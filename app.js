var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
dotenv.config();

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
// const { sendmail } = require("./utils/sendEmail");

var app = express();

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(require("cors")({ credentials: true, origin: true }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect("mongodb+srv://admin:admin123@cluster0.stdp4zq.mongodb.net/Childvocabulary?retryWrites=true&w=majority");


// mongoose.connect("mongodb://localhost:27017/Sample_ChildVocability");
 

// mongoose.connect(
//   "mongodb+srv://admin:admin123@cluster0.fucp4on.mongodb.net/BrainyLingo-prod?retryWrites=true&w=majority&appName=Cluster0"
// );



app.use("/", indexRouter);
app.use("/users", usersRouter);

app.use(express.static("./BrainyLingoFrontend/build"));

app.get("*", (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "BrainyLingoFrontend", "build", "index.html")
  );
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});



module.exports = app;
