// client/src/App.jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [message, setMessage] = useState('');
  const [pollId, setPollId] = useState('');
  const [userId] = useState('user1'); // Fixed userId for simplicity
  const [isAutomating, setIsAutomating] = useState(false);
  const [manualPollId, setManualPollId] = useState(''); // For manual pollId input

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server:', socket.id);
      setIsConnected(true);
    });
    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      setIsConnected(false);
    });
    socket.on('session-joined', (data) => {
      setMessage(data.message);
      if (isAutomating && !pollId && !manualPollId) {
        createPollAutomatically(); // Create poll only if no pollId is set
      } else if (isAutomating) {
        submitResponseAutomatically(); // Proceed to response if pollId exists
      }
    });
    socket.on('new-poll', (data) => {
      setMessage(`New poll: ${data.question}`);
      setPollId(data.pollId);
      console.log('New poll ID:', data.pollId);
      if (isAutomating) submitResponseAutomatically();
    });
    socket.on('poll-updated', (data) => {
      setMessage(`Poll updated: ${JSON.stringify(data.results)}`);
      if (isAutomating) endSessionAutomatically();
    });
    socket.on('session-ended', (data) => setMessage(data.message));
    socket.on('error', (data) => setMessage(data.message));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('session-joined');
      socket.off('new-poll');
      socket.off('poll-updated');
      socket.off('session-ended');
      socket.off('error');
    };
  }, [isAutomating, pollId, manualPollId]);

  const joinSession = () => {
    if (sessionCode) {
      socket.emit('join-session', { sessionCode, userId });
    } else {
      setMessage('Please enter a session code');
    }
  };

  const createPollAutomatically = () => {
    socket.emit('poll-created', { sessionCode, question: 'Automated Test Poll?', options: ['Yes', 'No'] });
  };

  const submitResponseAutomatically = () => {
    const effectivePollId = manualPollId || pollId;
    if (effectivePollId) {
      socket.emit('poll-response', { pollId: effectivePollId, userId, selectedOption: 0 });
    } else {
      setMessage('No pollId available. Create or enter a pollId first.');
    }
  };

  const endSessionAutomatically = () => {
    socket.emit('session-ended', { sessionCode });
  };

  const startAutomation = () => {
    setIsAutomating(true);
    joinSession(); // Start the automated sequence
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600">
          Real-Time Interaction Module
        </h1>
        <p className="mt-4">
          {isConnected ? 'Connected to backend!' : 'Trying to connect to backend...'}
        </p>
        <input
          className="mt-4 p-2 border rounded"
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value)}
          placeholder="Enter session code"
        />
        <input
          className="mt-2 p-2 border rounded"
          value={manualPollId}
          onChange={(e) => setManualPollId(e.target.value)}
          placeholder="Enter manual pollId (optional)"
        />
        <div className="mt-4 space-x-2">
          <button
            className="p-2 bg-blue-500 text-white rounded"
            onClick={joinSession}
            disabled={isAutomating}
          >
            Join Session
          </button>
          <button
            className="p-2 bg-green-500 text-white rounded"
            onClick={createPollAutomatically}
            disabled={isAutomating || !sessionCode}
          >
            Create Poll
          </button>
          <button
            className="p-2 bg-yellow-500 text-white rounded"
            onClick={submitResponseAutomatically}
            disabled={isAutomating || (!pollId && !manualPollId)}
          >
            Submit Response
          </button>
          <button
            className="p-2 bg-red-500 text-white rounded"
            onClick={endSessionAutomatically}
            disabled={isAutomating || !sessionCode}
          >
            End Session
          </button>
          <button
            className="p-2 bg-purple-500 text-white rounded"
            onClick={startAutomation}
            disabled={isAutomating || !sessionCode}
          >
            Start Automation
          </button>
        </div>
        <p className="mt-4">{message}</p>
        <p className="mt-2">Current Poll ID: {pollId || manualPollId || 'N/A'}</p>
      </div>
    </div>
  );
}

export default App;