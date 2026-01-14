const QuizAttempt = require("../models/QuizAttempt");
const Quiz = require("../models/Quiz");

// @desc    Start a quiz attempt
// @route   POST /api/v1/quizzes/:id/attempt
// @access  Public
exports.startQuizAttempt = async (req, res) => {
  try {
    const { id: quizId } = req.params;
    const { userId } = req.body; // Get userId from request body instead of token

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if quiz is available
    if (!quiz.isActive || !quiz.isPublished) {
      return res.status(400).json({
        success: false,
        message: "Quiz is not available",
      });
    }

    // Check if user has reached max attempts
    const previousAttempts = await QuizAttempt.find({
      quizId,
      userId,
    });

    if (previousAttempts.length >= quiz.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz`,
      });
    }

    // Check for in-progress attempts
    const inProgressAttempt = await QuizAttempt.findOne({
      quizId,
      userId,
      status: "in-progress",
    });

    if (inProgressAttempt) {
      return res.json({
        success: true,
        data: inProgressAttempt,
        message: "Resuming existing attempt",
      });
    }

    // Create new attempt
    const attemptNumber = previousAttempts.length + 1;
    
    const attempt = await QuizAttempt.create({
      quizId,
      userId,
      courseId: quiz.courseId,
      attemptNumber,
      status: "in-progress",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: attempt,
      message: "Quiz attempt started",
      quizInfo: {
        title: quiz.title,
        duration: quiz.duration,
        totalQuestions: quiz.questions.length,
        passingScore: quiz.passingScore,
      },
    });
  } catch (error) {
    console.error("Start attempt error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Submit quiz answers
// @route   POST /api/v1/quizzes/:id/submit
// @access  Public
exports.submitQuizAttempt = async (req, res) => {
  try {
    const { id: quizId } = req.params;
    const { answers, userId } = req.body;

    // Find in-progress attempt
    const attempt = await QuizAttempt.findOne({
      quizId,
      userId,
      status: "in-progress",
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "No active quiz attempt found",
      });
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Process answers
    const processedAnswers = [];
    let totalScore = 0;

    for (const answer of answers) {
      const question = quiz.questions.id(answer.questionId);
      if (!question) continue;

      let isCorrect = false;
      let pointsEarned = 0;

      if (question.type === "multiple-choice" || question.type === "single-choice") {
        const selectedOptions = answer.selectedOptions || [];
        const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt.text);
        isCorrect = selectedOptions.length === correctOptions.length &&
          selectedOptions.every(opt => correctOptions.includes(opt));
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.type === "true-false" || question.type === "short-answer") {
        isCorrect = answer.shortAnswer?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        pointsEarned = isCorrect ? question.points : 0;
      }

      totalScore += pointsEarned;

      processedAnswers.push({
        questionId: answer.questionId,
        selectedOptions: answer.selectedOptions,
        shortAnswer: answer.shortAnswer,
        isCorrect,
        pointsEarned,
        timeTaken: answer.timeTaken || 0,
      });
    }

    // Update attempt
    attempt.answers = processedAnswers;
    attempt.status = "completed";
    attempt.timeCompleted = new Date();
    attempt.score = totalScore;
    
    // Calculate total possible points
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    
    attempt.percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
    attempt.isPassed = attempt.percentage >= quiz.passingScore;

    await attempt.save();

    res.json({
      success: true,
      data: attempt,
      message: "Quiz submitted successfully",
      summary: {
        score: attempt.score,
        totalPoints: totalPoints,
        percentage: Math.round(attempt.percentage),
        isPassed: attempt.isPassed,
        passingScore: quiz.passingScore,
        correctAnswers: processedAnswers.filter(a => a.isCorrect).length,
        totalQuestions: processedAnswers.length,
      },
    });
  } catch (error) {
    console.error("Submit attempt error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get user's quiz attempts
// @route   GET /api/v1/quizzes/my-attempts
// @access  Public
exports.getUserQuizAttempts = async (req, res) => {
  try {
    const { userId, quizId, courseId, page = 1, limit = 10 } = req.query;

    const filter = {};
    
    if (userId) filter.userId = userId;
    if (quizId) filter.quizId = quizId;
    if (courseId) filter.courseId = courseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const attempts = await QuizAttempt.find(filter)
      .populate("quizId", "title")
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await QuizAttempt.countDocuments(filter);

    res.json({
      success: true,
      count: attempts.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: attempts,
    });
  } catch (error) {
    console.error("Get user attempts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single attempt details
// @route   GET /api/v1/quizzes/attempts/:id
// @access  Public
exports.getQuizAttempt = async (req, res) => {
  try {
    const { id } = req.params;

    const attempt = await QuizAttempt.findById(id)
      .populate("quizId", "title")
      .populate("courseId", "title")
      .lean();

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    res.json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    console.error("Get attempt error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};