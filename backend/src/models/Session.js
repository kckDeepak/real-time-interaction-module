const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionCode: String,
  status: { type: String, default: 'active' },
  polls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Poll' }],
  endedAt: Date,
});

// Add index for faster sessionCode queries
sessionSchema.index({ sessionCode: 1 });

module.exports = mongoose.model('Session', sessionSchema);