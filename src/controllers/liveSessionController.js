const LiveSession = require("../models/liveSessionModel");
const asyncHandler = require("express-async-handler");

// @desc    Create a new live session
// @route   POST /api/v1/live-sessions
// @access  Public (for now)
const createLiveSession = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    instructor,
    category,
    subCategory,
    type,
    isPaid,
    price,
    discountedPrice,
    schedule,
    liveDetails,
    totalSlots,
    enrollmentDeadline,
    waitlistEnabled,
    maxWaitlist,
    materials,
    prerequisites,
    whatYoullGet,
    recordSession,
    autoPublishRecording,
    recordingAvailableFor,
    recordingDownloadable,
    sendReminders,
    language,
    level,
    tags
  } = req.body;

  // Validate required fields
  if (!title || !description || !category || !schedule?.startTime || !schedule?.endTime) {
    res.status(400);
    throw new Error("Please provide all required fields: title, description, category, schedule.startTime, schedule.endTime");
  }

  // Check if end time is after start time
  if (new Date(schedule.endTime) <= new Date(schedule.startTime)) {
    res.status(400);
    throw new Error("End time must be after start time");
  }

  // Create live session (NO authentication checks)
  const liveSession = await LiveSession.create({
    title,
    description,
    instructor: instructor || "default-instructor-id", // Accept whatever is sent
    category,
    subCategory: subCategory || "",
    type: type || "live",
    status: "draft",
    isPaid: isPaid || false,
    price: isPaid ? (price || 0) : 0,
    currency: "USD",
    discountedPrice: discountedPrice,
    schedule: {
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      duration: schedule.duration || 60,
      timezone: schedule.timezone || "UTC",
      recurring: schedule.recurring || false,
      recurrencePattern: schedule.recurrencePattern || null
    },
    liveDetails: liveDetails || {
      platform: "custom",
      chatEnabled: true,
      qaEnabled: true,
      pollsEnabled: true,
      screenShareEnabled: true,
      whiteboardEnabled: true
    },
    totalSlots: totalSlots || 100,
    availableSlots: totalSlots || 100,
    enrollmentDeadline: enrollmentDeadline,
    waitlistEnabled: waitlistEnabled || false,
    maxWaitlist: maxWaitlist || 50,
    materials: materials || [],
    prerequisites: prerequisites || [],
    whatYoullGet: whatYoullGet || [],
    recordSession: recordSession !== undefined ? recordSession : true,
    autoPublishRecording: autoPublishRecording !== undefined ? autoPublishRecording : true,
    recordingAvailableFor: recordingAvailableFor || 30,
    recordingDownloadable: recordingDownloadable || false,
    sendReminders: sendReminders !== undefined ? sendReminders : true,
    language: language || "English",
    level: level || "All Levels",
    tags: tags || [],
    isActive: true
  });

  res.status(201).json({
    success: true,
    message: "Live session created successfully",
    data: liveSession
  });
});

// @desc    Get all live sessions
// @route   GET /api/v1/live-sessions
// @access  Public
const getAllLiveSessions = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    instructor,
    isPaid,
    level,
    language,
    search,
    page = 1,
    limit = 10,
    sort = "schedule.startTime"
  } = req.query;

  // Build filter
  const filter = { isActive: true };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (instructor) filter.instructor = instructor;
  if (isPaid !== undefined) filter.isPaid = isPaid === "true";
  if (level) filter.level = level;
  if (language) filter.language = language;

  // Search
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute query
  const liveSessions = await LiveSession.find(filter)
    .populate("instructor", "name email avatar")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await LiveSession.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: liveSessions.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: liveSessions
  });
});

// @desc    Get upcoming live sessions
// @route   GET /api/v1/live-sessions/upcoming
// @access  Public
const getUpcomingSessions = asyncHandler(async (req, res) => {
  const now = new Date();
  const limit = parseInt(req.query.limit) || 10;

  const upcomingSessions = await LiveSession.find({
    "schedule.startTime": { $gt: now },
    status: { $in: ["upcoming", "live"] },
    isActive: true
  })
    .populate("instructor", "name email avatar")
    .sort({ "schedule.startTime": 1 })
    .limit(limit);

  res.status(200).json({
    success: true,
    count: upcomingSessions.length,
    data: upcomingSessions
  });
});

// @desc    Get currently live sessions
// @route   GET /api/v1/live-sessions/live-now
// @access  Public
const getLiveNowSessions = asyncHandler(async (req, res) => {
  const now = new Date();
  
  const liveSessions = await LiveSession.find({
    "schedule.startTime": { $lte: now },
    "schedule.endTime": { $gte: now },
    status: "live",
    isActive: true
  })
    .populate("instructor", "name email avatar")
    .sort({ "schedule.startTime": 1 });

  res.status(200).json({
    success: true,
    count: liveSessions.length,
    data: liveSessions
  });
});

