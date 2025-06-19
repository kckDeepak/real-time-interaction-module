import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const UserDashboard = ({ socket }) => {
  const { sessionCode } = useParams();
  const [pollId, setPollId] = useState('');
  const [results, setResults] = useState({
    question: 'Waiting for poll...',
    options: [],
    responses: {},
  });
  const [selectedOption, setSelectedOption] = useState(null);
  const userId = 'user1'; // Replace with a unique identifier in a real app

  useEffect(() => {
    socket.emit('join-session', { sessionCode, userId });
    socket.on('new-poll', (data) => {
      setPollId(data.pollId);
      setResults({
        question: data.question,
        options: data.options,
        responses: data.options.reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
      });
      setSelectedOption(null);
    });
    socket.on('poll-updated', (data) => setResults(data.results));
    return () => {
      socket.off('new-poll');
      socket.off('poll-updated');
    };
  }, [socket, sessionCode]);

  const submitResponse = () => {
    if (pollId && selectedOption !== null) {
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
    </div>
  );
};

export default UserDashboard;