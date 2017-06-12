// Remove spinning loader you see before all charts are loaded and rendered
function remove_loader() {
    document.getElementById("charts-container").style.opacity = 1.0;
    var elem = document.getElementById("loader");
    elem.remove();
}

// Remove empty bins from a group
function remove_bins(source_group) {
    var bins = Array.prototype.slice.call(arguments, 1);
    return {
        all: function () {
            return source_group.all().filter(function (d) {
                return bins.indexOf(d.key) === -1;
            });
        }
    };
}

//get value of a nested property given a key. For example, object.foo.bar can be retrieved with DeepValue(object, "foo.bar")
function DeepValue(object, key) {
    var paths = key.split('.');
    var current = object;

    for (var i = 0; i < paths.length; i++) {
        if (current[paths[i]] == undefined) {
            return undefined;
        } else {
            current = current[paths[i]];
        }
    }
    return current;
}

//Transform the values from the dataset into two X and Y arrays to be used for regression and clustering. Also transforms the date into an integer
function CreateXYSeries(group, key1, key2) {
    var xDate = false;
    var xSeries = [];
    var ySeries = [];

    if (group.all()[0]['key'] instanceof Date) {
        xDate = true;
        var minDate = group.all()[0]['key'];
        var maxDate = group.all()[group.all().length - 1]['key'];
        var timeDiff = Math.abs(maxDate.getTime() - minDate.getTime());
        var totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    if (xDate) {
        group.all().forEach(function (d) {
            var timeDiff = Math.abs(DeepValue(d, key1).getTime() - minDate.getTime());
            var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            xSeries.push(diffDays);
            ySeries.push(DeepValue(d, key2));
        })
    }
    else {
        group.all().forEach(function (d) {
            xSeries.push(DeepValue(d, key1));
            ySeries.push(DeepValue(d, key2));
        })
    }
    return [xSeries, ySeries, xDate, totalDays];
}

//Custom reduce functions for the graphs
function reduceAddGradesPie() {
    return function (p, v) {
        if (v.student_id in p.student_ids)
            p.student_ids[v.student_id]++;
        else {
            p.student_ids[v.student_id] = 1;
            ++p.count;
        }
        return p;
    }
}

function reduceRemoveGradesPie() {
    return function (p, v) {
        p.student_ids[v.student_id]--;
        if (p.student_ids[v.student_id] === 0) {
            delete p.student_ids[v.student_id];
            --p.count;
        }
        return p;
    }
}

function reduceInitGradesPie() {
    return function () {
        return { student_ids: {}, count: 0 };
    }
}

function reduceAddSuccessPercentage() {
    return function (p, v) {
        ++p.count;
        if (v.sort == 'mistake')
            p.mistakeCount++;
        else if (v.sort == 'success')
            p.successCount++;
        else
            p.completionCount++;
        p.successPercentage = (p.successCount + p.completionCount) / p.count * 100;
        return p;
    }
}

function reduceRemoveSuccessPercentage() {
    return function (p, v) {
        --p.count;
        if (v.sort == 'mistake')
            p.mistakeCount--;
        else if (v.sort == 'success')
            p.successCount--;
        else
            p.completionCount--;
        p.successPercentage = (p.successCount + p.completionCount) / p.count * 100;
        return p;
    }
}

function reduceInitSuccessPercentage() {
    return function () {
        return { count: 0, successPercentage: 0, mistakeCount: 0, successCount: 0, completionCount: 0 };
    }
}

function reduceAddGrades() {
    return function (p, v) {
        ++p.count;
        if (v.sort == 'mistake')
            p.mistakeCount++;
        else if (v.sort == 'success')
            p.successCount++;
        else
            p.completionCount++;
        if (v.grade == "no grade") {
            p.no_grade = true;
            p.grade = 0;
        }
        else {
            p.no_grade = false;
            p.grade = v.grade;
        }
        p.successPercentage = (p.successCount + p.completionCount) / p.count * 100;
        return p;
    }
}

function reduceRemoveGrades() {
    return function (p, v) {
        --p.count;
        if (v.sort == 'mistake')
            p.mistakeCount--;
        else if (v.sort == 'success')
            p.successCount--;
        else
            p.completionCount--;

        if (v.grade == "no grade") {
            p.no_grade = true;
            p.grade = 0;
        }
        else {
            p.no_grade = false;
            p.grade = v.grade;
        }
        p.successPercentage = (p.successCount + p.completionCount) / p.count * 100;
        return p;
    }
}

function reduceInitGrades() {
    return function () {
        return { count: 0, grade: 0, no_grade: false, mistakeCount: 0, successCount: 0, completionCount: 0, successPercentage: 0 };
    }
}

function reduceAddClustering() {
    return function (p, v) {
        ++p.count;
        p.completions = v.completions;
        p.successes = v.successes;
        p.mistakes = v.mistakes;
        p.grade = v.grade;
        p.cluster_id = v.cluster_id;
        return p;
    }
}

function reduceRemoveClustering() {
    return function (p, v) {
        --p.count;
        p.completions = v.completions;
        p.successes = v.successes;
        p.mistakes = v.mistakes;
        p.grade = v.grade;
        p.cluster_id = v.cluster_id;
        return p;
    }
}

function reduceInitClustering() {
    return function () {
        return { count: 0, grade: 0, cluster_id: 0, completions: 0, successes: 0, mistakes: 0 };
    }
}