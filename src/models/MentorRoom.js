// models/MentorRoom.js
const mongoose = require('mongoose');

const sectionTwoIconSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  }
});

const mentorRoomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  badge: {
    type: String,
    required: true,
    trim: true
  },
  short_description: {
    type: String,
    required: true,
    trim: true
  },
  small_image: {
    type: String,
    required: true
  },
  banner_image: {
    type: String,
    required: true
  },
  section_one: {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    instructor_name: {
      type: String,
      required: true,
      trim: true
    },
    instructor_rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5
    },
    instructor_link: {
      type: String,
      required: true
    }
  },
  section_two: {
    box_title: {
      type: String,
      required: true,
      trim: true
    },
    box_sub_title: {
      type: String,
      required: true,
      trim: true
    },
    icons: [sectionTwoIconSchema]
  },
  cta_section: {
    title: {
      type: String,
      required: true,
      trim: true
    },
    sub_title: {
      type: String,
      required: true,
      trim: true
    },
    btn_link: {
      type: String,
      required: true
    },
    right_img: {
      type: String,
      required: true
    }
  },
  section_three: {
    left_img: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description_title: {
      type: String,
      required: true,
      trim: true
    },
    btn_link: {
      type: String,
      required: true
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Ensure only one document exists
mentorRoomSchema.statics.getSingleDocument = async function() {
  try {
    let doc = await this.findOne();
    if (!doc) {
      // Create default document if none exists
      doc = await this.create({
        title: "Default Mentor Room Title",
        badge: "Premium",
        short_description: "Default short description",
        small_image: "default-small.jpg",
        banner_image: "default-banner.jpg",
        section_one: {
          title: "Default Section One Title",
          description: "Default section one description",
          instructor_name: "Default Instructor",
          instructor_rating: 4.5,
          instructor_link: "#"
        },
        section_two: {
          box_title: "Default Box Title",
          box_sub_title: "Default Box Sub Title",
          icons: [
            { name: "Skill 1", icon: "skill1.svg" },
            { name: "Skill 2", icon: "skill2.svg" }
          ]
        },
        cta_section: {
          title: "Default CTA Title",
          sub_title: "Default CTA Sub Title",
          btn_link: "#",
          right_img: "cta-right.jpg"
        },
        section_three: {
          left_img: "section3-left.jpg",
          title: "Default Section Three Title",
          description_title: "Default Description Title",
          btn_link: "#"
        }
      });
    }
    return doc;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('MentorRoom', mentorRoomSchema);