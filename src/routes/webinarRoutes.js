// routes/webinarRoutes.js
const express = require("express");
const router = express.Router();
const webinarController = require("../controllers/webinarController");
const registrationController = require("../controllers/registrationController");

// Public routes
router.get("/", webinarController.getAllWebinars);
router.get("/featured", webinarController.getFeaturedWebinars);
router.get("/stats", webinarController.getWebinarStats);
router.get("/:id", webinarController.getWebinar);

// Registration routes
router.post("/:webinarId/register", webinarController.registerForWebinar);
router.get(
  "/:webinarId/registrations",
  webinarController.getWebinarRegistrations,
);

// Protected admin routes (add authentication middleware as needed)
// router.post('/', authMiddleware, adminMiddleware, webinarController.createWebinar);
// router.put('/:id', authMiddleware, adminMiddleware, webinarController.updateWebinar);
// router.delete('/:id', authMiddleware, adminMiddleware, webinarController.deleteWebinar);

// For development, make admin routes public (remove in production)
router.post("/", webinarController.createWebinar);
router.put("/:id", webinarController.updateWebinar);
router.delete("/:id", webinarController.deleteWebinar);

module.exports = router;
