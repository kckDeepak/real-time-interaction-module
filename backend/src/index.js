// server/src/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: true,
}));
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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a session
  socket.on('join-session', async ({ sessionCode, userId }) => {
    const session = await Session.findOne({ sessionCode, status: 'active' });
    if (session) {
      socket.join(sessionCode); // Join the session room
      socket.emit('session-joined', { sessionId: session._id, message: 'Joined session' });
      console.log(`User ${userId} joined session ${sessionCode}`);
    } else {
      socket.emit('error', { message: 'Invalid session code' });
    }
  });

  // Create and broadcast a new poll
  socket.on('poll-created', async ({ sessionCode, question, options }) => {
    const session = await Session.findOne({ sessionCode, status: 'active' });
    if (session) {
      const poll = new Poll({ sessionId: session._id, question, options });
      await poll.save();
      io.to(sessionCode).emit('new-poll', { pollId: poll._id, question, options });
      console.log(`New poll created in session ${sessionCode}`);
    }
  });

  // Handle poll response and broadcast updated results
  socket.on('poll-response', async ({ pollId, userId, selectedOption }) => {
    const poll = await Poll.findById(pollId);
    if (poll && poll.isActive) {
      poll.responses.push({ userId, selectedOption });
      await poll.save();
      const results = {
        question: poll.question,
        options: poll.options,
        responses: poll.responses.reduce((acc, resp) => {
          acc[resp.selectedOption] = (acc[resp.selectedOption] || 0) + 1;
          return acc;
        }, {}),
      };
      io.to(poll.sessionId).emit('poll-updated', { pollId, results });
      console.log(`Response recorded for poll ${pollId} by user ${userId}`);
    }
  });

  // End session
  socket.on('session-ended', async ({ sessionCode }) => {
    const session = await Session.findOne({ sessionCode });
    if (session) {
      session.status = 'ended';
      session.endedAt = new Date();
      await session.save();
      io.to(sessionCode).emit('session-ended', { message: 'Session has ended' });
      console.log(`Session ${sessionCode} ended`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI, {
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