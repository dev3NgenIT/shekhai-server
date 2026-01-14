const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  url: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    courseName: {
      type: String,
      trim: true,
    },
    announcementType: {
      type: String,
      enum: ["general", "course"],
      default: "general",
      required: true,
    },
    // CHANGE HERE: Make instructorId accept strings too
    instructorId: {
      type: mongoose.Schema.Types.Mixed, // Changed from ObjectId to Mixed
      required: true,
    },
    instructorName: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    sentTo: {
      type: String,
      enum: ["all", "specific", "none"],
      default: "all",
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attachments: [attachmentSchema],
    scheduleDate: {
      type: Date,
    },
    publishDate: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for days remaining until expiration
announcementSchema.virtual("daysRemaining").get(function () {
  if (!this.expiresAt) return null;
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  if (now > expiry) return 0;
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isExpired
announcementSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
});

// Indexes for better query performance
announcementSchema.index({ courseId: 1, status: 1 });
announcementSchema.index({ instructorId: 1 });
announcementSchema.index({ status: 1, publishDate: 1 });
announcementSchema.index({ announcementType: 1, status: 1 });
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Announcement", announcementSchema);