const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String },
  duration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    shortDescription: { type: String },
    longDescription: { type: String },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: { type: Number, default: 0 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    modules: [moduleSchema],
    totalModules: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    enrollmentDeadline: { type: Date },
    published: { type: Boolean, default: false },
    purchasedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    bannerUrl: { type: String },
    thumbnails: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
