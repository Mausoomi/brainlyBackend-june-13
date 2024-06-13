const mongoose = require("mongoose");

const countSchema = mongoose.Schema({
  Student_ID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "student",
  },
  Count:{
    type:Number,
  },
  CounttimeStamps:[],
});

const Count = mongoose.model("count", countSchema);
module.exports = Count;
