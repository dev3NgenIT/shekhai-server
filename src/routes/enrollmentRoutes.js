const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');

// @route   POST /api/v1/enrollments
// @desc    Create new enrollment
// @access  Public
router.post('/enrollments', enrollmentController.createEnrollment);

// @route   GET /api/v1/enrollments
// @desc    Get all enrollments with filters
// @access  Public
router.get('/enrollments', enrollmentController.getAllEnrollments);

// @route   GET /api/v1/enrollments/:id
// @desc    Get enrollment by ID
// @access  Public
router.get('/enrollments/:id', enrollmentController.getEnrollmentById);

// @route   GET /api/v1/enrollments/student/:email
// @desc    Get enrollments by student email
// @access  Public
router.get('/enrollments/student/:email', enrollmentController.getEnrollmentsByEmail);

// @route   GET /api/v1/enrollments/course/:courseId
// @desc    Get enrollments by course ID
// @access  Public
router.get('/enrollments/course/:courseId', enrollmentController.getEnrollmentsByCourse);

module.exports = router;