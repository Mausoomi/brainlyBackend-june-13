const mongoose = require("mongoose");

const Weeklyperformanceschema = new mongoose.Schema({
  StudentId: {type: mongoose.Types.ObjectId, ref:"student",},
  weekstartingdate: { type: Date, default: getStartOfCurrentWeek },
  Weekendingdate: { type: Date,default: getEndOfCurrentWeek },
  QuestionsCorrectCount: { type: Number, default: 0 },
  QuestionsWrongCount: { type: Number, default: 0 },
  TotalquestionsattemptedCount: { type: Number, default: 0 },
  Createdate: { type: Date, default: Date.Now },
});

// Function to calculate the date of the last Monday
function getStartOfCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(today.setDate(diff));
}

function getEndOfCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? 0 : 7); // Adjust to get the end of the current week (Sunday)
  return new Date(today.setDate(diff));
}

// console.log(getEndOfCurrentWeek());

const Weeklyperformance = mongoose.model("Weeklyperformance",Weeklyperformanceschema);

module.exports = Weeklyperformance;
