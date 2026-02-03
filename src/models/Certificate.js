const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: [true, "Certificate ID is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    instructorName: {
      type: String,
      required: [true, "Instructor name is required"],
      trim: true,
    },
    completionDate: {
      type: Date,
      required: [true, "Completion date is required"],
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    score: {
      type: Number,
      min: [0, "Score cannot be negative"],
      max: [100, "Score cannot exceed 100"],
    },
    grade: {
      type: String,
      enum: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"],
    },
    // Base64 certificate image
    certificateImage: {
      data: { type: String },
      contentType: { type: String }
    },
    // Or URL to PDF
    pdfUrl: {
      type: String,
      trim: true,
    },
    verificationCode: {
      type: String,
      unique: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokeReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate certificate ID before save
certificateSchema.pre('save', function(next) {
  if (!this.certificateId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.certificateId = `CERT-${timestamp}-${random}`;
  }
  
  if (!this.verificationCode) {
    this.verificationCode = Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  
  next();
});

// Index for faster queries
certificateSchema.index({ userId: 1, courseId: 1 });
certificateSchema.index({ certificateId: 1 });
certificateSchema.index({ verificationCode: 1 });

module.exports = mongoose.model("Certificate", certificateSchema);