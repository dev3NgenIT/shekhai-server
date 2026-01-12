// routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  toggleQuizStatus,
  getInstructorQuizzes,
  getQuizzesByCourse
} = require('../controllers/quizController');
const { auth, permit } = require('../middlewares/auth');

// All routes are protected
router.use(auth);

// Get all quizzes (all authenticated users can view, but filtered by role)
router.get('/', getQuizzes);

// Get instructor's quizzes
router.get('/instructors/:instructorId/quizzes', permit('instructor', 'admin'), getInstructorQuizzes);

// Get quizzes by course
router.get('/courses/:courseId/quizzes', getQuizzesByCourse);

// Get single quiz
router.get('/:id', getQuiz);

// Create quiz (instructor/admin only)
router.post('/', permit('instructor', 'admin'), createQuiz);

// Update quiz (instructor/admin only)
router.put('/:id', permit('instructor', 'admin'), updateQuiz);

// Delete quiz (instructor/admin only)
router.delete('/:id', permit('instructor', 'admin'), deleteQuiz);

// Toggle quiz status (instructor/admin only)
router.patch('/:id/toggle-status', permit('instructor', 'admin'), toggleQuizStatus);

module.exports = router;