const mongoose = require("mongoose");

const examQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
  },
  type: {
    type: String,
    enum: ["single-choice", "multiple-choice", "true-false", "short-answer", "essay"],
    required: [true, "Question type is required"],
  },
  options: [
    {
      text: {
        type: String,
        required: function () {
          return (
            this.type === "single-choice" || this.type === "multiple-choice"
          );
        },
      },
      isCorrect: {
        type: Boolean,
        default: false,
      },
    },
  ],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function () {
      return this.type !== "multiple-choice";
    },
  },
  points: {
    type: Number,
    default: 1,
    min: [1, "Points must be at least 1"],
  },
  explanation: {
    type: String,
    trim: true,
  },
});

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Exam title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },
    // Connection to module/lesson (optional)
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Duration in minutes
    duration: {
      type: Number,
      default: 60,
      min: [15, "Duration must be at least 15 minutes"],
      max: [360, "Duration cannot exceed 6 hours"],
    },
    passingScore: {
      type: Number, // percentage
      default: 70,
      min: [0, "Passing score cannot be negative"],
      max: [100, "Passing score cannot exceed 100%"],
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, "Maximum attempts must be at least 1"],
    },
    instructions: {
      type: String,
      trim: true,
    },
    questions: [examQuestionSchema],
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    scheduledDate: {
      type: Date,
    },
    availableFrom: {
      type: Date,
      default: Date.now,
    },
    availableUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before save
examSchema.pre('save', function(next) {
  this.totalQuestions = this.questions.length;
  this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  next();
});

module.exports = mongoose.model("Exam", examSchema);