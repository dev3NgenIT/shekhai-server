const Enrollment = require('../models/Enrollment');

// @desc    Create new enrollment
// @route   POST /api/v1/enrollments
// @access  Public
exports.createEnrollment = async (req, res) => {
  try {
    const {
      courseId,
      courseTitle,
      coursePrice,
      studentInfo,
      paymentInfo,
      enrollmentDate
    } = req.body;

    // Validation
    if (!courseId || !courseTitle || !coursePrice) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, title, and price are required'
      });
    }

    if (!studentInfo || !studentInfo.fullname || !studentInfo.email || !studentInfo.phone) {
      return res.status(400).json({
        success: false,
        message: 'Student information is incomplete'
      });
    }

    if (!paymentInfo || !paymentInfo.paymentId || !paymentInfo.transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Payment information is incomplete'
      });
    }

    // Create new enrollment
    const enrollment = new Enrollment({
      courseId,
      courseTitle,
      coursePrice: Number(coursePrice),
      studentInfo: {
        fullname: studentInfo.fullname.trim(),
        email: studentInfo.email.trim().toLowerCase(),
        phone: studentInfo.phone.trim()
      },
      paymentInfo: {
        method: paymentInfo.method || 'bKash',
        paymentId: paymentInfo.paymentId,
        transactionId: paymentInfo.transactionId,
        amount: Number(paymentInfo.amount) || Number(coursePrice),
        status: paymentInfo.status || 'Completed',
        paidAt: paymentInfo.paidAt ? new Date(paymentInfo.paidAt) : new Date()
      },
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      status: 'active',
      certificateIssued: false,
      progress: 0,
      lastAccessed: new Date()
    });

    await enrollment.save();

    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully',
      data: enrollment
    });

  } catch (error) {
    console.error('Enrollment creation error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Handle duplicate payment ID
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all enrollments
// @route   GET /api/v1/enrollments
// @access  Public
exports.getAllEnrollments = async (req, res) => {
  try {
    const {
      email,
      phone,
      courseId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'enrollmentDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    let filter = {};

    // Search by student email (case-insensitive)
    if (email) {
      filter['studentInfo.email'] = { $regex: email, $options: 'i' };
    }

    // Search by student phone
    if (phone) {
      filter['studentInfo.phone'] = { $regex: phone, $options: 'i' };
    }

    // Filter by course ID
    if (courseId) {
      filter.courseId = courseId;
    }

    // Filter by status
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.enrollmentDate = {};
      if (startDate) {
        filter.enrollmentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.enrollmentDate.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const enrollments = await Enrollment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Enrollment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: enrollments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: enrollments
    });

  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single enrollment by ID
// @route   GET /api/v1/enrollments/:id
// @access  Public
exports.getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: enrollment
    });

  } catch (error) {
    console.error('Get enrollment by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get enrollments by student email
// @route   GET /api/v1/enrollments/student/:email
// @access  Public
exports.getEnrollmentsByEmail = async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    
    const enrollments = await Enrollment.find({
      'studentInfo.email': email
    }).sort({ enrollmentDate: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });

  } catch (error) {
    console.error('Get enrollments by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get enrollments by course ID
// @route   GET /api/v1/enrollments/course/:courseId
// @access  Public
exports.getEnrollmentsByCourse = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      courseId: req.params.courseId
    }).sort({ enrollmentDate: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });

  } catch (error) {
    console.error('Get enrollments by course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = exports;