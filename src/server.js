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
const quizRoutes = require("./routes/quizRoutes");
const announcementRoutes = require("./routes/announcements"); // Add this import

const app = express();

// ---------------------------
// Compression for better performance
// ---------------------------
app.use(compression());

// ---------------------------
// CORS Configuration - Apply globally first
// ---------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://shekhai-dashboard.vercel.app",
  "https://shekhai-server-production.up.railway.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For development, you might want to log the blocked origin
      if (process.env.NODE_ENV === "development") {
        console.log(`CORS blocked origin: ${origin}`);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
  ],
  exposedHeaders: ["Content-Disposition"],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
};

// Apply CORS globally to all routes
app.use(cors(corsOptions));

// Handle preflight requests globally
app.options("*", cors(corsOptions));

// ---------------------------
// Body parsing with increased limits for file uploads
// ---------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ---------------------------
// Logging - Development only
// ---------------------------
if (process.env.NODE_ENV === "development") {
  app.use(
    morgan(
      ':date[iso] :remote-addr ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'
    )
  );
} else {
  // Production logging - simpler format
  app.use(morgan("combined"));
}

// ---------------------------
// Helmet Configuration
// ---------------------------
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, // Relaxed for file uploads
  crossOriginOpenerPolicy: { policy: "same-origin" },
};

// Only enable strict CSP in production
if (process.env.NODE_ENV === "production") {
  app.use(helmet(helmetConfig));
} else {
  // More relaxed for development
  app.use(
    helmet({
      ...helmetConfig,
      contentSecurityPolicy: false, // Disable CSP in development for easier testing
    })
  );
}

// ---------------------------
// Additional Security Headers
// ---------------------------
app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");

  // Set CORS headers dynamically
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Cache control for API responses
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  next();
});

// ---------------------------
// Create upload directories
// ---------------------------
const uploadsDir = path.join(process.cwd(), "uploads");
const communityUploadsDir = path.join(uploadsDir, "community");
const announcementUploadsDir = path.join(uploadsDir, "announcements");

// Create directories if they don't exist
[uploadsDir, communityUploadsDir, announcementUploadsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// ---------------------------
// Static Files with proper CORS headers
// ---------------------------
app.use(
  "/uploads",
  (req, res, next) => {
    // Set CORS headers for static files
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    // Cache static files for 1 day
    res.setHeader("Cache-Control", "public, max-age=86400");

    next();
  },
  express.static(uploadsDir)
);

// ---------------------------
// Health Check Endpoint
// ---------------------------
app.get("/health", (req, res) => {
  const healthcheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    database: "connected", // You might want to add DB connection check
    features: {
      authentication: true,
      course_management: true,
      lesson_management: true,
      payment_processing: true,
      file_uploads: true,
      community_forum: true,
      quiz_system: true,
      announcements: true,
    },
  };

  // You can add database connection check here
  // const dbStatus = mongoose.connection.readyState;
  // healthcheck.database = dbStatus === 1 ? "connected" : "disconnected";

  res.status(200).json(healthcheck);
});

// ---------------------------
// Connect database
// ---------------------------
connectDB();

