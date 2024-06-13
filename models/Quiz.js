const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  StudentId: {
    // type: mongoose.Types.ObjectId,
    // ref:"student",
    // required: true
  },
  QuestionsId: {
    // type: mongoose.Schema.Types.ObjectId,ref:"question",
    // required: true
  },
  question: {
    type: String,
    // required: true,
  },
  options: [{ type: String }],
  answer: {
    type: String,
    // required: true,
  },
  submitedanswer: {
    type: String,
    // required: true,
  },
  tag: {
    type: String,
  },
  difficultyLevel: {
    type: String,
  },
  previouslyWrong:{
    type:Boolean,
    default:false
  },
  ProgressRef: {
    type: mongoose.Types.ObjectId,
    ref: "Progress",
  },
});

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
