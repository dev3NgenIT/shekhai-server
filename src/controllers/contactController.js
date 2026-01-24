const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');

// Configure email transporter (for sending notifications)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// 1. POST /api/v1/contact - Submit contact form
exports.submitContact = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body;
    
    // Basic validation
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields',
      });
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Create contact record
    const contactData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      subject: subject || 'general',
      message: message.trim(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const contact = await Contact.create(contactData);

    // Send email notification (optional - configure SMTP in .env)
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = createTransporter();
        
        const mailOptions = {
          from: `"Shekhai Contact" <${process.env.SMTP_USER}>`,
          to: process.env.CONTACT_RECIPIENT || process.env.SMTP_USER,
          subject: `New Contact Form: ${contact.subjectLabel}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #234A96;">New Contact Form Submission</h2>
              <div style="background: #f4f7fd; padding: 20px; border-radius: 8px;">
                <p><strong>Name:</strong> ${contact.fullName}</p>
                <p><strong>Email:</strong> ${contact.email}</p>
                ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
                <p><strong>Subject:</strong> ${contact.subjectLabel}</p>
                <p><strong>Message:</strong></p>
                <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #234A96;">
                  ${contact.message.replace(/\n/g, '<br>')}
                </div>
                <p><strong>Submitted:</strong> ${new Date(contact.createdAt).toLocaleString()}</p>
                <p><strong>Status:</strong> ${contact.status}</p>
              </div>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                This message was sent from the contact form on Shekhai website.
              </p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log('Contact notification email sent');
      }
    } catch (emailError) {
      console.error('Error sending contact email:', emailError);
      // Don't fail the request if email fails
    }

    // Send success response
    res.status(201).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      data: {
        id: contact._id,
        fullName: contact.fullName,
        email: contact.email,
        subject: contact.subjectLabel,
        submittedAt: contact.createdAt,
      },
    });

  } catch (error) {
    console.error('Submit Contact Error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages,
      });
    }

    // Handle duplicate email submission (optional)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a message recently. Please wait before submitting another.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting contact form',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 2. GET /api/v1/contact - Get all contact messages (Admin only)
exports.getAllContacts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sort = '-createdAt' } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }
    
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v')
        .lean(),
      Contact.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get Contacts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 3. GET /api/v1/contact/:id - Get single contact
exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findById(id).select('-__v');
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Contact retrieved successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Get Contact Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 4. PATCH /api/v1/contact/:id - Update contact status
exports.updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const contact = await Contact.findById(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found',
      });
    }
    
    // Validate status
    const validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }
    
    // Update contact
    if (status) contact.status = status;
    if (notes) contact.notes = notes;
    
    await contact.save();
    
    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Update Contact Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 5. GET /api/v1/contact/stats - Get contact statistics
exports.getContactStats = async (req, res) => {
  try {
    const [total, newCount, inProgress, resolved, closed] = await Promise.all([
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'new' }),
      Contact.countDocuments({ status: 'in_progress' }),
      Contact.countDocuments({ status: 'resolved' }),
      Contact.countDocuments({ status: 'closed' }),
    ]);
    
    // Get today's contacts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysContacts = await Contact.countDocuments({
      createdAt: { $gte: today }
    });
    
    res.status(200).json({
      success: true,
      message: 'Contact stats retrieved',
      data: {
        total,
        new: newCount,
        inProgress,
        resolved,
        closed,
        todaysContacts,
        resolutionRate: total > 0 ? ((resolved + closed) / total * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    console.error('Get Contact Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// 6. DELETE /api/v1/contact/:id - Delete contact
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findById(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found',
      });
    }
    
    await contact.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
      data: {
        id: contact._id,
        name: contact.fullName,
        email: contact.email,
      },
    });
  } catch (error) {
    console.error('Delete Contact Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};