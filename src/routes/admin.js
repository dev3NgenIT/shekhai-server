const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { permit } = require('../middlewares/permit');
const ctrl = require('../controllers/adminController');

router.get('/users', auth, permit('admin'), ctrl.listUsers);
router.get('/courses', auth, permit('admin'), ctrl.listCourses);

module.exports = router;
