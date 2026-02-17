const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  submitStudyBit,
  getAllStudyBits,
  getStudyBitById,
  deleteStudyBit,
  getStats
} = require('../controllers/studyBitController');

// Validation rules for submission
const validateSubmission = [
  // Poster Info
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required').trim(),

  // Step 1
  body('step1.interestedArea')
    .notEmpty()
    .withMessage('Please select your area of interest')
    .isIn([
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
    ]),
  body('step1.otherArea')
    .if(body('step1.interestedArea').equals('Other'))
    .notEmpty()
    .withMessage('Please specify your area of interest')
    .trim(),

  // Step 2
  body('step2.skillLevel')
    .notEmpty()
    .withMessage('Please select your skill level')
    .isIn(['Beginner', 'Intermediate', 'Advanced']),
  body('step2.learningGoal')
    .notEmpty()
    .withMessage('Please select your learning goal')
    .isIn([
      'Get a new job',
      'Start a business',
      'Freelance work',
      'Personal hobby or improvement',
      'Academic improvement',
      'Other'
    ]),
  body('step2.otherGoal')
    .if(body('step2.learningGoal').equals('Other'))
    .notEmpty()
    .withMessage('Please specify your learning goal')
    .trim(),

  // Step 3
  body('step3.timeDedication')
    .notEmpty()
    .withMessage('Please select your time dedication')
    .isIn(['0-5 hours', '5-10 hours', '10-20 hours', '20+ hours']),
  body('step3.learningStyle')
    .notEmpty()
    .withMessage('Please select your learning style')
    .isIn([
      'Video tutorials',
      'Reading materials',
      'Practice exercises',
      'Interactive sessions',
      'One-on-one mentoring'
    ]),

  // Final Step
  body('finalStep.startTime')
    .notEmpty()
    .withMessage('Please select when you want to start')
    .isIn(['Immediately', 'Within a week', 'Within a month', 'Not sure yet'])
];

// Routes
router.post('/submit', validateSubmission, submitStudyBit);
router.get('/all', getAllStudyBits);
router.get('/stats', getStats);
router.get('/:id', getStudyBitById);
router.delete('/:id', deleteStudyBit);

module.exports = router;