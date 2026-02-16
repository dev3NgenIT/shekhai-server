const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { auth, permit } = require("../middlewares/auth");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// -----------------------------
// GET /me - logged-in user info
// -----------------------------
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -----------------------------
// Public route to get instructors list (NO AUTH REQUIRED)
// -----------------------------
router.get("/instructors/public", async (req, res) => {
  try {
    const instructors = await User.find({
      role: "instructor",
    })
      .select("name email avatarUrl bio createdAt")
      .limit(8);

    res.json({
      success: true,
      count: instructors.length,
      instructors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -----------------------------
// Public route to get single instructor by ID (NO AUTH REQUIRED)
// -----------------------------
router.get("/instructors/public/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructor ID format",
      });
    }

    const instructor = await User.findOne({
      _id: id,
      role: "instructor",
    })
      .select("-passwordHash -refreshToken -resetPasswordToken")
      .lean();

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found",
      });
    }

    res.json({
      success: true,
      instructor,
    });
  } catch (err) {
    console.error("Error fetching instructor:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching instructor",
    });
  }
});

// ---------------------------------------------------
// GET / - all users (admin only) + optional role filter
// ---------------------------------------------------
router.get("/", auth, permit("admin"), async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).select("-passwordHash");
    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -----------------------------
// PUT /me - update logged-in user profile
// -----------------------------
router.put("/me", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      email,
      bio,
      avatarUrl,
      phone,
      location,
      website, // ADD THIS
      socialLinks, // ADD THIS
      expertise,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findById(userId);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Update basic profile fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    // Update additional profile fields
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website; // ADD THIS

    // Handle socialLinks
    if (socialLinks) {
      if (!user.socialLinks) user.socialLinks = {};
      if (socialLinks.twitter !== undefined)
        user.socialLinks.twitter = socialLinks.twitter;
      if (socialLinks.linkedin !== undefined)
        user.socialLinks.linkedin = socialLinks.linkedin;
      if (socialLinks.github !== undefined)
        user.socialLinks.github = socialLinks.github;
      if (socialLinks.facebook !== undefined)
        user.socialLinks.facebook = socialLinks.facebook;
    }

    // Handle expertise array
    if (expertise !== undefined) {
      if (typeof expertise === "string") {
        user.expertise = expertise
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);
      } else if (Array.isArray(expertise)) {
        user.expertise = expertise;
      }
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is required" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is incorrect" });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    // Return user without sensitive data
    const updatedUser = user.toObject();
    delete updatedUser.passwordHash;
    delete updatedUser.refreshToken;
    delete updatedUser.resetPasswordToken;

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------------------------------------------
// PUT /:id - update a user (admin only) - UPDATED WITH ALL FIELDS
// ---------------------------------------------------
router.put("/:id", auth, permit("admin"), async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    if (userId === req.user.id && req.body.role && req.body.role !== "admin") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot change your own admin role" });
    }

    // Allowed fields for admin update
    const allowedFields = [
      "name",
      "email",
      "role",
      "bio",
      "avatarUrl",
      "phone",
      "location",
      "expertise",
      "isActive",
      "isEmailVerified",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Handle expertise specially if it's a string
    if (req.body.expertise && typeof req.body.expertise === "string") {
      updates.expertise = req.body.expertise
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash -refreshToken -resetPasswordToken");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------------------------------------------
// DELETE /:id - delete a user (admin only)
// ---------------------------------------------------
router.delete("/:id", auth, permit("admin"), async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    if (userId === req.user.id) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot delete yourself" });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
