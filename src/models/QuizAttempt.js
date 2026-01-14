// models/QuizAttempt.js
const mongoose = require("mongoose");

const attemptAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  selectedOptions: [String],
  shortAnswer: String,
  isCorrect: Boolean,
  pointsEarned: {
    type: Number,
    default: 0,
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0,
  },
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  answers: [attemptAnswerSchema],
  score: {
    type: Number,
    default: 0,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  isPassed: {
    type: Boolean,
    default: false,
  },
  timeStarted: {
    type: Date,
    default: Date.now,
  },
  timeCompleted: {
    type: Date,
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0,
  },
  attemptNumber: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["in-progress", "completed", "abandoned"],
    default: "in-progress",
  },
  ipAddress: String,
  userAgent: String,
  feedback: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Calculate scores before saving
quizAttemptSchema.pre("save", function(next) {
  if (this.answers.length > 0) {
    this.totalPoints = this.answers.reduce((total, answer) => total + answer.pointsEarned, 0);
    
    // Get quiz total points from answers
    const totalPossiblePoints = this.answers.reduce((total, answer) => {
      const question = this.answers.find(a => a.questionId.equals(answer.questionId));
      return total + (question ? question.pointsEarned : 0);
    }, 0);
    
    if (totalPossiblePoints > 0) {
      this.percentage = Math.round((this.totalPoints / totalPossiblePoints) * 100);
    }
  }
  
  if (this.timeStarted && this.timeCompleted) {
    this.timeSpent = Math.floor((this.timeCompleted - this.timeStarted) / 1000);
  }
  
  next();
});

// Indexes
quizAttemptSchema.index({ quizId: 1, userId: 1 });
quizAttemptSchema.index({ userId: 1, courseId: 1 });
quizAttemptSchema.index({ createdAt: -1 });

const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);

module.exports = QuizAttempt;