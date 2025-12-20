const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { auth, permit } = require("../middlewares/auth");
const User = require("../models/User");

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
const bcrypt = require("bcryptjs");

router.put("/me", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, bio, avatarUrl, currentPassword, newPassword } =
      req.body;

    const user = await User.findById(userId);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Update profile fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (bio) user.bio = bio;
    if (avatarUrl) user.avatarUrl = avatarUrl;

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

    const updatedUser = user.toObject();
    delete updatedUser.passwordHash;

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
// PUT /:id - update a user (admin only)
// ---------------------------------------------------
router.put("/:id", auth, permit("admin"), async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    // Prevent editing self role to non-admin accidentally
    if (userId === req.user.id && req.body.role && req.body.role !== "admin") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot change your own admin role" });
    }

    // Only allow certain fields to be updated
    const allowedFields = ["name", "email", "role", "status"];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    // Prevent deleting self
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
