const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  })
);
app.use(express.json());

// Import models
const Session = require('./models/Session');
const Poll = require('./models/Poll');
const UserResponse = require('./models/UserResponse');

// Import routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('Real-Time Interaction Module Backend');
});

// In-memory cache for real-time updates
const sessions = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a session
  socket.on('join-session', async ({ sessionCode, userId }) => {
    try {
      const startTime = Date.now();
      let session = await Session.findOne({ sessionCode, status: 'active' }).lean();
      if (!session) {
        session = new Session({ sessionCode, status: 'active', polls: [] });
        await session.save();
        console.log(`Created new session ${sessionCode} in ${Date.now() - startTime}ms`);
      }
      socket.join(sessionCode);
      socket.emit('session-joined', { sessionId: session._id, message: 'Joined session' });
      console.log(`User ${userId} joined session ${sessionCode} in ${Date.now() - startTime}ms`);
      if (!sessions[sessionCode]) sessions[sessionCode] = { polls: {} };
      const syncStart = Date.now();
      const polls = await Poll.find({ sessionId: session._id }).lean();
      polls.forEach(poll => {
        sessions[sessionCode].polls[poll._id] = poll;
        socket.emit('new-poll', { pollId: poll._id, question: poll.question, options: poll.options, duration: poll.duration });
      });
      console.log(`Synced ${polls.length} polls for ${sessionCode} in ${Date.now() - syncStart}ms`);
    } catch (error) {
      console.error('Join session error:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Create and broadcast a new poll
  socket.on('poll-created', async (data) => {
    try {
      const startTime = Date.now();
      console.log('Received poll-created event:', data);
      const { sessionCode, question, options, duration } = data;
      let session = await Session.findOne({ sessionCode, status: 'active' }).lean();
      if (!session) {
        console.warn(`Session ${sessionCode} not found, creating new`);
        session = new Session({ sessionCode, status: 'active', polls: [] });
        await session.save();
        console.log(`Created session ${sessionCode} in ${Date.now() - startTime}ms`);
      }
      const pollId = uuidv4();
      const poll = new Poll({
        _id: pollId,
        sessionId: session._id,
        question,
        options,
        responses: [],
        duration,
        isActive: true,
      });
      const savePollStart = Date.now();
      await poll.save();
      console.log(`Saved poll ${pollId} in ${Date.now() - savePollStart}ms`);
      const updateSessionStart = Date.now();
      await Session.findByIdAndUpdate(session._id, { $push: { polls: pollId } }, { new: true, lean: true });
      console.log(`Updated session ${session._id} with poll ${pollId} in ${Date.now() - updateSessionStart}ms`);
      if (!sessions[sessionCode]) sessions[sessionCode] = { polls: {} };
      sessions[sessionCode].polls[pollId] = { question, options, responses: {}, duration, isActive: true };
      const broadcastStart = Date.now();
      io.to(sessionCode).emit('new-poll', { pollId, question, options, duration });
      console.log(`Broadcasted new-poll to ${sessionCode} in ${Date.now() - broadcastStart}ms`);
      console.log(`New poll ${pollId} created in session ${sessionCode} in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Poll creation error:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to create poll', details: error.message });
    }
  });

  // Handle poll response and broadcast updated results
  socket.on('poll-response', async ({ pollId, userId, selectedOption }) => {
    try {
      const startTime = Date.now();
      const poll = await Poll.findById(pollId).lean();
      if (poll && poll.isActive) {
        const response = new UserResponse({ pollId, userId, selectedOption });
        await response.save();
        await Poll.findByIdAndUpdate(pollId, { $push: { responses: response._id } });
        const responses = await UserResponse.find({ pollId }).lean();
        const results = {
          question: poll.question,
          options: poll.options,
          responses: responses.reduce((acc, resp) => {
            acc[resp.selectedOption] = (acc[resp.selectedOption] || 0) + 1;
            return acc;
          }, {}),
        };
        if (!sessions[poll.sessionId.toString()]) sessions[poll.sessionId.toString()] = { polls: {} };
        sessions[poll.sessionId.toString()].polls[pollId] = { ...results, isActive: true };
        io.to(poll.sessionId.toString()).emit('poll-updated', { pollId, results });
        console.log(`Response recorded for poll ${pollId} by user ${userId} in ${Date.now() - startTime}ms`);
      }
    } catch (error) {
      console.error('Poll response error:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to record response' });
    }
  });

  // Handle poll end
  socket.on('poll-ended', async (data) => {
    try {
      const startTime = Date.now();
      const { pollId, sessionCode } = data;
      const session = await Session.findOne({ sessionCode }).lean();
      if (session && sessions[sessionCode] && sessions[sessionCode].polls[pollId]) {
        await Poll.findByIdAndUpdate(pollId, { isActive: false });
        sessions[sessionCode].polls[pollId].isActive = false;
        io.to(sessionCode).emit('poll-updated', { pollId, results: sessions[sessionCode].polls[pollId] });
        console.log(`Poll ${pollId} ended in session ${sessionCode} in ${Date.now() - startTime}ms`);
      }
    } catch (error) {
      console.error('Poll end error:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to end poll' });
    }
  });

  // End session
  socket.on('session-ended', async ({ sessionCode }) => {
    try {
      const startTime = Date.now();
      const session = await Session.findOne({ sessionCode });
      if (session) {
        session.status = 'ended';
        session.endedAt = new Date();
        await session.save();
        io.to(sessionCode).emit('session-ended', { message: 'Session has ended' });
        console.log(`Session ${sessionCode} ended in ${Date.now() - startTime}ms`);
        delete sessions[sessionCode]; // Clean up in-memory session
      }
    } catch (error) {
      console.error('Session end error:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to end session' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
    process.exit(1);
  });