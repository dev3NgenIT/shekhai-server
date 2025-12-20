const express = require("express");
const router = express.Router();
const { auth, permit } = require("../middlewares/auth");
const coursesCtrl = require("../controllers/courseController");

// Anyone can list published courses
router.get("/", coursesCtrl.list);

// Anyone can view a single published course
router.get("/:id", coursesCtrl.get);

// PROTECTED ROUTES (Instructor & Admin)

// Create course (with file upload middleware)
router.post("/", 
  auth, 
  permit("instructor", "admin"), 
  coursesCtrl.uploadCourseImages,  // Add this middleware
  coursesCtrl.create
);

// Update course
router.put("/:id", auth, permit("instructor", "admin"), coursesCtrl.update);

// Delete course
router.delete("/:id", auth, permit("instructor", "admin"), coursesCtrl.remove);

module.exports = router;