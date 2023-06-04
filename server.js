require("dotenv").config();
const express = require("express");
const methodOverride = require("method-override");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = 3000;

// set up multer storage
const upload = multer();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

// connect to mongo
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// models
const Soundboard = require("./models/Soundboard");

// routes
app.use("/", require("./controllers/soundboardController"));

app.get("/sounds/:uniqueID", async (req, res) => {
  try {
    const soundboard = await Soundboard.findOne({
      "sounds.uniqueID": req.params.uniqueID,
    });
    if (!soundboard) {
      res.status(404).send("Sound not found");
      return;
    }

    const sound = soundboard.sounds.find(
      (sound) => sound.uniqueID === req.params.uniqueID
    );
    if (!sound) {
      res.status(404).send("Sound not found");
      return;
    }

    res.set("Content-Type", sound.contentType);
    res.send(sound.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// connect to mongo
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongoDB connection error:"));
db.once("open", () => {
  console.log("connected to MongoDB");
});

// start the server
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
