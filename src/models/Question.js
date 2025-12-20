const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['General Discussion', 'Course Help', 'Career Advice', 'Project Showcase'],
    default: 'General Discussion',
  },
  subCategory: {
    type: String,
    trim: true,
  },
  // Simple author info - no authentication required
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
  },
  authorEmail: {
    type: String,
    required: [true, 'Author email is required'],
    trim: true,
    lowercase: true,
  },
  // Store image URLs (can be multiple)
  images: [{
    url: String,
    filename: String,
  }],
  isResolved: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  answersCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Virtual for answer relationship
QuestionSchema.virtual('answers', {
  ref: 'Answer',
  localField: '_id',
  foreignField: 'questionId',
  justOne: false,
});

module.exports = mongoose.model('Question', QuestionSchema);