require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const compression = require("compression");

const connectDB = require("./config/db");
const { errorHandler } = require("./middlewares/errorHandler");

// Routes
const communityRoutes = require("./routes/communityRoutes");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/courses");
const lessonRoutes = require("./routes/lessons");
const paymentRoutes = require("./routes/payments");
const uploadRoutes = require("./routes/uploads");
const adminRoutes = require("./routes/admin");
const categoryRoutes = require("./routes/category");

const app = express();

// ---------------------------
// Compression for better performance
// ---------------------------
app.use(compression());

// ---------------------------
// CORS Configuration
// ---------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "https://shekhai-dashboard.vercel.app",
  "https://shekhai-server.up.railway.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ---------------------------
// Body parsing with increased limits for file uploads
// ---------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ---------------------------
// Logging
// ---------------------------
app.use(
  morgan(
    ':date[iso] :remote-addr ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'
  )
);

// ---------------------------
// Helmet + CSP Configuration
// ---------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", ...allowedOrigins],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", ...allowedOrigins],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ---------------------------
// Additional Security Headers
// ---------------------------
app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  next();
});

// ---------------------------
// Static Files with CORS Headers
// ---------------------------
const uploadsDir = path.join(process.cwd(), "uploads");
const communityUploadsDir = path.join(uploadsDir, "community");

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(communityUploadsDir)) {
  fs.mkdirSync(communityUploadsDir, { recursive: true });
}

// Static files configuration
const staticOptions = {
  setHeaders: (res, filePath) => {
    // Allow all allowed origins for static files
    const requestOrigin = req.headers.origin;
    if (allowedOrigins.includes(requestOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  },
};

// Apply static middleware to uploads directory
app.use("/uploads", (req, res, next) => {
  express.static(uploadsDir, staticOptions)(req, res, next);
});

// Handle OPTIONS for static files
app.options("/uploads/*", (req, res) => {
  const requestOrigin = req.headers.origin;
  if (allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.status(200).end();
});

// ---------------------------
// Health Check Endpoint
// ---------------------------
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ---------------------------
// Connect database
// ---------------------------
connectDB();

// ---------------------------
// API Documentation endpoint
// ---------------------------
app.get("/api-docs", (req, res) => {
  res.json({
    message: "API Documentation",
    endpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      courses: "/api/v1/courses",
      lessons: "/api/v1/lessons",
      payments: "/api/v1/payments",
      uploads: "/api/v1/uploads",
      admin: "/api/v1/admin",
      categories: "/api/v1/categories",
      community: "/api/v1/community",
    },
    community_endpoints: {
      "GET /questions": "Get all questions",
      "GET /questions/:id": "Get single question with answers",
      "POST /questions": "Create new question (with images)",
      "POST /questions/:id/answers": "Add answer to question (with images)",
      "GET /stats": "Get community statistics",
    },
  });
});

// ---------------------------
// Routes
// ---------------------------
app.get("/", (req, res) =>
  res.json({
    ok: true,
    message: "Shekhai LMS Backend API",
    version: "1.0.0",
    documentation: "/api-docs",
    health: "/health",
  })
);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/community", communityRoutes);

// ---------------------------
// 404 Handler
// ---------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: "/api-docs",
  });
});

// ---------------------------
// Error handling middleware
// ---------------------------
app.use(errorHandler);

// ---------------------------
// Unhandled rejection handler
// ---------------------------
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  // Don't crash the server, just log
});

// ---------------------------
// Graceful Shutdown
// ---------------------------
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔗 Community uploads: ${communityUploadsDir}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});