const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "uploads", "announcements"),
    path.join(process.cwd(), "uploads", "community"),
    path.join(process.cwd(), "uploads", "courses"),
    path.join(process.cwd(), "uploads", "users"),
    path.join(process.cwd(), "uploads", "lessons"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize directories
createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(process.cwd(), "uploads");

    // Determine subdirectory based on route or file type
    if (req.baseUrl.includes("announcements")) {
      uploadPath = path.join(uploadPath, "announcements");
    } else if (req.baseUrl.includes("community")) {
      uploadPath = path.join(uploadPath, "community");
    } else if (req.baseUrl.includes("courses")) {
      uploadPath = path.join(uploadPath, "courses");
    } else if (req.baseUrl.includes("users")) {
      uploadPath = path.join(uploadPath, "users");
    } else if (req.baseUrl.includes("lessons")) {
      uploadPath = path.join(uploadPath, "lessons");
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + "-" + uniqueSuffix + ext;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images, PDFs, documents, and spreadsheets are allowed."
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5, // Max 5 files per request
  },
});

// Middleware to handle upload errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 10MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 5 files allowed.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field name for file upload.",
      });
    }
  } else if (err) {
    // Other errors
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }
  next();
};

// Export configured upload middleware
module.exports = {
  // Single file upload
  single: (fieldName) => [
    upload.single(fieldName),
    handleUploadErrors,
  ],

  // Multiple files upload
  array: (fieldName, maxCount) => [
    upload.array(fieldName, maxCount),
    handleUploadErrors,
  ],

  // Multiple fields with different file limits
  fields: (fields) => [
    upload.fields(fields),
    handleUploadErrors,
  ],

  // Any file upload
  any: () => [
    upload.any(),
    handleUploadErrors,
  ],

  // Helper to delete file
  deleteFile: (filePath) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  },

  // Helper to get file URL
  getFileUrl: (filename, type = "announcements") => {
    return `/uploads/${type}/${filename}`;
  },
};