require("dotenv").config();
const express = require("express");
const cors = require("cors");
const corsOptions = {
  origin: "http://localhost:3001",
  credentials: true,
};

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
app.use(cors(corsOptions));

app.use(function (req, res, next) {
  console.log("URL:", req.url);
  next();
});

const PORT = 3000;

// session middleware
app.use(
  session({
    secret: process.env.GOOGLE_CLIENT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// set up multer storage
const upload = multer();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

// connect to mongo
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// connect to mongo
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongoDB connection error:"));
db.once("open", () => {
  console.log("connected to MongoDB");
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
        .send("please try logging in before editing this soundboard");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
};

// create soundboard, authenticate first
app.get("/soundboards/create", ensureAuth, (req, res) => {
  res.redirect("http://localhost:3001/soundboards/create");
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
        uniqueID: crypto.randomBytes(16).toString("hex"),
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

// update soundboard
app.put("/soundboards/:id", upload.any(), ensureOwner, async (req, res) => {
  const { editTitles, deleteSounds, newTitle, description, title } = req.body;
  const image = req.files.find((file) => file.fieldname === "image");

  try {
    const soundboard = await Soundboard.findById(req.params.id);
    if (!soundboard) {
      return res.status(404).send("Soundboard not found");
    }

    soundboard.title = title;
    soundboard.description = description;
    if (image) {
      soundboard.image = {
        data: image.buffer,
        contentType: image.mimetype,
      };
    }

    // update existing sound titles and sound files
    if (editTitles) {
      for (const soundId in editTitles) {
        const sound = soundboard.sounds.id(soundId);
        if (sound) {
          sound.title = editTitles[soundId];

          const updatedSound = req.files.find(
            (file) => file.fieldname === `editSounds[${soundId}]`
          );

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
      console.log("deleteSounds:", deleteSounds);
      deleteSounds.forEach((soundId) => {
        soundboard.sounds.pull(soundId);
        console.log(`Deleted sound with ID: ${soundId}`);
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
          uniqueID: crypto.randomBytes(16).toString("hex"),
          buffer: file.buffer,
        });
      });
    }

    await soundboard.save();
    res.json({
      redirectUrl: `http://localhost:3001/soundboards/${soundboard._id}/edit`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

// delete soundboard
app.delete("/soundboards/:id", ensureOwner, async (req, res) => {
  try {
    console.log(
      `received request from frontend to delete soundboard with ID: ${req.params.id}`
    );
    await Soundboard.findByIdAndRemove(req.params.id);
    res
      .status(200)
      .json({ message: "successfully deleted soundboard", redirectUrl: "/" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
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

// refactored to redirect to frontend

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("http://localhost:3001/"); // redirect after login
  }
);

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("http://localhost:3001/");
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

// get soundboards for index as json
app.get("/soundboards", async (req, res) => {
  try {
    // grab only the title and image. reduce load speeds
    const soundboards = await Soundboard.find().select("_id title").exec();
    res.json(soundboards);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// get one soundboard as json
app.get("/soundboard/:id", async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id).exec();
    if (!soundboard) {
      return res.status(404).json({ message: "soundboard not found" });
    }
    res.json(soundboard);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// get soundboard img
app.get("/image/:id", async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id).exec();
    if (!soundboard || !soundboard.image) {
      return res.status(404).json({ message: "image not found" });
    }

    res.set("Content-Type", soundboard.image.contentType);
    res.send(soundboard.image.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// get user information as json
app.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.json(null);
  }
});

// get image data as json
app.get("/image/:id", async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id);
    if (!soundboard || !soundboard.image || !soundboard.image.data) {
      throw new Error("no image found");
    }
    res.contentType(soundboard.image.contentType);
    res.send(soundboard.image.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// start the server
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
