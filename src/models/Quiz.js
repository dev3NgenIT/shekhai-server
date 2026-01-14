const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
  },
  type: {
    type: String,
    enum: ["single-choice", "multiple-choice", "true-false", "short-answer"],
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
      return this.type !== "multiple-choice"; // For multiple-choice, correct answers are in options
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

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
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
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module", // If you have a separate Module model
    },
    moduleTitle: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number, // in minutes
      default: 30,
      min: [1, "Duration must be at least 1 minute"],
      max: [300, "Duration cannot exceed 300 minutes"],
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
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    availableFrom: {
      type: Date,
      required: [true, "Start date is required"],
    },
    availableUntil: {
      type: Date,
    },
    scheduleType: {
      type: String,
      enum: ["immediate", "scheduled"],
      default: "immediate",
    },
    questions: [questionSchema],
    isPublished: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Quiz", quizSchema);
