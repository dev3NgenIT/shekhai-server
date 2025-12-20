const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');

// Remove multer from here - we'll handle it in the controller
// ALL ROUTES ARE PUBLIC - NO AUTH REQUIRED

// Get all questions
router.get('/questions', communityController.getAllQuestions);

// Get single question with answers
router.get('/questions/:id', communityController.getQuestionById);

// Get community statistics
router.get('/stats', communityController.getCommunityStats);

// Create new question
router.post('/questions', communityController.createQuestion);

// Add answer to question
router.post('/questions/:id/answers', communityController.createAnswer);

module.exports = router;