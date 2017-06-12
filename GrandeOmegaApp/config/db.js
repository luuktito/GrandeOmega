var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//Create the schema for the assignment_activities
var assignment_activities = new Schema({
    teaching_unit_id : Number,
    student_id : Number,
    class_id : Number,
    sort : String,
    created_at : { type: Date, default: Date.now }
});

//Create the schema for the grades
var student_grades = new Schema({
    student_id : Number,
    grade : Number
});

//Add indexes to prevent duplicate entries
assignment_activities.index({ teaching_unit_id: 1, student_id: 1, class_id: 1, created_at: 1 }, { unique: true });
student_grades.index({ student_id: 1 }, { unique: true });

//Pass the models through so they can be used in the routes
mongoose.model('assignment_activities', assignment_activities);
mongoose.model('student_grades', student_grades);
mongoose.connect('mongodb://localhost:27017/GrandeOmega');