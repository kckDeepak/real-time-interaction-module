import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const [sessionCode, setSessionCode] = useState('');
  const [isSessionJoined, setIsSessionJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [pollId, setPollId] = useState('');
  const [userId] = useState('user1');

  useEffect(() => {
    socket.on('connect', () => console.log('Connected:', socket.id));
    socket.on('disconnect', () => console.log('Disconnected'));
    socket.on('session-joined', (data) => {
      console.log('Joined session:', data);
      setMessage(data.message);
      setIsSessionJoined(true);
    });
    socket.on('new-poll', (data) => {
      console.log('New poll received:', data);
      setMessage(`New poll: ${data.question}`);
      setPollId(data.pollId);
    });
    socket.on('poll-updated', (data) => {
      console.log('Poll updated:', data);
      setMessage(`Poll updated: ${data.results.question}`);
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
    });
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('session-joined');
      socket.off('new-poll');
      socket.off('poll-updated');
      socket.off('session-ended');
      socket.off('error');
      socket.off('connect_error');
    };
  }, []);

  const joinSession = () => {
    if (sessionCode.trim()) {
      socket.emit('join-session', { sessionCode, userId });
    } else {
      setMessage('Please enter a valid session code');
    }
  };

  console.log('Render - isSessionJoined:', isSessionJoined, 'pollId:', pollId); // Debug state

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-600 text-white p-4">
          <h2 className="text-xl font-bold">Real-Time Interaction Module</h2>
          <div className="mt-2 flex space-x-2">
            <input
              type="text"
              className="p-2 border rounded text-black bg-white"
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
          {isSessionJoined && (
            <div className="mt-2">
              <Link to="/admin" className="mr-2 text-white underline">Admin</Link>
              <Link to="/user" className="text-white underline">User</Link>
            </div>
          )}
          <p className="mt-2 text-white">{message}</p>
        </nav>
        <Routes>
          <Route
            path="/admin"
            element={
              isSessionJoined ? (
                <AdminDashboard socket={socket} sessionCode={sessionCode} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/user"
            element={
              isSessionJoined ? (
                <UserDashboardWrapper socket={socket} sessionCode={sessionCode} pollId={pollId} userId={userId} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

// Wrapper to handle route-specific logic
const UserDashboardWrapper = ({ socket, sessionCode, pollId, userId }) => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/user' && sessionCode) {
      console.log('Requesting poll for session:', sessionCode);
      socket.emit('request-poll', { sessionCode, userId });
    }
  }, [location, socket, sessionCode, userId]);

  return <UserDashboard socket={socket} sessionCode={sessionCode} pollId={pollId} userId={userId} />;
};

export default App;