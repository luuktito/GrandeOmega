var mongoose = require('mongoose');
var assignment_activities = mongoose.model('assignment_activities');
var student_grades = mongoose.model('student_grades');

//Route for homepage
exports.index = function (req, res) {
    res.render('index', { title: 'Home', year: new Date().getFullYear() });
};

//Route for about page
exports.about = function (req, res) {
    res.render('about', { title: 'About', year: new Date().getFullYear(), message: 'About GrandeOmega Analytics' });
};

//Route for about page
exports.contact = function (req, res) {
    res.render('contact', { title: 'Contact', year: new Date().getFullYear(), message: 'Contact Page' });
};
//Route for parser page
exports.parser = function (req, res) {
    var requestType = req.params.type;
    var fs = require('fs');
    var activities = [];
    var studentGrades = [];
    
    //Start reading the directory that holds all yaml files 
    fs.readdir('./data/', function (err, files) {
        //Loop through each file
        files.forEach(function (file) {
            var lineNumber = 0;
            var objectLine = 0;
            var firstObject = true;
            var teaching_unit_id, student_id, sort, created_at, class_id, grade = null;
            
            //Create a linereader
            var lineReader = require('readline').createInterface({
                input: require('fs').createReadStream('./data/' + file)
            });
            //Check if the file is a assignments_activities file
            if (file.indexOf('assignment_activities_with_class') == 0) {
                if (requestType == 'activities') {
                    lineReader.on('line', function (line) {
                        if (lineNumber != 0) {  //Skip the first line
                            //Check if you are started parsing a new entry (new attempt)
                            if ((line.substring(0, 1) == '-' && lineNumber != 1 && teaching_unit_id != undefined) || line.length == 0) {
                                //Push the previously parsed attempt into our array
                                activities.push({
                                    "teaching_unit_id" : teaching_unit_id,
                                    "student_id" : student_id,
                                    "class_id" : class_id,
                                    "sort" : sort,
                                    "created_at" : created_at
                                })
                                assignment_activities.create({ teaching_unit_id: teaching_unit_id, student_id: student_id, class_id: class_id, sort: sort, created_at: created_at });
                                //console.log('teaching_unit_id: ' + teaching_unit_id + ', student_id: ' + student_id + ', sort: ' + sort + ', class: ' + class_id + ', ' + created_at);
                                firstObject = false;
                                objectLine = 0;
                            }
                            var objectLineNew = objectLine;
                            
                            if (firstObject != true)
                                objectLineNew += 1;
                            
                            //Parse the actual fields we want to read from the files
                            switch (objectLineNew) {
                                case 4:
                                    created_at = line.substring(9, line.length);
                                    created_at = created_at.substring(created_at.indexOf(' ') + 1, created_at.indexOf('.'));
                                    break;
                                case 6:
                                    sort = line.substring(8, line.length);
                                    break;
                                case 8:
                                    student_id = line.substring(14, line.length);
                                    break;
                                case 9:
                                    class_id = line.substring(9, line.length);
                                case 10:
                                    teaching_unit_id = line.substring(20, line.length);
                                    break;
                            }
                            objectLine++;
                        }
                        lineNumber++;
                    });
                }
            }
            //Check if the file is a grades file
            else if (file.indexOf('grades') == 0) {
                if (requestType == 'studentGrades') {
                    lineReader.on('line', function (line) {
                        if (lineNumber != 0) {
                            if ((line.substring(0, 1) == '-' && lineNumber != 1) || line.length == 0) {
                                studentGrades.push({
                                    "student_id" : student_id,
                                    "grade" : grade
                                })
                                student_grades.create({ student_id: student_id, grade: grade });
                                //console.log('student_id: ' + student_id + ', grade: ' + grade);
                                objectLine = 0;
                            }
                            switch (objectLine) {
                                case 0:
                                    student_id = line.substring(14, line.length);
                                    break;
                                case 1:
                                    grade = line.substring(9, line.length);
                                    if (!(!isNaN(parseFloat(grade)) && isFinite(grade)))
                                        grade = 0;
                                    grade = String(grade);
                                    break;
                            }
                            objectLine++;
                        }
                        lineNumber++;
                    });
                }
            }
        });
    });
    
    //Check the request type of the page, the 2 possible types are activities and studentGrades
    if (requestType == 'activities') {
        res.send("The parser has finished, the database should be filled in a few seconds");
    }
    else if (requestType == 'studentGrades') {
        res.send("The parser has finished, the database should be filled");
    }
    else {
        res.send("This is not a valid parameter");
        console.log("Error: the request paramater: " + requestType + ", does not match any data request");
    }
};

//Route for API page
exports.api_data = function (req, res) {
    var requestType = req.params.type;
    if (requestType == 'activities') {
        //Find all activities in the mongoDB collection (same as SELECT 'columns' FROM table)
        assignment_activities.find({}, '-_id teaching_unit_id student_id class_id sort created_at', function (err, activities) {
            if (err)
                res.send(err);
            res.json(activities); // return all nerds in JSON format
        });
    }
    else if (requestType == 'studentGrades') {
        //Find all grades in the mongoDB collection (same as SELECT 'columns' FROM table)
        student_grades.find({}, '-_id student_id grade', function (err, studentGrades) {
            if (err)
                res.send(err);
            res.json(studentGrades); // return all nerds in JSON format
        });
    }
    else {
        console.log("Error: the request paramater: " + requestType + ", does not match any data request");
    }
};

