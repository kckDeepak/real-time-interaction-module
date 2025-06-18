const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', index: true }, // Add index
  userId: String,
  selectedOption: Number,
});

module.exports = mongoose.model('UserResponse', userResponseSchema);