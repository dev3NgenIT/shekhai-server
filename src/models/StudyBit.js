// models/StudyBit.js - Confirmed (No sessionId)
const mongoose = require('mongoose');

const studyBitSchema = new mongoose.Schema({
  // Poster Information
  posterInfo: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    }
  },

  // Step 1: Area of Interest
  step1: {
    interestedArea: {
      type: String,
      required: [true, 'Please select your area of interest'],
      enum: [
        'Web Development',
        'Small Business Management',
        'Graphic Design',
        'Fitness & Personal Training',
        'Cooking & Baking',
        'UI/UX Design',
        'Machine Learning / AI',
        'Urban Farming',
        'Robotics',
        'Tailoring & Sewing',
        'Poultry Farming',
        'Cattle Farming',
        'Other'
      ]
    },
    otherArea: {
      type: String,
      trim: true,
      default: null
    }
  },

  // Step 2: Skill Level & Goals
  step2: {
    skillLevel: {
      type: String,
      required: [true, 'Please select your skill level'],
      enum: ['Beginner', 'Intermediate', 'Advanced']
    },
    learningGoal: {
      type: String,
      required: [true, 'Please select your learning goal'],
      enum: [
        'Get a new job',
        'Start a business',
        'Freelance work',
        'Personal hobby or improvement',
        'Academic improvement',
        'Other'
      ]
    },
    otherGoal: {
      type: String,
      trim: true,
      default: null
    }
  },

  // Step 3: Time & Learning Style
  step3: {
    timeDedication: {
      type: String,
      required: [true, 'Please select your time dedication'],
      enum: ['0-5 hours', '5-10 hours', '10-20 hours', '20+ hours']
    },
    learningStyle: {
      type: String,
      required: [true, 'Please select your learning style'],
      enum: [
        'Video tutorials',
        'Reading materials',
        'Practice exercises',
        'Interactive sessions',
        'One-on-one mentoring'
      ]
    }
  },

  // Final Step: Start Time
  finalStep: {
    startTime: {
      type: String,
      required: [true, 'Please select when you want to start'],
      enum: ['Immediately', 'Within a week', 'Within a month', 'Not sure yet']
    }
  },

  // Metadata
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const StudyBit = mongoose.model('StudyBit', studyBitSchema);

module.exports = StudyBit;