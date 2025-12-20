const Lesson = require('../models/Lesson');
const Course = require('../models/Course');

exports.create = async (req,res,next) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);
  if(!course) return res.status(404).json({ msg:'Course not found' });
  if(String(course.instructor) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ msg:'Forbidden' });
  const payload = req.body;
  payload.course = courseId;
  const lesson = await Lesson.create(payload);
  res.status(201).json(lesson);
};

exports.update = async (req,res,next) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');
  if(!lesson) return res.status(404).json({ msg:'Not found' });
  if(String(lesson.course.instructor) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ msg:'Forbidden' });
  Object.assign(lesson, req.body);
  await lesson.save();
  res.json(lesson);
};

exports.remove = async (req,res,next) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');
  if(!lesson) return res.status(404).json({ msg:'Not found' });
  if(String(lesson.course.instructor) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ msg:'Forbidden' });
  await lesson.deleteOne();
  res.json({ ok:true });
};
