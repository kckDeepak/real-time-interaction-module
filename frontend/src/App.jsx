// client/src/App.jsx
import { useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server:', socket.id);
    });
    return () => {
      socket.off('connect');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600">
          Real-Time Interaction Module
        </h1>
        <p className="mt-4">Connected to backend!</p>
      </div>
    </div>
  );
}

export default App;