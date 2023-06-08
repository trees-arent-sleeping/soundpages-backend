const passport = require("passport");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../models/user");

// set up multer storage
const upload = multer();

const Soundboard = require("../models/Soundboard");

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
      res.status(403).send("forbidden");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
};

// index
router.get("/", async (req, res) => {
  try {
    const soundboards = await Soundboard.find().select("title").exec();
    res.render("index", { soundboards, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// create soundboard form
router.get("/soundboards/create", ensureAuth, (req, res) => {
  if (req.isAuthenticated()) {
    res.render("createSoundboard");
  } else {
    res.redirect("/auth/google"); // redirect to login if user isn't logged in
  }
});

// view soundboard
router.get("/soundboards/:id", async (req, res) => {
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
router.post("/soundboards", upload.any(), ensureAuth, async (req, res) => {
  const { title } = req.body;
  const audioTitle = Array.isArray(req.body.audioTitle)
    ? req.body.audioTitle
    : [req.body.audioTitle];
  const sounds = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach((file, index) => {
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
router.get("/soundboards/:id/edit", ensureOwner, async (req, res) => {
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
router.put("/soundboards/:id", upload.any(), ensureOwner, async (req, res) => {
  const { editTitles, deleteSounds, newTitle } = req.body;

  try {
    const soundboard = await Soundboard.findById(req.params.id);

    if (!soundboard) {
      return res.status(404).send("Soundboard not found");
    }

    // update existing sound titles
    if (editTitles) {
      for (const soundId in editTitles) {
        const sound = soundboard.sounds.id(soundId);
        if (sound) {
          sound.title = editTitles[soundId];
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
    if (newTitle && req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
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
    res.redirect(`/soundboards/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// delete soundboard
router.delete("/soundboards/:id", ensureOwner, async (req, res) => {
  try {
    await Soundboard.findByIdAndRemove(req.params.id);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

// login
router.get(
  "/login",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// google auth route
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/"); // redirect after login
  }
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

module.exports = router;
