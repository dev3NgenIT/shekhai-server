const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');

// ALL ROUTES ARE PUBLIC - NO AUTH REQUIRED

// Questions routes
router.get('/questions', communityController.getAllQuestions);
router.get('/questions/:id', communityController.getQuestionById);
router.post('/questions', communityController.createQuestion);

// Search questions
router.get('/search', communityController.searchQuestions);

// Answers routes
router.post('/questions/:id/answers', communityController.createAnswer);
router.put('/answers/:id/like', communityController.likeAnswer);
router.put('/answers/:id/accept', communityController.acceptAnswer);

// Community stats
router.get('/stats', communityController.getCommunityStats);

module.exports = router;