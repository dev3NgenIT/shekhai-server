const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { auth } = require('../middlewares/auth');

// bkash flow
router.post('/bkash/create', auth, ctrl.createBkashPayment);
router.post('/bkash/execute', auth, ctrl.executeBkashPayment);
router.post('/bkash/webhook', ctrl.bkashWebhook); // public endpoint

module.exports = router;
