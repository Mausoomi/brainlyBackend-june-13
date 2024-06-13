const Adventure = require("../models/Adventure");
const Fantasy = require("../models/Fantasy");
const Historyfiction = require("../models/Historyfiction");
const Sciencefiction = require("../models/Sciencefiction");
const Sport = require("../models/Sport");
const Mystery = require("../models/Mystery");
const Weeklyperformance = require("../models/WeeklyPerformance");
const Question = require("../models/Quiz");
const ImageKit = require("imagekit");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const sendToken = require("../utils/sendToken");
const sendOTP = require("../utils/sendOTP");
const bcrypt = require("bcryptjs");
// const DragDrop = require("../models/DragDrop");
const Progress = require("../models/Progress");
// const BrainQuestModel = require("../models/BrainQuest");
// const Status = require("../models/Status");
const CopyData = require("../models/CopyData");
const { ObjectId } = require("mongodb");
const Count = require("../models/Count");
const Rating = require("../models/ReviewRating");
const cron = require("node-cron");
const moment = require("moment-timezone");
// ---------------------------------------------------------------------------------------------------------- Image Upload Route ----------------------

var imagekit = new ImageKit({
  publicKey: process.env.public_key,
  privateKey: process.env.private_key,
  urlEndpoint: process.env.URL_Endpoint,
});

