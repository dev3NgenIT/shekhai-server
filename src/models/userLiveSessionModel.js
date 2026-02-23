// models/userLiveSessionModel.js
const mongoose = require("mongoose");

const userLiveSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    liveSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LiveSession",
      required: true,
    },

    // Relationship type
    relationshipType: {
      type: String,
      enum: ["enrolled", "saved", "waitlisted", "attended"],
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "cancelled", "completed", "expired"],
      default: "active",
    },

    // For enrolled sessions
    enrollment: {
      enrolledAt: Date,
      enrollmentId: String,
      paymentInfo: {
        paymentId: String,
        transactionId: String,
        amount: Number,
        currency: String,
        paymentMethod: String,
        paymentStatus: {
          type: String,
          enum: ["pending", "completed", "failed", "refunded"],
          default: "pending",
        },
        paidAt: Date,
      },
      attended: {
        type: Boolean,
        default: false,
      },
      joinedAt: Date,
      leftAt: Date,
    },

    // For saved sessions
    saved: {
      savedAt: {
        type: Date,
        default: Date.now,
      },
      notes: String,
    },

    // For waitlisted sessions
    waitlist: {
      joinedAt: Date,
      position: Number,
      notified: {
        type: Boolean,
        default: false,
      },
      convertedToEnrollment: {
        type: Boolean,
        default: false,
      },
    },

    // For attended sessions
    attendance: {
      joinedAt: Date,
      leftAt: Date,
      duration: Number, // minutes
      feedback: {
        rating: Number,
        comment: String,
        submittedAt: Date,
      },
      certificate: {
        issued: Boolean,
        issuedAt: Date,
        certificateUrl: String,
      },
    },

    // Metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
      deviceInfo: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure unique user-session combinations per relationship type
userLiveSessionSchema.index(
  { user: 1, liveSession: 1, relationshipType: 1 },
  { unique: true },
);

const UserLiveSession = mongoose.model(
  "UserLiveSession",
  userLiveSessionSchema,
);

module.exports = UserLiveSession;
