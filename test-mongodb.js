const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://ziadhatemdev:Ri2RnQYnzIMvtAv7@cluster0.bnfpg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

console.log("Testing MongoDB connection...");

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
