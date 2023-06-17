const mongoose = require("mongoose");

const User =
  mongoose.models.User ||
  mongoose.model("User", {
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
  });

module.exports = User;
