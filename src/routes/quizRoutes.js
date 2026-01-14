const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const quizAttemptController = require("../controllers/quizAttemptController");

// All routes are public (no authentication required)

// Quiz management routes
router.post("/", quizController.createQuiz);
router.get("/", quizController.getQuizzes);
router.get("/:id", quizController.getQuiz);
router.put("/:id", quizController.updateQuiz);
router.delete("/:id", quizController.deleteQuiz);
router.patch("/:id/publish", quizController.publishQuiz);
router.post("/:id/questions", quizController.addQuestion);
router.get("/:id/analytics", quizController.getQuizAnalytics);

// Course & module specific routes
router.get("/course/:courseId", quizController.getCourseQuizzes);
router.get("/module/:moduleId", quizController.getModuleQuizzes);
router.get("/upcoming", quizController.getUpcomingQuizzes);
router.get("/calendar/:year/:month", quizController.getQuizCalendar);

// Quiz attempts routes
router.post("/:id/attempt", quizAttemptController.startQuizAttempt);
router.post("/:id/submit", quizAttemptController.submitQuizAttempt);
router.get("/attempts/my-attempts", quizAttemptController.getUserQuizAttempts);
router.get("/attempts/:id", quizAttemptController.getQuizAttempt);

module.exports = router;