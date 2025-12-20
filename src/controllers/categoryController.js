const Category = require("../models/Category");
const Course = require("../models/Course");

// Create a new category (Admin only)
exports.create = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get all categories (simple list)
exports.list = async (req, res) => {
  try {
    const categories = await Category.find().sort("name");
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get a single category by ID
exports.get = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ msg: "Category not found" });
    res.json({ success: true, category: cat });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Delete a category (Admin only)
exports.remove = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ msg: "Category not found" });

    await cat.deleteOne();
    res.json({ success: true, msg: "Category deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Get all courses for a specific category
exports.getCoursesByCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ msg: "Category not found" });

    // Find published courses for this category
    const courses = await Course.find({ category: categoryId, published: true })
      .populate("instructor", "name email role")
      .populate("category", "name slug description");

    // Format category as array inside each course
    const formattedCourses = courses.map((course) => ({
      ...course.toObject(),
      category: course.category ? [course.category] : [],
      instructor: course.instructor || null,
    }));

    res.json({
      success: true,
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      courses: formattedCourses,
    });
  } catch (err) {
    next(err);
  }
};

// List all categories with their courses nested
exports.listWithCourses = async (req, res, next) => {
  try {
    // Get all categories
    const categories = await Category.find().sort("name");

    // For each category, find published courses
    const categoriesWithCourses = await Promise.all(
      categories.map(async (cat) => {
        const courses = await Course.find({
          category: cat._id,
          published: true,
        })
          .populate("instructor", "name email role")
          .populate("category", "name slug description");

        const formattedCourses = courses.map((course) => ({
          ...course.toObject(),
          category: course.category ? [course.category] : [],
          instructor: course.instructor || null,
        }));

        return {
          id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          courses: formattedCourses,
        };
      })
    );

    res.json({ success: true, categories: categoriesWithCourses });
  } catch (err) {
    next(err);
  }
};

// Update a category (Admin or Instructor)
exports.update = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ msg: "Category not found" });

    // Update fields
    category.name = req.body.name || category.name;
    category.slug = req.body.slug || category.slug;
    category.description = req.body.description || category.description;

    await category.save();
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