// @desc    Get single live session by ID
// @route   GET /api/v1/live-sessions/:id
// @access  Public
const getLiveSessionById = asyncHandler(async (req, res) => {
  const liveSession = await LiveSession.findById(req.params.id)
    .populate("instructor", "name email avatar bio");

  if (!liveSession || !liveSession.isActive) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Increment views
  liveSession.views = (liveSession.views || 0) + 1;
  await liveSession.save();

  res.status(200).json({
    success: true,
    data: liveSession
  });
});

// @desc    Update live session
// @route   PUT /api/v1/live-sessions/:id
// @access  Public (for now)
const updateLiveSession = asyncHandler(async (req, res) => {
  let liveSession = await LiveSession.findById(req.params.id);

  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Update fields
  const updates = req.body;

  // Handle nested updates
  if (updates.schedule && updates.schedule.startTime) {
    if (new Date(updates.schedule.startTime) <= new Date()) {
      res.status(400);
      throw new Error("Start time must be in the future");
    }
  }

  liveSession = await LiveSession.findByIdAndUpdate(
    req.params.id,
    updates,
    {
      new: true,
      runValidators: true
    }
  ).populate("instructor", "name email avatar");

  res.status(200).json({
    success: true,
    message: "Live session updated successfully",
    data: liveSession
  });
});

// @desc    Delete live session
// @route   DELETE /api/v1/live-sessions/:id
// @access  Public (for now)
const deleteLiveSession = asyncHandler(async (req, res) => {
  const liveSession = await LiveSession.findById(req.params.id);

  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Soft delete
  liveSession.isActive = false;
  await liveSession.save();

  res.status(200).json({
    success: true,
    message: "Live session deleted successfully"
  });
});

// @desc    Start a live session
// @route   POST /api/v1/live-sessions/:id/start
// @access  Public (for now)
const startLiveSession = asyncHandler(async (req, res) => {
  const liveSession = await LiveSession.findById(req.params.id);

  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Check if session can be started
  if (liveSession.status === "live") {
    res.status(400);
    throw new Error("Session is already live");
  }

  if (liveSession.status === "completed") {
    res.status(400);
    throw new Error("Cannot start a completed session");
  }

  // Update status
  liveSession.status = "live";
  await liveSession.save();

  res.status(200).json({
    success: true,
    message: "Live session started successfully",
    data: liveSession
  });
});

// @desc    End a live session
// @route   POST /api/v1/live-sessions/:id/end
// @access  Public (for now)
const endLiveSession = asyncHandler(async (req, res) => {
  const liveSession = await LiveSession.findById(req.params.id);

  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Check if session is live
  if (liveSession.status !== "live") {
    res.status(400);
    throw new Error("Session is not currently live");
  }

  // Update status and recording URL
  liveSession.status = "completed";
  
  if (req.body.recordingUrl) {
    liveSession.liveDetails.recordingUrl = req.body.recordingUrl;
  }

  await liveSession.save();

  res.status(200).json({
    success: true,
    message: "Live session ended successfully",
    data: liveSession
  });
});

// @desc    Get sessions by instructor
// @route   GET /api/v1/live-sessions/instructor/:instructorId
// @access  Public
const getSessionsByInstructor = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    instructor: req.params.instructorId,
    isActive: true
  };

  if (status) {
    filter.status = status;
  }

  const sessions = await LiveSession.find(filter)
    .populate("instructor", "name email avatar")
    .sort({ "schedule.startTime": -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await LiveSession.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: sessions.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: sessions
  });
});

// @desc    Search live sessions
// @route   GET /api/v1/live-sessions/search
// @access  Public
const searchLiveSessions = asyncHandler(async (req, res) => {
  const { q, category, level, isPaid, type, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  if (!q) {
    res.status(400);
    throw new Error("Search query is required");
  }

  const filter = {
    isActive: true,
    $or: [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } }
    ]
  };

  if (category) filter.category = category;
  if (level) filter.level = level;
  if (isPaid !== undefined) filter.isPaid = isPaid === "true";
  if (type) filter.type = type;

  const sessions = await LiveSession.find(filter)
    .populate("instructor", "name email avatar")
    .sort({ "schedule.startTime": 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await LiveSession.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: sessions.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: sessions
  });
});

// @desc    Get dashboard stats
// @route   GET /api/v1/live-sessions/stats/overview
// @access  Public
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  
  const totalSessions = await LiveSession.countDocuments({ isActive: true });
  const upcomingSessions = await LiveSession.countDocuments({
    "schedule.startTime": { $gt: now },
    status: "upcoming",
    isActive: true
  });
  const liveSessions = await LiveSession.countDocuments({
    "schedule.startTime": { $lte: now },
    "schedule.endTime": { $gte: now },
    status: "live",
    isActive: true
  });
  const completedSessions = await LiveSession.countDocuments({
    "schedule.endTime": { $lt: now },
    status: "completed",
    isActive: true
  });

  // Get total participants
  const sessions = await LiveSession.find({ isActive: true });
  const totalParticipants = sessions.reduce((sum, session) => {
    return sum + (session.totalSlots - session.availableSlots);
  }, 0);

  res.status(200).json({
    success: true,
    data: {
      totalSessions,
      upcomingSessions,
      liveSessions,
      completedSessions,
      totalParticipants
    }
  });
});

module.exports = {
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
};