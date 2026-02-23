// src/models/userModel.js
const mongoose = require("mongoose");

// Check if the model already exists to prevent overwrite
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    enrolledLiveSessions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LiveSession",
      },
    ],
    savedLiveSessions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LiveSession",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Remove password when converting to JSON
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

// IMPORTANT: Check if model exists before creating
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;  