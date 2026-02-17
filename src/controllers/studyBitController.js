const StudyBit = require('../models/StudyBit');
const { validationResult } = require('express-validator');

// @desc    Submit complete study bit form
// @route   POST /api/v1/study-bit/submit
// @access  Public
exports.submitStudyBit = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      name,
      email,
      phone,
      step1,
      step2,
      step3,
      finalStep
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and phone are required'
      });
    }

    // Validate step1
    if (!step1?.interestedArea) {
      return res.status(400).json({
        success: false,
        error: 'Please select your area of interest'
      });
    }

    // Validate step2
    if (!step2?.skillLevel || !step2?.learningGoal) {
      return res.status(400).json({
        success: false,
        error: 'Please select your skill level and learning goal'
      });
    }

    // Validate step3
    if (!step3?.timeDedication || !step3?.learningStyle) {
      return res.status(400).json({
        success: false,
        error: 'Please select your time dedication and learning style'
      });
    }

    // Validate finalStep
    if (!finalStep?.startTime) {
      return res.status(400).json({
        success: false,
        error: 'Please select when you want to start'
      });
    }

    // Check if "Other" option is selected and otherArea is provided
    if (step1.interestedArea === 'Other' && !step1.otherArea) {
      return res.status(400).json({
        success: false,
        error: 'Please specify your area of interest'
      });
    }

    // Check if "Other" goal is selected and otherGoal is provided
    if (step2.learningGoal === 'Other' && !step2.otherGoal) {
      return res.status(400).json({
        success: false,
        error: 'Please specify your learning goal'
      });
    }

    // Create new study bit entry (NO sessionId)
    const studyBit = new StudyBit({
      posterInfo: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim()
      },
      step1: {
        interestedArea: step1.interestedArea,
        otherArea: step1.otherArea || null
      },
      step2: {
        skillLevel: step2.skillLevel,
        learningGoal: step2.learningGoal,
        otherGoal: step2.otherGoal || null
      },
      step3: {
        timeDedication: step3.timeDedication,
        learningStyle: step3.learningStyle
      },
      finalStep: {
        startTime: finalStep.startTime
      },
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    });

    await studyBit.save();

    res.status(201).json({
      success: true,
      data: {
        id: studyBit._id,
        posterInfo: studyBit.posterInfo,
        step1: studyBit.step1,
        step2: studyBit.step2,
        step3: studyBit.step3,
        finalStep: studyBit.finalStep,
        createdAt: studyBit.createdAt
      },
      message: 'Study bit submitted successfully!'
    });

  } catch (error) {
    console.error('Error submitting study bit:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Server Error'
    });
  }
};

// @desc    Get all study bits
// @route   GET /api/v1/study-bit/all
// @access  Public
exports.getAllStudyBits = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const studyBits = await StudyBit.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StudyBit.countDocuments();

    // Get statistics
    const stats = {
      total: total
    };

    // Get area distribution
    const areaDistribution = await StudyBit.aggregate([
      { $group: { _id: '$step1.interestedArea', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get skill level distribution
    const skillDistribution = await StudyBit.aggregate([
      { $group: { _id: '$step2.skillLevel', count: { $sum: 1 } } }
    ]);

    // Get learning goals distribution
    const goalsDistribution = await StudyBit.aggregate([
      { $group: { _id: '$step2.learningGoal', count: { $sum: 1 } } }
    ]);

    // Get time dedication distribution
    const timeDistribution = await StudyBit.aggregate([
      { $group: { _id: '$step3.timeDedication', count: { $sum: 1 } } }
    ]);

    // Get start time distribution
    const startTimeDistribution = await StudyBit.aggregate([
      { $group: { _id: '$finalStep.startTime', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      count: studyBits.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
      distributions: {
        areas: areaDistribution,
        skills: skillDistribution,
        goals: goalsDistribution,
        timeDedication: timeDistribution,
        startTimes: startTimeDistribution
      },
      data: studyBits
    });

  } catch (error) {
    console.error('Error fetching study bits:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single study bit by ID
// @route   GET /api/v1/study-bit/:id
// @access  Public
exports.getStudyBitById = async (req, res) => {
  try {
    const studyBit = await StudyBit.findById(req.params.id);

    if (!studyBit) {
      return res.status(404).json({
        success: false,
        error: 'Study bit not found'
      });
    }

    res.status(200).json({
      success: true,
      data: studyBit
    });

  } catch (error) {
    console.error('Error fetching study bit:', error);
    
    // Check if invalid ID format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid study bit ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete study bit by ID
// @route   DELETE /api/v1/study-bit/:id
// @access  Public
exports.deleteStudyBit = async (req, res) => {
  try {
    const studyBit = await StudyBit.findByIdAndDelete(req.params.id);

    if (!studyBit) {
      return res.status(404).json({
        success: false,
        error: 'Study bit not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Study bit deleted successfully',
      data: {}
    });

  } catch (error) {
    console.error('Error deleting study bit:', error);
    
    // Check if invalid ID format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid study bit ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get statistics only
// @route   GET /api/v1/study-bit/stats
// @access  Public
exports.getStats = async (req, res) => {
  try {
    const total = await StudyBit.countDocuments();

    // Get area distribution
    const areaDistribution = await StudyBit.aggregate([
      { $group: { _id: '$step1.interestedArea', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get skill level distribution
    const skillDistribution = await StudyBit.aggregate([
      { $group: { _id: '$step2.skillLevel', count: { $sum: 1 } } }
    ]);

    // Get recent submissions count (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentSubmissions = await StudyBit.countDocuments({
      createdAt: { $gte: lastWeek }
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        recentSubmissions,
        distributions: {
          areas: areaDistribution,
          skills: skillDistribution
        }
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};