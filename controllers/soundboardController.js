const express = require("express");
const router = express.Router();
const multer = require("multer");

// set up multer storage
const upload = multer().array("audio");

const Soundboard = require("../models/Soundboard");

// index
router.get("/", async (req, res) => {
  try {
    const soundboards = await Soundboard.find().select("title").exec();
    res.render("index", { soundboards });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// create soundboard form
router.get("/soundboards/create", (req, res) => {
  res.render("createSoundboard");
});

// view soundboard
router.get("/soundboards/:id", async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id).populate(
      "sounds"
    );
    res.render("soundboard", { soundboard });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// create soundboard
router.post("/soundboards", upload, async (req, res) => {
  const { title } = req.body;
  const sounds = [];

  if (req.files && req.files.length > 0) {
    const soundTitles = req.body["soundTitles[]"];

    req.files.forEach((file, index) => {
      sounds.push({
        title: Array.isArray(soundTitles)
          ? soundTitles[index] || file.originalname
          : soundTitles || file.originalname,
        filename: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        duration: 15,
        uniqueID: Date.now().toString(),
        buffer: file.buffer,
      });
    });
  }

  try {
    const soundboard = new Soundboard({
      title,
      sounds,
    });

    await soundboard.save();
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