exports.imageupload = async (req, res, next) => {
  try {
    const imageData = req.file.buffer.toString("base64"); // Convert file to base64
    imagekit.upload(
      {
        file: imageData,
        fileName: req.file.originalname, // Use original file name
      },
      function (error, result) {
        if (error) {
          // console.log(error);
          res
            .status(500)
            .json({ error: "An error occurred while uploading the image" });
        } else {
          // console.log(result);
          const filename = result.name;
          // console.log(filename);
          res.status(200).json({ filename }); // Send back the URL of the uploaded image
        }
      }
    );
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
};

//--------------------------------------------------------------finduser----------------------------------------------

exports.FindUsername = catchAsyncErrors(async (req, res, next) => {
  try {
    // console.log(req.body)
    const { Email } = req.body;
    const existingUser = await Student.findOne({ Email });
    if (existingUser) {
      const otp = await sendOTP(existingUser.Email);
      console.log(otp);
      existingUser.OTP = otp;

      await existingUser.save();
      return res
        .status(200)
        .json({ message: "User Successfully Find", existingUser });
    } else {
      return res.status(404).json({ message: "No User Find with this Email " });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error " });
  }
});

exports.MatchOTP = catchAsyncErrors(async (req, res, next) => {
  const { user_id, OTP } = req.body;
  // console.log(data);

  const studentData = await Student.findOne({ _id: user_id });

  // const FoundedUser = studentData.OTP;
  if (Number(OTP) === Number(studentData.OTP)) {
    return res
      .status(200)
      .json({ message: "OTP  Matched Successfully", studentData });
  } else {
    return res.status(404).json({ message: "OTP Doesn't Match" });
  }
});

exports.Reset_Password = catchAsyncErrors(async (req, res, next) => {
  try {
    // console.log(req.body)
    const { id, New_Password } = req.body;
    const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUND, 10));
    const hashedPassword = await bcrypt.hash(New_Password, salt);

    const updateData = await Student.findByIdAndUpdate(id, {
      Password: hashedPassword,
    });
    if (!updateData) {
      return res.status(404).json({ message: "No User Found !" });
    } else {
      const updatedData = await updateData.save();
      sendToken(updatedData, res, 201);
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error " });
  }
});

exports.Signup_admin = catchAsyncErrors(async (req, res, next) => {
  try {
    const { Username, Email, Password } = req.body;
    const existingUser = await Admin.findOne({ Email });
    if (existingUser) {
      return res.status(409).json({ message: "admin Email already exists" });
    }
    const newadmin = new Admin({
      Username,
      Email,
      Password,
    });
    await newadmin.save();
    sendToken(newadmin, res, 201);
  } catch (error) {
    return next(new ErrorHandler("No admin was Created ", 404));
  }
});

exports.Signin_user = async (req, res, next) => {
  try {
    const { Email, Password } = req.body;
    // Try to find the user in Student collection
    let user = await Student.findOne({ Email });
    if (!user) {
      user = await Admin.findOne({ Email });
    }
    if (!user) {
      return res
        .status(401)
        .json({ message: "Authentication failed. User not found." });
    }

    const passwordMatch = await user.constructor.comparePassword(
      Password,
      user.Password
    );

    if (passwordMatch) {
      sendToken(user, res, 201);
    } else {
      res
        .status(401)
        .json({ message: "Authentication failed. Incorrect password." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

exports.Signup = async (req, res, next) => {
  try {
    const { Username, Email, Password, Children_Name } = req.body;
    const existingUser = await Student.findOne({ Email: Email });
    if (existingUser) {
      return res.status(409).json({ message: "Student Email already exists" });
    }
    const newStudent = new Student({
      Username,
      Password,
      Email,
      Children_Name,
    });
    await newStudent.save();
    sendToken(newStudent, res, 201);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

exports.currentAdmin = catchAsyncErrors(async (req, res, next) => {
  const userType = await req.UserType;
  try {
    let user;
    if (userType === "student") {
      user = await Student.findById(req.id).exec();
    } else if (userType === "admin") {
      user = await Admin.findById(req.id).exec();
    }
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

exports.updateUserProfile = async (req, res) => {
  try {
    const { WeeklyPerformanceId } = req.body;

    // Check if the user exists
    const user = await Student.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Update the user profile
    const updatedUser = await Student.findByIdAndUpdate(
      req.user._id,
      {
        WeeklyPerformanceId,
      },
      { new: true }
    );

    res.status(200).json({
      message: "User profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.signout = async (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Successfully Logged Out!" });
};

// -----------------------------------------------------------------------------------  Adventure  ----------------

exports.createAdventure = async (req, res) => {
  try {
    const adventure = new Adventure(req.body);
    await adventure.save();
    // console.log(adventure);
    res.status(201).json(adventure);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllAdventures = async (req, res) => {
  try {
    const adventures = await Adventure.find();
    res.status(200).json(adventures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdventureById = async (req, res) => {
  try {
    const adventure = await Adventure.findById(req.params.id);

    if (!adventure) {
      return res.status(404).json({ message: "Adventure not found" });
    }

    res.status(200).json(adventure);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateAdventure = async (req, res) => {
  try {
    const adventure = await Adventure.findByIdAndUpdate(
      req.params.id,
      req.body
    );
    await adventure.save();
    res.status(200).json(adventure);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteAdventure = async (req, res) => {
  try {
    await Adventure.findByIdAndDelete(req.params.id);
    res
      .status(201)
      .json({ success: true, message: "The requested Adventure is Deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.fetchCompletedAdventure = async (req, res) => {
  try {
    const completedScienceFiction = await Adventure.find({
      Status: "Completed",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res
        .status(404)
        .json({ message: "No completed science fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchInProgressAdventure = async (req, res) => {
  try {
    const completedScienceFiction = await Adventure.find({
      Status: "In Progress",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  In Progress fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchNewAdventure = async (req, res) => {
  try {
    const completedScienceFiction = await Adventure.find({ Status: "New" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  New fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ----------------------------------------------------------------------------  Fantasy -----------------------

exports.createFantasy = async (req, res) => {
  try {
    const { Storyadvenure, Wordexplore, Brainquest, Title, Image, Status } =
      req.body;
    const fantasy = new Fantasy({
      Title,
      Image,
      Status,
      Storyadvenure,
      Wordexplore,
      Brainquest,
    });
    await fantasy.save();
    res.status(201).json(fantasy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllFantasy = async (req, res) => {
  try {
    const fantasy = await Fantasy.find();
    res.status(200).json(fantasy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFantasyById = async (req, res) => {
  try {
    // console.log(req.params.id);
    const fantasy = await Fantasy.findById(req.params.id);
    if (!fantasy) {
      return res.status(404).json({ message: "Fantasy not found" });
    }

    res.status(200).json(fantasy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateFantasy = async (req, res) => {
  try {
    const fantasy = await Fantasy.findByIdAndUpdate(req.params.id, req.body);
    await fantasy.save();
    // console.log(fantasy);
    res.status(200).json(fantasy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteFantasy = async (req, res) => {
  try {
    await Fantasy.findByIdAndDelete(req.params.id);
    res.status(201).json({
      success: true,
      message: "The requested Fantasy is Deleted Successfully ",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.fetchCompletedFantasy = async (req, res) => {
  try {
    const completedScienceFiction = await Fantasy.find({ Status: "Completed" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res
        .status(404)
        .json({ message: "No completed science fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchInProgressFantasy = async (req, res) => {
  try {
    const completedScienceFiction = await Fantasy.find({
      Status: "In Progress",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  In Progress fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchNewFantasy = async (req, res) => {
  try {
    const completedScienceFiction = await Fantasy.find({ Status: "New" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  New fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// -------------------------------------------------------------------------- Historyfiction ------------------------

exports.createHistoryfiction = async (req, res) => {
  try {
    const { Storyadvenure, Wordexplore, Brainquest, Title, Image, Status } =
      req.body;
    const historyfiction = new Historyfiction({
      Title,
      Image,
      Status,
      Storyadvenure,
      Wordexplore,
      Brainquest,
    });
    await historyfiction.save();
    res.status(201).json(historyfiction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllHistoryfiction = async (req, res) => {
  try {
    const historyfiction = await Historyfiction.find();
    res.status(200).json(historyfiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistoryfictionById = async (req, res) => {
  try {
    const historyfiction = await Historyfiction.findById(req.params.id);

    if (!historyfiction) {
      return res.status(404).json({ message: "Fantasy not found" });
    }

    res.status(200).json(historyfiction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateHistoryfiction = async (req, res) => {
  try {
    const historyfiction = await Historyfiction.findByIdAndUpdate(
      req.params.id,
      req.body
    );
    await historyfiction.save();
    res.status(200).json(historyfiction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteHistoryfiction = async (req, res) => {
  try {
    await Historyfiction.findByIdAndDelete(req.params.id);
    res.status(204).json();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.fetchCompletedHistoryfiction = async (req, res) => {
  try {
    const completedScienceFiction = await Historyfiction.find({
      Status: "Completed",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res
        .status(404)
        .json({ message: "No completed science fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchInProgressHistoryfiction = async (req, res) => {
  try {
    const completedScienceFiction = await Historyfiction.find({
      Status: "In Progress",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  In Progress fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchNewHistoryfiction = async (req, res) => {
  try {
    const completedScienceFiction = await Historyfiction.find({
      Status: "New",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  New fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ----------------------------------------------------------------------------------  Sciencefiction ---------------

exports.createSciencefiction = async (req, res) => {
  try {
    const sciencefiction = new Sciencefiction(req.body);

    // Handle multiple image upload for Storyadvenure
    if (req.files && req.files["Storyadvenure.Storyimage"]) {
      sciencefiction.Storyadvenure[0].Storyimage = req.files[
        "Storyadvenure.Storyimage"
      ].map((file) => file.filename);
    }

    if (req.files && req.files["Image"]) {
      sciencefiction.Image = req.files["Image"].map((file) => file.filename);
    }

    // Handle multiple image upload for Wordexplore
    if (req.files && req.files["Wordexplore.Storyimage"]) {
      sciencefiction.Wordexplore[0].Storyimage = req.files[
        "Wordexplore.Storyimage"
      ].map((file) => file.filename);
    }

    await sciencefiction.save();
    res.status(201).json(sciencefiction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllSciencefiction = async (req, res) => {
  try {
    const sciencefiction = await Sciencefiction.find();
    res.status(200).json(sciencefiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSciencefictionById = async (req, res) => {
  try {
    const sciencefiction = await Sciencefiction.findById(req.params.id);

    if (!sciencefiction) {
      return res.status(404).json({ message: "Fantasy not found" });
    }

    res.status(200).json(sciencefiction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSciencefiction = async (req, res) => {
  try {
    const sciencefiction = await Sciencefiction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // Handle multiple image upload for Storyadvenure
    if (req.files && req.files["Image"]) {
      sciencefiction.Image = req.files["Image"].map((file) => file.filename);
    }

    // Handle multiple image upload for Storyadvenure
    if (req.files && req.files["Storyadvenure.Storyimage"]) {
      sciencefiction.Storyadvenure[0].Storyimage = req.files[
        "Storyadvenure.Storyimage"
      ].map((file) => file.filename);
    }

    // Handle multiple image upload for Wordexplore
    if (req.files && req.files["Wordexplore.Storyimage"]) {
      sciencefiction.Wordexplore.forEach((val, index) => {
        val.Storyimage = req.files["Wordexplore.Storyimage"]
          .map((file, i) => {
            if (i === index) {
              // console.log(i);
              // console.log(file.filename);
              return file.filename;
            }
            return null;
          })
          .filter((filename) => filename !== null);
        val.Storyimage = val.Storyimage.join(""); // Concatenate filenames into a single string
      });
    }

    await sciencefiction.save();
    res.status(200).json(sciencefiction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteSciencefiction = async (req, res) => {
  try {
    await Sciencefiction.findByIdAndDelete(req.params.id);
    res.status(204).json();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.fetchCompletedSciencefiction = async (req, res) => {
  try {
    const completedScienceFiction = await Sciencefiction.find({
      Status: "Completed",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res
        .status(404)
        .json({ message: "No completed science fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchInProgressSciencefiction = async (req, res) => {
  try {
    const completedScienceFiction = await Sciencefiction.find({
      Status: "In Progress",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  In Progress fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchNewSciencefiction = async (req, res) => {
  try {
    const completedScienceFiction = await Sciencefiction.find({
      Status: "New",
    });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  New fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  ---------------------------------------------------------------------------------- Sportification -----------------

exports.createSportfiction = async (req, res) => {
  try {
    const sport = new Sport(req.body);

    // Handle multiple image upload for Storyadvenure
    if (req.files && req.files["Storyadvenure.Storyimage"]) {
      sport.Storyadvenure[0].Storyimage = req.files[
        "Storyadvenure.Storyimage"
      ].map((file) => file.filename);
    }

    // Handle multiple image upload for Wordexplore
    if (req.files && req.files["Wordexplore.StoryImage"]) {
      sport.Wordexplore[0].StoryImage = req.files["Wordexplore.StoryImage"].map(
        (file) => file.filename
      );
    }

    await sport.save();
    res.status(201).json(sport);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllSportfiction = async (req, res) => {
  try {
    const sport = await Sport.find();
    res.status(200).json(sport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSportfictionById = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);

    if (!sport) {
      return res.status(404).json({ message: "Fantasy not found" });
    }

    res.status(200).json(sport);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSportfiction = async (req, res) => {
  try {
    const sport = await Sport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    // Handle multiple image upload for Storyadvenure
    if (req.files && req.files["Storyadvenure.Storyimage"]) {
      sport.Storyadvenure[0].Storyimage = req.files[
        "Storyadvenure.Storyimage"
      ].map((file) => file.filename);
    }

    // Handle multiple image upload for Wordexplore
    if (req.files && req.files["Wordexplore.StoryImage"]) {
      sport.Wordexplore[0].StoryImage = req.files["Wordexplore.StoryImage"].map(
        (file) => file.filename
      );
    }

    await sport.save();
    res.status(200).json(sport);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteSportfiction = async (req, res) => {
  try {
    await Sport.findByIdAndDelete(req.params.id);
    res.status(204).json();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.fetchCompletedSportfiction = async (req, res) => {
  try {
    const completedScienceFiction = await Sport.find({ Status: "Completed" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res
        .status(404)
        .json({ message: "No completed science fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchInProgressSportfiction = async (req, res) => {
  try {
    const completedScienceFiction = await Sport.find({ Status: "In Progress" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  In Progress fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchNewSportfiction = async (req, res) => {
  try {
    const completedScienceFiction = await Sport.find({ Status: "New" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  New fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// -----------------------------------------------------------------------  Mystery  ----------

exports.createMystery = async (req, res) => {
  try {
    const mystery = new Mystery(req.body);
    await mystery.save();
    res.status(201).json(mystery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllMystery = async (req, res) => {
  try {
    const mystery = await Mystery.find();
    res.status(200).json(mystery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMysteryById = async (req, res) => {
  try {
    const mystery = await Mystery.findById(req.params.id);

    if (!mystery) {
      return res.status(404).json({ message: "Fantasy not found" });
    }

    res.status(200).json(mystery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateMystery = async (req, res) => {
  try {
    const mystery = await Mystery.findByIdAndUpdate(req.params.id, req.body);
    await mystery.save();
    res.status(200).json(mystery);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteMystery = async (req, res) => {
  try {
    await Mystery.findByIdAndDelete(req.params.id);
    res.status(204).json();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.fetchCompletedMystery = async (req, res) => {
  try {
    const completedScienceFiction = await Mystery.find({ Status: "Completed" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res
        .status(404)
        .json({ message: "No completed science fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchInProgressMystery = async (req, res) => {
  try {
    const completedScienceFiction = await Mystery.find({
      Status: "In Progress",
    });
    // console.log(completedScienceFiction);
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  In Progress fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fetchNewMystery = async (req, res) => {
  try {
    const completedScienceFiction = await Mystery.find({ Status: "New" });
    if (!completedScienceFiction || completedScienceFiction.length === 0) {
      return res.status(404).json({ message: "No  New fiction found" });
    }
    res.status(200).json(completedScienceFiction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ------------------------------------------------------------------------------------------  Daily Quiz Controllers -------------------------------------

exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getQuestionByStudentIdAndQuestionId = async (req, res) => {
  try {
    const { StudentId, QuestionsId } = req.query;

    if (!StudentId || !QuestionsId) {
      return res
        .status(400)
        .json({ error: "Both StudentId and QuestionsId are required." });
    }

    // Find the question based on StudentId and QuestionsId
    const question = await Question.findOne({ StudentId, QuestionsId });

    if (question) {
      res.status(200).json(question); // Return found question
    } else {
      res.status(404).json({ error: "Question not found." }); // Return error if question not found
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateQuestionByStudentIdAndQuestionId = async (req, res) => {
  try {
    const {
      StudentId,
      QuestionsId,
      question,
      options,
      answer,
      submitedanswer,
      tag,
      difficultyLevel,
    } = req.body;

    // Check if both StudentId and QuestionsId are provided
    if (!StudentId || !QuestionsId) {
      return res
        .status(400)
        .json({ error: "Both StudentId and QuestionsId are required." });
    }

    // Find the existing question
    const existingQuestion = await Question.findOne({ StudentId, QuestionsId });

    if (!existingQuestion) {
      return res.status(404).json({ error: "Question not found." });
    }

    // Update the existing question
    existingQuestion.question = question || existingQuestion.question;
    existingQuestion.options = options || existingQuestion.options;
    existingQuestion.answer = answer || existingQuestion.answer;
    existingQuestion.submitedanswer =
      submitedanswer || existingQuestion.submitedanswer;
    existingQuestion.tag = tag || existingQuestion.tag;
    existingQuestion.difficultyLevel =
      difficultyLevel || existingQuestion.difficultyLevel;

    // Save the updated question
    const updatedQuestion = await existingQuestion.save();
    res.status(200).json(updatedQuestion); // Return updated question
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }
    res
      .status(201)
      .json({ message: "Question deleted successfully", deletedQuestion });
  } catch (error) {
    res.status(500).json({ error });
  }
};

exports.FetchAllUsers = catchAsyncErrors(async (req, res) => {
  try {
    const allUsers = await Student.find();
    res.status(200).json(allUsers);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------------------------------------------

exports.Get_Weekly_Performance_of_Student = catchAsyncErrors(
  async (req, res) => {
    try {
      const studentId = req.params.id;
      const weeklyQuiz = await Weeklyperformance.findOne({
        StudentId: studentId,
      });

      res.status(200).json({ success: true, weeklyQuiz });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

exports.Get_Weekly_Performance_of_Student_All = catchAsyncErrors(
  async (req, res) => {
    try {
      const studentId = req.params.id;
      const weeklyQuiz = await Weeklyperformance.find({
        StudentId: studentId,
      });
      res.status(200).json({ success: true, weeklyQuiz });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ------------------------------------------------------------------ Progress ----------

exports.createQuestion = async (req, res) => {
  try {
    const {
      StudentId,
      QuestionsId,
      question,
      options,
      answer,
      submitedanswer,
      tag,
      difficultyLevel,
      pathname,
      StoryTitle,
    } = req.body;

    let previouslyWrong;
    if (submitedanswer === answer) {
      previouslyWrong = false;
    } else {
      previouslyWrong = true;
    }
    // console.log(previouslyWrong);
    // Check if the question already exists for the given StudentId and QuestionsId
    const existingQuestion = await Question.findOne({ StudentId, QuestionsId });
    const existingProgress = await Progress.findOne({
      StudentId,
      QuestionsId,
    });

    const CurrentCopy_Data = await CopyData.findOne({
      Student_ID: StudentId,
      pathname: pathname,
    });

    // console.log(existingProgress);
    if (existingQuestion && existingProgress) {
      const UpdatedQuestion = await Question.findByIdAndUpdate(
        existingQuestion._id,
        {
          StudentId,
          QuestionsId,
          question,
          options,
          answer,
          submitedanswer,
          tag,
          difficultyLevel,
          previouslyWrong,
          ProgressRef: existingProgress._id,
        }
      );
      const savedQuestion = await UpdatedQuestion.save();
      await CurrentCopy_Data.Data.forEach((val) => {
        if (val.Title === StoryTitle) {
          val.Brainquest.forEach((data) => {
            data.Question_id.push(savedQuestion._id);
          });
        }
      });
      await CurrentCopy_Data.save();
      res.status(201).json(savedQuestion); // Return newly created question
    } else {
      const newQuestion = new Question({
        StudentId,
        QuestionsId,
        question,
        options,
        answer,
        submitedanswer,
        tag,
        difficultyLevel,
        previouslyWrong,
        ProgressRef: existingProgress._id,
      });
      const savedQuestion = await newQuestion.save();
      await CurrentCopy_Data.Data.forEach((val) => {
        if (val.Title === StoryTitle) {
          val.Brainquest.forEach((data) => {
            data.Question_id.push(savedQuestion._id);
          });
        }
      });
      await CurrentCopy_Data.save();
      // console.log(CurrentCopy_Data);
      res.status(201).json(savedQuestion); // Return newly created question
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.CreateProgress = async (req, res) => {
  try {
    const {
      StudentId,
      QuestionsId,
      nextReviewDate,
      lastRevieweDate,
      submitedanswer,
      answer,
    } = req.body;
    var nextDay;
    var Submiteddate;
    // console.log(submitedanswer, answer);

    if (answer === submitedanswer) {
      Submiteddate = new Date(); // Correcting the assignment
      nextDay = new Date(Submiteddate);
      nextDay.setDate(Submiteddate.getDate() + 3);
      var repetitionInterval = req.body.repetitionInterval + 2;
      var repetitionLevel = req.body.repetitionLevel + 1;
    } else {
      Submiteddate = new Date();
      nextDay = new Date(Submiteddate);
      nextDay.setDate(Submiteddate.getDate() + 1);
      var repetitionInterval = req.body.repetitionInterval;
      var repetitionLevel = req.body.repetitionLevel;
    }

    // Check if the question already exists for the given StudentId and QuestionsId
    const existingProgress = await Progress.findOne({ StudentId, QuestionsId });

    if (existingProgress) {
      // Update the existing question
      existingProgress.repetitionLevel = repetitionLevel;
      existingProgress.repetitionInterval = repetitionInterval;
      existingProgress.nextReviewDate = nextDay;
      existingProgress.lastRevieweDate = Submiteddate;

      const updatedProgress = await existingProgress.save();
      res.status(200).json(updatedProgress); // Return updated question
    } else {
      // Create a new question
      const newProgress = new Progress({
        StudentId,
        QuestionsId,
        repetitionLevel,
        repetitionInterval,
        nextReviewDate: nextDay,
        lastRevieweDate,
      });

      const savedProgress = await newProgress.save();
      res.status(201).json(savedProgress); // Return newly created question
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.Get_Daily_Quiz_Questions = catchAsyncErrors(async (req, res) => {
  try {
    const StudentID = req.params.Student_id;
    const All_Student_Question = await Question.find({
      StudentId: StudentID,
    }).populate("ProgressRef");

    const currentdate = new Date();
    const currentdateLeftPart = `${currentdate.getFullYear()}-${
      currentdate.getMonth() + 1
    }-${currentdate.getDate()}`;

    const Data = All_Student_Question.filter((Question) => {
      // console.log(Question)
      const nextReviewDate = Question.ProgressRef.nextReviewDate;
      const nextReviewDateLeftPart = `${nextReviewDate.getFullYear()}-${
        nextReviewDate.getMonth() + 1
      }-${nextReviewDate.getDate()}`;
      return currentdateLeftPart === nextReviewDateLeftPart;
    });

    const WorngQuestions = Data.filter((Question) => {
      return Question.submitedanswer !== Question.answer;
    });

    const CorrectQuestions = Data.filter((Question) => {
      return Question.submitedanswer === Question.answer;
    });

    let QuizQuestions = [...WorngQuestions, ...CorrectQuestions];
    // console.log(QuizQuestions)
    // Select only the first 10 questions
    const RemainingQuestions = QuizQuestions.slice(10);
    QuizQuestions = QuizQuestions.slice(0, 10);
    // Sort the array based on the lastRevieweDate
    QuizQuestions.sort(
      (a, b) =>
        new Date(a.ProgressRef.lastRevieweDate) -
        new Date(b.ProgressRef.lastRevieweDate)
    );
    // console.log(QuizQuestions);

    for (const question of RemainingQuestions) {
      const Student_Question = await Question.findById(question._id).populate(
        "ProgressRef"
      );
      // console.log(Student_Question);
      const NewnextReviewDate = new Date(
        Student_Question.ProgressRef.nextReviewDate
      );
      NewnextReviewDate.setDate(NewnextReviewDate.getDate() + 1);
      const ProgressQuestion = await Progress.findByIdAndUpdate(
        Student_Question.ProgressRef._id,
        { nextReviewDate: NewnextReviewDate }
      );
      // console.log(ProgressQuestion);
    }

    res.status(200).json({ success: true, data: QuizQuestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.Update_Questions = catchAsyncErrors(async (req, res) => {
  try {
    // console.log(req.body);
    let QuestionID = req.body.Question_id;
    let Submitted_Answer = req.body.Submitted_Answer;

    const CurrentQuestion = await Question.findById(QuestionID);
    let previouslyWrong;
    if (CurrentQuestion.submitedanswer === CurrentQuestion.answer) {
      previouslyWrong = false;
    } else {
      previouslyWrong = true;
    }

    const UpdatedQuestion = await Question.findByIdAndUpdate(QuestionID, {
      submitedanswer: Submitted_Answer,
      previouslyWrong: previouslyWrong,
    });
    // console.log(UpdatedQuestion)
    res.status(201).json({ UpdatedQuestion });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

exports.Fetch_WeeklyPerformace_Data = catchAsyncErrors(async (req, res) => {
  try {
    const {
      StudentId,
      QuestionsCorrectCount,
      QuestionsWrongCount,
      TotalquestionsattemptedCount,
    } = req.body.formData;

    const TodayDate = new Date().toISOString().slice(0, 10);
    const All_Week_Data = await Weeklyperformance.find({
      StudentId: StudentId,
    });

    let foundMatch = false;

    if (All_Week_Data.length > 0) {
      for (const WeeklyPerformance of All_Week_Data) {
        let WeeklyPerformancesStartingDate = WeeklyPerformance.weekstartingdate;
        let WeeklyPerformancesEndingDate = WeeklyPerformance.Weekendingdate;
        let AllDates_Between_StartandEnd = [];
        let currentDate = new Date(WeeklyPerformancesStartingDate);

        // Loop through each date until we reach the ending date
        while (currentDate <= WeeklyPerformancesEndingDate) {
          AllDates_Between_StartandEnd.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        await Promise.all(
          AllDates_Between_StartandEnd.map(async (value) => {
            let formattedValue = value.toISOString().slice(0, 10);
            if (formattedValue === TodayDate) {
              foundMatch = true;
              WeeklyPerformance.QuestionsCorrectCount += QuestionsCorrectCount;
              WeeklyPerformance.QuestionsWrongCount += QuestionsWrongCount;
              WeeklyPerformance.TotalquestionsattemptedCount +=
                TotalquestionsattemptedCount;
              await WeeklyPerformance.save();
              res.status(201).json(WeeklyPerformance);
            }
          })
        );
      }
      // console.log(foundMatch);
      if (!foundMatch) {
        const weekly_Performance = new Weeklyperformance({
          StudentId,
          QuestionsCorrectCount,
          QuestionsWrongCount,
          TotalquestionsattemptedCount,
        });
        const savedPerformance = await weekly_Performance.save();
        res.status(201).json(savedPerformance);
      }
    } else {
      const weeklyPerformance = new Weeklyperformance({
        StudentId,
        QuestionsCorrectCount,
        QuestionsWrongCount,
        TotalquestionsattemptedCount,
      });
      const savedPerformance = await weeklyPerformance.save();
      res.status(201).json(savedPerformance);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

exports.Fetch_LeaderBoardData_For_Current_Weeked = catchAsyncErrors(
  async (req, res) => {
    try {
      // const Student_ID = req.params.StudentID;
      const TodayDate = new Date().toISOString().slice(0, 10);
      const All_Week_Data = await Weeklyperformance.find().populate(
        "StudentId"
      );
      let foundData = [];

      if (All_Week_Data.length > 0) {
        for (const AllWeeklyPerformance of All_Week_Data) {
          let WeeklyPerformancesStartingDate =
            AllWeeklyPerformance.weekstartingdate;
          let WeeklyPerformancesEndingDate =
            AllWeeklyPerformance.Weekendingdate;
          let AllDates_Between_StartandEnd = [];
          let currentDate = new Date(WeeklyPerformancesStartingDate);
          // Loop through each date until we reach the ending date
          while (currentDate <= WeeklyPerformancesEndingDate) {
            AllDates_Between_StartandEnd.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          await Promise.all(
            AllDates_Between_StartandEnd.map(async (value) => {
              let formattedValue = value.toISOString().slice(0, 10);
              if (formattedValue === TodayDate) {
                foundData.push(AllWeeklyPerformance);
              }
            })
          );
        }
      }

      // console.log(foundData)
      res.status(201).json({ foundData });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  }
);

exports.Fetch_Daily_Quiz_Data = async (req, res) => {
  try {
    console.log(req.body);
    const { CorrectQuestions, WrongQuestions, id } = req.body;
    const TodayDate = new Date().toISOString().slice(0, 10);

    for (const question of CorrectQuestions) {
      const FoundedQuestion = await Question.findById(question._id);
      // Update progress for correct questions
      await updateProgressForCorrectQuestion(FoundedQuestion);
    }

    for (const question of WrongQuestions) {
      const FoundedQuestion = await Question.findById(question._id);
      // Update progress for wrong questions
      await updateProgressForWrongQuestion(FoundedQuestion);
    }

    // Update weekly performance for correct and wrong questions
    await updateWeeklyPerformance(
      CorrectQuestions,
      WrongQuestions,
      id,
      TodayDate
    );

    res.status(200).json({ message: "Data fetched successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

async function updateProgressForCorrectQuestion(FoundedQuestion) {
  const FoundedProgress = await Progress.findById(FoundedQuestion.ProgressRef);
  FoundedProgress.repetitionLevel = Number(FoundedProgress.repetitionLevel) + 1;
  switch (Number(FoundedProgress.repetitionInterval)) {
    case 3:
      FoundedProgress.repetitionInterval *= 2;
      break;
    default:
      if (Number(FoundedProgress.repetitionInterval) > 3) {
        FoundedProgress.repetitionInterval *= 2;
      } else {
        FoundedProgress.repetitionInterval += 2;
      }
      break;
  }
  const Submiteddate = FoundedProgress.nextReviewDate;
  const nextDay = new Date(Submiteddate);
  nextDay.setDate(Submiteddate.getDate() + FoundedProgress.repetitionInterval);
  FoundedProgress.nextReviewDate = nextDay;
  FoundedProgress.lastRevieweDate = new Date(); // Update last review date
  await FoundedProgress.save();
}

async function updateProgressForWrongQuestion(FoundedQuestion) {
  const FoundedProgress = await Progress.findById(FoundedQuestion.ProgressRef);
  switch (Number(FoundedProgress.repetitionInterval)) {
    case 3:
      FoundedProgress.repetitionInterval -= 2;
      break;
    default:
      if (Number(FoundedProgress.repetitionInterval) > 3) {
        FoundedProgress.repetitionInterval /= 2; // Divide by 2
      }
      break;
  }
  if (Number(FoundedProgress.repetitionLevel) > 0) {
    FoundedProgress.repetitionLevel--;
  }
  const Submiteddate = FoundedProgress.nextReviewDate;
  const nextDay = new Date(Submiteddate);
  nextDay.setDate(Submiteddate.getDate() + 1);
  FoundedProgress.nextReviewDate = nextDay;
  FoundedProgress.lastRevieweDate = new Date(); // Update last review date
  await FoundedProgress.save();
}

async function updateWeeklyPerformance(
  CorrectQuestions,
  WrongQuestions,
  id,
  TodayDate
) {
  const studentWeeklyPerformances = await Weeklyperformance.find({
    StudentId: id,
  });
  // Loop fore the Difffierent Weekly Performances to check on Which Performce Question Reveal.
  for (const WeeklyPerformance of studentWeeklyPerformances) {
    const WeeklyPerformancesStartingDate = new Date(
      WeeklyPerformance.weekstartingdate
    );
    const WeeklyPerformancesEndingDate = new Date(
      WeeklyPerformance.Weekendingdate
    );
    // Make Condition For All the Dates between the Start and End of the week.
    const AllDates_Between_StartandEnd = [];
    let currentDate = new Date(WeeklyPerformancesStartingDate);
    // Loop through each date until we reach the ending date.
    while (currentDate <= WeeklyPerformancesEndingDate) {
      AllDates_Between_StartandEnd.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    for (const date of AllDates_Between_StartandEnd) {
      const formattedValue = date.toISOString().slice(0, 10);
      if (formattedValue === TodayDate) {
        const All_Questions = await Question.find({ StudentId: id }).populate(
          "ProgressRef"
        );
        for (const question of All_Questions) {
          // console.log(question);
          // console.log(question.previouslyWrong);
          if (question.submitedanswer === question.answer) {
            if (!question.previouslyWrong) {
              WeeklyPerformance.QuestionsCorrectCount++;
              WeeklyPerformance.QuestionsCorrectCount--;
            } else {
              WeeklyPerformance.QuestionsWrongCount--;
              WeeklyPerformance.QuestionsCorrectCount++;
            }
          } else {
            if (question.previouslyWrong) {
              WeeklyPerformance.QuestionsWrongCount--;
              WeeklyPerformance.QuestionsWrongCount++;
            } else {
              WeeklyPerformance.QuestionsCorrectCount--;
              WeeklyPerformance.QuestionsWrongCount++;
            }
          }
        }
        await WeeklyPerformance.save();
        break; // No need to continue after updating for today's date
      }
    }
  }
}

const lock = {};
exports.Create_whole_copy = async (req, res) => {
  try {
    const { Student_ID, pathname, Data } = req.body;
    // Check if data already exists
    let foundedData = await CopyData.findOne({
      Student_ID: Student_ID,
      pathname: pathname,
    });

    if (!foundedData) {
      // Acquire lock before creating data
      console.log(lock);
      if (!lock[`${Student_ID}-${pathname}`]) {
        lock[`${Student_ID}-${pathname}`] = true; // Set lock
        // Create new data if lock is acquired
        const newCopyData = new CopyData({
          Student_ID,
          Data,
          pathname,
        });
        await newCopyData.save();

        foundedData = newCopyData;
        console.log("Created Data: -----------");
        delete lock[`${Student_ID}-${pathname}`]; // Release lock after creation
        return res.status(201).json({ foundedData }); // Resource created
      } else {
        // If another request is already creating the data, return 409 Conflict
        console.log("Another request is creating data: ----------- ");
        return res.status(409).json();
      }
    } else {
      console.log("Found Data: ----------- ");
      return res.status(200).json({ foundedData }); // Resource found
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message }); // Internal server error
  }
};

exports.Get_whole_copy = async (req, res) => {
  try {
    // console.log(req.body);
    const { Student_ID, pathname } = req.body;
    const alreadyExits = await CopyData.findOne({
      Student_ID: Student_ID,
      pathname: pathname,
    });
    return res.status(201).json({ alreadyExits });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
};

exports.Update_Drag_Drop_Copy = async (req, res) => {
  try {
    // console.log(req.body);
    const { StoryTitle, Student_ID, WordExplorerID, pathname } = req.body;

    const FoundedCopiedData = await CopyData.findOne({
      Student_ID: Student_ID,
      pathname: pathname,
    });
    // console.log(FoundedCopiedData);

    const TodayDate = new Date();
    console.log(TodayDate);
    const existingCount = await Count.findOne({ Student_ID: Student_ID });

    let matchedWordexplore = [];
    let wordExplorermatchlength = 0;
    let BrainQuestlength = 0;
    await FoundedCopiedData.Data.forEach((val) => {
      if (val.Title === StoryTitle) {
        val.Status = "In Progress";
        val.Wordexplore.forEach((data) => {
          const id = data._id.toString();

          if (id === WordExplorerID) {
            data.isMatched = true;
            matchedWordexplore = val.Wordexplore; // Extract the Wordexplore array after the match
            if (existingCount) {
              existingCount.Count++;
              existingCount.CounttimeStamps.push(TodayDate);
              existingCount.save();
            } else {
              const newCount = new Count({
                Student_ID: Student_ID,
                Count: 1,
                CounttimeStamps: [TodayDate],
              });
              console.log(newCount);
              newCount.save();
            }
          }
          if (data.isMatched === true) {
            wordExplorermatchlength++;
          }
        });
        val.Brainquest.forEach((data) => {
          if (data.isCompleted === true) {
            val.Status = "In Progress";
            BrainQuestlength++;
          }
        });
        if (
          wordExplorermatchlength === val.Wordexplore.length &&
          BrainQuestlength === val.Brainquest.length
        ) {
          val.Status = "Completed";
        }
      }
    });

    await FoundedCopiedData.save();

    // console.log(FoundedCopiedData);
    return res.status(201).json({ matchedWordexplore });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
};

exports.Update_Copy_brainQuest = async (req, res) => {
  try {
    // console.log(req.body)
    const { StoryTitle, Student_ID, isCompleted, pathname, QuestionID } =
      req.body;
    const FoundedCopiedData = await CopyData.findOne({
      Student_ID: Student_ID,
      pathname: pathname,
    });
    // console.log(FoundedCopiedData);

    let matchedBarinQuest = [];

    await FoundedCopiedData.Data.forEach((val) => {
      if (val.Title === StoryTitle) {
        val.Brainquest.forEach((data) => {
          data.isCompleted = true;
          matchedBarinQuest = val.Brainquest;
        });
      }
    });

    //  console.log(matchedBarinQuest);

    await FoundedCopiedData.save();

    let wordExplorermatchlength = 0;
    let BrainQuestlength = 0;
    // console.log(FoundedCopiedData);
    await FoundedCopiedData.Data.forEach((val) => {
      if (val.Title === StoryTitle) {
        val.Status = "In Progress";
        val.Wordexplore.forEach((data) => {
          if (data.isMatched === true) {
            wordExplorermatchlength++;
          }
        });
        val.Brainquest.forEach((data) => {
          if (data.isCompleted === true) {
            BrainQuestlength++;
          }
        });
        if (
          wordExplorermatchlength === val.Wordexplore.length &&
          BrainQuestlength === val.Brainquest.length
        ) {
          val.Status = "Completed";
        }
      }
    });

    //

    await FoundedCopiedData.save();

    res.status(201).json({ matchedBarinQuest });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

exports.Get_Copy_brainQuest = async (req, res) => {
  try {
    // console.log(req.body);
    const { StoryTitle, Student_ID, pathname } = req.body;
    // const FoundedCopiedData = await CopyData.findOne({
    //   Student_ID: Student_ID,
    //   pathname: pathname,
    // }).populate();
    // // console.log(FoundedCopiedData);
    const FoundedCopiedData = await CopyData.findOne({
      Student_ID: Student_ID,
      pathname: pathname,
    }).populate({
      path: "Data.Brainquest.Question_id",
      model: "Question",
    });
    // console.log(FoundedCopiedData);
    let matchedBarinQuest = [];

    await FoundedCopiedData.Data.forEach((val) => {
      if (val.Title === StoryTitle) {
        return val.Brainquest.forEach((data) => {
          // console.log(data);
          if (data.isCompleted === true) {
            matchedBarinQuest = val.Brainquest;
          }
        });
      }
    });

    // console.log(matchedBarinQuest);

    await FoundedCopiedData.save();
    // console.log(FoundedCopiedData);
    res.status(201).json({ matchedBarinQuest });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

exports.Get_Count_Student = catchAsyncErrors(async (req, res, next) => {
  try {
    const Student_ID = req.params.StudentID;
    // console.log(Student_ID);
    const existingCount = await Count.find({ Student_ID });
    console.log(existingCount);
    return res.status(200).json({ existingCount });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

exports.Get_All_Student_list = catchAsyncErrors(async (req, res, next) => {
  try {
    const All_Student_list = await Student.find();
    // console.log(All_Student_list);
    return res.status(200).json({ All_Student_list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
});

exports.SyncAlluser_Data_ScienceData = catchAsyncErrors(
  async (req, res, next) => {
    try {
      const AllFoundedCopyData_Science = await CopyData.find({
        pathname: "/ScienceFictionStories",
      });

      for (const userCopyData of AllFoundedCopyData_Science) {
        for (let i = 0; i < userCopyData.Data.length; i++) {
          const ScienceStory = userCopyData.Data[i];
          const ExistingScienceData = await Sciencefiction.findOne({
            _id: ScienceStory._id,
          });

          if (ExistingScienceData) {
            ScienceStory.Image[0] = ExistingScienceData.Image[0];

            // Sync Wordexplore
            const updatedWordexplore = ScienceStory.Wordexplore.map((word) => {
              const ExistingWord = ExistingScienceData.Wordexplore.find(
                (existingWord) => existingWord._id.equals(word._id)
              );
              if (ExistingWord) {
                word.Storytitle = ExistingWord.Storytitle;
                word.Storyttext = ExistingWord.Storyttext;
                word.Storyimage[0] = ExistingWord.Storyimage[0];
                word.Storyitext = ExistingWord.Storyitext;
                word.Synonyms = ExistingWord.Synonyms;
                word.Antonyms = ExistingWord.Antonyms;
                word.Noun = ExistingWord.Noun;
              }
              return word;
            });

            // Add missing ExistingWord and remove unmatched Wordexplore
            ScienceStory.Wordexplore = [
              ...updatedWordexplore.filter((word) =>
                ExistingScienceData.Wordexplore.some((existingWord) =>
                  existingWord._id.equals(word._id)
                )
              ),
              ...ExistingScienceData.Wordexplore.filter(
                (existingWord) =>
                  !ScienceStory.Wordexplore.some((word) =>
                    word._id.equals(existingWord._id)
                  )
              ),
            ];

            // Sync Brainquest
            const updatedBrainquest = ScienceStory.Brainquest.map(
              (brainquest) => {
                const ExistingBrainquest = ExistingScienceData.Brainquest.find(
                  (existingBrainquest) =>
                    existingBrainquest._id.equals(brainquest._id)
                );
                if (ExistingBrainquest) {
                  brainquest.Question = ExistingBrainquest.Question;
                  brainquest.Option = ExistingBrainquest.Option;
                  brainquest.Answer = ExistingBrainquest.Answer;
                }

                return brainquest;
              }
            );

            // Add missing ExistingBrainquest and remove unmatched Brainquest
            ScienceStory.Brainquest = [
              ...updatedBrainquest.filter((brainquest) =>
                ExistingScienceData.Brainquest.some((existingBrainquest) =>
                  existingBrainquest._id.equals(brainquest._id)
                )
              ),
              ...ExistingScienceData.Brainquest.filter(
                (existingBrainquest) =>
                  !ScienceStory.Brainquest.some((brainquest) =>
                    brainquest._id.equals(existingBrainquest._id)
                  )
              ),
            ];

            // Sync Storyadvenure content
            const updatedContent = ScienceStory.Storyadvenure.content.map(
              (content) => {
                const ExistingContent =
                  ExistingScienceData.Storyadvenure.content.find(
                    (existingContent) => existingContent._id.equals(content._id)
                  );
                if (ExistingContent) {
                  content.Storyimage[0] = ExistingContent.Storyimage[0];
                  content.Paragraph = ExistingContent.Paragraph;
                }
                return content;
              }
            );

            // Add missing ExistingContent and remove unmatched content
            ScienceStory.Storyadvenure.content = [
              ...updatedContent.filter((content) =>
                ExistingScienceData.Storyadvenure.content.some(
                  (existingContent) => existingContent._id.equals(content._id)
                )
              ),
              ...ExistingScienceData.Storyadvenure.content.filter(
                (existingContent) =>
                  !ScienceStory.Storyadvenure.content.some((content) =>
                    content._id.equals(existingContent._id)
                  )
              ),
            ];
          }

          // Save updated data
          await userCopyData.save();
        }

        // Add ExistingScienceData to userCopyData.Data if not present
        const AllExistingScienceData = await Sciencefiction.find();

        AllExistingScienceData.forEach((existingData) => {
          const isExistingScienceDataPresent = userCopyData.Data.some((data) =>
            data._id.equals(existingData._id)
          );

          if (!isExistingScienceDataPresent) {
            userCopyData.Data.push(existingData);
          }
        });

        // Save the final updated data
        await userCopyData.save();

        userCopyData.Data = userCopyData.Data.filter((data) =>
          AllExistingScienceData.some((existingData) =>
            data._id.equals(existingData._id)
          )
        );

        // Save the final updated data
        await userCopyData.save();
      }

      return res
        .status(200)
        .json({ message: "Data synchronized successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

exports.SyncAlluser_Data_FantasyData = catchAsyncErrors(
  async (req, res, next) => {
    try {
      const AllFoundedCopyData_Science = await CopyData.find({
        pathname: "/FantasyStories",
      });

      for (const userCopyData of AllFoundedCopyData_Science) {
        for (let i = 0; i < userCopyData.Data.length; i++) {
          const ScienceStory = userCopyData.Data[i];
          const ExistingScienceData = await Fantasy.findOne({
            _id: ScienceStory._id,
          });

          if (ExistingScienceData) {
            ScienceStory.Image[0] = ExistingScienceData.Image[0];

            // Sync Wordexplore
            const updatedWordexplore = ScienceStory.Wordexplore.map((word) => {
              const ExistingWord = ExistingScienceData.Wordexplore.find(
                (existingWord) => existingWord._id.equals(word._id)
              );
              if (ExistingWord) {
                word.Storytitle = ExistingWord.Storytitle;
                word.Storyttext = ExistingWord.Storyttext;
                word.Storyimage[0] = ExistingWord.Storyimage[0];
                word.Storyitext = ExistingWord.Storyitext;
                word.Synonyms = ExistingWord.Synonyms;
                word.Antonyms = ExistingWord.Antonyms;
                word.Noun = ExistingWord.Noun;
              }
              return word;
            });

            // Add missing ExistingWord and remove unmatched Wordexplore
            ScienceStory.Wordexplore = [
              ...updatedWordexplore.filter((word) =>
                ExistingScienceData.Wordexplore.some((existingWord) =>
                  existingWord._id.equals(word._id)
                )
              ),
              ...ExistingScienceData.Wordexplore.filter(
                (existingWord) =>
                  !ScienceStory.Wordexplore.some((word) =>
                    word._id.equals(existingWord._id)
                  )
              ),
            ];

            // Sync Brainquest
            const updatedBrainquest = ScienceStory.Brainquest.map(
              (brainquest) => {
                const ExistingBrainquest = ExistingScienceData.Brainquest.find(
                  (existingBrainquest) =>
                    existingBrainquest._id.equals(brainquest._id)
                );
                if (ExistingBrainquest) {
                  brainquest.Question = ExistingBrainquest.Question;
                  brainquest.Option = ExistingBrainquest.Option;
                  brainquest.Answer = ExistingBrainquest.Answer;
                }

                return brainquest;
              }
            );

            // Add missing ExistingBrainquest and remove unmatched Brainquest
            ScienceStory.Brainquest = [
              ...updatedBrainquest.filter((brainquest) =>
                ExistingScienceData.Brainquest.some((existingBrainquest) =>
                  existingBrainquest._id.equals(brainquest._id)
                )
              ),
              ...ExistingScienceData.Brainquest.filter(
                (existingBrainquest) =>
                  !ScienceStory.Brainquest.some((brainquest) =>
                    brainquest._id.equals(existingBrainquest._id)
                  )
              ),
            ];

            // Sync Storyadvenure content
            const updatedContent = ScienceStory.Storyadvenure.content.map(
              (content) => {
                const ExistingContent =
                  ExistingScienceData.Storyadvenure.content.find(
                    (existingContent) => existingContent._id.equals(content._id)
                  );
                if (ExistingContent) {
                  content.Storyimage[0] = ExistingContent.Storyimage[0];
                  content.Paragraph = ExistingContent.Paragraph;
                }
                return content;
              }
            );

            // Add missing ExistingContent and remove unmatched content
            ScienceStory.Storyadvenure.content = [
              ...updatedContent.filter((content) =>
                ExistingScienceData.Storyadvenure.content.some(
                  (existingContent) => existingContent._id.equals(content._id)
                )
              ),
              ...ExistingScienceData.Storyadvenure.content.filter(
                (existingContent) =>
                  !ScienceStory.Storyadvenure.content.some((content) =>
                    content._id.equals(existingContent._id)
                  )
              ),
            ];
          }

          // Save updated data
          await userCopyData.save();
        }

        // Add ExistingScienceData to userCopyData.Data if not present
        const AllExistingScienceData = await Fantasy.find();

        AllExistingScienceData.forEach((existingData) => {
          const isExistingScienceDataPresent = userCopyData.Data.some((data) =>
            data._id.equals(existingData._id)
          );

          if (!isExistingScienceDataPresent) {
            userCopyData.Data.push(existingData);
          }
        });

        // Save the final updated data
        await userCopyData.save();

        userCopyData.Data = userCopyData.Data.filter((data) =>
          AllExistingScienceData.some((existingData) =>
            data._id.equals(existingData._id)
          )
        );

        // Save the final updated data
        await userCopyData.save();
      }

      return res
        .status(200)
        .json({ message: "Data synchronized successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

exports.SyncAlluser_Data_MysteryData = catchAsyncErrors(
  async (req, res, next) => {
    try {
      const AllFoundedCopyData_Science = await CopyData.find({
        pathname: "/MysteryStories",
      });

      for (const userCopyData of AllFoundedCopyData_Science) {
        for (let i = 0; i < userCopyData.Data.length; i++) {
          const ScienceStory = userCopyData.Data[i];
          const ExistingScienceData = await Mystery.findOne({
            _id: ScienceStory._id,
          });

          if (ExistingScienceData) {
            ScienceStory.Image[0] = ExistingScienceData.Image[0];

            // Sync Wordexplore
            const updatedWordexplore = ScienceStory.Wordexplore.map((word) => {
              const ExistingWord = ExistingScienceData.Wordexplore.find(
                (existingWord) => existingWord._id.equals(word._id)
              );
              if (ExistingWord) {
                word.Storytitle = ExistingWord.Storytitle;
                word.Storyttext = ExistingWord.Storyttext;
                word.Storyimage[0] = ExistingWord.Storyimage[0];
                word.Storyitext = ExistingWord.Storyitext;
                word.Synonyms = ExistingWord.Synonyms;
                word.Antonyms = ExistingWord.Antonyms;
                word.Noun = ExistingWord.Noun;
              }
              return word;
            });

            // Add missing ExistingWord and remove unmatched Wordexplore
            ScienceStory.Wordexplore = [
              ...updatedWordexplore.filter((word) =>
                ExistingScienceData.Wordexplore.some((existingWord) =>
                  existingWord._id.equals(word._id)
                )
              ),
              ...ExistingScienceData.Wordexplore.filter(
                (existingWord) =>
                  !ScienceStory.Wordexplore.some((word) =>
                    word._id.equals(existingWord._id)
                  )
              ),
            ];

            // Sync Brainquest
            const updatedBrainquest = ScienceStory.Brainquest.map(
              (brainquest) => {
                const ExistingBrainquest = ExistingScienceData.Brainquest.find(
                  (existingBrainquest) =>
                    existingBrainquest._id.equals(brainquest._id)
                );
                if (ExistingBrainquest) {
                  brainquest.Question = ExistingBrainquest.Question;
                  brainquest.Option = ExistingBrainquest.Option;
                  brainquest.Answer = ExistingBrainquest.Answer;
                }

                return brainquest;
              }
            );

            // Add missing ExistingBrainquest and remove unmatched Brainquest
            ScienceStory.Brainquest = [
              ...updatedBrainquest.filter((brainquest) =>
                ExistingScienceData.Brainquest.some((existingBrainquest) =>
                  existingBrainquest._id.equals(brainquest._id)
                )
              ),
              ...ExistingScienceData.Brainquest.filter(
                (existingBrainquest) =>
                  !ScienceStory.Brainquest.some((brainquest) =>
                    brainquest._id.equals(existingBrainquest._id)
                  )
              ),
            ];

            // Sync Storyadvenure content
            const updatedContent = ScienceStory.Storyadvenure.content.map(
              (content) => {
                const ExistingContent =
                  ExistingScienceData.Storyadvenure.content.find(
                    (existingContent) => existingContent._id.equals(content._id)
                  );
                if (ExistingContent) {
                  content.Storyimage[0] = ExistingContent.Storyimage[0];
                  content.Paragraph = ExistingContent.Paragraph;
                }
                return content;
              }
            );

            // Add missing ExistingContent and remove unmatched content
            ScienceStory.Storyadvenure.content = [
              ...updatedContent.filter((content) =>
                ExistingScienceData.Storyadvenure.content.some(
                  (existingContent) => existingContent._id.equals(content._id)
                )
              ),
              ...ExistingScienceData.Storyadvenure.content.filter(
                (existingContent) =>
                  !ScienceStory.Storyadvenure.content.some((content) =>
                    content._id.equals(existingContent._id)
                  )
              ),
            ];
          }

          // Save updated data
          await userCopyData.save();
        }

        // Add ExistingScienceData to userCopyData.Data if not present
        const AllExistingScienceData = await Mystery.find();

        AllExistingScienceData.forEach((existingData) => {
          const isExistingScienceDataPresent = userCopyData.Data.some((data) =>
            data._id.equals(existingData._id)
          );

          if (!isExistingScienceDataPresent) {
            userCopyData.Data.push(existingData);
          }
        });

        // Save the final updated data
        await userCopyData.save();

        userCopyData.Data = userCopyData.Data.filter((data) =>
          AllExistingScienceData.some((existingData) =>
            data._id.equals(existingData._id)
          )
        );

        // Save the final updated data
        await userCopyData.save();
      }

      return res
        .status(200)
        .json({ message: "Data synchronized successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

exports.SyncAlluser_Data_HistoryData = catchAsyncErrors(
  async (req, res, next) => {
    try {
      const AllFoundedCopyData_Science = await CopyData.find({
        pathname: "/HistoryStories",
      });

      for (const userCopyData of AllFoundedCopyData_Science) {
        for (let i = 0; i < userCopyData.Data.length; i++) {
          const ScienceStory = userCopyData.Data[i];
          const ExistingScienceData = await Historyfiction.findOne({
            _id: ScienceStory._id,
          });

          if (ExistingScienceData) {
            ScienceStory.Image[0] = ExistingScienceData.Image[0];

            // Sync Wordexplore
            const updatedWordexplore = ScienceStory.Wordexplore.map((word) => {
              const ExistingWord = ExistingScienceData.Wordexplore.find(
                (existingWord) => existingWord._id.equals(word._id)
              );
              if (ExistingWord) {
                word.Storytitle = ExistingWord.Storytitle;
                word.Storyttext = ExistingWord.Storyttext;
                word.Storyimage[0] = ExistingWord.Storyimage[0];
                word.Storyitext = ExistingWord.Storyitext;
                word.Synonyms = ExistingWord.Synonyms;
                word.Antonyms = ExistingWord.Antonyms;
                word.Noun = ExistingWord.Noun;
              }
              return word;
            });

            // Add missing ExistingWord and remove unmatched Wordexplore
            ScienceStory.Wordexplore = [
              ...updatedWordexplore.filter((word) =>
                ExistingScienceData.Wordexplore.some((existingWord) =>
                  existingWord._id.equals(word._id)
                )
              ),
              ...ExistingScienceData.Wordexplore.filter(
                (existingWord) =>
                  !ScienceStory.Wordexplore.some((word) =>
                    word._id.equals(existingWord._id)
                  )
              ),
            ];

            // Sync Brainquest
            const updatedBrainquest = ScienceStory.Brainquest.map(
              (brainquest) => {
                const ExistingBrainquest = ExistingScienceData.Brainquest.find(
                  (existingBrainquest) =>
                    existingBrainquest._id.equals(brainquest._id)
                );
                if (ExistingBrainquest) {
                  brainquest.Question = ExistingBrainquest.Question;
                  brainquest.Option = ExistingBrainquest.Option;
                  brainquest.Answer = ExistingBrainquest.Answer;
                }

                return brainquest;
              }
            );

            // Add missing ExistingBrainquest and remove unmatched Brainquest
            ScienceStory.Brainquest = [
              ...updatedBrainquest.filter((brainquest) =>
                ExistingScienceData.Brainquest.some((existingBrainquest) =>
                  existingBrainquest._id.equals(brainquest._id)
                )
              ),
              ...ExistingScienceData.Brainquest.filter(
                (existingBrainquest) =>
                  !ScienceStory.Brainquest.some((brainquest) =>
                    brainquest._id.equals(existingBrainquest._id)
                  )
              ),
            ];

            // Sync Storyadvenure content
            const updatedContent = ScienceStory.Storyadvenure.content.map(
              (content) => {
                const ExistingContent =
                  ExistingScienceData.Storyadvenure.content.find(
                    (existingContent) => existingContent._id.equals(content._id)
                  );
                if (ExistingContent) {
                  content.Storyimage[0] = ExistingContent.Storyimage[0];
                  content.Paragraph = ExistingContent.Paragraph;
                }
                return content;
              }
            );

            // Add missing ExistingContent and remove unmatched content
            ScienceStory.Storyadvenure.content = [
              ...updatedContent.filter((content) =>
                ExistingScienceData.Storyadvenure.content.some(
                  (existingContent) => existingContent._id.equals(content._id)
                )
              ),
              ...ExistingScienceData.Storyadvenure.content.filter(
                (existingContent) =>
                  !ScienceStory.Storyadvenure.content.some((content) =>
                    content._id.equals(existingContent._id)
                  )
              ),
            ];
          }

          // Save updated data
          await userCopyData.save();
        }

        // Add ExistingScienceData to userCopyData.Data if not present
        const AllExistingScienceData = await Historyfiction.find();

        AllExistingScienceData.forEach((existingData) => {
          const isExistingScienceDataPresent = userCopyData.Data.some((data) =>
            data._id.equals(existingData._id)
          );

          if (!isExistingScienceDataPresent) {
            userCopyData.Data.push(existingData);
          }
        });

        // Save the final updated data
        await userCopyData.save();

        userCopyData.Data = userCopyData.Data.filter((data) =>
          AllExistingScienceData.some((existingData) =>
            data._id.equals(existingData._id)
          )
        );

        // Save the final updated data
        await userCopyData.save();
      }

      return res
        .status(200)
        .json({ message: "Data synchronized successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

exports.SyncAlluser_Data_AdventureData = catchAsyncErrors(
  async (req, res, next) => {
    try {
      const AllFoundedCopyData_Science = await CopyData.find({
        pathname: "/AdventureStories",
      });

      for (const userCopyData of AllFoundedCopyData_Science) {
        for (let i = 0; i < userCopyData.Data.length; i++) {
          const ScienceStory = userCopyData.Data[i];
          const ExistingScienceData = await Adventure.findOne({
            _id: ScienceStory._id,
          });

          if (ExistingScienceData) {
            ScienceStory.Image[0] = ExistingScienceData.Image[0];

            // Sync Wordexplore
            const updatedWordexplore = ScienceStory.Wordexplore.map((word) => {
              const ExistingWord = ExistingScienceData.Wordexplore.find(
                (existingWord) => existingWord._id.equals(word._id)
              );
              if (ExistingWord) {
                word.Storytitle = ExistingWord.Storytitle;
                word.Storyttext = ExistingWord.Storyttext;
                word.Storyimage[0] = ExistingWord.Storyimage[0];
                word.Storyitext = ExistingWord.Storyitext;
                word.Synonyms = ExistingWord.Synonyms;
                word.Antonyms = ExistingWord.Antonyms;
                word.Noun = ExistingWord.Noun;
              }
              return word;
            });

            // Add missing ExistingWord and remove unmatched Wordexplore
            ScienceStory.Wordexplore = [
              ...updatedWordexplore.filter((word) =>
                ExistingScienceData.Wordexplore.some((existingWord) =>
                  existingWord._id.equals(word._id)
                )
              ),
              ...ExistingScienceData.Wordexplore.filter(
                (existingWord) =>
                  !ScienceStory.Wordexplore.some((word) =>
                    word._id.equals(existingWord._id)
                  )
              ),
            ];

            // Sync Brainquest
            const updatedBrainquest = ScienceStory.Brainquest.map(
              (brainquest) => {
                const ExistingBrainquest = ExistingScienceData.Brainquest.find(
                  (existingBrainquest) =>
                    existingBrainquest._id.equals(brainquest._id)
                );
                if (ExistingBrainquest) {
                  brainquest.Question = ExistingBrainquest.Question;
                  brainquest.Option = ExistingBrainquest.Option;
                  brainquest.Answer = ExistingBrainquest.Answer;
                }

                return brainquest;
              }
            );

            // Add missing ExistingBrainquest and remove unmatched Brainquest
            ScienceStory.Brainquest = [
              ...updatedBrainquest.filter((brainquest) =>
                ExistingScienceData.Brainquest.some((existingBrainquest) =>
                  existingBrainquest._id.equals(brainquest._id)
                )
              ),
              ...ExistingScienceData.Brainquest.filter(
                (existingBrainquest) =>
                  !ScienceStory.Brainquest.some((brainquest) =>
                    brainquest._id.equals(existingBrainquest._id)
                  )
              ),
            ];

            // Sync Storyadvenure content
            const updatedContent = ScienceStory.Storyadvenure.content.map(
              (content) => {
                const ExistingContent =
                  ExistingScienceData.Storyadvenure.content.find(
                    (existingContent) => existingContent._id.equals(content._id)
                  );
                if (ExistingContent) {
                  content.Storyimage[0] = ExistingContent.Storyimage[0];
                  content.Paragraph = ExistingContent.Paragraph;
                }
                return content;
              }
            );

            // Add missing ExistingContent and remove unmatched content
            ScienceStory.Storyadvenure.content = [
              ...updatedContent.filter((content) =>
                ExistingScienceData.Storyadvenure.content.some(
                  (existingContent) => existingContent._id.equals(content._id)
                )
              ),
              ...ExistingScienceData.Storyadvenure.content.filter(
                (existingContent) =>
                  !ScienceStory.Storyadvenure.content.some((content) =>
                    content._id.equals(existingContent._id)
                  )
              ),
            ];
          }

          // Save updated data
          await userCopyData.save();
        }

        // Add ExistingScienceData to userCopyData.Data if not present
        const AllExistingScienceData = await Adventure.find();

        AllExistingScienceData.forEach((existingData) => {
          const isExistingScienceDataPresent = userCopyData.Data.some((data) =>
            data._id.equals(existingData._id)
          );

          if (!isExistingScienceDataPresent) {
            userCopyData.Data.push(existingData);
          }
        });

        // Save the final updated data
        await userCopyData.save();

        userCopyData.Data = userCopyData.Data.filter((data) =>
          AllExistingScienceData.some((existingData) =>
            data._id.equals(existingData._id)
          )
        );

        // Save the final updated data
        await userCopyData.save();
      }

      return res
        .status(200)
        .json({ message: "Data synchronized successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

exports.SyncAlluser_Data_SportData = catchAsyncErrors(
  async (req, res, next) => {
    try {
      const AllFoundedCopyData_Science = await CopyData.find({
        pathname: "/SportsStories",
      });

      for (const userCopyData of AllFoundedCopyData_Science) {
        for (let i = 0; i < userCopyData.Data.length; i++) {
          const ScienceStory = userCopyData.Data[i];
          const ExistingScienceData = await Sport.findOne({
            _id: ScienceStory._id,
          });

          if (ExistingScienceData) {
            ScienceStory.Image[0] = ExistingScienceData.Image[0];

            // Sync Wordexplore
            const updatedWordexplore = ScienceStory.Wordexplore.map((word) => {
              const ExistingWord = ExistingScienceData.Wordexplore.find(
                (existingWord) => existingWord._id.equals(word._id)
              );
              if (ExistingWord) {
                word.Storytitle = ExistingWord.Storytitle;
                word.Storyttext = ExistingWord.Storyttext;
                word.Storyimage[0] = ExistingWord.Storyimage[0];
                word.Storyitext = ExistingWord.Storyitext;
                word.Synonyms = ExistingWord.Synonyms;
                word.Antonyms = ExistingWord.Antonyms;
                word.Noun = ExistingWord.Noun;
              }
              return word;
            });

            // Add missing ExistingWord and remove unmatched Wordexplore
            ScienceStory.Wordexplore = [
              ...updatedWordexplore.filter((word) =>
                ExistingScienceData.Wordexplore.some((existingWord) =>
                  existingWord._id.equals(word._id)
                )
              ),
              ...ExistingScienceData.Wordexplore.filter(
                (existingWord) =>
                  !ScienceStory.Wordexplore.some((word) =>
                    word._id.equals(existingWord._id)
                  )
              ),
            ];

            // Sync Brainquest
            const updatedBrainquest = ScienceStory.Brainquest.map(
              (brainquest) => {
                const ExistingBrainquest = ExistingScienceData.Brainquest.find(
                  (existingBrainquest) =>
                    existingBrainquest._id.equals(brainquest._id)
                );
                if (ExistingBrainquest) {
                  brainquest.Question = ExistingBrainquest.Question;
                  brainquest.Option = ExistingBrainquest.Option;
                  brainquest.Answer = ExistingBrainquest.Answer;
                }

                return brainquest;
              }
            );

            // Add missing ExistingBrainquest and remove unmatched Brainquest
            ScienceStory.Brainquest = [
              ...updatedBrainquest.filter((brainquest) =>
                ExistingScienceData.Brainquest.some((existingBrainquest) =>
                  existingBrainquest._id.equals(brainquest._id)
                )
              ),
              ...ExistingScienceData.Brainquest.filter(
                (existingBrainquest) =>
                  !ScienceStory.Brainquest.some((brainquest) =>
                    brainquest._id.equals(existingBrainquest._id)
                  )
              ),
            ];

            // Sync Storyadvenure content
            const updatedContent = ScienceStory.Storyadvenure.content.map(
              (content) => {
                const ExistingContent =
                  ExistingScienceData.Storyadvenure.content.find(
                    (existingContent) => existingContent._id.equals(content._id)
                  );
                if (ExistingContent) {
                  content.Storyimage[0] = ExistingContent.Storyimage[0];
                  content.Paragraph = ExistingContent.Paragraph;
                }
                return content;
              }
            );

            // Add missing ExistingContent and remove unmatched content
            ScienceStory.Storyadvenure.content = [
              ...updatedContent.filter((content) =>
                ExistingScienceData.Storyadvenure.content.some(
                  (existingContent) => existingContent._id.equals(content._id)
                )
              ),
              ...ExistingScienceData.Storyadvenure.content.filter(
                (existingContent) =>
                  !ScienceStory.Storyadvenure.content.some((content) =>
                    content._id.equals(existingContent._id)
                  )
              ),
            ];
          }

          // Save updated data
          await userCopyData.save();
        }

        // Add ExistingScienceData to userCopyData.Data if not present
        const AllExistingScienceData = await Sport.find();

        AllExistingScienceData.forEach((existingData) => {
          const isExistingScienceDataPresent = userCopyData.Data.some((data) =>
            data._id.equals(existingData._id)
          );

          if (!isExistingScienceDataPresent) {
            userCopyData.Data.push(existingData);
          }
        });

        // Save the final updated data
        await userCopyData.save();

        userCopyData.Data = userCopyData.Data.filter((data) =>
          AllExistingScienceData.some((existingData) =>
            data._id.equals(existingData._id)
          )
        );

        // Save the final updated data
        await userCopyData.save();
      }

      return res
        .status(200)
        .json({ message: "Data synchronized successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

exports.Edit_Profile = catchAsyncErrors(async (req, res, next) => {
  try {
    console.log(req.body);
    const Student_id = req.params.Student_ID;
    const { Username, Email, Children_Name } = req.body;
    const Existing_Student = await Student.findById(Student_id);

    if (!Existing_Student) {
      return res.status(404).json({ message: "Student not found" });
    }

    Existing_Student.Username = Username;
    Existing_Student.Email = Email;
    Existing_Student.Children_Name = Children_Name;

    await Existing_Student.save();

    return res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.Edit_Profile_Password = catchAsyncErrors(async (req, res, next) => {
  try {
    console.log(req.body);
    const Student_id = req.params.Student_ID;
    const { Current_Password, New_Password, Confirm_New_Password } = req.body;
    const Existing_Student = await Student.findById(Student_id);

    if (!Existing_Student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const passwordMatch = await Existing_Student.constructor.comparePassword(
      Current_Password,
      Existing_Student.Password
    );

    if (passwordMatch) {
      Existing_Student.Password = New_Password;
      await Existing_Student.save();
      return res.status(200).json({ message: "Password updated successfully" });
    } else {
      return res
        .status(500)
        .json({
          message:
            "Please give a Valid Current Password to Change the Password",
        });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

//...................................................review

exports.Review_Data = catchAsyncErrors(async (req, res) => {
  try {
    const { wordRating, storyRating, questionRating, comment } = req.body;
    const rating = new Rating({
      wordRating,
      storyRating,
      questionRating,
      comment,
    });
    console.log(rating, "..........ratingBackend");
    await rating.save();
    res.status(201).send("Rating submitted successfully");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

async function Update_All_Progress_For_missed_date() {
  try {
    const allProgress = await Progress.find();

    for (const singleProgress of allProgress) {
      const foundedProgress = await Progress.findById(singleProgress._id);
      const submittedDate = foundedProgress.nextReviewDate;
      const todayDate = new Date();
      // todayDate.setHours(0, 0, 0, 0); // Set the time to midnight for an accurate date comparison

      if (submittedDate < todayDate) {
        foundedProgress.nextReviewDate = todayDate;
        foundedProgress.lastRevieweDate = todayDate; // Update the last review date
        await foundedProgress.save();
      }
    }
  } catch (error) {
    console.error("Error updating progress records:", error);
  }
}

cron.schedule(
  "0 0 * * *",
  async () => {
    const currentUKTime = moment().tz("Europe/London").format();
    console.log(
      `Running the update progress function at UK midnight: ${currentUKTime}`
    );
    await Update_All_Progress_For_missed_date();
  },
  {
    timezone: "Europe/London",
  }
);
