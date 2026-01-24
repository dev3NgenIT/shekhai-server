// src/models/Registration.js
const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  webinar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webinar',
    required: [true, 'Webinar ID is required']
  },
  
  user: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true
    },
    
    phone: {
      type: String,
      trim: true
    },
    
    role: {
      type: String,
      default: 'other'
    },
    
    organization: {
      type: String,
      trim: true
    }
  },
  
  payment: {
    amount: {
      type: Number,
      default: 0
    },
    
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    
    transactionId: String,
    paymentMethod: String,
    paidAt: Date
  },
  
  preferences: {
    receiveSMS: {
      type: Boolean,
      default: false
    },
    
    receiveEmailUpdates: {
      type: Boolean,
      default: true
    }
  },
  
  status: {
    type: String,
    enum: ['registered', 'attended', 'cancelled', 'waitlisted'],
    default: 'registered'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);