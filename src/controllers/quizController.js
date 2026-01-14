const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const Course = require("../models/Course");

// @desc    Create a new quiz (course & module based)
// @route   POST /api/v1/quizzes
// @access  Public
exports.createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      courseId,
      moduleId,
      moduleTitle,
      duration,
      passingScore,
      maxAttempts,
      instructions,
      tags,
      availableFrom,
      availableUntil,
      scheduleType,
      questions,
    } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Validate dates
    const startDate = new Date(availableFrom);
    const endDate = new Date(availableUntil);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    // Validate maximum 30 questions
    if (questions && questions.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Maximum 30 questions allowed per quiz",
      });
    }

    // If moduleId is provided, validate it exists in the course
    let finalModuleTitle = moduleTitle;
    if (moduleId) {
      const moduleExists = course.modules.some(
        (module) => module._id.toString() === moduleId
      );

      if (!moduleExists) {
        return res.status(400).json({
          success: false,
          message: "Module not found in the selected course",
        });
      }

      // Get module title if not provided
      const module = course.modules.find((m) => m._id.toString() === moduleId);
      finalModuleTitle = finalModuleTitle || module?.title;
    }

    // Create quiz
    const quiz = await Quiz.create({
      title,
      description,
      courseId,
      moduleId: moduleId || null,
      moduleTitle: finalModuleTitle || null,
      duration: duration || 30,
      passingScore: passingScore || 70,
      maxAttempts: maxAttempts || 1,
      instructions,
      tags: tags || [],
      availableFrom: startDate,
      availableUntil: endDate,
      scheduleType: scheduleType || "immediate",
      questions: questions || [],
      isPublished: false,
    });

    res.status(201).json({
      success: true,
      data: quiz,
      message: "Quiz created successfully",
    });
  } catch (error) {
    console.error("Create quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all quizzes with filters (course/module/date)
// @route   GET /api/v1/quizzes
// @access  Public
exports.getQuizzes = async (req, res) => {
  try {
    console.log("=== GET QUIZZES REQUEST ===");
    console.log("Query params:", req.query);

    const {
      courseId,
      moduleId,
      instructorId,
      isActive,
      isPublished,
      status, // active, scheduled, expired, draft
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // Apply filters
    if (courseId) filter.courseId = courseId;
    if (moduleId) filter.moduleId = moduleId;
    if (instructorId) filter.instructorId = instructorId;

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.availableFrom = {};
      if (fromDate) filter.availableFrom.$gte = new Date(fromDate);
      if (toDate) filter.availableFrom.$lte = new Date(toDate);
    }

    // Status filter
    if (status) {
      const now = new Date();
      switch (status) {
        case "active":
          filter.isActive = true;
          filter.isPublished = true;
          filter.availableFrom = { $lte: now };
          filter.$or = [
            { availableUntil: { $exists: false } },
            { availableUntil: null },
            { availableUntil: { $gte: now } },
          ];
          break;
        case "scheduled":
          filter.isActive = true;
          filter.isPublished = true;
          filter.availableFrom = { $gt: now };
          break;
        case "expired":
          filter.isActive = true;
          filter.isPublished = true;
          filter.availableUntil = { $lt: now };
          break;
        case "draft":
          filter.isPublished = false;
          break;
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    console.log("Final filter:", JSON.stringify(filter, null, 2));

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const quizzes = await Quiz.find(filter)
      .populate("courseId", "title code modules")
      .sort({ availableFrom: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log("Found quizzes:", quizzes.length);

    const total = await Quiz.countDocuments(filter);

    // Add virtual fields
    const quizzesWithVirtuals = quizzes.map((quiz) => ({
      ...quiz,
      questionCount: quiz.questions.length,
      status: getQuizStatus(quiz),
      daysRemaining: getDaysRemaining(quiz.availableUntil),
    }));

    res.json({
      success: true,
      count: quizzesWithVirtuals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: quizzesWithVirtuals,
    });
  } catch (error) {
    console.error("Get quizzes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Helper function to get quiz status
const getQuizStatus = (quiz) => {
  const now = new Date();

  if (!quiz.isActive) return "disabled";
  if (!quiz.isPublished) return "draft";

  if (now < new Date(quiz.availableFrom)) return "scheduled";
  if (quiz.availableUntil && now > new Date(quiz.availableUntil))
    return "expired";

  return "active";
};

// Helper function to get days remaining
const getDaysRemaining = (endDate) => {
  if (!endDate) return null;

  const now = new Date();
  const end = new Date(endDate);

  if (now > end) return 0;

  const diffTime = end - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// @desc    Get single quiz by ID
// @route   GET /api/v1/quizzes/:id
// @access  Public
exports.getQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findById(id)
      .populate("courseId", "title code modules")
      .lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if quiz is accessible
    const now = new Date();

    // Check if quiz is published and active
    if (
      !quiz.isPublished ||
      !quiz.isActive ||
      now < new Date(quiz.availableFrom)
    ) {
      return res.status(403).json({
        success: false,
        message: "Quiz is not available",
      });
    }

    // Check expiration
    if (quiz.availableUntil && now > new Date(quiz.availableUntil)) {
      return res.status(403).json({
        success: false,
        message: "Quiz has expired",
      });
    }

    // Add virtual fields
    const quizWithVirtuals = {
      ...quiz,
      questionCount: quiz.questions.length,
      status: getQuizStatus(quiz),
      daysRemaining: getDaysRemaining(quiz.availableUntil),
    };

    res.json({
      success: true,
      data: quizWithVirtuals,
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get quizzes by course with module filter
// @route   GET /api/v1/quizzes/course/:courseId
// @access  Public
exports.getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleId, status, page = 1, limit = 10 } = req.query;

    const filter = {
      courseId,
      isActive: true,
      isPublished: true,
    };

    // Filter by module if specified
    if (moduleId) {
      filter.moduleId = moduleId;
    }

    // Status filter
    if (status === "active") {
      const now = new Date();
      filter.availableFrom = { $lte: now };
      filter.$or = [
        { availableUntil: { $exists: false } },
        { availableUntil: null },
        { availableUntil: { $gte: now } },
      ];
    } else if (status === "upcoming") {
      filter.availableFrom = { $gt: new Date() };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const quizzes = await Quiz.find(filter)
      .sort({ availableFrom: 1 }) // Sort by upcoming first
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Quiz.countDocuments(filter);

    // Group quizzes by module
    const quizzesByModule = {};
    quizzes.forEach((quiz) => {
      const moduleKey = quiz.moduleId || "course-wide";
      if (!quizzesByModule[moduleKey]) {
        quizzesByModule[moduleKey] = {
          moduleId: quiz.moduleId,
          moduleTitle: quiz.moduleTitle || "Course-wide Quizzes",
          quizzes: [],
        };
      }
      quizzesByModule[moduleKey].quizzes.push(quiz);
    });

    res.json({
      success: true,
      count: quizzes.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: quizzes,
      groupedByModule: Object.values(quizzesByModule),
    });
  } catch (error) {
    console.error("Get course quizzes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get quizzes by module
// @route   GET /api/v1/quizzes/module/:moduleId
// @access  Public
exports.getModuleQuizzes = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const filter = {
      moduleId,
      isActive: true,
      isPublished: true,
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const quizzes = await Quiz.find(filter)
      .populate("courseId", "title code")
      .sort({ availableFrom: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Quiz.countDocuments(filter);

    res.json({
      success: true,
      count: quizzes.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: quizzes,
    });
  } catch (error) {
    console.error("Get module quizzes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get upcoming quizzes (date-wise)
// @route   GET /api/v1/quizzes/upcoming
// @access  Public
exports.getUpcomingQuizzes = async (req, res) => {
  try {
    const { days = 7, page = 1, limit = 10 } = req.query;

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + parseInt(days));

    const filter = {
      isActive: true,
      isPublished: true,
      availableFrom: {
        $gte: now,
        $lte: futureDate,
      },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const quizzes = await Quiz.find(filter)
      .populate("courseId", "title code")
      .sort({ availableFrom: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Quiz.countDocuments(filter);

    res.json({
      success: true,
      count: quizzes.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: quizzes,
      timeframe: {
        from: now.toISOString(),
        to: futureDate.toISOString(),
        days: parseInt(days),
      },
    });
  } catch (error) {
    console.error("Get upcoming quizzes error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get quiz calendar (all quizzes for a month)
// @route   GET /api/v1/quizzes/calendar/:year/:month
// @access  Public
exports.getQuizCalendar = async (req, res) => {
  try {
    const { year, month } = req.params;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const filter = {
      isActive: true,
      isPublished: true,
      $or: [
        {
          availableFrom: { $lte: endDate },
          availableUntil: { $gte: startDate },
        },
      ],
    };

    const quizzes = await Quiz.find(filter)
      .populate("courseId", "title code")
      .sort({ availableFrom: 1 })
      .lean();

    // Group by date
    const calendar = {};
    quizzes.forEach((quiz) => {
      const quizDate = new Date(quiz.availableFrom).toISOString().split("T")[0];
      if (!calendar[quizDate]) {
        calendar[quizDate] = [];
      }
      calendar[quizDate].push(quiz);
    });

    res.json({
      success: true,
      data: {
        month: parseInt(month),
        year: parseInt(year),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        calendar,
        quizzes,
      },
    });
  } catch (error) {
    console.error("Get quiz calendar error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update a quiz
// @route   PUT /api/v1/quizzes/:id
// @access  Public
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the quiz
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Don't allow updating if quiz has attempts and it's published
    if (quiz.isPublished) {
      const attemptCount = await QuizAttempt.countDocuments({ quizId: id });
      if (attemptCount > 0) {
        // Only allow limited updates for quizzes with attempts
        const allowedUpdates = [
          "title",
          "description",
          "instructions",
          "tags",
          "availableUntil",
          "isActive",
        ];
        const restrictedUpdates = Object.keys(updateData).filter(
          (key) => !allowedUpdates.includes(key)
        );

        if (restrictedUpdates.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot update certain fields after quiz has attempts",
            restrictedFields: restrictedUpdates,
          });
        }
      }
    }

    // Validate dates if provided
    if (updateData.availableFrom || updateData.availableUntil) {
      const startDate = updateData.availableFrom
        ? new Date(updateData.availableFrom)
        : quiz.availableFrom;
      const endDate = updateData.availableUntil
        ? new Date(updateData.availableUntil)
        : quiz.availableUntil;

      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    // Validate questions limit if updating questions
    if (updateData.questions && updateData.questions.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Maximum 30 questions allowed per quiz",
      });
    }

    // Update quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("courseId", "title code");

    res.json({
      success: true,
      data: updatedQuiz,
      message: "Quiz updated successfully",
    });
  } catch (error) {
    console.error("Update quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete a quiz
// @route   DELETE /api/v1/quizzes/:id
// @access  Public
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the quiz
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if quiz has attempts
    const attemptCount = await QuizAttempt.countDocuments({ quizId: id });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete quiz that has attempts. Archive it instead.",
        attemptsCount: attemptCount,
      });
    }

    // Delete quiz
    await Quiz.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Publish a quiz
// @route   PATCH /api/v1/quizzes/:id/publish
// @access  Public
exports.publishQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the quiz
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Validate quiz has questions
    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish quiz without questions",
      });
    }

    // Validate all questions have correct answers
    const invalidQuestions = quiz.questions.filter((q) => {
      if (q.type === "multiple-choice" || q.type === "single-choice") {
        return !q.options || q.options.length < 2 || !q.correctAnswer;
      }
      if (q.type === "true-false") {
        return q.correctAnswer === undefined;
      }
      if (q.type === "short-answer") {
        return !q.correctAnswer || q.correctAnswer.trim() === "";
      }
      return false;
    });

    if (invalidQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some questions are incomplete or invalid",
        invalidQuestions: invalidQuestions.map((q, idx) => ({
          index: idx,
          question: q.question,
          type: q.type,
        })),
      });
    }

    // Publish quiz
    quiz.isPublished = true;
    quiz.publishedAt = new Date();
    await quiz.save();

    const populatedQuiz = await Quiz.findById(id).populate(
      "courseId",
      "title code"
    );

    res.json({
      success: true,
      data: populatedQuiz,
      message: "Quiz published successfully",
    });
  } catch (error) {
    console.error("Publish quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Add a question to a quiz
// @route   POST /api/v1/quizzes/:id/questions
// @access  Public
exports.addQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const questionData = req.body;

    // Find the quiz
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if quiz is published and has attempts
    if (quiz.isPublished) {
      const attemptCount = await QuizAttempt.countDocuments({ quizId: id });
      if (attemptCount > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot add questions to a published quiz that has attempts",
        });
      }
    }

    // Validate question data
    if (!questionData.question || questionData.question.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Question text is required",
      });
    }

    if (!questionData.type) {
      return res.status(400).json({
        success: false,
        message: "Question type is required",
      });
    }

    // Validate based on question type
    switch (questionData.type) {
      case "multiple-choice":
      case "single-choice":
        if (
          !questionData.options ||
          questionData.options.length < 2 ||
          !questionData.correctAnswer
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Multiple/single choice questions require options and correct answer",
          });
        }
        break;
      case "true-false":
        if (questionData.correctAnswer === undefined) {
          return res.status(400).json({
            success: false,
            message: "True/False questions require correct answer",
          });
        }
        break;
      case "short-answer":
        if (
          !questionData.correctAnswer ||
          questionData.correctAnswer.trim() === ""
        ) {
          return res.status(400).json({
            success: false,
            message: "Short answer questions require correct answer",
          });
        }
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid question type",
        });
    }

    // Check maximum questions limit
    if (quiz.questions.length >= 30) {
      return res.status(400).json({
        success: false,
        message: "Maximum 30 questions allowed per quiz",
      });
    }

    // Add question
    quiz.questions.push(questionData);
    await quiz.save();

    res.json({
      success: true,
      data: quiz.questions[quiz.questions.length - 1],
      message: "Question added successfully",
      totalQuestions: quiz.questions.length,
    });
  } catch (error) {
    console.error("Add question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get quiz analytics
// @route   GET /api/v1/quizzes/:id/analytics
// @access  Public
exports.getQuizAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the quiz
    const quiz = await Quiz.findById(id).lean();
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find({ quizId: id })
      .sort({ completedAt: -1 })
      .lean();

    // Calculate analytics
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(
      (a) => a.status === "completed"
    ).length;
    const inProgressAttempts = attempts.filter(
      (a) => a.status === "in-progress"
    ).length;
    const expiredAttempts = attempts.filter(
      (a) => a.status === "expired"
    ).length;

    // Calculate scores
    const scores = attempts
      .filter((a) => a.score !== undefined)
      .map((a) => a.score);

    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    const passingAttempts = attempts.filter(
      (a) => a.score !== undefined && a.score >= quiz.passingScore
    ).length;

    const passingRate =
      completedAttempts > 0 ? (passingAttempts / completedAttempts) * 100 : 0;

    // Question-wise analysis
    const questionStats = [];
    if (quiz.questions && attempts.length > 0) {
      quiz.questions.forEach((question, index) => {
        const questionAttempts = attempts.filter((attempt) =>
          attempt.answers.some((ans) => ans.questionIndex === index)
        );

        const correctAttempts = questionAttempts.filter((attempt) => {
          const answer = attempt.answers.find(
            (ans) => ans.questionIndex === index
          );
          return answer?.isCorrect;
        }).length;

        const accuracy =
          questionAttempts.length > 0
            ? (correctAttempts / questionAttempts.length) * 100
            : 0;

        questionStats.push({
          questionIndex: index,
          question: question.question.substring(0, 50) + "...",
          type: question.type,
          totalAttempts: questionAttempts.length,
          correctAttempts,
          accuracy: parseFloat(accuracy.toFixed(2)),
        });
      });
    }

    // Time analysis
    const completionTimes = attempts
      .filter((a) => a.timeTaken && a.timeTaken > 0)
      .map((a) => a.timeTaken);

    const averageTime =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
        : 0;

    const analytics = {
      quizInfo: {
        title: quiz.title,
        totalQuestions: quiz.questions.length,
        passingScore: quiz.passingScore,
        duration: quiz.duration,
        maxAttempts: quiz.maxAttempts,
      },
      overview: {
        totalAttempts,
        completedAttempts,
        inProgressAttempts,
        expiredAttempts,
        completionRate:
          totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
      },
      scores: {
        averageScore: parseFloat(averageScore.toFixed(2)),
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
        passingRate: parseFloat(passingRate.toFixed(2)),
        passingAttempts,
        failingAttempts: completedAttempts - passingAttempts,
      },
      timing: {
        averageTime: parseFloat(averageTime.toFixed(2)),
        fastestTime:
          completionTimes.length > 0 ? Math.min(...completionTimes) : 0,
        slowestTime:
          completionTimes.length > 0 ? Math.max(...completionTimes) : 0,
      },
      questionStats,
      attemptsTimeline: attempts.map((attempt) => ({
        date: attempt.completedAt || attempt.startedAt,
        score: attempt.score,
        status: attempt.status,
      })),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Get quiz analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
