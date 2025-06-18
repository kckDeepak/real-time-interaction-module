// client/src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import io from 'socket.io-client';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const socket = io('http://localhost:5000');

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [isSessionJoined, setIsSessionJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [pollId, setPollId] = useState('');
  const [userId] = useState('user1');

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected:', socket.id);
      setIsConnected(true);
    });
    socket.on('disconnect', () => {
      console.log('Disconnected');
      setIsConnected(false);
      setIsSessionJoined(false);
    });
    socket.on('session-joined', (data) => {
      console.log('Joined session:', data);
      setMessage(data.message);
      setIsSessionJoined(true);
    });
    socket.on('new-poll', (data) => {
      console.log('New poll:', data);
      setMessage(`New poll: ${data.question}`);
      setPollId(data.pollId);
    });
    socket.on('poll-updated', (data) => {
      console.log('Poll updated:', data);
      setMessage(`Poll updated: ${JSON.stringify(data.results)}`);
    });
    socket.on('session-ended', (data) => {
      console.log('Session ended:', data);
      setMessage(data.message);
      setIsSessionJoined(false);
      setPollId('');
    });
    socket.on('error', (data) => {
      console.log('Error:', data);
      setMessage(data.message);
      setIsSessionJoined(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('session-joined');
      socket.off('new-poll');
      socket.off('poll-updated');
      socket.off('session-ended');
      socket.off('error');
    };
  }, []);

  const joinSession = () => {
    if (sessionCode.trim()) {
      socket.emit('join-session', { sessionCode, userId });
    } else {
      setMessage('Please enter a valid session code');
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-600 text-white p-4">
          <h2 className="text-xl font-bold">Real-Time Interaction Module</h2>
          <div className="mt-2 flex space-x-2">
            <input
              type="text" // Explicitly set to text
              className="p-2 border rounded text-black bg-white" // Ensure contrast
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              placeholder="Enter session code"
            />
            <button
              className="p-2 bg-blue-500 text-white rounded"
              onClick={joinSession}
              disabled={!sessionCode.trim()}
            >
              Join
            </button>
          </div>
          <p className="mt-2 text-white">{message}</p> {/* Ensure message is visible */}
        </nav>
        <Routes>
          <Route
            path="/admin"
            element={
              isSessionJoined ? (
                <AdminDashboard socket={socket} sessionCode={sessionCode} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/user"
            element={
              isSessionJoined ? (
                <UserDashboard socket={socket} sessionCode={sessionCode} pollId={pollId} userId={userId} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="/" element={<Navigate to="/admin" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;