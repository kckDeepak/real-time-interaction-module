import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const AdminDashboard = ({ socket }) => {
  const { sessionCode } = useParams();
  const [polls, setPolls] = useState([]);
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });
  const [message, setMessage] = useState('');

  useEffect(() => {
    socket.on('new-poll', (data) => {
      setPolls((prev) => [...prev, { ...data, id: data.pollId }]);
      setMessage(`Poll created: ${data.question}`);
    });
    socket.on('error', (data) => setMessage(data.message || 'An error occurred'));
    return () => {
      socket.off('new-poll');
      socket.off('error');
    };
  }, [socket]);

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    if (name === 'question') {
      setNewPoll((prev) => ({ ...prev, question: value }));
    } else {
      const newOptions = [...newPoll.options];
      newOptions[index] = value;
      setNewPoll((prev) => ({ ...prev, options: newOptions }));
    }
  };

  const addOption = () => setNewPoll((prev) => ({ ...prev, options: [...prev.options, ''] }));
  const removeOption = (index) =>
    setNewPoll((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));

  const createPoll = () => {
    if (newPoll.question && newPoll.options.length >= 2 && newPoll.options.every((opt) => opt.trim())) {
      socket.emit('poll-created', { sessionCode, ...newPoll });
      setNewPoll({ question: '', options: ['', ''] });
      setMessage('Poll created...');
    } else {
      setMessage('Please fill all fields with at least 2 options');
    }
  };

  const endSession = () => {
    socket.emit('session-ended', { sessionCode });
    setMessage('Session ended');
    setPolls([]);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <p className="mb-4">Session ID: {sessionCode}</p>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Create New Poll</h3>
        <input
          type="text"
          name="question"
          value={newPoll.question}
          onChange={(e) => handleInputChange(e)}
          placeholder="Enter question"
          className="w-full p-2 mb-2 border rounded text-black"
        />
        {newPoll.options.map((opt, index) => (
          <div key={index} className="flex mb-2">
            <input
              type="text"
              name="option"
              value={opt}
              onChange={(e) => handleInputChange(e, index)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 p-2 border rounded text-black mr-2"
            />
            {index >= 2 && (
              <button
                onClick={() => removeOption(index)}
                className="p-2 bg-red-500 text-white rounded"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button onClick={addOption} className="mb-2 p-2 bg-green-500 text-white rounded">
          Add Option
        </button>
        <button
          onClick={createPoll}
          className="p-2 bg-blue-500 text-white rounded"
          disabled={!newPoll.question || newPoll.options.length < 2}
        >
          Create Poll
        </button>
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Active Polls</h3>
        {polls.length > 0 ? (
          <ul>
            {polls.map((poll) => (
              <li key={poll.id} className="p-2 border rounded mt-2">
                {poll.question}
              </li>
            ))}
          </ul>
        ) : (
          <p>No active polls</p>
        )}
      </div>
      <button onClick={endSession} className="p-2 bg-red-500 text-white rounded">
        End Session
      </button>
      {message && <p className="mt-2 text-red-500">{message}</p>}
    </div>
  );
};

export default AdminDashboard;