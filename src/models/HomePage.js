// models/HomePage.js
const mongoose = require('mongoose');

const iconSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true }, // Can be URL or base64
  description: { type: String },
  courses_count: { type: Number, default: 0 },
  color: { type: String, default: '#4F46E5' }
}, { _id: true });

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  avatar: { type: String }, // Can be URL or base64
  content: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 5 }
}, { _id: true });

const statisticSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  icon: { type: String }, // Can be icon name or base64
  suffix: { type: String, default: '+' }
}, { _id: true });

const featureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  icon: { type: String }, // Can be URL or base64
  description: { type: String }
}, { _id: true });

const expertSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  avatar: { type: String }, // Can be URL or base64
  bio: { type: String }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String }, // Can be URL or base64
  courses_count: { type: Number, default: 0 },
  description: { type: String }
}, { _id: true });

const linkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  link: { type: String, required: true }
}, { _id: true });

const socialSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  icon: { type: String, required: true },
  link: { type: String, required: true }
}, { _id: true });

const homePageSchema = new mongoose.Schema({
  // Hero Section
  hero: {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    search_placeholder: { type: String, required: true },
    search_button: { type: String, required: true },
    background_image: { type: String }, // Can be URL or base64
    hero_image: { type: String } // Additional hero image
  },

  // Featured Categories
  featured_categories: {
    title: { type: String, required: true },
    subtitle: { type: String },
    categories: [iconSchema]
  },

  // Start Learning Today Section
  start_learning: {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String }, // Can be URL or base64
    button_text: { type: String, default: 'Start Learning' },
    button_link: { type: String, default: '/courses' }
  },

  // Cooking & Recipes Section
  cooking_section: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    button_text: { type: String, required: true },
    image: { type: String }, // Can be URL or base64
    features: [featureSchema]
  },

  // Agriculture Skills Section
  agriculture_section: {
    title: { type: String, required: true },
    tagline: { type: String, required: true },
    special_offer: { type: String },
    description: { type: String, required: true },
    image: { type: String }, // Can be URL or base64
    button_text: { type: String, default: 'Explore Courses' },
    button_link: { type: String, default: '/courses/agriculture' }
  },

  // Experts Section
  experts_section: {
    title: { type: String, required: true },
    subtitle: { type: String },
    experts: [expertSchema]
  },

  // Hobby to Hustle Section
  hobby_section: {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    description: { type: String, required: true },
    button_text: { type: String, required: true },
    image: { type: String }, // Can be URL or base64
    features: [featureSchema]
  },

  // Project Idea Section
  project_section: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String }, // Can be URL or base64
    button_text: { type: String, default: 'Start Project' },
    button_link: { type: String, default: '/projects' }
  },

  // Popular Products
  popular_products: {
    title: { type: String, required: true },
    products: [productSchema]
  },

  // Share Your Skill CTA
  share_skill_cta: {
    title: { type: String, required: true },
    journey_text: { type: String, required: true },
    button_text: { type: String, required: true },
    button_link: { type: String, default: '/become-instructor' },
    background_image: { type: String } // Can be URL or base64
  },

  // Why Choose Us Section
  why_choose_us: {
    title: { type: String, required: true },
    features: [featureSchema]
  },

  // Statistics Section
  statistics: {
    title: { type: String },
    subtitle: { type: String },
    stats: [statisticSchema]
  },

  // Study Bit Section
  study_bit: {
    title: { type: String, required: true },
    question: { type: String, required: true },
    image: { type: String }, // Can be URL or base64
    button_text: { type: String, default: 'Browse Skills' },
    button_link: { type: String, default: '/skills' }
  },

  // Testimonials Section
  testimonials: {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    testimonials: [testimonialSchema]
  },

  // Footer
  footer: {
    company_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    copyright: { type: String, required: true },
    description: { type: String },
    
    // Links
    pages: [linkSchema],
    important_links: [linkSchema],
    social_profiles: [socialSchema]
  },

  // SEO Metadata
  seo: {
    meta_title: { type: String, default: 'Shekhai - Online Learning Platform' },
    meta_description: { type: String, default: 'Learn new skills with Shekhai online courses' },
    meta_keywords: { type: String, default: 'online courses, learning, skills' },
    og_image: { type: String } // Can be URL or base64
  },

  // Settings
  settings: {
    is_active: { type: Boolean, default: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 }
  }
}, {
  timestamps: true,
  minimize: false
});

// Ensure only one document exists
homePageSchema.statics.getSingleton = async function() {
  let doc = await this.findOne();
  if (!doc) {
    // Create with default values
    doc = await this.create({
      hero: {
        title: 'Get Your Study Done',
        subtitle: 'Browse through Thousands of StudyBit. Choose one you trust. Pay as you go',
        search_placeholder: 'I want to learn Mathematics',
        search_button: 'Search Now'
      },
      featured_categories: {
        title: 'Popular Categories',
        categories: [
          { name: 'Smart Home Automation', icon: '', courses_count: 15, color: '#4F46E5' }
        ]
      },
      start_learning: {
        title: 'Start Learning Today',
        subtitle: '500+ Learning Module Available',
        description: 'Gain in-demand skills and knowledge through interactive and engaging online learning, and take the next step toward a successful future.',
        button_text: 'Start Learning',
        button_link: '/courses'
      },
      // ... other defaults
    });
  }
  return doc;
};

// Helper method to update specific section
homePageSchema.statics.updateSection = async function(section, data) {
  const update = {};
  update[section] = data;
  
  return this.findOneAndUpdate(
    {},
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('HomePage', homePageSchema);