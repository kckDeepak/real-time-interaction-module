import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PollProgressVisualization from './PollProgressVisualization';

const UserDashboard = ({ socket }) => {
  const { sessionCode } = useParams();
  const [pollId, setPollId] = useState('');
  const [results, setResults] = useState({ question: 'Waiting for poll...', options: [], responses: {} });
  const [selectedOption, setSelectedOption] = useState(null);
  const userId = 'user1'; // Replace with a unique identifier in a real app

  useEffect(() => {
    console.log('UserDashboard mounted with sessionCode:', sessionCode, 'socket.connected:', socket.connected);
    const setupListeners = () => {
      // Join session with a small delay to ensure connection
      const joinSession = () => {
        if (socket.connected) {
          console.log('Joining session:', sessionCode);
          socket.emit('join-session', { sessionCode, userId }, (ack) => {
            console.log('Join session ack:', ack);
          });
        } else {
          console.log('Waiting for connection...');
          setTimeout(joinSession, 500); // Retry after 500ms
        }
      };
      joinSession();

      socket.on('new-poll', (data) => {
        console.log('New poll received:', data);
        setPollId(data.pollId);
        setResults({
          question: data.question,
          options: data.options,
          responses: data.options.reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
        });
        setSelectedOption(null);
      });
      socket.on('poll-updated', (data) => {
        console.log('Poll updated in UserDashboard:', data);
        if (data.pollId === pollId) {
          setResults(data.results);
        }
      });
    };

    setupListeners();

    socket.on('disconnect', () => console.log('Disconnected from server'));
    socket.on('connect', () => {
      console.log('Reconnected to server, re-joining session');
      setupListeners();
    });

    return () => {
      console.log('UserDashboard unmounted with sessionCode:', sessionCode);
      socket.off('new-poll');
      socket.off('poll-updated');
    };
  }, [socket, sessionCode, pollId]);

  const submitResponse = () => {
    if (pollId && selectedOption !== null) {
      console.log('Submitting response - pollId:', pollId, 'userId:', userId, 'selectedOption:', selectedOption);
      socket.emit('poll-response', { pollId, userId, selectedOption });
      setSelectedOption(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">User Dashboard</h2>
      {pollId && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Poll: {results.question}</h3>
          {results.options.map((opt, index) => (
            <div key={index} className="mt-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="option"
                  value={index}
                  checked={selectedOption === index}
                  onChange={() => setSelectedOption(index)}
                  className="mr-2"
                />
                {opt}
              </label>
            </div>
          ))}
          <button
            onClick={submitResponse}
            className="mt-2 p-2 bg-yellow-500 text-white rounded"
            disabled={selectedOption === null}
          >
            Submit Response
          </button>
        </div>
      )}
      {pollId && <PollProgressVisualization socket={socket} sessionCode={sessionCode} pollId={pollId} />}
    </div>
  );
};

export default UserDashboard;