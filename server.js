require("dotenv").config();
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const app = express();
const PORT = 3000;

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// routes
app.use("/", require("./controllers/soundboardController"));

// connect to mongoDB
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongoDB connection error:"));
db.once("open", () => {
  console.log("connected to MongoDB");
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
