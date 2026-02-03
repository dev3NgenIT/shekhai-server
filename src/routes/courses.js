const express = require("express");
const router = express.Router();
const { auth, permit } = require("../middlewares/auth");
const coursesCtrl = require("../controllers/courseController");

// Make sure all controller functions exist
console.log("Available controller functions:", Object.keys(coursesCtrl));

// PUBLIC ROUTES
router.get("/", coursesCtrl.list); // List all published courses
router.get("/:id", coursesCtrl.get); // Get single course

// PROTECTED ROUTES
router.post("/", 
  auth, 
  permit("instructor", "admin"), 
  coursesCtrl.uploadCourseImages, // Middleware for file upload
  coursesCtrl.create
);

router.put("/:id", auth, permit("instructor", "admin"), coursesCtrl.update);
router.delete("/:id", auth, permit("instructor", "admin"), coursesCtrl.remove);

// LEARNING ROUTES (for enrolled students)
router.get("/:courseId/learn", auth, coursesCtrl.getCourseForLearning);
router.get("/:courseId/syllabus", auth, coursesCtrl.getSyllabus);
router.put("/:courseId/lessons/:lessonId/progress", auth, coursesCtrl.updateLessonProgress);

// QUIZ & EXAM ROUTES
router.get("/:courseId/quizzes", auth, (req, res) => {
  // Forward to quiz controller or handle here
  res.json({ message: "Get course quizzes" });
});

router.get("/:courseId/exams", auth, (req, res) => {
  // Forward to exam controller or handle here
  res.json({ message: "Get course exams" });
});

module.exports = router;