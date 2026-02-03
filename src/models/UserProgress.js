const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema(
  {
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
    
    // Lesson Progress
    completedLessons: [
      {
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        moduleId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        completedAt: {
          type: Date,
          default: Date.now,
        },
        timeSpent: {
          type: Number, // in seconds
          default: 0,
        },
        notes: {
          type: String,
          trim: true,
        },
        bookmarked: {
          type: Boolean,
          default: false,
        },
      },
    ],
    
    // Quiz Attempts
    quizAttempts: [
      {
        quizId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Quiz",
          required: true,
        },
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        score: {
          type: Number,
          required: true,
        },
        totalScore: {
          type: Number,
          required: true,
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
        },
        passed: {
          type: Boolean,
          default: false,
        },
        answers: [
          {
            questionId: mongoose.Schema.Types.ObjectId,
            selectedAnswer: mongoose.Schema.Types.Mixed,
            isCorrect: Boolean,
            pointsEarned: Number,
          },
        ],
        startedAt: {
          type: Date,
          default: Date.now,
        },
        completedAt: {
          type: Date,
        },
        timeTaken: {
          type: Number, // in seconds
        },
      },
    ],
    
    // Exam Attempts
    examAttempts: [
      {
        examId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exam",
          required: true,
        },
        score: {
          type: Number,
          required: true,
        },
        totalScore: {
          type: Number,
          required: true,
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
        },
        passed: {
          type: Boolean,
          default: false,
        },
        startedAt: {
          type: Date,
          default: Date.now,
        },
        completedAt: {
          type: Date,
        },
        timeTaken: {
          type: Number, // in seconds
        },
      },
    ],
    
    // Current Progress
    currentLesson: {
      lessonId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      moduleId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      startedAt: {
        type: Date,
      },
      lastAccessed: {
        type: Date,
      },
    },
    
    // Overall Progress
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalTimeSpent: {
      type: Number, // in seconds
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Certificate
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate",
    },
    certificateEarned: {
      type: Boolean,
      default: false,
    },
    certificateEarnedAt: {
      type: Date,
    },
    
    // Status
    status: {
      type: String,
      enum: ["enrolled", "in_progress", "completed", "dropped", "failed"],
      default: "enrolled",
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    droppedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster queries
userProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
userProgressSchema.index({ userId: 1 });
userProgressSchema.index({ courseId: 1 });
userProgressSchema.index({ "completedLessons.lessonId": 1 });

// Update progress percentage
userProgressSchema.methods.updateProgress = async function(course) {
  const completedCount = this.completedLessons.length;
  const totalLessons = course.totalLessons || 0;
  
  this.progressPercentage = totalLessons > 0 
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;
  
  // Update status based on progress
  if (this.progressPercentage === 100) {
    this.status = "completed";
    this.completedAt = new Date();
    this.certificateEarned = true;
  } else if (this.progressPercentage > 0) {
    this.status = "in_progress";
  }
  
  await this.save();
  return this;
};

// Add completed lesson
userProgressSchema.methods.addCompletedLesson = async function(lessonId, moduleId, timeSpent = 0, notes = "") {
  const existingIndex = this.completedLessons.findIndex(
    cl => cl.lessonId.toString() === lessonId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing
    this.completedLessons[existingIndex].completedAt = new Date();
    this.completedLessons[existingIndex].timeSpent += timeSpent;
    this.completedLessons[existingIndex].notes = notes || this.completedLessons[existingIndex].notes;
  } else {
    // Add new
    this.completedLessons.push({
      lessonId,
      moduleId,
      completedAt: new Date(),
      timeSpent,
      notes,
      bookmarked: false,
    });
  }
  
  return this;
};

// Bookmark lesson
userProgressSchema.methods.toggleBookmark = function(lessonId, bookmarked) {
  const lesson = this.completedLessons.find(
    cl => cl.lessonId.toString() === lessonId.toString()
  );
  
  if (lesson) {
    lesson.bookmarked = bookmarked;
  }
  return this;
};

module.exports = mongoose.model("UserProgress", userProgressSchema);