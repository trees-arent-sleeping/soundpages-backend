require("dotenv").config();
const express = require("express");
const methodOverride = require("method-override");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const crypto = require("crypto");

const User = require("./models/User");
const Soundboard = require("./models/Soundboard");

require("./config/passport");

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

// session config
app.use(
  session({
    secret: crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
  })
);

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

// auth middleware
const ensureAuth = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
};

// check that user is the creator of the soundboard
const ensureOwner = async function (req, res, next) {
  try {
    const soundboard = await Soundboard.findById(req.params.id);
    console.log("req.user:", req.user);
    console.log("soundboard.creator:", soundboard.creator);

    if (req.user && soundboard.creator.equals(req.user._id)) {
      return next();
    } else {
      res
        .status(403)
        .send("Please try logging in before editing this soundboard");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
};

// index
app.get("/", async (req, res) => {
  try {
    const soundboards = await Soundboard.find().exec();
    res.render("index", { soundboards, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// create soundboard form
app.get("/soundboards/create", ensureAuth, (req, res) => {
  if (req.isAuthenticated()) {
    res.render("createSoundboard");
  } else {
    res.redirect("/auth/google"); // redirect to login if user isn't logged in
  }
});

// view soundboard
app.get("/soundboards/:id", async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id)
      .populate("sounds")
      .populate({
        path: "creator",
        model: User,
        select: "username",
      });
    const username = soundboard.creator ? soundboard.creator.username : "Guest";
    res.render("soundboard", { soundboard, username, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// create soundboard
app.post("/soundboards", upload.any(), ensureAuth, async (req, res) => {
  const { title, description } = req.body;
  const image = req.files.find((file) => file.fieldname === "image");
  const audioTitle = Array.isArray(req.body.audioTitle)
    ? req.body.audioTitle
    : [req.body.audioTitle];
  const sounds = [];
  const audioFiles = req.files.filter((file) =>
    file.fieldname.startsWith("audioFiles")
  );
  if (audioFiles && audioFiles.length > 0) {
    audioFiles.forEach((file, index) => {
      sounds.push({
        title: audioTitle[index] || file.originalname,
        filename: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        duration: 15,
        uniqueID: `${Date.now().toString()}-${index}`,
        buffer: file.buffer,
      });
    });
  }

  try {
    const soundboard = new Soundboard({
      title,
      description,
      image: {
        data: image.buffer,
        contentType: image.mimetype,
      },
      sounds,
      creator: req.user._id,
    });
    await soundboard.save();
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// edit soundboard form
app.get("/soundboards/:id/edit", ensureOwner, async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id).populate(
      "sounds"
    );
    res.render("editSoundboard", { soundboard });
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// update soundboard
app.put("/soundboards/:id", upload.any(), ensureOwner, async (req, res) => {
  const { editTitles, deleteSounds, newTitle, description, title } = req.body;
  const image = req.files.find((file) => file.fieldname === "image");
  try {
    const soundboard = await Soundboard.findById(req.params.id);
    soundboard.title = title;
    soundboard.description = description;
    if (image) {
      soundboard.image.data = image.buffer;
      soundboard.image.contentType = image.mimetype;
    }
    if (!soundboard) {
      return res.status(404).send("Soundboard not found");
    }
    // update existing sound titles and sound files
    if (editTitles) {
      for (const soundId in editTitles) {
        const sound = soundboard.sounds.id(soundId);
        if (sound) {
          sound.title = editTitles[soundId];
          // find updated sound file in request
          const updatedSound = req.files.find(
            (file) => file.fieldname === `editSounds[${soundId}]`
          );
          // if found, update the sound file
          if (updatedSound) {
            sound.filename = updatedSound.originalname;
            sound.contentType = updatedSound.mimetype;
            sound.fileSize = updatedSound.size;
            sound.buffer = updatedSound.buffer;
          }
        }
      }
    }
    // delete selected sounds
    if (deleteSounds) {
      deleteSounds.forEach((soundId) => {
        soundboard.sounds.pull(soundId);
      });
    }
    // add new sounds
    if (newTitle && newTitle.length > 0 && req.files && req.files.length > 0) {
      const audioFiles = req.files.filter((file) =>
        file.fieldname.startsWith("audioFile")
      );
      audioFiles.forEach((file, index) => {
        soundboard.sounds.push({
          title: newTitle[index] || file.originalname,
          filename: file.originalname,
          contentType: file.mimetype,
          fileSize: file.size,
          duration: 15,
          uniqueID: `${Date.now().toString()}-${index}`,
          buffer: file.buffer,
        });
      });
    }
    await soundboard.save();
    res.redirect(`/soundboards/${req.params.id}/edit`);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// delete soundboard
app.delete("/soundboards/:id", ensureOwner, async (req, res) => {
  try {
    await Soundboard.findByIdAndRemove(req.params.id);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// login
app.get(
  "/login",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// google auth route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/"); // redirect after login
  }
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// sounds route
app.get("/sounds/:uniqueID", async (req, res) => {
  try {
    const soundboard = await Soundboard.findOne({
      "sounds.uniqueID": req.params.uniqueID,
    });
    if (!soundboard) {
      res.status(404).send("sound not found");
      return;
    }

    const sound = soundboard.sounds.find(
      (sound) => sound.uniqueID === req.params.uniqueID
    );
    if (!sound) {
      res.status(404).send("sound not found");
      return;
    }

    res.set("Content-Type", sound.contentType);
    res.send(sound.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
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
