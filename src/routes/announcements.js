const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcementController");
const upload = require("../middlewares/upload");

// Public routes - No authentication required
router.get("/", announcementController.getAnnouncements);
router.get("/:id", announcementController.getAnnouncement);
router.get("/course/:courseId", announcementController.getCourseAnnouncements);
router.get("/general", announcementController.getGeneralAnnouncements);
router.get("/instructor/:instructorId", announcementController.getInstructorAnnouncements);
router.get("/dashboard/recent", announcementController.getRecentAnnouncements);

// Create and update routes - No authentication required
router.post(
  "/",
  upload.array("attachments", 5),
  announcementController.createAnnouncement
);

router.put(
  "/:id",
  upload.array("attachments", 5),
  announcementController.updateAnnouncement
);

// Delete and other routes - No authentication required
router.delete(
  "/:id",
  announcementController.deleteAnnouncement
);

router.patch(
  "/:id/publish",
  announcementController.publishAnnouncement
);

router.delete(
  "/:id/attachments/:attachmentId",
  announcementController.removeAttachment
);

router.get(
  "/stats/overview",
  announcementController.getAnnouncementStats
);

module.exports = router;