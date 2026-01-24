const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// PUBLIC ROUTES (No authentication required)
router.post('/', contactController.submitContact);

// PROTECTED ROUTES (Add authentication middleware if needed)
// router.get('/', authMiddleware, contactController.getAllContacts);
// router.get('/:id', authMiddleware, contactController.getContactById);
// router.patch('/:id', authMiddleware, contactController.updateContactStatus);
// router.get('/stats', authMiddleware, contactController.getContactStats);

// For now, make all routes public (adjust as needed)
router.get('/', contactController.getAllContacts);
router.get('/:id', contactController.getContactById);
router.patch('/:id', contactController.updateContactStatus);
router.get('/stats', contactController.getContactStats);
router.delete('/:id', contactController.deleteContact);

module.exports = router;