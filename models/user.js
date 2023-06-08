const mongoose = require("mongoose");

// check if model already exists before defining it to avoid conflicts with soundboardController.js
const User =
  mongoose.models.User ||
  mongoose.model("User", {
    // user schema
    username: {
      type: String,
      required: true,
      unique: true,
    },
  });

module.exports = User;
