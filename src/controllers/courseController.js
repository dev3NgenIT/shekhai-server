const Course = require("../models/Course");
const Category = require("../models/Category");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer configuration for course images
const courseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "courses");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: courseStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).fields([
  { name: 'banner', maxCount: 1 },
  { name: 'thumbnails', maxCount: 4 }
]);

// Middleware for file upload
exports.uploadCourseImages = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, msg: 'File size too large (max 5MB)' });
      }
      if (err.message === 'Only image files are allowed') {
        return res.status(400).json({ success: false, msg: 'Only image files are allowed' });
      }
      return res.status(400).json({ success: false, msg: 'File upload error: ' + err.message });
    }
    next();
  });
};

// List all published courses
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = search
      ? { title: { $regex: search, $options: "i" }, published: true }
      : { published: true };

    const courses = await Course.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("instructor", "name email role")
      .populate("category", "name slug description");

    const mappedCourses = courses.map((course) => ({
      ...course.toObject(),
      category: course.category ? [course.category] : [],
      instructor: course.instructor ? course.instructor : null,
    }));

    res.json({ success: true, courses: mappedCourses });
  } catch (err) {
    next(err);
  }
};

// Get single course by ID
exports.get = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("instructor", "name email role")
      .populate("category", "name slug description");

    if (!course) return res.status(404).json({ success: false, msg: "Course not found" });

    res.json({
      success: true,
      course: {
        ...course.toObject(),
        category: course.category ? [course.category] : [],
        instructor: course.instructor ? course.instructor : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Create course
exports.create = async (req, res, next) => {
  try {
    let payload = req.body;
    
    console.log("Files received:", req.files);
    console.log("Body received:", req.body);

    // Handle uploaded files
    if (req.files) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get("host");
      
      // Banner image
      if (req.files['banner'] && req.files['banner'][0]) {
        const banner = req.files['banner'][0];
        payload.bannerUrl = `${protocol}://${host}/uploads/courses/${banner.filename}`;
      }
      
      // Thumbnail images
      if (req.files['thumbnails']) {
        payload.thumbnails = req.files['thumbnails'].map(file => 
          `${protocol}://${host}/uploads/courses/${file.filename}`
        );
      }
    }
    
    // Parse modules if sent as JSON string
    if (typeof payload.modules === 'string') {
      try {
        payload.modules = JSON.parse(payload.modules);
      } catch (parseErr) {
        return res.status(400).json({ 
          success: false, 
          msg: "Invalid modules format" 
        });
      }
    }

    // Validate required fields
    if (!payload.instructor) {
      if (req.user.role === "instructor") {
        payload.instructor = req.user.id;
      } else {
        return res.status(400).json({ 
          success: false, 
          msg: "Instructor is required" 
        });
      }
    }

    if (!payload.category) {
      return res.status(400).json({ 
        success: false, 
        msg: "Category is required" 
      });
    }

    // Validate category exists
    const cat = await Category.findById(payload.category);
    if (!cat) {
      return res.status(400).json({ 
        success: false, 
        msg: "Category not found" 
      });
    }

    // Calculate totals
    payload.totalModules = payload.modules ? payload.modules.length : 0;
    payload.totalDuration = payload.modules
      ? payload.modules.reduce((sum, m) => sum + (Number(m.duration) || 0), 0)
      : 0;

    // Ensure proper data types
    payload.price = Number(payload.price) || 0;
    payload.published = payload.published === 'true' || payload.published === true;

    // Create course
    const createdCourse = await Course.create(payload);

    const courseWithPopulate = await Course.findById(createdCourse._id)
      .populate("instructor", "name email role")
      .populate("category", "name slug description");

    res.status(201).json({
      success: true,
      course: {
        ...courseWithPopulate.toObject(),
        category: courseWithPopulate.category ? [courseWithPopulate.category] : [],
        instructor: courseWithPopulate.instructor || null,
      },
    });
  } catch (err) {
    console.error("Create course error:", err);
    next(err);
  }
};

// Update course
exports.update = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        msg: "Course not found" 
      });
    }

    // Check permissions
    if (req.user.role !== "admin" && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        msg: "Forbidden" 
      });
    }

    Object.assign(course, req.body);

    if (req.body.modules) {
      course.totalModules = req.body.modules.length;
      course.totalDuration = req.body.modules.reduce(
        (sum, m) => sum + (Number(m.duration) || 0),
        0
      );
    }

    // Update bannerUrl and thumbnails
    if (req.body.bannerUrl !== undefined) course.bannerUrl = req.body.bannerUrl;
    if (req.body.thumbnails !== undefined) course.thumbnails = req.body.thumbnails;

    course.updatedAt = new Date();
    await course.save();
    
    res.json({ 
      success: true, 
      course 
    });
  } catch (err) {
    next(err);
  }
};

// Delete course
exports.remove = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        msg: "Course not found" 
      });
    }

    if (req.user.role !== "admin" && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        msg: "Forbidden" 
      });
    }

    await course.deleteOne();
    res.json({ 
      success: true 
    });
  } catch (err) {
    next(err);
  }
};