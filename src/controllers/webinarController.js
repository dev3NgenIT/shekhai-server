// controllers/webinarController.js
const Webinar = require('../models/Webinar');
const Registration = require('../models/Registration');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// 1. Create new webinar (Admin only)
exports.createWebinar = async (req, res) => {
  try {
    const webinarData = req.body;
    
    // Auto-calculate isFree based on price
    if (webinarData.price === undefined || webinarData.price === 0) {
      webinarData.isFree = true;
      webinarData.price = 0;
    } else {
      webinarData.isFree = false;
    }
    
    const webinar = await Webinar.create(webinarData);
    
    res.status(201).json({
      success: true,
      message: 'Webinar created successfully',
      data: webinar
    });
  } catch (error) {
    console.error('Create Webinar Error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Webinar with this title or slug already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating webinar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 2. Get all webinars with filters
exports.getAllWebinars = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      status,
      isFeatured,
      isFree,
      badge,
      search,
      sort = 'startTime',
      order = 'asc'
    } = req.query;
    
    const query = {};
    
    // Filter by status
    if (status) {
      if (status === 'upcoming') {
        query.startTime = { $gt: new Date() };
        query.status = 'published';
      } else if (status === 'live') {
        const now = new Date();
        query.startTime = { $lte: now };
        query.endTime = { $gte: now };
        query.status = 'published';
      } else if (status === 'past') {
        query.endTime = { $lt: new Date() };
      } else {
        query.status = status;
      }
    } else {
      // Default: show only published webinars
      query.status = 'published';
    }
    
    // Filter by featured
    if (isFeatured === 'true') {
      query.isFeatured = true;
    }
    
    // Filter by free/paid
    if (isFree === 'true') {
      query.isFree = true;
      query.price = 0;
    } else if (isFree === 'false') {
      query.isFree = false;
      query.price = { $gt: 0 };
    }
    
    // Filter by badge type
    if (badge) {
      query.badge = badge;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { longDescription: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Sort configuration
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortConfig = {};
    sortConfig[sort] = sortOrder;
    
    const [webinars, total] = await Promise.all([
      Webinar.find(query)
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNum)
        .select('-longDescription -zoomLink')
        .lean(),
      Webinar.countDocuments(query)
    ]);
    
    // Add virtual fields to response
    const webinarsWithVirtuals = webinars.map(webinar => {
      const doc = new Webinar(webinar);
      return {
        ...webinar,
        duration: doc.duration,
        formattedDate: doc.formattedDate,
        formattedTime: doc.formattedTime,
        isAvailable: doc.isAvailable,
        remainingSeats: doc.remainingSeats
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Webinars retrieved successfully',
      data: webinarsWithVirtuals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get Webinars Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching webinars',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 3. Get single webinar by ID or slug
exports.getWebinar = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if id is a valid ObjectId or a slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    
    const webinar = await Webinar.findOne(query);
    
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }
    
    // Increment view count (optional)
    webinar.views = (webinar.views || 0) + 1;
    await webinar.save();
    
    res.status(200).json({
      success: true,
      message: 'Webinar retrieved successfully',
      data: webinar
    });
  } catch (error) {
    console.error('Get Webinar Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching webinar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 4. Update webinar
exports.updateWebinar = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // If price is updated, update isFree accordingly
    if (updateData.price !== undefined) {
      if (updateData.price === 0) {
        updateData.isFree = true;
      } else {
        updateData.isFree = false;
      }
    }
    
    const webinar = await Webinar.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Webinar updated successfully',
      data: webinar
    });
  } catch (error) {
    console.error('Update Webinar Error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating webinar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 5. Delete webinar
exports.deleteWebinar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const webinar = await Webinar.findById(id);
    
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }
    
    // Check if there are registrations
    const registrationsCount = await Registration.countDocuments({ webinar: id });
    if (registrationsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete webinar with existing registrations'
      });
    }
    
    await webinar.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Webinar deleted successfully'
    });
  } catch (error) {
    console.error('Delete Webinar Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting webinar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// 6. Register for webinar
exports.registerForWebinar = async (req, res) => {
  try {
    const { webinarId } = req.params;
    const registrationData = req.body;
    
    // Find webinar
    const webinar = await Webinar.findById(webinarId);
    
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }
    
    // Check if webinar is available for registration
    // Instead of checking isAvailable property, check based on status and time
    const now = new Date();
    const startTime = new Date(webinar.startTime);
    const endTime = new Date(webinar.endTime);
    
    // Check if webinar is in draft or cancelled status
    if (webinar.status === 'draft' || webinar.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This webinar is not available for registration'
      });
    }
    
    // Check if webinar has already ended
    if (now > endTime) {
      return res.status(400).json({
        success: false,
        message: 'This webinar has already ended'
      });
    }
    
    // Check if webinar has already started (optional: you might want to allow registration even after start)
    if (now > startTime) {
      return res.status(400).json({
        success: false,
        message: 'This webinar has already started'
      });
    }
    
    // Check if user already registered
    const existingRegistration = await Registration.findOne({
      webinar: webinarId,
      'user.email': registrationData.email.toLowerCase()
    });
    
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this webinar'
      });
    }
    
    // Check if seats are available
    if (webinar.currentParticipants >= webinar.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'No seats available'
      });
    }
    
    // Create registration
    const registration = await Registration.create({
      webinar: webinarId,
      user: {
        name: registrationData.name,
        email: registrationData.email.toLowerCase(),
        phone: registrationData.phone,
        role: registrationData.role,
        organization: registrationData.organization
      },
      preferences: {
        receiveSMS: registrationData.receiveSMS || false,
        receiveEmailUpdates: registrationData.receiveEmailUpdates !== false
      },
      payment: {
        amount: webinar.isFree ? 0 : webinar.price,
        status: webinar.isFree ? 'completed' : 'pending'
      }
    });
    
    // Update webinar participant count
    webinar.currentParticipants += 1;
    await webinar.save();
    
    // Send confirmation email (your existing email code)
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // ... your email sending code ...
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the registration if email fails
    }
    
    res.status(201).json({
      success: true,
      message: 'Successfully registered for the webinar',
      data: {
        registrationId: registration._id,
        webinar: webinar.title,
        date: webinar.formattedDate,
        time: webinar.formattedTime,
        paymentRequired: !webinar.isFree,
        paymentStatus: webinar.isFree ? 'completed' : 'pending'
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering for webinar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// 7. Get webinar registrations (Admin only)
exports.getWebinarRegistrations = async (req, res) => {
  try {
    const { webinarId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    
    const query = { webinar: webinarId };
    
    if (status) {
      query.status = status;
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const [registrations, total] = await Promise.all([
      Registration.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-zoomMeetingDetails')
        .lean(),
      Registration.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Registrations retrieved successfully',
      data: registrations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get Registrations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 8. Get featured webinars
exports.getFeaturedWebinars = async (req, res) => {
  try {
    const featuredWebinars = await Webinar.find({
      isFeatured: true,
      status: 'published',
      startTime: { $gt: new Date() }
    })
    .sort({ startTime: 1 })
    .limit(3)
    .select('title shortDescription thumbnail startTime endTime price isFree badge')
    .lean();
    
    res.status(200).json({
      success: true,
      message: 'Featured webinars retrieved',
      data: featuredWebinars
    });
  } catch (error) {
    console.error('Get Featured Webinars Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured webinars',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 9. Get webinar statistics
exports.getWebinarStats = async (req, res) => {
  try {
    const [
      totalWebinars,
      upcomingWebinars,
      liveWebinars,
      freeWebinars,
      paidWebinars,
      totalRegistrations,
      totalRevenue
    ] = await Promise.all([
      Webinar.countDocuments({ status: 'published' }),
      Webinar.countDocuments({ status: 'published', startTime: { $gt: new Date() } }),
      Webinar.countDocuments({ 
        status: 'published',
        startTime: { $lte: new Date() },
        endTime: { $gte: new Date() }
      }),
      Webinar.countDocuments({ status: 'published', isFree: true }),
      Webinar.countDocuments({ status: 'published', isFree: false }),
      Registration.countDocuments({ status: 'registered' }),
      Registration.aggregate([
        { $match: { 'payment.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$payment.amount' } } }
      ])
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Webinar stats retrieved',
      data: {
        totalWebinars,
        upcomingWebinars,
        liveWebinars,
        freeWebinars,
        paidWebinars,
        totalRegistrations,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get Webinar Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching webinar statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};