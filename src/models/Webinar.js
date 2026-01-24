// src/models/Webinar.js
const mongoose = require('mongoose');

const webinarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  badge: {
    type: String,
    default: 'webinar',
    enum: ['webinar', 'workshop', 'masterclass', 'seminar', 'conference']
  },
  
  shortDescription: {
    type: String,
    required: [true, 'Short description is required']
  },
  
  longDescription: {
    type: String,
    required: [true, 'Long description is required']
  },
  
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  
  zoomLink: {
    type: String,
    default: ''
  },
  
  thumbnail: {
    type: String,
    default: ''
  },
  
  bannerImage: {
    type: String,
    default: ''
  },
  
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  
  isFree: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  status: {
    type: String,
    enum: ['draft', 'published', 'live', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  maxParticipants: {
    type: Number,
    default: 100,
    min: 1
  },
  
  currentParticipants: {
    type: Number,
    default: 0,
    min: 0
  },
  
  instructor: {
    name: {
      type: String,
      required: [true, 'Instructor name is required']
    },
    title: {
      type: String,
      required: [true, 'Instructor title is required']
    },
    avatar: {
      type: String,
      default: ''
    }
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  // Additional fields
  requirements: [String],
  learningOutcomes: [String],
  includes: [String],
  
  registrationOpen: {
    type: Boolean,
    default: true
  },
  
  registrationDeadline: Date
  
}, {
  timestamps: true
});

// Generate slug from title before saving
webinarSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    // Generate slug from title
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/--+/g, '-')     // Replace multiple hyphens with single
      .trim();
    
    // Add timestamp to make it unique
    const timestamp = Date.now().toString().slice(-6);
    this.slug = `${this.slug}-${timestamp}`;
  }
  next();
});

module.exports = mongoose.model('Webinar', webinarSchema);