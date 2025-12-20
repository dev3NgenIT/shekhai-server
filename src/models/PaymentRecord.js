const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  provider: { type: String, enum: ['bkash'], default: 'bkash' },
  providerPaymentId: String,
  amount: Number,
  currency: { type: String, default: 'BDT' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  status: { type: String, enum: ['pending','completed','failed','refunded'], default: 'pending' },
  rawResponse: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('PaymentRecord', paymentSchema);
