const mongoose = require("mongoose");

const soundSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        // check if file is audio
        return /^audio\//.test(value);
      },
      message: "invalid audio file type",
    },
  },
  fileSize: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        // check if file is under 15MB
        return value <= 15 * 1024 * 1024;
      },
      message: "file size exceeds the 15MB limit",
    },
  },
  duration: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        // check if the duration is within the 15s limit
        return value <= 15 && value >= 0;
      },
      message: "clip should be between 0 and 15 seconds",
    },
  },
  uniqueID: {
    type: String,
    required: true,
    unique: true,
  },
  buffer: {
    type: Buffer,
    required: true,
  },
});

const SoundboardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  sounds: [soundSchema],
});

const Soundboard = mongoose.model("Soundboard", SoundboardSchema);

module.exports = Soundboard;
