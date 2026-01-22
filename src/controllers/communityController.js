const Question = require('../models/Question');
const Answer = require('../models/Answer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/community');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for various file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDF, and Word documents are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
}).single('attachment'); // Changed from array to single

// 1. POST /api/v1/community/questions - Create new question
exports.createQuestion = async (req, res) => {
  // Handle file upload
  upload(req, res, async function(err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum 5MB allowed.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
      });
    }
    
    try {
      const { name, email, title, question } = req.body;
      
      // Basic validation
      if (!name || !email || !title || !question) {
        return res.status(400).json({
          success: false,
          message: 'Please fill all required fields',
        });
      }
      
      // Email validation
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address',
        });
      }
      
      // Handle attachment
      let attachmentData = null;
      if (req.file) {
        attachmentData = {
          url: `/uploads/community/${req.file.filename}`,
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        };
      }
      
      // Create question
      const questionData = {
        name,
        email,
        title,
        question,
        attachment: attachmentData,
        // Auto-generate tags from title and question
        tags: [...new Set(
          `${title} ${question}`
            .toLowerCase()
            .match(/\b\w+\b/g) || []
        )].slice(0, 10), // Limit to 10 tags
      };
      
      const newQuestion = await Question.create(questionData);
      
      res.status(201).json({
        success: true,
        message: 'Question posted successfully!',
        data: {
          id: newQuestion._id,
          slug: newQuestion.slug,
          name: newQuestion.name,
          title: newQuestion.title,
          createdAt: newQuestion.createdAt,
          attachment: newQuestion.attachment,
        },
      });
    } catch (error) {
      console.error('Create Question Error:', error);
      
      // Handle duplicate slug error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A similar question already exists. Please rephrase your title.',
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating question',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  });
};

// 2. GET /api/v1/community/questions - Get all questions
exports.getAllQuestions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      sort = 'newest',
      resolved = 'all' 
    } = req.query;
    
    // Build query
    const query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { question: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Filter by resolution status
    if (resolved === 'resolved') {
      query.isResolved = true;
    } else if (resolved === 'unresolved') {
      query.isResolved = false;
    }
    
    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'popular') {
      sortOption = { views: -1 };
    } else if (sort === 'most-answered') {
      sortOption = { answersCount: -1 };
    }
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query with pagination
    const [questions, total] = await Promise.all([
      Question.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('-email -__v') // Exclude sensitive/technical fields
        .lean(),
      Question.countDocuments(query)
    ]);
    
    // Get answers count for each question
    const questionsWithAnswers = await Promise.all(
      questions.map(async (question) => {
        const answers = await Answer.find({ questionId: question._id })
          .select('name content createdAt isAccepted likes attachment')
          .sort({ isAccepted: -1, likes: -1, createdAt: 1 })
          .limit(3)
          .lean();
        
        return {
          ...question,
          answers,
          hasMoreAnswers: question.answersCount > 3,
        };
      })
    );
    
    res.status(200).json({
      success: true,
      message: 'Questions retrieved successfully',
      data: questionsWithAnswers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
      filters: {
        search,
        sort,
        resolved,
      },
    });
  } catch (error) {
    console.error('Get Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 3. GET /api/v1/community/questions/:id - Get single question with answers
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by slug first, then by ID
    const mongoose = require('mongoose');
    const question = await Question.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { slug: id }
      ]
    }).select('-__v');
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }
    
    // Increment view count
    await Question.findByIdAndUpdate(question._id, { $inc: { views: 1 } });
    
    // Get all answers for this question
    const answers = await Answer.find({ questionId: question._id })
      .select('-__v')
      .sort({ isAccepted: -1, likes: -1, createdAt: 1 })
      .lean();
    
    // Get related questions
    const relatedQuestions = await Question.find({
      $or: [
        { tags: { $in: question.tags } },
        { title: { $regex: question.title.split(' ')[0], $options: 'i' } }
      ],
      _id: { $ne: question._id }
    })
    .select('title slug answersCount views createdAt')
    .limit(5)
    .lean();
    
    res.status(200).json({
      success: true,
      message: 'Question retrieved successfully',
      data: {
        ...question.toObject(),
        answers,
        relatedQuestions,
      },
    });
  } catch (error) {
    console.error('Get Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching question',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 4. POST /api/v1/community/questions/:id/answers - Add answer to question
exports.createAnswer = async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum 5MB allowed.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
      });
    }
    
    try {
      const { id } = req.params;
      const { name, email, content } = req.body;
      
      // Validate inputs
      if (!name || !email || !content) {
        return res.status(400).json({
          success: false,
          message: 'Please fill all required fields',
        });
      }
      
      // Check if question exists
      const question = await Question.findById(id);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found',
        });
      }
      
      // Handle attachment
      let attachmentData = null;
      if (req.file) {
        attachmentData = {
          url: `/uploads/community/${req.file.filename}`,
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        };
      }
      
      // Create answer
      const answerData = {
        questionId: id,
        name,
        email,
        content,
        attachment: attachmentData,
      };
      
      const answer = await Answer.create(answerData);
      
      // Update question's answer count
      await Question.findByIdAndUpdate(id, { $inc: { answersCount: 1 } });
      
      res.status(201).json({
        success: true,
        message: 'Answer posted successfully!',
        data: {
          id: answer._id,
          name: answer.name,
          content: answer.content,
          createdAt: answer.createdAt,
          attachment: answer.attachment,
        },
      });
    } catch (error) {
      console.error('Create Answer Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error posting answer',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  });
};

