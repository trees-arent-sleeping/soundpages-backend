const express = require("express");
const router = express.Router();
const multer = require("multer");

// set up multer storage
const upload = multer();

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
router.post("/soundboards", upload.any(), async (req, res) => {
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
        uniqueID: `${Date.now().toString()}-${index}`, // add index to the uniqueID to prevent all sounds having the same ID
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

// edit soundboard form
router.get("/soundboards/:id/edit", async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id).populate(
      "sounds"
    );
    res.render("editSoundboard", { soundboard });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// delete soundboard
router.delete("/soundboards/:id", async (req, res) => {
  try {
    const soundboard = await Soundboard.findById(req.params.id);
    if (!soundboard) {
      res.status(404).send("Soundboard not found");
      return;
    }

    await soundboard.deleteOne();
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// update soundboard
router.put(
  "/soundboards/:id",
  upload.array("audioFile[]"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { deleteSounds, editTitles } = req.body;
      let newTitle = Array.isArray(req.body.newTitle)
        ? req.body.newTitle
        : [req.body.newTitle];

      // delete Sounds
      if (deleteSounds && deleteSounds.length > 0) {
        await Soundboard.updateOne(
          { _id: id },
          { $pull: { sounds: { _id: { $in: deleteSounds } } } }
        );
      }

      // edit sound titles
      if (editTitles) {
        for (const [soundId, newTitle] of Object.entries(editTitles)) {
          await Soundboard.updateOne(
            { "sounds._id": soundId },
            { $set: { "sounds.$.title": newTitle } }
          );
        }
      }

      // add new sounds
      if (req.files.length > 0) {
        const newSounds = req.files.map((file, index) => {
          return {
            title: newTitle[index] || file.originalname,
            filename: file.originalname,
            contentType: file.mimetype,
            fileSize: file.size,
            duration: 15,
            uniqueID: `${Date.now().toString()}-${index}`,
            buffer: file.buffer,
          };
        });
        await Soundboard.updateOne(
          { _id: id },
          { $push: { sounds: { $each: newSounds } } }
        );
      }

      res.redirect(`/soundboards/${id}`);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// add sound to soundboard
router.post(
  "/soundboards/:id/sounds",
  upload.single("audioFile"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const { originalname, mimetype, size, buffer } = req.file;

      const newSound = {
        title: title || originalname,
        filename: originalname,
        contentType: mimetype,
        fileSize: size,
        duration: 15,
        uniqueID: `${Date.now().toString()}`,
        buffer: buffer,
      };

      await Soundboard.updateOne({ _id: id }, { $push: { sounds: newSound } });
      res.redirect(`/soundboards/${id}/edit`);
    } catch (err) {
      console.error(err);
      res.status(500).send("internal server error");
    }
  }
);

// delete sound from soundboard
router.delete("/soundboards/:id/sounds/:soundId", async (req, res) => {
  try {
    await Soundboard.updateOne(
      { _id: req.params.id },
      { $pull: { sounds: { _id: req.params.soundId } } }
    );
    res.redirect(`/soundboards/${req.params.id}/edit`);
  } catch (err) {
    console.error(err);
    res.status(500).send("internal server error");
  }
});

module.exports = router;