// ---------------------------
// API Documentation endpoint
// ---------------------------
app.get("/api-docs", (req, res) => {
  const docs = {
    message: "🚀 Shekhai LMS API Documentation",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    baseUrl: `${req.protocol}://${req.get("host")}`,
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
      quizzes: "/api/v1/quizzes",
      announcements: "/api/v1/announcements",
    },
    features: {
      announcement_system: {
        description: "Announcement Management System",
        endpoints: [
          "GET    /announcements                  - Get all announcements (with filters)",
          "GET    /announcements/:id              - Get single announcement",
          "POST   /announcements                  - Create new announcement (instructor/admin only)",
          "PUT    /announcements/:id              - Update announcement",
          "DELETE /announcements/:id              - Delete announcement",
          "PATCH  /announcements/:id/publish      - Publish announcement",
          "GET    /announcements/stats/overview   - Get announcement statistics",
          "GET    /announcements/course/:courseId - Get announcements by course",
          "GET    /announcements/dashboard/recent - Get recent announcements for dashboard",
        ],
        notes: [
          "Instructor/Admin authentication required for create/update/delete operations",
          "Supports file attachments (PDF, images, documents)",
          "Priority levels: high, medium, low",
          "Status: draft or published",
          "Supports scheduling and expiration dates",
        ],
      },
      quiz_system: {
        description: "Quiz Management System (No Authentication Required)",
        endpoints: [
          "GET    /quizzes                      - Get all quizzes with filters",
          "POST   /quizzes                      - Create a new quiz (max 30 questions)",
          "GET    /quizzes/:id                  - Get single quiz by ID",
          "PUT    /quizzes/:id                  - Update quiz",
          "DELETE /quizzes/:id                  - Delete quiz",
          "PATCH  /quizzes/:id/publish          - Publish quiz",
          "POST   /quizzes/:id/questions        - Add question to quiz",
          "GET    /quizzes/:id/analytics        - Get quiz analytics",
          "GET    /quizzes/course/:courseId     - Get quizzes by course",
          "GET    /quizzes/module/:moduleId     - Get quizzes by module",
          "GET    /quizzes/upcoming             - Get upcoming quizzes",
          "GET    /quizzes/calendar/:year/:month - Get quiz calendar",
          "POST   /quizzes/:id/attempt          - Start quiz attempt",
          "POST   /quizzes/:id/submit           - Submit quiz answers",
          "GET    /quizzes/attempts/my-attempts - Get user attempts",
          "GET    /quizzes/attempts/:id         - Get single attempt details",
        ],
        notes: [
          "No authentication tokens required",
          "Maximum 30 questions per quiz",
          "Multiple question types supported",
          "Quiz attempts tracking",
          "Detailed analytics available",
        ],
      },
    },
    quick_start: {
      authentication: "Use /api/v1/auth/login to get JWT token",
      testing: "Use Postman or curl with appropriate headers",
      file_uploads: "Use multipart/form-data for file uploads",
      pagination: "Use ?page=1&limit=10 query parameters",
    },
  };

  res.json(docs);
});

// ---------------------------
// Welcome Route
// ---------------------------
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Shekhai LMS Backend API",
    version: "2.0.0",
    documentation: "/api-docs",
    health: "/health",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    features: {
      authentication: "✅ JWT Based",
      course_management: "✅ Full CRUD",
      lesson_management: "✅ With Video Support",
      payment_processing: "✅ Stripe Integration",
      file_uploads: "✅ Image/Video/Document Support",
      community_forum: "✅ Q&A with Images",
      quiz_system: "✅ Public Access (No Auth Required)",
      announcement_system: "✅ With Scheduling & Attachments",
    },
    status: {
      database: "Connected",
      server: "Running",
      uploads: "Available",
      cache: "Enabled",
    },
  });
});

// ---------------------------
// API Routes
// ---------------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/community", communityRoutes);
app.use("/api/v1/quizzes", quizRoutes);
app.use("/api/v1/announcements", announcementRoutes);

// ---------------------------
// 404 Handler
// ---------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      "/api/v1/auth",
      "/api/v1/users",
      "/api/v1/courses",
      "/api/v1/lessons",
      "/api/v1/payments",
      "/api/v1/uploads",
      "/api/v1/admin",
      "/api/v1/categories",
      "/api/v1/community",
      "/api/v1/quizzes",
      "/api/v1/announcements",
    ],
    documentation: "/api-docs",
    suggestion: "Check the API documentation for correct endpoint usage",
  });
});

// ---------------------------
// Error handling middleware (must be last)
// ---------------------------
app.use(errorHandler);

// ---------------------------
// Unhandled rejection handler
// ---------------------------
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  console.error("Stack trace:", err.stack);

  // In production, you might want to send an alert/notification
  if (process.env.NODE_ENV === "production") {
    // Add your error monitoring service here (Sentry, LogRocket, etc.)
    console.error(
      "Production error occurred. Consider implementing error monitoring."
    );
  }
});

// ---------------------------
// Uncaught exception handler
// ---------------------------
process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err.message);
  console.error("Stack trace:", err.stack);

  // Graceful shutdown
  server.close(() => {
    console.log("Server closed due to uncaught exception");
    process.exit(1);
  });

  // Force exit after 5 seconds if server doesn't close
  setTimeout(() => {
    console.error("Forcing process exit due to timeout");
    process.exit(1);
  }, 5000);
});

