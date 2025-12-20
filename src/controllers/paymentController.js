const PaymentRecord = require('../models/PaymentRecord');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const bkash = require('../services/bkashService');

// Create payment (bkash) - returns a payment token/checkout info
exports.createBkashPayment = async (req,res,next) => {
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if(!course) return res.status(404).json({ msg: 'Course not found' });
  if(course.price <= 0) return res.status(400).json({ msg: 'Course is free' });

  // create a pending PaymentRecord
  const payment = await PaymentRecord.create({
    provider: 'bkash',
    amount: course.price,
    currency: course.currency,
    user: req.user.id,
    course: course._id,
    status: 'pending'
  });

  // call bkash service to create payment
  const createResp = await bkash.createPayment({ amount: course.price, paymentId: payment._id.toString(), intent: 'sale' });

  // store raw response
  payment.rawResponse = createResp;
  await payment.save();

  res.json({ paymentId: payment._id, bkash: createResp });
};

// Execute payment after frontend completes approval
exports.executeBkashPayment = async (req,res,next) => {
  const { bkashPaymentID, localPaymentId } = req.body;
  const payment = await PaymentRecord.findById(localPaymentId);
  if(!payment) return res.status(404).json({ msg:'Payment not found' });

  const execResp = await bkash.executePayment({ paymentID: bkashPaymentID });

  payment.rawResponse = execResp;
  payment.status = execResp && execResp.status === 'success' ? 'completed' : 'failed';
  payment.providerPaymentId = bkashPaymentID;
  await payment.save();

  if(payment.status === 'completed'){
    // create enrollment
    await Enrollment.create({ course: payment.course, student: payment.user, paymentId: payment._id });
  }

  res.json({ ok: true, payment });
};

// Webhook endpoint (public)
exports.bkashWebhook = async (req,res,next) => {
  // This scaffold just logs the payload and returns 200.
  console.log('bkash webhook received', req.body);
  // In production: validate signature, update PaymentRecord by providerPaymentId, set status, notify user.
  res.json({ ok: true });
};
