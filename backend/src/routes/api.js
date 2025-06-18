// server/src/routes/api.js
const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Poll = require('../models/Poll');
const UserResponse = require('../models/UserResponse');
const { v4: uuidv4 } = require('uuid'); // For generating unique session codes

// Middleware to check session existence
const checkSession = async (req, res, next) => {
  const { code } = req.params;
  const session = await Session.findOne({ sessionCode: code, status: 'active' });
  if (!session) return res.status(404).json({ error: 'Session not found or inactive' });
  req.session = session;
  next();
};

// Create a new session
router.post('/sessions', async (req, res) => {
  const { adminId } = req.body;
  if (!adminId) return res.status(400).json({ error: 'adminId is required' });

  const sessionCode = uuidv4().split('-')[0]; // Short unique code (e.g., first 8 chars)
  const session = new Session({ sessionCode, adminId });
  await session.save();
  res.status(201).json({ sessionCode });
});

// Validate session code
router.get('/sessions/:code', checkSession, async (req, res) => {
  res.json({ sessionId: req.session._id, adminId: req.session.adminId });
});

// Create a new poll
router.post('/polls', async (req, res) => {
  const { sessionId, question, options } = req.body;
  if (!sessionId || !question || !options?.length) {
    return res.status(400).json({ error: 'sessionId, question, and options are required' });
  }

  const poll = new Poll({ sessionId, question, options });
  await poll.save();
  res.status(201).json({ pollId: poll._id });
});

// Submit a user response
router.post('/polls/:pollId/respond', async (req, res) => {
  const { pollId } = req.params;
  const { userId, selectedOption } = req.body;
  if (!userId || selectedOption === undefined) {
    return res.status(400).json({ error: 'userId and selectedOption are required' });
  }

  const poll = await Poll.findById(pollId);
  if (!poll || !poll.isActive) return res.status(404).json({ error: 'Poll not found or inactive' });

  poll.responses.push({ userId, selectedOption });
  await poll.save();
  res.status(200).json({ message: 'Response recorded' });
});

// Fetch live results
router.get('/sessions/:sessionId/results', async (req, res) => {
  const { sessionId } = req.params;
  const polls = await Poll.find({ sessionId }).lean();
  const results = polls.map(poll => ({
    question: poll.question,
    options: poll.options,
    responses: poll.responses.reduce((acc, resp) => {
      acc[resp.selectedOption] = (acc[resp.selectedOption] || 0) + 1;
      return acc;
    }, {}),
  }));
  res.json(results);
});

module.exports = router;