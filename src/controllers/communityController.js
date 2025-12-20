const Question = require('../models/Question');
const Answer = require('../models/Answer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/community');
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

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
}).array('images', 5); // Max 5 images

// 1. POST /api/community/questions - Create new question (NO AUTH)
exports.createQuestion = async (req, res) => {
  // Handle file upload first
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    
    try {
      const { title, content, category, subCategory, authorName, authorEmail } = req.body;
      
      // Handle image uploads
      const images = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          images.push({
            url: `/uploads/community/${file.filename}`,
            filename: file.originalname,
          });
        });
      }
      
      const questionData = {
        title,
        content,
        category: category || 'General Discussion',
        subCategory,
        authorName,
        authorEmail,
        images,
      };
      
      const question = await Question.create(questionData);
      
      res.status(201).json({
        success: true,
        message: 'Question created successfully',
        data: question,
      });
    } catch (error) {
      console.error('Create Question Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating question',
        error: error.message,
      });
    }
  });
};

// 2. GET /api/community/questions - Get all questions (NO AUTH)
exports.getAllQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    
    const query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    // Get questions WITH answers populated
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: 'answers',
        select: 'content authorName authorEmail createdAt',
        options: { sort: { createdAt: 1 }, limit: 2 }, // Show 2 latest answers
      })
      .lean();
    
    const total = await Question.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: 'Questions retrieved successfully',
      data: questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message,
    });
  }
};

// 3. GET /api/community/questions/:id - Get single question with answers (NO AUTH)
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Increment view count
    await Question.findByIdAndUpdate(id, { $inc: { views: 1 } });
    
    const question = await Question.findById(id)
      .populate({
        path: 'answers',
        options: { sort: { createdAt: 1 } },
      })
      .lean();
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Question retrieved successfully',
      data: question,
    });
  } catch (error) {
    console.error('Get Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching question',
      error: error.message,
    });
  }
};

// 4. POST /api/community/questions/:id/answers - Add answer to question (NO AUTH)
exports.createAnswer = async (req, res) => {
  // Handle file upload first
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    
    try {
      const { id } = req.params;
      const { content, authorName, authorEmail } = req.body;
      
      // Check if question exists
      const question = await Question.findById(id);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found',
        });
      }
      
      // Handle image uploads for answer
      const images = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          images.push({
            url: `/uploads/community/${file.filename}`,
            filename: file.originalname,
          });
        });
      }
      
      const answerData = {
        content,
        questionId: id,
        authorName,
        authorEmail,
        images,
      };
      
      const answer = await Answer.create(answerData);
      
      res.status(201).json({
        success: true,
        message: 'Answer added successfully',
        data: answer,
      });
    } catch (error) {
      console.error('Create Answer Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating answer',
        error: error.message,
      });
    }
  });
};

// 5. GET /api/community/stats - Get community statistics
exports.getCommunityStats = async (req, res) => {
  try {
    const [totalQuestions, totalAnswers] = await Promise.all([
      Question.countDocuments(),
      Answer.countDocuments(),
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Community stats retrieved',
      data: {
        totalTopics: totalQuestions,
        totalReplies: totalAnswers,
        totalMembers: totalQuestions, // Approximate - unique email count would be better
      },
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching community stats',
      error: error.message,
    });
  }
};