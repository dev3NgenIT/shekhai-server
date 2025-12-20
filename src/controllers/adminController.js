const User = require('../models/User');
const Course = require('../models/Course');

exports.listUsers = async (req,res,next) => {
  const users = await User.find().select('-passwordHash').limit(200);
  res.json(users);
};

exports.listCourses = async (req,res,next) => {
  const courses = await Course.find().populate('instructor','name email').limit(200);
  res.json(courses);
};
