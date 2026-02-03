const express = require("express");
const router = express.Router();
const {
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
  getDashboardStats
} = require("../controllers/liveSessionController");

// Public routes (NO authentication)
router.get("/", getAllLiveSessions);
router.get("/upcoming", getUpcomingSessions);
router.get("/live-now", getLiveNowSessions);
router.get("/search", searchLiveSessions);
router.get("/stats/overview", getDashboardStats);
router.get("/instructor/:instructorId", getSessionsByInstructor);
router.get("/:id", getLiveSessionById);

// Create, update, delete routes (NO authentication)
router.post("/", createLiveSession);
router.put("/:id", updateLiveSession);
router.delete("/:id", deleteLiveSession);
router.post("/:id/start", startLiveSession);
router.post("/:id/end", endLiveSession);

module.exports = router;