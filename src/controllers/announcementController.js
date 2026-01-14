const Announcement = require("../models/Announcement");
const Course = require("../models/Course");

// @desc    Get all announcements with filters
// @route   GET /api/v1/announcements
// @access  Public
exports.getAnnouncements = async (req, res) => {
  try {
    const {
      courseId,
      instructorId,
      status = "published", // Default to published for public access
      priority,
      announcementType,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { isActive: true, status: "published" }; // Always show published only for public

    // Apply filters
    if (courseId) filter.courseId = courseId;
    if (instructorId) filter.instructorId = instructorId;
    if (priority) filter.priority = priority;
    if (announcementType) filter.announcementType = announcementType;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
        { courseName: { $regex: search, $options: "i" } },
      ];
    }

    // Filter out expired announcements
    const now = new Date();
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ];

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const announcements = await Announcement.find(filter)
      .populate("courseId", "title code")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Announcement.countDocuments(filter);

    // Add virtual fields
    const announcementsWithVirtuals = announcements.map((announcement) => ({
      ...announcement,
      daysRemaining: announcement.expiresAt
        ? Math.ceil(
            (new Date(announcement.expiresAt) - new Date()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
      isExpired: announcement.expiresAt
        ? new Date() > new Date(announcement.expiresAt)
        : false,
    }));

    res.json({
      success: true,
      count: announcementsWithVirtuals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: announcementsWithVirtuals,
    });
  } catch (error) {
    console.error("Get announcements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single announcement by ID
// @route   GET /api/v1/announcements/:id
// @access  Public
exports.getAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findOne({
      _id: id,
      isActive: true,
      status: "published",
    })
      .populate("courseId", "title code instructor")
      .populate("recipients", "name email")
      .lean();

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Check if announcement is expired
    const now = new Date();
    if (announcement.expiresAt && new Date(announcement.expiresAt) < now) {
      return res.status(410).json({
        success: false,
        message: "This announcement has expired",
      });
    }

    // Increment view count
    await Announcement.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Add virtual fields
    const announcementWithVirtuals = {
      ...announcement,
      daysRemaining: announcement.expiresAt
        ? Math.ceil(
            (new Date(announcement.expiresAt) - now) / (1000 * 60 * 60 * 24)
          )
        : null,
      isExpired: announcement.expiresAt ? new Date(announcement.expiresAt) < now : false,
    };

    res.json({
      success: true,
      data: announcementWithVirtuals,
    });
  } catch (error) {
    console.error("Get announcement error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Create a new announcement
// @route   POST /api/v1/announcements
// @access  Public
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      courseId,
      priority,
      status,
      sentTo,
      recipients,
      scheduleDate,
      expiresAt,
      tags,
      announcementType = "general",
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    let course = null;
    let courseName = null;

    // Handle course announcement
    if (announcementType === "course" && courseId) {
      // Validate course exists
      course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
      courseName = course.title;
    }

    // For public access, use default instructor info
    const defaultInstructor = {
      id: "public_user",
      name: "Public User",
    };

    // Process tags
    let processedTags = [];
    if (tags) {
      if (typeof tags === "string") {
        processedTags = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      } else if (Array.isArray(tags)) {
        processedTags = tags.map((tag) => tag.trim()).filter((tag) => tag);
      }
    }

    // Handle file uploads if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/announcements/${file.filename}`,
      }));
    }

    // Create announcement
    const announcement = await Announcement.create({
      title,
      content,
      courseId: announcementType === "course" && courseId ? courseId : null,
      courseName: announcementType === "course" ? courseName : null,
      announcementType,
      instructorId: defaultInstructor.id,
      instructorName: defaultInstructor.name,
      priority: priority || "medium",
      status: status || "draft",
      sentTo: sentTo || "all",
      recipients: recipients || [],
      scheduleDate: scheduleDate || null,
      expiresAt: expiresAt || null,
      tags: processedTags,
      publishDate: status === "published" ? new Date() : null,
      attachments: attachments,
    });

    res.status(201).json({
      success: true,
      data: announcement,
      message: `Announcement created successfully (${announcementType})`,
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update an announcement
// @route   PUT /api/v1/announcements/:id
// @access  Public
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find announcement
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Handle course change if updating
    if (
      updateData.courseId &&
      updateData.courseId !== announcement.courseId?.toString()
    ) {
      const newCourse = await Course.findById(updateData.courseId);
      if (!newCourse) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
      updateData.courseName = newCourse.title;
    }

    // If status is changing to published, set publishDate
    if (
      updateData.status === "published" &&
      announcement.status !== "published"
    ) {
      updateData.publishDate = new Date();
    }

    // Process tags if provided
    if (updateData.tags) {
      if (typeof updateData.tags === "string") {
        updateData.tags = updateData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      } else if (Array.isArray(updateData.tags)) {
        updateData.tags = updateData.tags
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }
    }

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      updateData.attachments = [
        ...announcement.attachments,
        ...req.files.map((file) => ({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: `/uploads/announcements/${file.filename}`,
        })),
      ];
    }

    // Update announcement
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("courseId", "title code")
      .populate("recipients", "name email");

    res.json({
      success: true,
      data: updatedAnnouncement,
      message: "Announcement updated successfully",
    });
  } catch (error) {
    console.error("Update announcement error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/v1/announcements/:id
// @access  Public
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    // Find announcement
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Soft delete (set isActive to false)
    announcement.isActive = false;
    await announcement.save();

    res.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Publish an announcement
// @route   PATCH /api/v1/announcements/:id/publish
// @access  Public
exports.publishAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.status = "published";
    announcement.publishDate = new Date();
    await announcement.save();

    res.json({
      success: true,
      data: announcement,
      message: "Announcement published successfully",
    });
  } catch (error) {
    console.error("Publish announcement error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get announcement statistics
// @route   GET /api/v1/announcements/stats/overview
// @access  Public
exports.getAnnouncementStats = async (req, res) => {
  try {
    const { courseId, announcementType } = req.query;
    const filter = { isActive: true, status: "published" };

    if (courseId) filter.courseId = courseId;
    if (announcementType) filter.announcementType = announcementType;

    const total = await Announcement.countDocuments(filter);
    const published = await Announcement.countDocuments({
      ...filter,
      status: "published",
    });

    // Get announcements by type
    const typeStats = await Announcement.aggregate([
      { $match: filter },
      { $group: { _id: "$announcementType", count: { $sum: 1 } } },
    ]);

    // Get announcements by priority
    const priorityStats = await Announcement.aggregate([
      { $match: filter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    // Get announcements by course (only for course announcements)
    const courseStats = await Announcement.aggregate([
      { $match: { ...filter, announcementType: "course" } },
      {
        $group: {
          _id: "$courseId",
          count: { $sum: 1 },
          courseName: { $first: "$courseName" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      data: {
        total,
        published,
        types: typeStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        priorities: priorityStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        topCourses: courseStats,
      },
    });
  } catch (error) {
    console.error("Get announcement stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get announcements by course
// @route   GET /api/v1/announcements/course/:courseId
// @access  Public
exports.getCourseAnnouncements = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const filter = {
      courseId,
      isActive: true,
      status: "published",
      announcementType: "course",
    };

    // Filter out expired announcements
    const now = new Date();
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const announcements = await Announcement.find(filter)
      .populate("instructorId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Announcement.countDocuments(filter);

    // Add virtual fields
    const announcementsWithVirtuals = announcements.map((announcement) => ({
      ...announcement,
      daysRemaining: announcement.expiresAt
        ? Math.ceil(
            (new Date(announcement.expiresAt) - new Date()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
      isExpired: announcement.expiresAt
        ? new Date() > new Date(announcement.expiresAt)
        : false,
    }));

    res.json({
      success: true,
      count: announcementsWithVirtuals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: announcementsWithVirtuals,
    });
  } catch (error) {
    console.error("Get course announcements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get general announcements
// @route   GET /api/v1/announcements/general
// @access  Public
exports.getGeneralAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const filter = {
      isActive: true,
      status: "published",
      announcementType: "general",
    };

    // Filter out expired announcements
    const now = new Date();
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const announcements = await Announcement.find(filter)
      .populate("instructorId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Announcement.countDocuments(filter);

    // Add virtual fields
    const announcementsWithVirtuals = announcements.map((announcement) => ({
      ...announcement,
      daysRemaining: announcement.expiresAt
        ? Math.ceil(
            (new Date(announcement.expiresAt) - new Date()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
      isExpired: announcement.expiresAt
        ? new Date() > new Date(announcement.expiresAt)
        : false,
    }));

    res.json({
      success: true,
      count: announcementsWithVirtuals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: announcementsWithVirtuals,
    });
  } catch (error) {
    console.error("Get general announcements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get announcements for dashboard
// @route   GET /api/v1/announcements/dashboard/recent
// @access  Public
exports.getRecentAnnouncements = async (req, res) => {
  try {
    const { limit = 5, type = "all" } = req.query;

    const filter = {
      isActive: true,
      status: "published",
    };

    // Filter by type if specified
    if (type === "general") {
      filter.announcementType = "general";
    } else if (type === "course") {
      filter.announcementType = "course";
    }

    // Filter out expired announcements
    const now = new Date();
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ];

    const announcements = await Announcement.find(filter)
      .populate("courseId", "title code")
      .populate("instructorId", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Add virtual fields
    const announcementsWithVirtuals = announcements.map((announcement) => ({
      ...announcement,
      daysRemaining: announcement.expiresAt
        ? Math.ceil(
            (new Date(announcement.expiresAt) - now) / (1000 * 60 * 60 * 24)
          )
        : null,
      isExpired: announcement.expiresAt ? new Date(announcement.expiresAt) < now : false,
    }));

    res.json({
      success: true,
      data: announcementsWithVirtuals,
    });
  } catch (error) {
    console.error("Get recent announcements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Remove attachment from announcement
// @route   DELETE /api/v1/announcements/:id/attachments/:attachmentId
// @access  Public
exports.removeAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Remove the attachment
    announcement.attachments = announcement.attachments.filter(
      (attachment) => attachment._id.toString() !== attachmentId
    );

    await announcement.save();

    res.json({
      success: true,
      message: "Attachment removed successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Remove attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get announcements by instructor
// @route   GET /api/v1/announcements/instructor/:instructorId
// @access  Public
exports.getInstructorAnnouncements = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { page = 1, limit = 10, type = "all" } = req.query;

    const filter = {
      instructorId,
      isActive: true,
      status: "published",
    };

    // Filter by type if specified
    if (type === "general") {
      filter.announcementType = "general";
    } else if (type === "course") {
      filter.announcementType = "course";
    }

    // Filter out expired announcements
    const now = new Date();
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const announcements = await Announcement.find(filter)
      .populate("courseId", "title code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Announcement.countDocuments(filter);

    // Add virtual fields
    const announcementsWithVirtuals = announcements.map((announcement) => ({
      ...announcement,
      daysRemaining: announcement.expiresAt
        ? Math.ceil(
            (new Date(announcement.expiresAt) - new Date()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
      isExpired: announcement.expiresAt
        ? new Date() > new Date(announcement.expiresAt)
        : false,
    }));

    res.json({
      success: true,
      count: announcementsWithVirtuals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: announcementsWithVirtuals,
    });
  } catch (error) {
    console.error("Get instructor announcements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};