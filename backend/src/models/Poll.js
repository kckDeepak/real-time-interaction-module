const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  responses: [{ userId: String, selectedOption: Number }],
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('Poll', pollSchema);