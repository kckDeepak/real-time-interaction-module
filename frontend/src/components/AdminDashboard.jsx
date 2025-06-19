import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const AdminDashboard = ({ socket, sessionCode }) => {
  const [polls, setPolls] = useState([]);
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handlePollCreated = (data) => {
      console.log('Poll created response:', data);
      setPolls((prev) => [...prev, { ...data, id: data.pollId }]);
      setMessage(`Poll created: ${data.question}`);
    };
    const handleError = (data) => {
      console.log('Error from server:', data);
      setMessage(data.message || 'An error occurred');
    };

    socket.on('new-poll', handlePollCreated); // Listen for confirmation
    socket.on('error', handleError);

    return () => {
      socket.off('new-poll', handlePollCreated);
      socket.off('error', handleError);
    };
  }, [socket]);

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    if (name === 'question') {
      setNewPoll((prev) => ({ ...prev, question: value }));
    } else if (name === 'option') {
      const newOptions = [...newPoll.options];
      newOptions[index] = value;
      setNewPoll((prev) => ({ ...prev, options: newOptions }));
    }
  };

  const addOption = () => {
    setNewPoll((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index) => {
    setNewPoll((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const createPoll = () => {
    if (newPoll.question && newPoll.options.length >= 2 && newPoll.options.every(opt => opt.trim())) {
      console.log('Creating poll:', { sessionCode, ...newPoll });
      socket.emit('poll-created', { sessionCode, ...newPoll });
      setNewPoll({ question: '', options: ['', ''] });
      setMessage('Poll creation initiated...');
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Create New Poll</h3>
        <input
          type="text"
          name="question"
          value={newPoll.question}
          onChange={(e) => handleInputChange(e)}
          placeholder="Enter question"
          className="w-full p-2 mb-2 border rounded text-black bg-white"
        />
        {newPoll.options.map((opt, index) => (
          <div key={index} className="flex mb-2">
            <input
              type="text"
              name="option"
              value={opt}
              onChange={(e) => handleInputChange(e, index)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 p-2 border rounded text-black bg-white mr-2"
            />
            {index >= 2 && (
              <button
                className="p-2 bg-red-500 text-white rounded"
                onClick={() => removeOption(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          className="mb-2 p-2 bg-green-500 text-white rounded"
          onClick={addOption}
        >
          Add Option
        </button>
        <button
          className="p-2 bg-blue-500 text-white rounded"
          onClick={createPoll}
          disabled={!newPoll.question || newPoll.options.length < 2 || !newPoll.options.every(opt => opt.trim())}
        >
          Create Poll
        </button>
      </div>
      <div className="mb-4">
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
      <button
        className="p-2 bg-red-500 text-white rounded"
        onClick={endSession}
      >
        End Session
      </button>
      {message && <p className="mt-2 text-red-500">{message}</p>}
    </motion.div>
  );
};