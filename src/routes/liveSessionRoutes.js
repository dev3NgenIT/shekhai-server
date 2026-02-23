const express = require("express");
const router = express.Router();
const {
  // Existing functions
  createLiveSession,
  getAllLiveSessions,
  getUpcomingSessions,
  getLiveNowSessions,
  getLiveSessionById,
  updateLiveSession,
  deleteLiveSession,
  startLiveSession,
  endLiveSession,
  getSessionsByInstructor,
  searchLiveSessions,
  getDashboardStats,

  // NEW USER INTERACTION FUNCTIONS
  saveLiveSession,
  unsaveLiveSession,
  enrollInLiveSession,
  cancelEnrollment,
  getUserSavedSessions,
  getUserEnrolledSessions,
  getUserWaitlistedSessions,
  getUserAllActivities,
  checkUserSessionStatus,
  markAttendance,
} = require("../controllers/liveSessionController");

// ============= PUBLIC ROUTES =============
router.get("/", getAllLiveSessions);
router.get("/upcoming", getUpcomingSessions);
router.get("/live-now", getLiveNowSessions);
router.get("/search", searchLiveSessions);
router.get("/stats/overview", getDashboardStats);
router.get("/instructor/:instructorId", getSessionsByInstructor);
router.get("/:id", getLiveSessionById);

// ============= USER INTERACTION ROUTES =============

// Session status check
router.get("/:id/check-user-status/:userId", checkUserSessionStatus);

// Save/Unsave routes
router.post("/:id/save", saveLiveSession);
router.delete("/:id/unsave", unsaveLiveSession);

// Enrollment routes
router.post("/:id/enroll", enrollInLiveSession);
router.post("/:id/cancel-enrollment", cancelEnrollment);
router.post("/:id/mark-attendance", markAttendance);

// User's saved sessions
router.get("/user/:userId/saved", getUserSavedSessions);

// User's enrolled sessions (with optional status filter)
router.get("/user/:userId/enrolled", getUserEnrolledSessions);

// User's waitlisted sessions
router.get("/user/:userId/waitlisted", getUserWaitlistedSessions);

// User's all session activities
router.get("/user/:userId/all-activities", getUserAllActivities);

// ============= ADMIN/INSTRUCTOR ROUTES =============
router.post("/", createLiveSession);
router.put("/:id", updateLiveSession);
router.delete("/:id", deleteLiveSession);
router.post("/:id/start", startLiveSession);
router.post("/:id/end", endLiveSession);

module.exports = router;
