const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  // From your form
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
  },
  
  // File attachment handling
  attachment: {
    url: String,
    filename: String,
    fileType: String,
    fileSize: Number,
  },
  
  // Additional fields for forum functionality
  views: {
    type: Number,
    default: 0,
  },
  answersCount: {
    type: Number,
    default: 0,
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  likes: {
    type: Number,
    default: 0,
  },
  
  // SEO and organization
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// Generate slug before saving
QuestionSchema.pre('save', function(next) {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
  next();
});

// Virtual for answer relationship
QuestionSchema.virtual('answers', {
  ref: 'Answer',
  localField: '_id',
  foreignField: 'questionId',
  justOne: false,
});

// Add toJSON option to include virtuals
QuestionSchema.set('toJSON', { virtuals: true });
QuestionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Question', QuestionSchema);