// controllers/quizController.js
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Create a new quiz
// @route   POST /api/v1/quizzes
// @access  Private (Instructor/Admin)
exports.createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      module,
      duration,
      passingScore,
      maxAttempts,
      isActive,
      shuffleQuestions,
      showResults,
      scheduledStart,
      scheduledEnd,
      questions
    } = req.body;

    // Validate course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        msg: 'Course not found'
      });
    }

    // Check authorization - user must be instructor of course or admin
    if (req.user.role !== 'admin' && courseExists.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to create quiz for this course'
      });
    }

    // Validate module if provided
    if (module) {
      const moduleExists = courseExists.modules.id(module);
      if (!moduleExists) {
        return res.status(404).json({
          success: false,
          msg: 'Module not found in this course'
        });
      }
    }

    // Validate questions (max 30)
    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        msg: 'At least one question is required'
      });
    }

    if (questions.length > 30) {
      return res.status(400).json({
        success: false,
        msg: 'Maximum 30 questions allowed'
      });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.text || q.text.trim() === '') {
        return res.status(400).json({
          success: false,
          msg: `Question ${i + 1}: Text is required`
        });
      }

      if (q.type === 'multiple-choice' || q.type === 'true-false') {
        if (!q.options || q.options.length < 2) {
          return res.status(400).json({
            success: false,
            msg: `Question ${i + 1}: At least 2 options are required`
          });
        }
        
        const hasCorrect = q.options.some(opt => opt.isCorrect);
        if (!hasCorrect) {
          return res.status(400).json({
            success: false,
            msg: `Question ${i + 1}: Please select a correct option`
          });
        }
      } else if (q.type === 'short-answer') {
        if (!q.correctAnswer || q.correctAnswer.trim() === '') {
          return res.status(400).json({
            success: false,
            msg: `Question ${i + 1}: Correct answer is required for short-answer questions`
          });
        }
      }
      // Essay questions don't need validation for correct answer
    }

    // Create quiz
    const quiz = await Quiz.create({
      title,
      description,
      course,
      module: module || null,
      instructor: req.user.id,
      duration,
      passingScore,
      maxAttempts,
      isActive,
      shuffleQuestions,
      showResults,
      scheduledStart: scheduledStart || null,
      scheduledEnd: scheduledEnd || null,
      questions: questions.map((q, index) => ({
        ...q,
        order: index
      }))
    });

    res.status(201).json({
      success: true,
      data: quiz,
      msg: 'Quiz created successfully'
    });
  } catch (error) {
    console.error('Create Quiz Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all quizzes
// @route   GET /api/v1/quizzes
// @access  Private
exports.getQuizzes = async (req, res) => {
  try {
    const {
      course,
      instructor,
      status,
      isActive,
      search,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    // Filter by course
    if (course) {
      query.course = course;
    }

    // Filter by instructor
    if (instructor) {
      query.instructor = instructor;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Filter by custom status
    if (status) {
      const now = new Date();
      switch (status) {
        case 'active':
          query.isActive = true;
          query.$or = [
            { scheduledStart: null, scheduledEnd: null },
            { scheduledStart: { $lte: now }, scheduledEnd: { $gte: now } }
          ];
          break;
        case 'inactive':
          query.isActive = false;
          break;
        case 'scheduled':
          query.scheduledStart = { $gt: now };
          break;
        case 'ongoing':
          query.scheduledStart = { $lte: now };
          query.scheduledEnd = { $gte: now };
          break;
        case 'expired':
          query.scheduledEnd = { $lt: now };
          break;
      }
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // For students, only show quizzes for enrolled courses
    if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      if (student && student.enrolledCourses) {
        query.course = { $in: student.enrolledCourses };
      }
      query.isActive = true;
    }

    // For instructors, only show their own quizzes
    if (req.user.role === 'instructor') {
      query.instructor = req.user.id;
    }

    // Pagination
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    const quizzes = await Quiz.find(query)
      .populate('course', 'title _id')
      .populate('module', 'title _id')
      .populate('instructor', 'name email _id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitInt);

    const total = await Quiz.countDocuments(query);

    res.status(200).json({
      success: true,
      count: quizzes.length,
      total,
      totalPages: Math.ceil(total / limitInt),
      currentPage: pageInt,
      data: quizzes
    });
  } catch (error) {
    console.error('Get Quizzes Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single quiz
// @route   GET /api/v1/quizzes/:id
// @access  Private
exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'title _id instructor')
      .populate('module', 'title _id')
      .populate('instructor', 'name email _id');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        msg: 'Quiz not found'
      });
    }

    // Check authorization
    if (req.user.role === 'instructor' && quiz.instructor._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to access this quiz'
      });
    }

    // For students, check if enrolled in course
    if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      if (!student.enrolledCourses.includes(quiz.course._id)) {
        return res.status(403).json({
          success: false,
          msg: 'You are not enrolled in this course'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Get Quiz Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update quiz
// @route   PUT /api/v1/quizzes/:id
// @access  Private (Instructor/Admin)
exports.updateQuiz = async (req, res) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        msg: 'Quiz not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to update this quiz'
      });
    }

    // Validate questions if provided in update
    if (req.body.questions && req.body.questions.length > 30) {
      return res.status(400).json({
        success: false,
        msg: 'Maximum 30 questions allowed'
      });
    }

    // Update quiz
    quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('course', 'title _id').populate('instructor', 'name email _id');

    res.status(200).json({
      success: true,
      data: quiz,
      msg: 'Quiz updated successfully'
    });
  } catch (error) {
    console.error('Update Quiz Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// @desc    Toggle quiz status
// @route   PATCH /api/v1/quizzes/:id/toggle-status
// @access  Private (Instructor/Admin)
exports.toggleQuizStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        msg: 'Quiz not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to update this quiz'
      });
    }

    quiz.isActive = isActive;
    quiz.updatedAt = Date.now();
    await quiz.save();

    res.status(200).json({
      success: true,
      data: quiz,
      msg: `Quiz ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle Status Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/v1/quizzes/:id
// @access  Private (Instructor/Admin)
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        msg: 'Quiz not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && quiz.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to delete this quiz'
      });
    }

    // Check if quiz has attempts
    if (quiz.totalAttempts > 0) {
      return res.status(400).json({
        success: false,
        msg: 'Cannot delete quiz with existing attempts. Archive it instead.'
      });
    }

    await quiz.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      msg: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete Quiz Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get instructor's quizzes
// @route   GET /api/v1/instructors/:instructorId/quizzes
// @access  Private
exports.getInstructorQuizzes = async (req, res) => {
  try {
    const { instructorId } = req.params;
    
    // Verify the requested instructor is the same as logged in user
    if (req.user.role !== 'admin' && req.user.id !== instructorId) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to view these quizzes'
      });
    }

    const quizzes = await Quiz.find({ instructor: instructorId })
      .populate('course', 'title _id')
      .populate('module', 'title _id')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error('Get Instructor Quizzes Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get quizzes by course
// @route   GET /api/v1/courses/:courseId/quizzes
// @access  Private
exports.getQuizzesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        msg: 'Course not found'
      });
    }

    // Check authorization
    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to view quizzes for this course'
      });
    }

    if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      if (!student.enrolledCourses.includes(courseId)) {
        return res.status(403).json({
          success: false,
          msg: 'You are not enrolled in this course'
        });
      }
    }

    const quizzes = await Quiz.find({ course: courseId })
      .populate('module', 'title _id')
      .sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error('Get Quizzes By Course Error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: error.message
    });
  }
};