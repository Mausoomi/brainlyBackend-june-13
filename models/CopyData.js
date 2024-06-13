const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  Storyimage: [],
  Paragraph: [],
});

const wordExploreSchema = new mongoose.Schema({
  Storytitle: String,
  Storyttext: String,
  Storyimage: [],
  Storyitext: String,
  Synonyms: {
    type: String,
  },
  Antonyms: {
    type: String,
  },
   Noun:{
    type:String
  },
  isMatched: {
    type: Boolean,
    default: false,
  },
});

const brainQuestSchema = new mongoose.Schema({
  Question: String,
  Option: [],
  Answer: String,
  isCompleted: { type: Boolean, default: false },
  Question_id: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
  }],
});

const DataSchema = new mongoose.Schema({
  Title: { type: String },
  Image: [],
  Status: String,
  Storyadvenure: {
    Storytitle: String,
    content: [storySchema],
  },
  Wordexplore: [wordExploreSchema],
  Brainquest: [brainQuestSchema],
});

const CopyDataSchema = new mongoose.Schema({
  Student_ID: {
    type: mongoose.Types.ObjectId,
    ref: "student",
  },
  pathname: {
    type: String,
  },
  Data: [DataSchema],
});

const CopyData = mongoose.model("CopyData", CopyDataSchema);

module.exports = CopyData;
