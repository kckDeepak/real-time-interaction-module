const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
  pollId: {
    type: String, // Changed to String to match UUID from Poll._id
    required: true,
    ref: 'Poll', // Optional: for population, but ref works with String if configured
  },
  userId: {
    type: String, // Assuming userId is a string; adjust if it's ObjectId
    required: true,
  },
  selectedOption: {
    type: Number, // Index of the selected option
    required: true,
    min: 0,
  },
  // sessionId is optional unless explicitly needed; remove if not used
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: false, // Changed to false if not needed
  },
}, { timestamps: true });

const UserResponse = mongoose.model('UserResponse', userResponseSchema);

module.exports = UserResponse;