// 5. GET /api/v1/community/stats - Get community statistics
exports.getCommunityStats = async (req, res) => {
  try {
    const [totalQuestions, totalAnswers, unresolvedQuestions, recentQuestions] = await Promise.all([
      Question.countDocuments(),
      Answer.countDocuments(),
      Question.countDocuments({ isResolved: false }),
      Question.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title slug answersCount createdAt')
        .lean(),
    ]);
    
    // Get top contributors (based on answers)
    const topContributors = await Answer.aggregate([
      {
        $group: {
          _id: '$name',
          answerCount: { $sum: 1 },
          acceptedAnswers: { $sum: { $cond: [{ $eq: ['$isAccepted', true] }, 1, 0] } }
        }
      },
      { $sort: { answerCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: '$_id',
          answerCount: 1,
          acceptedAnswers: 1,
          _id: 0
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Community stats retrieved',
      data: {
        totalQuestions,
        totalAnswers,
        unresolvedQuestions,
        resolvedQuestions: totalQuestions - unresolvedQuestions,
        topContributors,
        recentQuestions,
        resolutionRate: totalQuestions > 0 ? 
          ((totalQuestions - unresolvedQuestions) / totalQuestions * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching community stats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 6. PUT /api/v1/community/answers/:id/like - Like an answer
exports.likeAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const answer = await Answer.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true }
    ).select('likes');
    
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Answer liked',
      data: { likes: answer.likes },
    });
  } catch (error) {
    console.error('Like Answer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking answer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 7. PUT /api/v1/community/answers/:id/accept - Accept an answer
exports.acceptAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const answer = await Answer.findById(id);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }
    
    // Only allow accepting if user is the question asker (simplified - in production, add auth)
    // For now, we'll accept any request (you should add proper authorization)
    
    // Unaccept any previously accepted answer for this question
    await Answer.updateMany(
      { 
        questionId: answer.questionId,
        _id: { $ne: id },
        isAccepted: true 
      },
      { $set: { isAccepted: false } }
    );
    
    // Accept this answer
    answer.isAccepted = true;
    await answer.save();
    
    res.status(200).json({
      success: true,
      message: 'Answer accepted as solution',
      data: answer,
    });
  } catch (error) {
    console.error('Accept Answer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting answer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 8. GET /api/v1/community/search - Search questions
exports.searchQuestions = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }
    
    const query = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { question: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ]
    };
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    const [questions, total] = await Promise.all([
      Question.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('title slug answersCount views createdAt tags')
        .lean(),
      Question.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Search results',
      data: questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        query: q,
      },
    });
  } catch (error) {
    console.error('Search Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching questions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};