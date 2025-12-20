const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { permit } = require('../middlewares/permit');
const ctrl = require('../controllers/lessonController');

router.post('/:courseId', auth, permit('instructor'), ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
