const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Answer content is required'],
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  // Simple author info - no authentication required
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
  },
  authorEmail: {
    type: String,
    required: [true, 'Author email is required'],
    trim: true,
    lowercase: true,
  },
  // Store image URLs for answers
  images: [{
    url: String,
    filename: String,
  }],
  isAccepted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Update answer count in question when answer is saved
AnswerSchema.post('save', async function () {
  const Question = mongoose.model('Question');
  await Question.findByIdAndUpdate(this.questionId, {
    $inc: { answersCount: 1 },
  });
});

module.exports = mongoose.model('Answer', AnswerSchema);