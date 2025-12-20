const { body } = require('express-validator');

exports.courseValidator = [
  body('title').notEmpty().withMessage('Title required'),
  body('description').isString().optional()
];
