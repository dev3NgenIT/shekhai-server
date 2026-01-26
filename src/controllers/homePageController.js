// controllers/homePageController.js
const HomePage = require('../models/HomePage');
const fs = require('fs');
const path = require('path');

// Helper function to process images
const processImage = (imageData) => {
  if (!imageData) return '';
  
  // Check if it's a base64 image
  if (imageData.startsWith('data:image/')) {
    // Validate base64 format
    const matches = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }
    
    // Check file size (max 5MB)
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('Image size exceeds 5MB limit');
    }
    
    return imageData; // Return base64 as-is for now
    // In production, you might want to save to disk or cloud storage
  }
  
  return imageData; // Return URL as-is
};

// Process all images in an object recursively
const processImagesInObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const processed = { ...obj };
  
  Object.keys(processed).forEach(key => {
    const value = processed[key];
    
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        processed[key] = processImage(value);
      } catch (error) {
        console.error(`Error processing image in field ${key}:`, error.message);
        processed[key] = ''; // Clear invalid image
      }
    } else if (Array.isArray(value)) {
      processed[key] = value.map(item => processImagesInObject(item));
    } else if (typeof value === 'object' && value !== null) {
      processed[key] = processImagesInObject(value);
    }
  });
  
  return processed;
};

// Get homepage data
exports.getHomePage = async (req, res) => {
  try {
    const homePage = await HomePage.getSingleton();
    
    res.status(200).json({
      success: true,
      message: 'Homepage data fetched successfully',
      data: homePage
    });
  } catch (error) {
    console.error('Error fetching homepage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage data',
      error: error.message
    });
  }
};

// Create or Update homepage data
exports.updateHomePage = async (req, res) => {
  try {
    let updateData = req.body;
    
    // Process all images in the update data
    updateData = processImagesInObject(updateData);
    
    const homePage = await HomePage.findOneAndUpdate(
      {},
      updateData,
      { 
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Homepage updated successfully',
      data: homePage
    });
  } catch (error) {
    console.error('Error updating homepage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update homepage',
      error: error.message
    });
  }
};

// Update specific section
exports.updateSection = async (req, res) => {
  try {
    const { section } = req.params;
    let sectionData = req.body;
    
    // Process images in section data
    sectionData = processImagesInObject(sectionData);
    
    const homePage = await HomePage.updateSection(section, sectionData);

    res.status(200).json({
      success: true,
      message: `${section} section updated successfully`,
      data: homePage[section]
    });
  } catch (error) {
    console.error(`Error updating ${section} section:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to update ${section} section`,
      error: error.message
    });
  }
};

// Add item to array section
exports.addToArraySection = async (req, res) => {
  try {
    const { section, arrayField } = req.params;
    let itemData = req.body;
    
    // Process images in item data
    itemData = processImagesInObject(itemData);
    
    const homePage = await HomePage.findOneAndUpdate(
      {},
      { $push: { [`${section}.${arrayField}`]: itemData } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Item added to ${section}.${arrayField} successfully`,
      data: homePage[section][arrayField]
    });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item',
      error: error.message
    });
  }
};

// Update item in array section
exports.updateArrayItem = async (req, res) => {
  try {
    const { section, arrayField, itemId } = req.params;
    let updateData = req.body;
    
    // Process images in update data
    updateData = processImagesInObject(updateData);
    
    const homePage = await HomePage.findOneAndUpdate(
      { [`${section}.${arrayField}._id`]: itemId },
      { $set: { [`${section}.${arrayField}.$`]: updateData } },
      { new: true }
    );

    if (!homePage) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Item updated in ${section}.${arrayField} successfully`,
      data: updateData
    });
  } catch (error) {
    console.error('Error updating array item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error.message
    });
  }
};

// Remove item from array section
exports.removeFromArraySection = async (req, res) => {
  try {
    const { section, arrayField, itemId } = req.params;
    
    const homePage = await HomePage.findOneAndUpdate(
      {},
      { $pull: { [`${section}.${arrayField}`]: { _id: itemId } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Item removed from ${section}.${arrayField} successfully`,
      data: homePage[section][arrayField]
    });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item',
      error: error.message
    });
  }
};

// Upload image endpoint (for large images)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Convert file to base64
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
    
    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        base64: base64Image,
        url: `/uploads/${req.file.filename}` // If you want to save to disk
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
};

// Reset homepage to defaults
exports.resetHomePage = async (req, res) => {
  try {
    await HomePage.deleteMany({});
    const homePage = await HomePage.getSingleton();
    
    res.status(200).json({
      success: true,
      message: 'Homepage reset to defaults',
      data: homePage
    });
  } catch (error) {
    console.error('Error resetting homepage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset homepage',
      error: error.message
    });
  }
};

// Get homepage preview
exports.getPreview = async (req, res) => {
  try {
    const homePage = await HomePage.getSingleton();
    
    // Return simplified data for preview
    const previewData = {
      hero: homePage.hero,
      featured_categories: homePage.featured_categories,
      start_learning: homePage.start_learning,
      testimonials: homePage.testimonials,
      statistics: homePage.statistics,
      last_updated: homePage.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Homepage preview fetched successfully',
      data: previewData
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch preview',
      error: error.message
    });
  }
};