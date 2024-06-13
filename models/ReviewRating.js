

const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  wordRating: { type: Number, required: true },
  storyRating: { type: Number, required: true },
  questionRating: { type: Number, required: true },
  comment: { type: String, required: false },
  Student_id: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
    },
  ],
  StoryTitle: { type: String, required: false },
});

module.exports = mongoose.model("Rating", ratingSchema);
