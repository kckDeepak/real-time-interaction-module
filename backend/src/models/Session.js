// server/models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionCode: { type: String, required: true, unique: true },
  adminId: { type: String }, // Changed to optional
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});

module.exports = mongoose.model('Session', sessionSchema);