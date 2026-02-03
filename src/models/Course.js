const mongoose = require("mongoose");

// Lesson Resource Schema
const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['pdf', 'zip', 'markdown', 'video', 'link'], required: true },
  url: { type: String },
  content: { type: String }, // Base64 for small files
  size: { type: String },
  description: { type: String }
}, { timestamps: true });

// Lesson Schema - SIMPLIFIED to connect with your existing Quiz
const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['video', 'quiz', 'practice', 'project', 'reading'], default: 'video' },
  videoUrl: { type: String },
  duration: { type: Number, default: 0 }, // in seconds
  
  // Connection to existing Quiz
  quizId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quiz',
    required: function() { return this.type === 'quiz'; }
  },
  
  content: {
    text: { type: String }, // For reading lessons
    videoUrl: { type: String },
    resources: [resourceSchema],
    instructions: { type: String } // For practice/project
  },
  order: { type: Number, required: true },
  isPreview: { type: Boolean, default: false },
  status: { type: String, enum: ['locked', 'unlocked', 'completed'], default: 'locked' }
}, { timestamps: true });

// Module Schema
const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true },
  lessons: [lessonSchema],
  totalLessons: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  status: { type: String, enum: ['locked', 'unlocked', 'completed'], default: 'locked' }
}, { timestamps: true });

// Main Course Schema
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    longDescription: { type: String, required: true },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: { type: Number, default: 0 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    
    // Base64 Images
    bannerImage: {
      data: { type: String }, // Base64 string
      contentType: { type: String },
      size: { type: Number }
    },
    thumbnails: [{
      data: { type: String }, // Base64 string
      contentType: { type: String },
      size: { type: Number },
      order: { type: Number }
    }],
    
    // Course Structure
    modules: [moduleSchema],
    totalModules: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    totalProjects: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 }, // in minutes
    
    enrollmentDeadline: { type: Date },
    published: { type: Boolean, default: false },
    
    // Analytics
    enrolledStudents: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    
    // Certificate
    certificateTemplate: {
      title: { type: String },
      description: { type: String },
      templateImage: { // Base64 certificate template
        data: { type: String },
        contentType: { type: String }
      }
    },
    
    // Meta
    tags: [{ type: String }],
    language: { type: String, default: "English" },
    subtitles: [{ type: String }],
    certificateIncluded: { type: Boolean, default: false },
    accessType: { type: String, enum: ['lifetime', 'subscription', 'timed'], default: 'lifetime' },
    prerequisites: [{ type: String }],
    whatYoullLearn: [{ type: String }],
    
    // References to separate collections (like your existing Quiz model)
    allQuizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
    allExams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }],
    allCertificates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' }]
  },
  { timestamps: true }
);

// Calculate totals before save
courseSchema.pre('save', function(next) {
  // Calculate totals from modules
  this.totalModules = this.modules.length;
  this.totalLessons = this.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  this.totalQuizzes = this.modules.reduce((sum, module) => 
    sum + module.lessons.filter(lesson => lesson.type === 'quiz').length, 0);
  this.totalProjects = this.modules.reduce((sum, module) => 
    sum + module.lessons.filter(lesson => lesson.type === 'project').length, 0);
  this.totalDuration = this.modules.reduce((sum, module) => 
    sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.duration || 0), 0), 0);
  
  // Collect all quiz IDs from lessons
  this.allQuizzes = this.modules.reduce((quizzes, module) => {
    module.lessons.forEach(lesson => {
      if (lesson.type === 'quiz' && lesson.quizId) {
        quizzes.push(lesson.quizId);
      }
    });
    return quizzes;
  }, []);
  
  next();
});

// Virtual for progress calculation
courseSchema.virtual('progress').get(function() {
  return {
    totalLessons: this.totalLessons,
    totalDuration: this.totalDuration,
    totalQuizzes: this.totalQuizzes,
    totalProjects: this.totalProjects
  };
});

module.exports = mongoose.model("Course", courseSchema);