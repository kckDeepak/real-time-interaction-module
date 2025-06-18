const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true }, // Add index
  question: String,
  options: [String],
  responses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserResponse' }],
  duration: Number,
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('Poll', pollSchema);