// ---------------------------
// Graceful Shutdown
// ---------------------------
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error("Error during server shutdown:", err);
      process.exit(1);
    }

    console.log("✅ HTTP server closed");

    // Close database connections here if needed
    // mongoose.connection.close(false, () => {
    //   console.log("✅ Database connection closed");
    //   process.exit(0);
    // });

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("⚠️ Could not close connections in time, forcing shutdown");
    process.exit(1);
  }, 30000);
};

// Handle various shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, "0.0.0.0", () => {
  const address = server.address();
  const host = address.address === "::" ? "localhost" : address.address;

  console.log(`
  ╔══════════════════════════════════════════════════════════════════════╗
  ║                                                                      ║
  ║   🚀 Shekhai LMS Server Started Successfully!                       ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║   📍 Server: ${host}:${PORT}                                        ║
  ║   🌍 Environment: ${process.env.NODE_ENV || "development"}          ║
  ║   📊 Node Version: ${process.version}                               ║
  ║   📁 Uploads Directory: ${uploadsDir}                               ║
  ║   🔗 CORS Origins: ${allowedOrigins.length} configured              ║
  ║                                                                      ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                      ║
  ║   📚 API Documentation: http://${host}:${PORT}/api-docs             ║
  ║   ❤️  Health Check: http://${host}:${PORT}/health                   ║
  ║   🎯 Quiz System: Public Access (No Auth Required)                  ║
  ║   📢 Announcement System: With Scheduling & Attachments             ║
  ║                                                                      ║
  ╚══════════════════════════════════════════════════════════════════════╝
  `);

  // Log all available endpoints
  console.log("\n📋 Available API Endpoints:");
  console.log("├── /api/v1/auth              - Authentication");
  console.log("├── /api/v1/users             - User Management");
  console.log("├── /api/v1/courses           - Course Management");
  console.log("├── /api/v1/lessons           - Lesson Management");
  console.log("├── /api/v1/payments          - Payment Processing");
  console.log("├── /api/v1/uploads           - File Uploads");
  console.log("├── /api/v1/admin             - Admin Functions");
  console.log("├── /api/v1/categories        - Category Management");
  console.log("├── /api/v1/community         - Community Forum");
  console.log("├── /api/v1/quizzes           - Quiz System (Public)");
  console.log("└── /api/v1/announcements     - Announcement System");

  console.log("\n🎯 Key Features:");
  console.log("├── Quiz System: No authentication required");
  console.log("├── Announcements: With file attachments");
  console.log("├── File Uploads: Images, videos, documents");
  console.log("├── Community: Q&A with image support");
  console.log("├── Payments: Stripe integration");
  console.log("└── Security: JWT authentication, CORS, Helmet");

  console.log(
    `\n✅ Server is ready to accept requests at http://${host}:${PORT}`
  );
  console.log(
    `📝 API Documentation available at http://${host}:${PORT}/api-docs`
  );
});

// ---------------------------
// Handle server errors
// ---------------------------
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    console.log("\nTry one of these solutions:");
    console.log("1. Use a different port: PORT=3001 npm start");
    console.log("2. Kill the process using port " + PORT);
    console.log("   On Unix/Linux/Mac: lsof -ti:" + PORT + " | xargs kill -9");
    console.log("   On Windows: netstat -ano | findstr :" + PORT);
    console.log("3. Wait a few minutes and try again");
  } else if (error.code === "EACCES") {
    console.error(`❌ Permission denied for port ${PORT}`);
    console.log("Try using a port above 1024 or run with sudo");
  } else {
    console.error("❌ Server error:", error.message);
    console.error("Error code:", error.code);
  }
  process.exit(1);
});

// ---------------------------
// Handle connection events
// ---------------------------
server.on("connection", (socket) => {
  // Optional: Log connection info (can be noisy in production)
  if (process.env.NODE_ENV === "development") {
    console.log(
      `New connection from ${socket.remoteAddress}:${socket.remotePort}`
    );
  }

  // Set timeout to prevent hanging connections
  socket.setTimeout(30000); // 30 seconds

  socket.on("timeout", () => {
    console.log(`Socket timeout from ${socket.remoteAddress}`);
    socket.end();
  });
});
