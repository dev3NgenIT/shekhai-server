// routes/homePageRoutes.js
const express = require('express');
const router = express.Router();
const homePageController = require('../controllers/homePageController');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/homepage');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Get homepage data
router.get('/', homePageController.getHomePage);

// Get homepage preview
router.get('/preview', homePageController.getPreview);

// Update entire homepage
router.post('/', homePageController.updateHomePage);
router.patch('/', homePageController.updateHomePage);

// Update specific section
router.patch('/section/:section', homePageController.updateSection);

// Add to array section
router.post('/section/:section/:arrayField', homePageController.addToArraySection);

// Update item in array section
router.patch('/section/:section/:arrayField/:itemId', homePageController.updateArrayItem);

// Remove from array section
router.delete('/section/:section/:arrayField/:itemId', homePageController.removeFromArraySection);

// Upload image (for large images)
router.post('/upload/image', upload.single('image'), homePageController.uploadImage);

// Upload multiple images
router.post('/upload/images', upload.array('images', 10), async (req, res) => {
  try {
    const images = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/homepage/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: images
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// Reset homepage
router.delete('/reset', homePageController.resetHomePage);

// Export data
router.get('/export', async (req, res) => {
  try {
    const homePage = await HomePage.getSingleton();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="homepage-backup.json"');
    
    res.send(JSON.stringify(homePage, null, 2));
  } catch (error) {
    console.error('Error exporting homepage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export homepage',
      error: error.message
    });
  }
});

// Import data
router.post('/import', async (req, res) => {
  try {
    const importData = req.body;
    
    if (!importData || typeof importData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid import data'
      });
    }
    
    const homePage = await HomePage.findOneAndUpdate(
      {},
      importData,
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Homepage imported successfully',
      data: homePage
    });
  } catch (error) {
    console.error('Error importing homepage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import homepage',
      error: error.message
    });
  }
});

module.exports = router;