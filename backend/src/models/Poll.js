const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => require('uuid').v4(), // Use UUID as _id
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length >= 2 && v.every(opt => opt.trim());
      },
      message: 'Options must contain at least 2 non-empty values',
    },
  },
  responses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserResponse',
    default: [],
  }],
  duration: {
    type: Number, // Keep as Number but make optional
    required: false, // Changed to false since timers are removed
    min: 1, // Optional: keep min constraint if duration is still used elsewhere
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;