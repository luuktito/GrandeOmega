//Call our api's to get the json data for activities and studentGrades, pass them over to our main functions
queue()
    .defer(d3.json, "/api/activities")
    .defer(d3.json, "/api/studentGrades")
    .await(makeGraphs);

function makeGraphs(error, apiDataActivities, apiDataGrades) {
    if ((apiDataActivities.length > 0) && (apiDataGrades.length > 0)) {
        var gradesSuccesses = [];
        var gradesMistakes = [];
        var dateFormat = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
        //Preparse the data to save processing time later on
        apiDataActivities.forEach(function (d) {
            d.created_at = dateFormat.parse(d.created_at);
            d.grade = "no grade";
            //Add the grades from the second json result to our main array of data
            apiDataGrades.forEach(function (item) {
                if (item.student_id == d.student_id)
                    d.grade = item.grade;
            })
            //Create the data set to be used for K-means and DBSCAN
            if (d.sort == "success") {
                //No grade is replaced with 0 to make sure the clustering can work in numerical dimensions
                var gradeTemp = (d.grade !== 'no grade') ? d.grade : 0;
                if (gradesSuccesses[d.student_id] == null) {
                    gradesSuccesses[d.student_id] = { successes: 1, grade: gradeTemp };
                }
                else {
                    var oldCompletions = gradesSuccesses[d.student_id].successes;
                    gradesSuccesses[d.student_id] = { successes: oldCompletions + 1, grade: gradeTemp };
                }
            }
            //Create the data set to be used for K Nearest Neighbor and Naive Bayes
            else if (d.sort == "mistake") {
                var gradeTemp = (d.grade !== 'no grade') ? d.grade : 0;
                if (gradesMistakes[d.student_id] == null) {
                    gradesMistakes[d.student_id] = { mistakes: 1, grade: gradeTemp };
                }
                else {
                    var oldMistakes = gradesMistakes[d.student_id].mistakes;
                    gradesMistakes[d.student_id] = { mistakes: oldMistakes + 1, grade: gradeTemp };
                }
            }
        });

        //Get the results of the KMeans program using the grades and successes of students for x and y (2D KMeans)
        //First parameter is the amount of iterations, second parameter is the amount of clusters, third is a array of objects with the format: student_id: { field1: 0, field2: 0 }
        var kmeansResult = RunKmeans(10, 6, JSON.parse(JSON.stringify(gradesSuccesses)));

        //Get the results of the DBSCAN program using the grades and successes of students for x and y
        //First parameter is the epsilon distance, second parameter is the minimum amount of points in a cluster, third is a array of objects with the format: student_id: { field1: 0, field2: 0 }
        var dbscanResult = RunDbscan(12, 3, JSON.parse(JSON.stringify(gradesSuccesses)));

        //Get the results of the K Nearest Neighbor program using the grades and mistakes of students for x and y, the training set is the result of the previous KMeans
        //First parameter is the maximum amount of neighbors to check, second parameter is array of objects with the format: student_id: { field1: 0, field2: 0 }, third is a training set array of objects with the same format
        var knearestResult = RunKNearestNeighbor(3, JSON.parse(JSON.stringify(gradesMistakes)), JSON.parse(JSON.stringify(kmeansResult[0])));

        //Get the results of the Naive Bayes Classification program using the grades and mistakes of students for x and y, the training set is the result of the previous KMeans
        //First parameter is and array of objects with the format: student_id: { field1: 0, field2: 0 }, second is a training set array of objects with the same format
        var naivebayesResult = RunNaiveBayesClassifier(JSON.parse(JSON.stringify(gradesMistakes)), JSON.parse(JSON.stringify(kmeansResult[0])));

        //Create a the crossfilter instances
        var ndx = crossfilter(apiDataActivities);
        var ndxRegression = crossfilter(apiDataActivities);
        var ndx2 = crossfilter(kmeansResult[0]);
        var ndx3 = crossfilter(dbscanResult);
        var ndx4 = crossfilter(knearestResult);
        var ndx5 = crossfilter(naivebayesResult);

        //Define Dimensions
        var Teaching_unit_id = ndx.dimension(function (d) { return d.teaching_unit_id; });
        var Student_id = ndx.dimension(function (d) { return d.student_id; });
        var Class_id = ndx.dimension(function (d) { return d.class_id });
        var Sort = ndx.dimension(function (d) { return d.sort; });
        var Created_at = ndx.dimension(function (d) { return d.created_at; });
        var Created_at_By_Hour = ndx.dimension(function (d) { return d3.time.hour(d.created_at); });
        var dayOfWeek = ndx.dimension(function (d) {
            var day = (d.created_at.getDay() + 6) % 7
            var name = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return day + '.' + name[day];
        });
        var hourOfDay = ndx.dimension(function (d) { return d.created_at.getHours(); });
        var hourOfDayCorrelation = ndxRegression.dimension(function (d) { return d.created_at.getHours(); });

        var Created_at_By_Day = ndxRegression.dimension(function (d) { return d3.time.day(d.created_at); });
        var Student_id_Regression = ndxRegression.dimension(function (d) { return d.student_id; });

        var KMeansDimension = ndx2.dimension(function (d) { return d.successes + ',' + d.grade + ',' + d.cluster_id; });
        var DbscanDimension = ndx3.dimension(function (d) { return d.successes + ',' + d.grade + ',' + d.cluster_id; });
        var KNearestDimension = ndx4.dimension(function (d) { return d.mistakes + ',' + d.grade + ',' + d.cluster_id; });
        var NaiveBayesDimension = ndx5.dimension(function (d) { return d.mistakes + ',' + d.grade + ',' + d.cluster_id; });

        //Only return the dimensions for each respective day, rest results in "", which is filtered out later
        var SortMonday = ndx.dimension(function (d) { return d.created_at.getDay() == 1 ? d.sort : ""; });
        var SortTuesday = ndx.dimension(function (d) { return d.created_at.getDay() == 2 ? d.sort : ""; });
        var SortWednesday = ndx.dimension(function (d) { return d.created_at.getDay() == 3 ? d.sort : ""; });
        var SortThursday = ndx.dimension(function (d) { return d.created_at.getDay() == 4 ? d.sort : ""; });
        var SortFriday = ndx.dimension(function (d) { return d.created_at.getDay() == 5 ? d.sort : ""; });
        var SortSaturday = ndx.dimension(function (d) { return d.created_at.getDay() == 6 ? d.sort : ""; });
        var SortSunday = ndx.dimension(function (d) { return d.created_at.getDay() == 0 ? d.sort : ""; });

        var GradesPie = ndx.dimension(function (d) { return d.grade.toString(); });

        //Calculate metrics
        var AssignmentsByDate = Created_at.group();
        var AssignmentsBySuccess = Sort.group();
        var AssignmentsByStudent = Student_id.group();
        var AssignmentsByClass = Class_id.group();
        var AssignmentsByAssignment = Teaching_unit_id.group();
        var AssignmentsByDateByHour = Created_at_By_Hour.group();
        var dayOfWeekGroup = dayOfWeek.group();

        //Filter out empty days
        var AssignmentsBySuccessMonday = remove_bins(SortMonday.group(), "");
        var AssignmentsBySuccessTuesday = remove_bins(SortTuesday.group(), "");
        var AssignmentsBySuccessWednesday = remove_bins(SortWednesday.group(), "");
        var AssignmentsBySuccessThursday = remove_bins(SortThursday.group(), "");
        var AssignmentsBySuccessFriday = remove_bins(SortFriday.group(), "");
        var AssignmentsBySuccessSaturday = remove_bins(SortSaturday.group(), "");
        var AssignmentsBySuccessSunday = remove_bins(SortSunday.group(), "");

        ////Custom group reduces, the functions for these are located in utils.js
        //Custom group reduce, custom count to make sure only unique combinations of student_id, grade are passed through
        var GradesPieGroup = GradesPie.group().reduce(reduceAddGradesPie(), reduceRemoveGradesPie(), reduceInitGradesPie());

        var SuccessPercentageByDateByDay = Created_at_By_Day.group().reduce(reduceAddSuccessPercentage(), reduceRemoveSuccessPercentage(), reduceInitSuccessPercentage());
        var hourOfDayGroup = hourOfDay.group().reduce(reduceAddSuccessPercentage(), reduceRemoveSuccessPercentage(), reduceInitSuccessPercentage());
        var hourOfDayCorrelationGroup = hourOfDayCorrelation.group().reduce(reduceAddSuccessPercentage(), reduceRemoveSuccessPercentage(), reduceInitSuccessPercentage());

        var StudentGradesGroup = Student_id.group().reduce(reduceAddGrades(), reduceRemoveGrades(), reduceInitGrades());
        var StudentGradesGroupRegression = Student_id_Regression.group().reduce(reduceAddGrades(), reduceRemoveGrades(), reduceInitGrades());

        //Custom group reduce, simply to add the custom value and color accessors in the graph
        var KMeansDimensionGroup = KMeansDimension.group().reduce(reduceAddClustering(), reduceRemoveClustering(), reduceInitClustering());
        var DbscanDimensionGroup = DbscanDimension.group().reduce(reduceAddClustering(), reduceRemoveClustering(), reduceInitClustering());
        var KNearestDimensionGroup = KNearestDimension.group().reduce(reduceAddClustering(), reduceRemoveClustering(), reduceInitClustering());
        var NaiveBayesDimensionGroup = NaiveBayesDimension.group().reduce(reduceAddClustering(), reduceRemoveClustering(), reduceInitClustering());

        //Group all to get the total number of filtered records to be shown on the top of the page
        var all = ndx.groupAll();

        //Define threshold values for the main assignments per hour chart
        var minDate = Created_at.bottom(1)[0].created_at;
        var maxDate = Created_at.top(1)[0].created_at;

        //Define threshold values for success percentage per day chart
        var minDateDay = d3.time.day(Created_at_By_Day.bottom(1)[0].created_at);
        var maxDateDay = d3.time.day(Created_at_By_Day.top(1)[0].created_at);

        //Define threshold values for grades over amount of activities
        var minValueGradesActivities = Number.MAX_SAFE_INTEGER;
        var maxValueGradesActivities = 0;
        StudentGradesGroup.all().forEach(function (d) {
            if (d.value.count > maxValueGradesActivities)
                maxValueGradesActivities = d.value.count;
            if (d.value.count < minValueGradesActivities)
                minValueGradesActivities = d.value.count;
        })

        //Define threshold values for grades over amount of successes
        var minValueGradesSuccesses = Number.MAX_SAFE_INTEGER;
        var maxValueGradesSuccesses = 0;
        KMeansDimensionGroup.all().forEach(function (d) {
            if (d.value.successes > maxValueGradesSuccesses)
                maxValueGradesSuccesses = d.value.successes;
            if (d.value.successes < minValueGradesSuccesses)
                minValueGradesSuccesses = d.value.successes;
        })

        //Define threshold values for grades over amount of mistakes
        var minValueGradesMistakes = Number.MAX_SAFE_INTEGER;
        var maxValueGradesMistakes = 0;
        KNearestDimensionGroup.all().forEach(function (d) {
            if (d.value.mistakes > maxValueGradesMistakes)
                maxValueGradesMistakes = d.value.mistakes;
            if (d.value.mistakes < minValueGradesMistakes)
                minValueGradesMistakes = d.value.mistakes;
        })

        //Define the charts and their html id's to be linked to by dc.js
        var dateChart = dc.barChart("#date-chart");
        var dayOfWeekChart = dc.rowChart('#day-of-week-chart');
        var studentSelector = dc.selectMenu('#student-selector');
        var classSelector = dc.selectMenu('#class-selector');
        var attemptTypeChart = dc.pieChart("#attempt-type-chart");
        var attemptTypeMondayChart = dc.pieChart("#attempt-type-monday-chart");
        var attemptTypeTuesdayChart = dc.pieChart("#attempt-type-tuesday-chart");
        var attemptTypeWednesdayChart = dc.pieChart("#attempt-type-wednesday-chart");
        var attemptTypeThursdayChart = dc.pieChart("#attempt-type-thursday-chart");
        var attemptTypeFridayChart = dc.pieChart("#attempt-type-friday-chart");
        var attemptTypeSaturdayChart = dc.pieChart("#attempt-type-saturday-chart");
        var attemptTypeSundayChart = dc.pieChart("#attempt-type-sunday-chart");
        var totalProjects = dc.numberDisplay("#total-projects");
        var studentGradesChart = dc.bubbleChart('#student-grades-chart');
        var studentGradesActivitiesChart = dc.bubbleChart('#student-grades-activities-chart');
        var hourOfDaySuccessRatioChart = dc.barChart('#success-percentage-by-hour-chart');
        var studentGradesActivitiesRegressionChart = dc.bubbleChart('#student-grades-activities-regression-chart');
        var successPercentageOverDateRegression = dc.lineChart('#success-percentage-by-day-regression-chart');
        var studentGradesSuccessPercentageRegressionChart = dc.bubbleChart('#student-grades-percentage-regression-chart');
        var studentGradesActivitiesCorrelationChart = dc.bubbleChart('#student-grades-activities-correlation-chart');
        var studentGradesSuccessPercentageCorrelationChart = dc.bubbleChart('#student-grades-percentage-correlation-chart');
        var hourOfDaySuccessRatioCorrelationChart = dc.barChart('#success-percentage-by-hour-correlation-chart');
        var gradesPieChart = dc.pieChart('#grades-pie-chart');
        var KMeansSuccessesGrade = dc.bubbleChart('#kmeans-successes-grade-chart');
        var DbscanSuccessesGrade = dc.bubbleChart('#dbscan-successes-grade-chart');
        var KNearestMistakesGrade = dc.bubbleChart('#knearest-mistakes-grade-chart');
        var NaiveBayesMistakesGrade = dc.bubbleChart('#naive-bayes-mistakes-grade-chart');

        //Define the parameters for all graphs
        totalProjects
            .formatNumber(d3.format("d"))
            .dimension(ndx)
            .valueAccessor(function (d) { return d; })
            .group(all);

        dateChart
            .width(890)
            .height(300)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .dimension(Created_at_By_Hour)
            .group(AssignmentsByDateByHour)
            .mouseZoomable(true)
            .transitionDuration(500)
            .x(d3.time.scale().domain([minDate, maxDate]))
            .xUnits(d3.time.hours)
            .elasticY(true)
            .xAxisLabel("Day")
            .yAxisLabel("Activities");

        dayOfWeekChart
            .width(250)
            .height(250)
            .margins({ top: 20, left: 10, right: 20, bottom: 20 })
            .dimension(dayOfWeek)
            .group(dayOfWeekGroup)
            .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
            .label(function (d) { return d.key.split('.')[1]; })
            .elasticX(true)
            .xAxis().ticks(6);

        studentSelector
            .dimension(Student_id)
            .group(AssignmentsByStudent)
            .multiple(true)
            .numberVisible(6)
            .controlsUseVisibility(true)
            .title(function (d) { return d.key + ' (attempts: ' + d.value + ')'; });

        classSelector
            .dimension(Class_id)
            .group(AssignmentsByClass)
            .multiple(true)
            .numberVisible(6)
            .controlsUseVisibility(true)
            .title(function (d) { return d.key + ' (attempts: ' + d.value + ')'; });

        attemptTypeChart
            .height(250)
            .width(250)
            .radius(100)
            .innerRadius(50)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(-20)
            .dimension(Sort)
            .group(AssignmentsBySuccess);

        attemptTypeMondayChart
            .height(200)
            .width(200)
            .radius(100)
            .innerRadius(40)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(0)
            .dimension(SortMonday)
            .group(AssignmentsBySuccessMonday)
        attemptTypeMondayChart.filter = function () { };

        attemptTypeTuesdayChart
            .height(200)
            .width(200)
            .radius(100)
            .innerRadius(40)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(0)
            .dimension(SortTuesday)
            .group(AssignmentsBySuccessTuesday);
        attemptTypeTuesdayChart.filter = function () { };

        attemptTypeWednesdayChart
            .height(200)
            .width(200)
            .radius(100)
            .innerRadius(40)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(0)
            .dimension(SortWednesday)
            .group(AssignmentsBySuccessWednesday);
        attemptTypeWednesdayChart.filter = function () { };

        attemptTypeThursdayChart
            .height(200)
            .width(200)
            .radius(100)
            .innerRadius(40)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(0)
            .dimension(SortThursday)
            .group(AssignmentsBySuccessThursday);
        attemptTypeThursdayChart.filter = function () { };

        attemptTypeFridayChart
            .height(200)
            .width(200)
            .radius(100)
            .innerRadius(40)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(0)
            .dimension(SortFriday)
            .group(AssignmentsBySuccessFriday);
        attemptTypeFridayChart.filter = function () { };

        attemptTypeSaturdayChart
            .height(200)
            .width(200)
            .radius(100)
            .innerRadius(40)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(0)
            .dimension(SortSaturday)
            .group(AssignmentsBySuccessSaturday);
        attemptTypeSaturdayChart.filter = function () { };

        attemptTypeSundayChart
            .height(200)
            .width(200)
            .radius(100)
            .innerRadius(40)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(0)
            .dimension(SortSunday)
            .group(AssignmentsBySuccessSunday);
        attemptTypeSundayChart.filter = function () { };

        gradesPieChart
            .height(270)
            .width(270)
            .radius(100)
            .innerRadius(60)
            .minAngleForLabel(0)
            .transitionDuration(1000)
            .externalRadiusPadding(-25)
            .valueAccessor(function (d) { return d.value.count; })
            .dimension(GradesPie)
            .group(GradesPieGroup);

        studentGradesChart
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(["#1674b8", "#ff0129"])
            .colorDomain([0, 1])
            .dimension(Student_id)
            .group(StudentGradesGroup)
            .colorAccessor(function (p) { return p.value.no_grade == true ? 1 : 0; })
            .valueAccessor(function (p) { return p.value.grade; })
            .radiusValueAccessor(function (p) { return 1.5; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.ordinal()
            .domain(function (d) { return d.student_id; }))
            .elasticX(true)
            .xUnits(dc.units.ordinal)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticY(true)
            .on("renderlet", function (chart) {
                chart.selectAll("g.x text")
                    .attr('transform', 'translate(12,15) rotate(90)');
                chart.redraw();
            })
            .xAxisLabel("Students")
            .yAxisLabel("Grade");
        studentGradesChart.filter = function () { };

        studentGradesActivitiesChart
            .width(850)
            .height(300)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(["#1674b8", "#ff0129"])
            .colorDomain([0, 1])
            .dimension(Student_id)
            .group(StudentGradesGroup)
            .colorAccessor(function (p) { return p.value.no_grade == true ? 1 : 0; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.count; })
            .radiusValueAccessor(function (p) { return 2; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([minValueGradesActivities, maxValueGradesActivities]))
            .xAxisPadding(20)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .xAxisLabel("Amount of Activities")
            .yAxisLabel("Grade");
        studentGradesActivitiesChart.filter = function () { };

        hourOfDaySuccessRatioChart
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .dimension(hourOfDay)
            .group(hourOfDayGroup)
            .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
            .label(function (d) { return d.key; })
            .valueAccessor(function (p) { return p.value.successPercentage; })
            .keyAccessor(function (p) { return p.key; })
            .x(d3.scale.linear().domain([0, 24]))
            .y(d3.scale.linear().domain([0, 100]))
            .xAxisLabel("Hour of Day")
            .yAxisLabel("Success %");

        successPercentageOverDateRegression
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .dimension(Created_at_By_Day)
            .group(SuccessPercentageByDateByDay)
            .valueAccessor(function (p) { return p.value.successPercentage; })
            .transitionDuration(500)
            .x(d3.time.scale().domain([minDateDay, maxDateDay]))
            .xUnits(d3.time.days)
            .renderArea(true)
            .on('postRender', function (chart) {
                DrawRegression(SuccessPercentageByDateByDay, 'key', 'value.successPercentage', maxDateDay, chart, 'simple_linear');
                DrawRegression(SuccessPercentageByDateByDay, 'key', 'value.successPercentage', maxDateDay, chart, 'logarithmic');
            })
            .brushOn(false)
            .elasticY(true)
            .xAxisLabel("Day")
            .yAxisLabel("Success %");
        successPercentageOverDateRegression.filter = function () { };

        studentGradesActivitiesRegressionChart
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(["#1674b8", "#ff0129"])
            .colorDomain([0, 1])
            .dimension(Student_id_Regression)
            .group(StudentGradesGroupRegression)
            .colorAccessor(function (p) { return p.value.no_grade == true ? 1 : 0; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.count; })
            .radiusValueAccessor(function (p) { return 2; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([minValueGradesActivities, maxValueGradesActivities]))
            .xAxisPadding(20)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .on('postRender', function (chart) {
                DrawRegression(StudentGradesGroup, 'value.count', 'value.grade', maxValueGradesActivities, chart, 'simple_linear');
                DrawRegression(StudentGradesGroup, 'value.count', 'value.grade', maxValueGradesActivities, chart, 'logarithmic');
            })
            .xAxisLabel("Amount of Activities")
            .yAxisLabel("Grade");
        studentGradesActivitiesRegressionChart.filter = function () { };

        studentGradesSuccessPercentageRegressionChart
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(["#1674b8", "#ff0129"])
            .colorDomain([0, 1])
            .dimension(Student_id_Regression)
            .group(StudentGradesGroupRegression)
            .colorAccessor(function (p) { return p.value.no_grade == true ? 1 : 0; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.successPercentage; })
            .radiusValueAccessor(function (p) { return 2; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([0, 100]))
            .xAxisPadding(2)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .on('postRender', function (chart) {
                DrawRegression(StudentGradesGroup, 'value.successPercentage', 'value.grade', 100, chart, 'simple_linear');
                DrawRegression(StudentGradesGroup, 'value.successPercentage', 'value.grade', 100, chart, 'logarithmic');
            })
            .xAxisLabel("Success %")
            .yAxisLabel("Grade");
        studentGradesSuccessPercentageRegressionChart.filter = function () { };

        studentGradesActivitiesCorrelationChart
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(["#1674b8", "#ff0129"])
            .colorDomain([0, 1])
            .dimension(Student_id_Regression)
            .group(StudentGradesGroupRegression)
            .colorAccessor(function (p) { return p.value.no_grade == true ? 1 : 0; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.count; })
            .radiusValueAccessor(function (p) { return 2; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([minValueGradesActivities, maxValueGradesActivities]))
            .xAxisPadding(20)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .on('postRender', function (chart) {
                DrawCorrelation(StudentGradesGroup, 'value.count', 'value.grade', chart, 'pearson');
                DrawCorrelation(StudentGradesGroup, 'value.count', 'value.grade', chart, 'spearman');
            })
            .xAxisLabel("Amount of Activities")
            .yAxisLabel("Grade");
        studentGradesActivitiesCorrelationChart.filter = function () { };

        studentGradesSuccessPercentageCorrelationChart
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(["#1674b8", "#ff0129"])
            .colorDomain([0, 1])
            .dimension(Student_id_Regression)
            .group(StudentGradesGroupRegression)
            .colorAccessor(function (p) { return p.value.no_grade == true ? 1 : 0; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.successPercentage; })
            .radiusValueAccessor(function (p) { return 2; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([0, 100]))
            .xAxisPadding(2)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .on('postRender', function (chart) {
                DrawCorrelation(StudentGradesGroup, 'value.successPercentage', 'value.grade', chart, 'pearson');
                DrawCorrelation(StudentGradesGroup, 'value.successPercentage', 'value.grade', chart, 'spearman');
            })
            .xAxisLabel("Success %")
            .yAxisLabel("Grade");
        studentGradesSuccessPercentageCorrelationChart.filter = function () { };

        hourOfDaySuccessRatioCorrelationChart
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .dimension(hourOfDayCorrelation)
            .group(hourOfDayCorrelationGroup)
            .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
            .label(function (d) { return d.key; })
            .valueAccessor(function (p) { return p.value.successPercentage; })
            .keyAccessor(function (p) { return p.key; })
            .on('postRender', function (chart) {
                DrawCorrelation(StudentGradesGroup, 'key', 'value.successPercentage', chart, 'pearson');
                DrawCorrelation(StudentGradesGroup, 'key', 'value.successPercentage', chart, 'spearman');
            })
            .brushOn(false)
            .x(d3.scale.linear().domain([0, 24]))
            .y(d3.scale.linear().domain([0, 100]))
            .xAxisLabel("Hour of Day")
            .yAxisLabel("Success %");
        hourOfDaySuccessRatioCorrelationChart.filter = function () { };

        KMeansSuccessesGrade
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(d3.scale.category10())
            .dimension(KMeansDimension)
            .group(KMeansDimensionGroup)
            .colorAccessor(function (p) { return p.value.cluster_id; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.successes; })
            .radiusValueAccessor(function (p) { return 1.5; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([minValueGradesSuccesses, maxValueGradesSuccesses]))
            .xAxisPadding(10)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .on('postRender', function (chart) {
                var chartBody = chart.select('g.chart-body');
                var text = chartBody.selectAll().data([[]]);
                text.enter().append('text')
                    .attr({
                        class: 'extra-label',
                        'transform': 'translate(' + (chart.x().range()[1] * 0.85) + ',' + 20 + ')',
                        'text-anchor': 'left',
                    })
                    .text("SSE: " + kmeansResult[1].toFixed(2));
            })
            .xAxisLabel("Successful Assignments")
            .yAxisLabel("Grade");
        KMeansSuccessesGrade.filter = function () { };

        DbscanSuccessesGrade
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(d3.scale.category10())
            .dimension(DbscanDimension)
            .group(DbscanDimensionGroup)
            .colorAccessor(function (p) { return p.value.cluster_id; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.successes; })
            .radiusValueAccessor(function (p) { return 1.5; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([minValueGradesSuccesses, maxValueGradesSuccesses]))
            .xAxisPadding(10)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .xAxisLabel("Successful Assignments")
            .yAxisLabel("Grade");
        DbscanSuccessesGrade.filter = function () { };

        KNearestMistakesGrade
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(d3.scale.category10())
            .dimension(KNearestDimension)
            .group(KNearestDimensionGroup)
            .colorAccessor(function (p) { return p.value.cluster_id; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.mistakes; })
            .radiusValueAccessor(function (p) { return 1.5; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([minValueGradesMistakes, maxValueGradesMistakes]))
            .xAxisPadding(20)
            .y(d3.scale.linear().domain([0, 100]))
            .yAxisPadding(5)
            .elasticX(true)
            .elasticY(true)
            .xAxisLabel("Assignment mistakes")
            .yAxisLabel("Grade");
        KNearestMistakesGrade.filter = function () { };

        NaiveBayesMistakesGrade
            .width(1140)
            .height(400)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .colors(d3.scale.category10())
            .dimension(NaiveBayesDimension)
            .group(NaiveBayesDimensionGroup)
            .colorAccessor(function (p) { return p.value.cluster_id; })
            .valueAccessor(function (p) { return p.value.grade; })
            .keyAccessor(function (p) { return p.value.mistakes; })
            .radiusValueAccessor(function (p) { return 1.5; })
            .brushOn(false)
            .transitionDuration(500)
            .x(d3.scale.linear().domain([minValueGradesMistakes, maxValueGradesMistakes]))
            .xAxisPadding(20)
            .y(d3.scale.linear().domain([0, 100]))
            .elasticX(true)
            .elasticY(true)
            .yAxisPadding(5)
            .xAxisLabel("Assignment mistakes")
            .yAxisLabel("Grade");
        NaiveBayesMistakesGrade.filter = function () { };

        //Render all graphs
        dc.renderAll();
    }
    else {
        remove_loader();
        alert("The data required to display the graph has not yet been inserted into the database. Please go to \nlocalhost:3000/parser/activities and \nlocalhost:3000/parser/studentGrades to run the parsers and fill the database");
        var elem = document.getElementById("charts-container");
        elem.remove();
    }

    //Remove spinning loader once all graphs have been loaded
    remove_loader();
};
