const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Answer content is required'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  
  // File attachment for answer
  attachment: {
    url: String,
    filename: String,
    fileType: String,
    fileSize: Number,
  },
  
  // Voting system
  likes: {
    type: Number,
    default: 0,
  },
  isAccepted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// When answer is accepted, update the question as resolved
AnswerSchema.post('save', async function(doc) {
  if (doc.isAccepted) {
    const Question = mongoose.model('Question');
    await Question.findByIdAndUpdate(doc.questionId, { 
      isResolved: true 
    });
  }
});

module.exports = mongoose.model('Answer', AnswerSchema);