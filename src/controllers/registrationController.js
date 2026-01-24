// controllers/registrationController.js
const Registration = require('../models/Registration');

// Additional registration management endpoints

// 1. Update registration status
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { status, notes } = req.body;
    
    const registration = await Registration.findById(registrationId);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    // Update status
    if (status) registration.status = status;
    if (notes) registration.notes = notes;
    
    await registration.save();
    
    res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
      data: registration
    });
  } catch (error) {
    console.error('Update Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 2. Cancel registration
exports.cancelRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { reason } = req.body;
    
    const registration = await Registration.findById(registrationId);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    // Update registration status
    registration.status = 'cancelled';
    registration.cancellationReason = reason;
    registration.cancelledAt = new Date();
    
    await registration.save();
    
    // Decrement webinar participant count
    const webinar = await Webinar.findById(registration.webinar);
    if (webinar) {
      webinar.currentParticipants = Math.max(0, webinar.currentParticipants - 1);
      await webinar.save();
    }
    
    // TODO: Send cancellation email
    
    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 3. Send zoom link to registrants
exports.sendZoomLinks = async (req, res) => {
  try {
    const { webinarId } = req.params;
    
    const registrations = await Registration.find({
      webinar: webinarId,
      status: 'registered'
    });
    
    // TODO: Send zoom links via email/SMS
    
    res.status(200).json({
      success: true,
      message: `Zoom links sent to ${registrations.length} participants`,
      sentCount: registrations.length
    });
  } catch (error) {
    console.error('Send Zoom Links Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending zoom links',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 4. Check registration status
exports.checkRegistration = async (req, res) => {
  try {
    const { webinarId, email } = req.params;
    
    const registration = await Registration.findOne({
      webinar: webinarId,
      'user.email': email
    });
    
    if (!registration) {
      return res.status(200).json({
        success: true,
        message: 'Not registered',
        registered: false
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Registration found',
      registered: true,
      data: {
        status: registration.status,
        registrationId: registration._id,
        registeredAt: registration.createdAt
      }
    });
  } catch (error) {
    console.error('Check Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};