const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  userId: { type: String, required: true },
  selectedOption: { type: Number, required: true },
});

module.exports = mongoose.model('UserResponse', userResponseSchema);