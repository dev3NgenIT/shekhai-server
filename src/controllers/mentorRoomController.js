// controllers/mentorRoomController.js
const MentorRoom = require('../models/MentorRoom');

// Get single mentor room document
exports.getMentorRoom = async (req, res) => {
  try {
    const mentorRoom = await MentorRoom.getSingleDocument();
    res.status(200).json({
      success: true,
      data: mentorRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching mentor room data',
      error: error.message
    });
  }
};

// Create or update mentor room document
exports.createOrUpdateMentorRoom = async (req, res) => {
  try {
    const data = req.body;
    
    // Check if document exists
    let mentorRoom = await MentorRoom.findOne();
    
    if (mentorRoom) {
      // Update existing document
      mentorRoom = await MentorRoom.findByIdAndUpdate(
        mentorRoom._id,
        { ...data, updated_at: Date.now() },
        { new: true, runValidators: true }
      );
      
      res.status(200).json({
        success: true,
        message: 'Mentor room updated successfully',
        data: mentorRoom
      });
    } else {
      // Create new document
      mentorRoom = await MentorRoom.create(data);
      
      res.status(201).json({
        success: true,
        message: 'Mentor room created successfully',
        data: mentorRoom
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error saving mentor room data',
      error: error.message
    });
  }
};

// Update specific fields
exports.updateMentorRoom = async (req, res) => {
  try {
    const updates = req.body;
    
    let mentorRoom = await MentorRoom.findOne();
    
    if (!mentorRoom) {
      return res.status(404).json({
        success: false,
        message: 'Mentor room document not found'
      });
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key === 'section_two' && updates[key] && updates[key].icons) {
        // Handle icons array specially
        mentorRoom.section_two.icons = updates[key].icons;
      } else {
        mentorRoom[key] = updates[key];
      }
    });
    
    mentorRoom.updated_at = Date.now();
    await mentorRoom.save();
    
    res.status(200).json({
      success: true,
      message: 'Mentor room updated successfully',
      data: mentorRoom
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating mentor room',
      error: error.message
    });
  }
};

// Delete mentor room document
exports.deleteMentorRoom = async (req, res) => {
  try {
    const mentorRoom = await MentorRoom.findOneAndDelete();
    
    if (!mentorRoom) {
      return res.status(404).json({
        success: false,
        message: 'Mentor room document not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Mentor room deleted successfully',
      data: mentorRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting mentor room',
      error: error.message
    });
  }
};

// Upload images (you'll need to implement file upload separately)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
};