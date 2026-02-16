const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },

    // Profile
    avatarUrl: String,
    bio: String,
    phone: String,
    location: String,
    website: String, // ADD THIS

    // Social Links - ADD THIS
    socialLinks: {
      twitter: String,
      linkedin: String,
      github: String,
      facebook: String,
    },

    // Account Status
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    // Security
    refreshToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,

    // Instructor Specific
    expertise: [String],
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],

    // Student Specific
    enrolledCourses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        enrolledAt: { type: Date, default: Date.now },
        progress: { type: Number, default: 0 },
      },
    ],

    // Stats
    rating: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
