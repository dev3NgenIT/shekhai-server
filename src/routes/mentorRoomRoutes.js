// routes/mentorRoomRoutes.js
const express = require('express');
const router = express.Router();
const mentorRoomController = require('../controllers/mentorRoomController');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateMentorRoom = [
  body('title').notEmpty().withMessage('Title is required'),
  body('badge').notEmpty().withMessage('Badge is required'),
  body('short_description').notEmpty().withMessage('Short description is required'),
  body('section_one.title').notEmpty().withMessage('Section one title is required'),
  body('section_one.instructor_name').notEmpty().withMessage('Instructor name is required'),
  body('section_one.instructor_rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  body('section_two.box_title').notEmpty().withMessage('Section two box title is required'),
  body('cta_section.title').notEmpty().withMessage('CTA title is required'),
  body('section_three.title').notEmpty().withMessage('Section three title is required')
];

// Get mentor room data
router.get('/', mentorRoomController.getMentorRoom);

// Create or update mentor room (full document)
router.post('/', validateMentorRoom, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
}, mentorRoomController.createOrUpdateMentorRoom);

// Update mentor room (partial update)
router.patch('/', mentorRoomController.updateMentorRoom);

// Delete mentor room
router.delete('/', mentorRoomController.deleteMentorRoom);

module.exports = router;