const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Poll = require('../models/Poll');
const UserResponse = require('../models/UserResponse');
const { v4: uuidv4 } = require('uuid');

// Middleware to check session existence
const checkSession = async (req, res, next) => {
  const { code } = req.params;
  const startTime = Date.now();
  const session = await Session.findOne({ sessionCode: code, status: 'active' }).lean();
  console.log(`Checked session ${code} in ${Date.now() - startTime}ms`);
  if (!session) return res.status(404).json({ error: 'Session not found or inactive' });
  req.session = session;
  next();
};

// Create a new session
router.post('/sessions', async (req, res) => {
  const startTime = Date.now();
  const { adminId } = req.body;
  console.log(`Received session creation request with adminId: ${adminId}`, req.body);

  if (!adminId) {
    console.log('adminId is missing, using default');
    return res.status(400).json({ error: 'adminId is required' });
  }

  const sessionCode = uuidv4().split('-')[0]; // Short unique code (e.g., first 8 chars)
  try {
    const session = new Session({ sessionCode, adminId, status: 'active', polls: [] });
    const saveStart = Date.now();
    await session.save();
    console.log(`Created session ${sessionCode} with adminId ${adminId} in ${Date.now() - saveStart}ms`);
    res.status(201).json({ sessionCode });
    console.log(`Responded with sessionCode ${sessionCode} in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('Error creating session:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to create session', error: error.message });
  }
});

// Validate session code
router.get('/sessions/:code', checkSession, async (req, res) => {
  res.json({ sessionId: req.session._id, adminId: req.session.adminId });
});

// Create a new poll
router.post('/polls', async (req, res) => {
  const startTime = Date.now();
  const { sessionId, question, options } = req.body;
  console.log(`Received poll creation request for session ${sessionId}`, req.body);

  if (!sessionId || !question || !options?.length) {
    return res.status(400).json({ error: 'sessionId, question, and options are required' });
  }

  try {
    const poll = new Poll({ sessionId, question, options, isActive: true });
    const saveStart = Date.now();
    await poll.save();
    console.log(`Created poll for session ${sessionId} in ${Date.now() - saveStart}ms`);
    res.status(201).json({ pollId: poll._id });
    console.log(`Responded with pollId ${poll._id} in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('Error creating poll:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to create poll', error: error.message });
  }
});

// Submit a user response
router.post('/polls/:pollId/respond', async (req, res) => {
  const startTime = Date.now();
  const { pollId } = req.params;
  const { userId, selectedOption } = req.body;
  console.log(`Received response for poll ${pollId}`, req.body);

  if (!userId || selectedOption === undefined) {
    return res.status(400).json({ error: 'userId and selectedOption are required' });
  }

  try {
    const poll = await Poll.findById(pollId).lean();
    if (!poll || !poll.isActive) return res.status(404).json({ error: 'Poll not found or inactive' });
    const response = new UserResponse({ pollId, userId, selectedOption });
    await response.save();
    await Poll.findByIdAndUpdate(pollId, { $push: { responses: response._id } });
    console.log(`Recorded response for poll ${pollId} in ${Date.now() - startTime}ms`);
    res.status(200).json({ message: 'Response recorded' });
  } catch (error) {
    console.error('Error recording response:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to record response', error: error.message });
  }
});

// Fetch live results
router.get('/sessions/:sessionId/results', async (req, res) => {
  const startTime = Date.now();
  const { sessionId } = req.params;
  console.log(`Fetching results for session ${sessionId}`);

  try {
    const polls = await Poll.find({ sessionId }).lean();
    const results = polls.map((poll) => ({
      question: poll.question,
      options: poll.options,
      responses: poll.responses.reduce((acc, resp) => {
        acc[resp.selectedOption] = (acc[resp.selectedOption] || 0) + 1;
        return acc;
      }, {}),
    }));
    console.log(`Fetched results for ${polls.length} polls in ${Date.now() - startTime}ms`);
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to fetch results', error: error.message });
  }
});

module.exports = router;