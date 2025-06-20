import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  withCredentials: true,
  transports: ['websocket'],
});

// Log connection status and attempt reconnect
socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('disconnect', () => console.log('Socket disconnected'));
socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
  setTimeout(() => socket.connect(), 1000); // Retry connection after 1 second
});

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home socket={socket} />} />
        <Route path="/admin/:sessionCode" element={<AdminDashboard socket={socket} />} />
        <Route path="/user/:sessionCode" element={<UserDashboard socket={socket} />} />
      </Routes>
    </Router>
  );
}

export default App;