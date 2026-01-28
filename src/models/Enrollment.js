const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  coursePrice: {
    type: Number,
    required: true
  },
  studentInfo: {
    fullname: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  paymentInfo: {
    method: {
      type: String,
      default: 'bKash'
    },
    paymentId: {
      type: String,
      required: true
    },
    transactionId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
      default: 'Completed'
    },
    paidAt: {
      type: Date,
      default: Date.now
    }
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateId: String,
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for faster queries
enrollmentSchema.index({ 'studentInfo.email': 1 });
enrollmentSchema.index({ 'studentInfo.phone': 1 });
enrollmentSchema.index({ courseId: 1 });
enrollmentSchema.index({ 'paymentInfo.paymentId': 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;