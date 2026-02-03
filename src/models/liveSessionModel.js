const mongoose = require("mongoose");

const liveSessionSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },
  
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true
  },
  
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Instructor is required"]
  },
  
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true
  },
  
  subCategory: {
    type: String,
    trim: true
  },
  
  type: {
    type: String,
    enum: ["live", "scheduled", "on-demand"],
    default: "live"
  },
  
  status: {
    type: String,
    enum: ["draft", "upcoming", "live", "completed", "cancelled"],
    default: "upcoming"
  },
  
  // Pricing Information
  isPaid: {
    type: Boolean,
    default: false
  },
  
  price: {
    type: Number,
    default: 0,
    min: [0, "Price cannot be negative"]
  },
  
  currency: {
    type: String,
    default: "USD"
  },
  
  discountedPrice: {
    type: Number,
    min: [0, "Discounted price cannot be negative"]
  },
  
  // Schedule Information
  schedule: {
    startTime: {
      type: Date,
      required: function() {
        return this.type !== "on-demand";
      }
    },
    endTime: {
      type: Date,
      required: function() {
        return this.type !== "on-demand";
      },
      validate: {
        validator: function(value) {
          return value > this.schedule.startTime;
        },
        message: "End time must be after start time"
      }
    },
    duration: {
      type: Number, // in minutes
      default: 60
    },
    timezone: {
      type: String,
      default: "UTC"
    },
    recurring: {
      type: Boolean,
      default: false
    },
    recurrencePattern: {
      type: String,
      enum: ["daily", "weekly", "monthly", null],
      default: null
    }
  },
  
  // Live Session Details
  liveDetails: {
    platform: {
      type: String,
      enum: ["zoom", "google_meet", "teams", "custom", "jitsi"],
      default: "custom"
    },
    meetingId: {
      type: String,
      trim: true
    },
    meetingPassword: {
      type: String,
      trim: true
    },
    meetingUrl: {
      type: String,
      trim: true
    },
    joinUrl: {
      type: String,
      trim: true
    },
    streamUrl: {
      type: String,
      trim: true
    },
    recordingUrl: {
      type: String,
      trim: true
    },
    chatEnabled: {
      type: Boolean,
      default: true
    },
    qaEnabled: {
      type: Boolean,
      default: true
    },
    pollsEnabled: {
      type: Boolean,
      default: true
    },
    screenShareEnabled: {
      type: Boolean,
      default: true
    },
    whiteboardEnabled: {
      type: Boolean,
      default: true
    }
  },
  
  // Enrollment Information
  totalSlots: {
    type: Number,
    default: 100,
    min: [1, "Total slots must be at least 1"]
  },
  
  availableSlots: {
    type: Number,
    default: 100
  },
  
  waitlistEnabled: {
    type: Boolean,
    default: false
  },
  
  waitlistCount: {
    type: Number,
    default: 0
  },
  
  // Enrollment Settings
  enrollment: {
    enrollmentDeadline: {
      type: Date
    },
    autoEnroll: {
      type: Boolean,
      default: true
    },
    requiresApproval: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      default: 100
    }
  },
  
  // Prerequisites & Outcomes
  prerequisites: [{
    type: String,
    trim: true
  }],
  
  whatYoullGet: [{
    type: String,
    trim: true
  }],
  
  // Materials
  materials: [{
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["pdf", "video", "link", "zip", "document", "image"],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: String
    },
    downloadable: {
      type: Boolean,
      default: true
    }
  }],
  
  // Recording Settings
  recordingSettings: {
    recordSession: {
      type: Boolean,
      default: true
    },
    autoPublishRecording: {
      type: Boolean,
      default: true
    },
    recordingAvailableFor: {
      type: Number, // days
      default: 30
    },
    downloadable: {
      type: Boolean,
      default: false
    }
  },
  
  // Interaction Settings
  interactionSettings: {
    allowChat: {
      type: Boolean,
      default: true
    },
    allowRaiseHand: {
      type: Boolean,
      default: true
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    moderateChat: {
      type: Boolean,
      default: false
    },
    qaMode: {
      type: String,
      enum: ["moderated", "open", "disabled"],
      default: "moderated"
    }
  },
  
  // Notifications
  notifications: {
    reminder24h: {
      type: Boolean,
      default: true
    },
    reminder1h: {
      type: Boolean,
      default: true
    },
    reminder15min: {
      type: Boolean,
      default: true
    },
    recordingAvailable: {
      type: Boolean,
      default: true
    }
  },
  
  // Metadata
  metadata: {
    language: {
      type: String,
      default: "English"
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
      default: "All Levels"
    },
    tags: [{
      type: String,
      trim: true
    }],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    totalEnrollments: {
      type: Number,
      default: 0
    }
  },
  
  // Stats
  stats: {
    attendanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    qaQuestions: {
      type: Number,
      default: 0
    },
    pollParticipation: {
      type: Number,
      default: 0
    }
  },
  
  // Calculated fields (will be populated by virtuals)
  startsIn: {
    type: String
  },
  
  isEnrolled: {
    type: Boolean,
    default: false
  },
  
  enrollmentStatus: {
    type: String,
    enum: ["enrolled", "waiting", "pending", null],
    default: null
  },
  
  liveParticipants: {
    type: Number,
    default: 0
  },
  
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // System fields
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating startsIn
liveSessionSchema.virtual("calculatedStartsIn").get(function() {
  if (this.type === "on-demand" || !this.schedule.startTime) {
    return "Available Now";
  }
  
  const now = new Date();
  const startTime = new Date(this.schedule.startTime);
  
  if (startTime <= now) {
    if (this.status === "live") {
      return "Live Now";
    }
    return "Started";
  }
  
  const diffMs = startTime - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
});

// Pre-save middleware to update calculated fields
liveSessionSchema.pre("save", function(next) {
  // Update startsIn
  this.startsIn = this.calculatedStartsIn;
  
  // Calculate duration if not set
  if (this.schedule.startTime && this.schedule.endTime && !this.schedule.duration) {
    const diffMs = this.schedule.endTime - this.schedule.startTime;
    this.schedule.duration = Math.floor(diffMs / 60000); // Convert to minutes
  }
  
  // Update available slots based on enrollments
  if (this.totalSlots && !this.availableSlots) {
    this.availableSlots = this.totalSlots;
  }
  
  // Update enrollment percentage
  if (this.totalSlots > 0) {
    this.metadata.totalEnrollments = this.totalSlots - this.availableSlots;
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

const LiveSession = mongoose.model("LiveSession", liveSessionSchema);

module.exports = LiveSession;