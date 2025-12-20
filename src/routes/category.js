const express = require("express");
const router = express.Router();
const { auth, permit } = require("../middlewares/auth");
const ctrl = require("../controllers/categoryController");

// Public
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.get("/:id/courses", ctrl.getCoursesByCategory); // NEW: get all courses under this category

// Admin only
router.post("/", auth, permit("admin", "instructor"), ctrl.create);
router.delete("/:id", auth, permit("admin", "instructor"), ctrl.remove);
// Update category (Admin or Instructor)
router.put("/:id", auth, permit("admin", "instructor"), ctrl.update);

module.exports = router;
