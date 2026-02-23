const LiveSession = require("../models/liveSessionModel");
const UserLiveSession = require("../models/userLiveSessionModel");
const User = require("../models/userModel");
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
    isActive: true,
    enrolledUsers: [],
    waitlist: [],
    savedBy: [],
    paymentStats: {
      totalRevenue: 0,
      totalPaidEnrollments: 0,
      totalFreeEnrollments: 0
    }
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
    .populate("instructor", "name email avatar bio")
    .populate("enrolledUsers.user", "name email")
    .populate("waitlist.user", "name email");

  if (!liveSession || !liveSession.isActive) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Increment views
  liveSession.metadata.totalViews = (liveSession.metadata.totalViews || 0) + 1;
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

  // Also soft delete all user relationships
  await UserLiveSession.updateMany(
    { liveSession: req.params.id },
    { status: "expired" }
  );

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

  // Get total revenue
  const totalRevenue = sessions.reduce((sum, session) => {
    return sum + (session.paymentStats?.totalRevenue || 0);
  }, 0);

  res.status(200).json({
    success: true,
    data: {
      totalSessions,
      upcomingSessions,
      liveSessions,
      completedSessions,
      totalParticipants,
      totalRevenue,
      totalEnrollments: await UserLiveSession.countDocuments({ 
        relationshipType: "enrolled",
        status: "active"
      })
    }
  });
});

// ============= USER INTERACTION FUNCTIONS =============

// @desc    Save a live session (for later)
// @route   POST /api/v1/live-sessions/:id/save
// @access  Public (but will need user ID)
const saveLiveSession = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const liveSession = await LiveSession.findById(req.params.id);

  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Check if already saved
  const alreadySaved = await UserLiveSession.findOne({
    user: userId,
    liveSession: req.params.id,
    relationshipType: "saved"
  });

  if (alreadySaved) {
    res.status(400);
    throw new Error("Session already saved");
  }

  // Create saved record
  const savedSession = await UserLiveSession.create({
    user: userId,
    liveSession: req.params.id,
    relationshipType: "saved",
    saved: {
      savedAt: new Date()
    },
    status: "active"
  });

  // Also add to session's savedBy array
  liveSession.savedBy = liveSession.savedBy || [];
  if (!liveSession.savedBy.includes(userId)) {
    liveSession.savedBy.push(userId);
    await liveSession.save();
  }

  res.status(201).json({
    success: true,
    message: "Session saved successfully",
    data: savedSession
  });
});

// @desc    Remove saved session
// @route   DELETE /api/v1/live-sessions/:id/unsave
// @access  Public
const unsaveLiveSession = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const savedSession = await UserLiveSession.findOneAndDelete({
    user: userId,
    liveSession: req.params.id,
    relationshipType: "saved"
  });

  if (!savedSession) {
    res.status(404);
    throw new Error("Saved session not found");
  }

  // Remove from session's savedBy array
  await LiveSession.findByIdAndUpdate(
    req.params.id,
    { $pull: { savedBy: userId } }
  );

  res.status(200).json({
    success: true,
    message: "Session removed from saved"
  });
});

