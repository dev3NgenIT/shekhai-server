const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.post('/signup', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], ctrl.signup);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], ctrl.login);

router.post('/refresh', ctrl.refreshToken);

module.exports = router;
