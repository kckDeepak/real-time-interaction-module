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

// Endpoint to create a new session for admin
app.post('/api/sessions', async (req, res) => {
  try {
    const sessionCode = uuidv4().split('-')[0]; // Generate a short unique session code
    const session = new Session({ sessionCode, status: 'active', polls: [] });
    await session.save();
    res.status(201).json({ sessionCode });
  } catch (error) {
    console.error('Error creating session:', error.message);
    res.status(500).json({ message: 'Failed to create session' });
  }
});

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a session
  socket.on('join-session', async ({ sessionCode, userId }) => {
    try {
      const session = await Session.findOne({ sessionCode, status: 'active' }).lean();
      if (!session) {
        socket.emit('error', { message: 'Session not found or inactive' });
        return;
      }
      socket.join(sessionCode);
      socket.emit('session-joined', { sessionId: session._id, message: 'Joined session' });
      if (!sessions[sessionCode]) sessions[sessionCode] = { polls: {} };
      const polls = await Poll.find({ sessionId: session._id }).lean();
      polls.forEach(poll => {
        sessions[sessionCode].polls[poll._id] = poll;
        socket.emit('new-poll', { pollId: poll._id, question: poll.question, options: poll.options, duration: poll.duration });
      });
    } catch (error) {
      console.error('Join session error:', error.message);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Handle poll creation
  socket.on('poll-created', async (data) => {
    try {
      const { sessionCode, question, options, duration } = data;
      let session = await Session.findOne({ sessionCode, status: 'active' }).lean();
      if (!session) {
        session = new Session({ sessionCode, status: 'active', polls: [] });
        await session.save();
      }
      const pollId = uuidv4();
      const poll = new Poll({
        _id: pollId,
        sessionId: session._id,
        question,
        options,
        responses: [],
        duration: duration || undefined,
        isActive: true,
      });
      await poll.save();
      await Session.findByIdAndUpdate(session._id, { $push: { polls: pollId } });
      if (!sessions[sessionCode]) sessions[sessionCode] = { polls: {} };
      sessions[sessionCode].polls[pollId] = { question, options, responses: {}, duration: duration || undefined, isActive: true };
      io.to(sessionCode).emit('new-poll', { pollId, question, options, duration: duration || undefined });
    } catch (error) {
      console.error('Poll creation error:', error.message);
      socket.emit('error', { message: 'Failed to create poll' });
    }
  });

  // Handle poll responses
  socket.on('poll-response', async ({ pollId, userId, selectedOption }) => {
    try {
      const poll = await Poll.findById(pollId).lean();
      if (poll && poll.isActive) {
        if (selectedOption >= 0 && selectedOption < poll.options.length) {
          const response = new UserResponse({
            pollId,
            userId,
            selectedOption,
          });
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
        } else {
          socket.emit('error', { message: 'Invalid response option' });
        }
      } else {
        socket.emit('error', { message: 'Poll not found or inactive' });
      }
    } catch (error) {
      console.error('Poll response error:', error.message);
      socket.emit('error', { message: 'Failed to record response' });
    }
  });

  // Handle poll ending
  socket.on('poll-ended', async (data) => {
    try {
      const { pollId, sessionCode } = data;
      const session = await Session.findOne({ sessionCode }).lean();
      if (session && sessions[sessionCode] && sessions[sessionCode].polls[pollId]) {
        await Poll.findByIdAndUpdate(pollId, { isActive: false });
        sessions[sessionCode].polls[pollId].isActive = false;
        io.to(sessionCode).emit('poll-updated', { pollId, results: sessions[sessionCode].polls[pollId] });
      }
    } catch (error) {
      console.error('Poll end error:', error.message);
      socket.emit('error', { message: 'Failed to end poll' });
    }
  });

  // Handle session ending
  socket.on('session-ended', async ({ sessionCode }) => {
    try {
      const session = await Session.findOne({ sessionCode });
      if (session) {
        session.status = 'ended';
        session.endedAt = new Date();
        await session.save();
        io.to(sessionCode).emit('session-ended', { message: 'Session has ended' });
        delete sessions[sessionCode];
      }
    } catch (error) {
      console.error('Session end error:', error.message);
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
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });