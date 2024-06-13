
const mongoose = require("mongoose");

const ProgressSchema = new mongoose.Schema({
  StudentId: { },
  QuestionsId: {},
  repetitionLevel: {
    type: Number,
    // default: 0
  },
  repetitionInterval: {
    type: Number,
    // default: 1
  },
  nextReviewDate: {
    type: Date
  },
  lastRevieweDate: {
    type: Date
  },
  QuestionRef: {
    type: mongoose.Types.ObjectId,
    ref: "Progress",
  },
});

const Progress = mongoose.model("Progress", ProgressSchema);

module.exports = Progress;