// @desc    Enroll in a live session (with payment)
// @route   POST /api/v1/live-sessions/:id/enroll
// @access  Public
const enrollInLiveSession = asyncHandler(async (req, res) => {
  const {
    userId,
    paymentInfo,
    studentInfo
  } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const liveSession = await LiveSession.findById(req.params.id);

  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  // Check availability
  if (liveSession.availableSlots <= 0) {
    // Add to waitlist if enabled
    if (liveSession.waitlistEnabled) {
      // Check if already on waitlist
      const alreadyWaitlisted = await UserLiveSession.findOne({
        user: userId,
        liveSession: req.params.id,
        relationshipType: "waitlisted"
      });

      if (alreadyWaitlisted) {
        res.status(400);
        throw new Error("Already on waitlist");
      }

      // Check waitlist limit
      if (liveSession.waitlist.length >= (liveSession.maxWaitlist || 50)) {
        res.status(400);
        throw new Error("Waitlist is full");
      }

      const waitlistEntry = await UserLiveSession.create({
        user: userId,
        liveSession: req.params.id,
        relationshipType: "waitlisted",
        waitlist: {
          joinedAt: new Date(),
          position: liveSession.waitlist.length + 1
        },
        status: "active"
      });

      // Add to session waitlist
      liveSession.waitlist.push({
        user: userId,
        joinedAt: new Date(),
        notified: false
      });
      
      liveSession.waitlistCount = liveSession.waitlist.length;
      await liveSession.save();

      return res.status(200).json({
        success: true,
        message: "Added to waitlist",
        data: waitlistEntry,
        waitlist: true
      });
    }

    res.status(400);
    throw new Error("No available slots");
  }

  // Check if already enrolled
  const alreadyEnrolled = await UserLiveSession.findOne({
    user: userId,
    liveSession: req.params.id,
    relationshipType: { $in: ["enrolled", "attended"] }
  });

  if (alreadyEnrolled) {
    res.status(400);
    throw new Error("Already enrolled in this session");
  }

  // Check if it's a free session
  const isFree = !liveSession.isPaid || liveSession.price === 0;

  // Generate enrollment ID
  const enrollmentId = `ENR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Create enrollment record
  const enrollmentData = {
    user: userId,
    liveSession: req.params.id,
    relationshipType: "enrolled",
    enrollment: {
      enrolledAt: new Date(),
      enrollmentId: enrollmentId,
      paymentInfo: isFree ? {
        paymentMethod: "free",
        paymentStatus: "completed",
        amount: 0,
        paidAt: new Date()
      } : {
        paymentId: paymentInfo?.paymentId,
        transactionId: paymentInfo?.transactionId,
        amount: paymentInfo?.amount || liveSession.price,
        currency: paymentInfo?.currency || liveSession.currency || "BDT",
        paymentMethod: paymentInfo?.paymentMethod || "bkash",
        paymentStatus: paymentInfo?.paymentStatus || "completed",
        paidAt: paymentInfo?.paidAt || new Date()
      }
    },
    status: "active"
  };

  // Add student info if provided
  if (studentInfo) {
    enrollmentData.studentInfo = studentInfo;
  }

  const enrollment = await UserLiveSession.create(enrollmentData);

  // Update live session stats
  liveSession.availableSlots -= 1;
  liveSession.metadata.totalEnrollments = (liveSession.metadata.totalEnrollments || 0) + 1;
  
  // Update payment stats if paid
  if (!isFree && paymentInfo?.amount) {
    liveSession.paymentStats = liveSession.paymentStats || {
      totalRevenue: 0,
      totalPaidEnrollments: 0,
      totalFreeEnrollments: 0
    };
    liveSession.paymentStats.totalRevenue = (liveSession.paymentStats.totalRevenue || 0) + paymentInfo.amount;
    liveSession.paymentStats.totalPaidEnrollments = (liveSession.paymentStats.totalPaidEnrollments || 0) + 1;
  } else if (isFree) {
    liveSession.paymentStats = liveSession.paymentStats || {
      totalRevenue: 0,
      totalPaidEnrollments: 0,
      totalFreeEnrollments: 0
    };
    liveSession.paymentStats.totalFreeEnrollments = (liveSession.paymentStats.totalFreeEnrollments || 0) + 1;
  }

  // Add to enrolledUsers array
  liveSession.enrolledUsers = liveSession.enrolledUsers || [];
  liveSession.enrolledUsers.push({
    user: userId,
    enrollmentDate: new Date(),
    status: "enrolled",
    paymentInfo: enrollmentData.enrollment.paymentInfo
  });

  await liveSession.save();

  // Remove from saved if it was saved
  await UserLiveSession.deleteOne({
    user: userId,
    liveSession: req.params.id,
    relationshipType: "saved"
  });

  // Remove from waitlist if it was on waitlist
  await UserLiveSession.deleteOne({
    user: userId,
    liveSession: req.params.id,
    relationshipType: "waitlisted"
  });

  // Remove from session waitlist
  liveSession.waitlist = liveSession.waitlist.filter(
    w => w.user.toString() !== userId
  );
  liveSession.waitlistCount = liveSession.waitlist.length;
  await liveSession.save();

  res.status(201).json({
    success: true,
    message: isFree ? "Successfully enrolled in free session" : "Payment successful! Enrollment completed",
    data: {
      enrollment,
      session: liveSession,
      isFree,
      enrollmentId
    }
  });
});

// @desc    Cancel enrollment
// @route   POST /api/v1/live-sessions/:id/cancel-enrollment
// @access  Public
const cancelEnrollment = asyncHandler(async (req, res) => {
  const { userId, reason } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("User ID is required");
  }

  const enrollment = await UserLiveSession.findOne({
    user: userId,
    liveSession: req.params.id,
    relationshipType: "enrolled"
  });

  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  // Update enrollment status
  enrollment.status = "cancelled";
  await enrollment.save();

  // Update live session
  const liveSession = await LiveSession.findById(req.params.id);
  if (liveSession) {
    liveSession.availableSlots += 1;
    
    // Remove from enrolledUsers array
    liveSession.enrolledUsers = liveSession.enrolledUsers.filter(
      e => e.user.toString() !== userId
    );
    
    await liveSession.save();
  }

  res.status(200).json({
    success: true,
    message: "Enrollment cancelled successfully"
  });
});

// @desc    Get user's saved sessions
// @route   GET /api/v1/live-sessions/user/:userId/saved
// @access  Public
const getUserSavedSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const savedSessions = await UserLiveSession.find({
    user: req.params.userId,
    relationshipType: "saved",
    status: "active"
  })
    .populate({
      path: "liveSession",
      populate: {
        path: "instructor",
        select: "name email avatar"
      }
    })
    .sort({ "saved.savedAt": -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await UserLiveSession.countDocuments({
    user: req.params.userId,
    relationshipType: "saved",
    status: "active"
  });

  res.status(200).json({
    success: true,
    count: savedSessions.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: savedSessions.map(item => ({
      ...item.liveSession.toObject(),
      savedAt: item.saved.savedAt,
      relationshipId: item._id
    }))
  });
});

// @desc    Get user's enrolled sessions
// @route   GET /api/v1/live-sessions/user/:userId/enrolled
// @access  Public
const getUserEnrolledSessions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    user: req.params.userId,
    relationshipType: "enrolled"
  };

  if (status === "active") {
    filter.status = "active";
  } else if (status === "completed") {
    filter.status = "completed";
  } else if (status === "cancelled") {
    filter.status = "cancelled";
  }

  const enrolledSessions = await UserLiveSession.find(filter)
    .populate({
      path: "liveSession",
      populate: {
        path: "instructor",
        select: "name email avatar"
      }
    })
    .sort({ "enrollment.enrolledAt": -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await UserLiveSession.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: enrolledSessions.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: enrolledSessions.map(item => ({
      ...item.liveSession.toObject(),
      enrollmentDetails: item.enrollment,
      attended: item.enrollment?.attended,
      relationshipId: item._id
    }))
  });
});

// @desc    Check if user has saved/enrolled in a session
// @route   GET /api/v1/live-sessions/:id/check-user-status/:userId
// @access  Public
const checkUserSessionStatus = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const [saved, enrolled, waitlisted] = await Promise.all([
    UserLiveSession.findOne({
      user: userId,
      liveSession: id,
      relationshipType: "saved",
      status: "active"
    }),
    UserLiveSession.findOne({
      user: userId,
      liveSession: id,
      relationshipType: "enrolled",
      status: "active"
    }),
    UserLiveSession.findOne({
      user: userId,
      liveSession: id,
      relationshipType: "waitlisted",
      status: "active"
    })
  ]);

  // Get live session for availability info
  const liveSession = await LiveSession.findById(id).select("availableSlots totalSlots waitlistEnabled");

  res.status(200).json({
    success: true,
    data: {
      isSaved: !!saved,
      savedAt: saved?.saved.savedAt,
      isEnrolled: !!enrolled,
      enrolledAt: enrolled?.enrollment.enrolledAt,
      paymentStatus: enrolled?.enrollment.paymentInfo?.paymentStatus,
      isWaitlisted: !!waitlisted,
      waitlistPosition: waitlisted?.waitlist.position,
      relationshipIds: {
        saved: saved?._id,
        enrolled: enrolled?._id,
        waitlisted: waitlisted?._id
      },
      sessionInfo: {
        availableSlots: liveSession?.availableSlots,
        totalSlots: liveSession?.totalSlots,
        waitlistEnabled: liveSession?.waitlistEnabled
      }
    }
  });
});

// @desc    Mark attendance for a session
// @route   POST /api/v1/live-sessions/:id/mark-attendance
// @access  Public
const markAttendance = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const enrollment = await UserLiveSession.findOne({
    user: userId,
    liveSession: req.params.id,
    relationshipType: "enrolled",
    status: "active"
  });

  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  enrollment.enrollment.attended = true;
  enrollment.enrollment.joinedAt = new Date();
  enrollment.relationshipType = "attended";
  await enrollment.save();

  // Update live session attendance
  await LiveSession.findByIdAndUpdate(
    req.params.id,
    { 
      $inc: { "stats.attendanceRate": 1 },
      $set: { "enrolledUsers.$[elem].attended": true }
    },
    {
      arrayFilters: [{ "elem.user": userId }]
    }
  );

  res.status(200).json({
    success: true,
    message: "Attendance marked successfully"
  });
});

// @desc    Get user's waitlisted sessions
// @route   GET /api/v1/live-sessions/user/:userId/waitlisted
// @access  Public
const getUserWaitlistedSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const waitlistedSessions = await UserLiveSession.find({
    user: req.params.userId,
    relationshipType: "waitlisted",
    status: "active"
  })
    .populate({
      path: "liveSession",
      populate: {
        path: "instructor",
        select: "name email avatar"
      }
    })
    .sort({ "waitlist.joinedAt": -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await UserLiveSession.countDocuments({
    user: req.params.userId,
    relationshipType: "waitlisted",
    status: "active"
  });

  res.status(200).json({
    success: true,
    count: waitlistedSessions.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: waitlistedSessions.map(item => ({
      ...item.liveSession.toObject(),
      waitlistInfo: item.waitlist,
      relationshipId: item._id
    }))
  });
});

// @desc    Get all user session activities
// @route   GET /api/v1/live-sessions/user/:userId/all-activities
// @access  Public
const getUserAllActivities = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const activities = await UserLiveSession.find({
    user: req.params.userId
  })
    .populate("liveSession", "title schedule startTime category")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  const grouped = {
    saved: activities.filter(a => a.relationshipType === "saved"),
    enrolled: activities.filter(a => a.relationshipType === "enrolled"),
    waitlisted: activities.filter(a => a.relationshipType === "waitlisted"),
    attended: activities.filter(a => a.relationshipType === "attended"),
    cancelled: activities.filter(a => a.status === "cancelled")
  };

  res.status(200).json({
    success: true,
    data: {
      activities,
      grouped,
      totalCount: activities.length
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
  getDashboardStats,
  // New user interaction functions
  saveLiveSession,
  unsaveLiveSession,
  enrollInLiveSession,
  cancelEnrollment,
  getUserSavedSessions,
  getUserEnrolledSessions,
  getUserWaitlistedSessions,
  getUserAllActivities,
  checkUserSessionStatus,
  markAttendance
};