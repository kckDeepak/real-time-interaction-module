// client/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bar } from 'react-chartjs-2';

export const AdminDashboard = ({ socket, sessionCode }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [results, setResults] = useState(null);

  const createPoll = () => {
    const validOptions = options.filter(opt => opt.trim()).slice(0, 2);
    if (question.trim() && validOptions.length) {
      console.log('Creating poll:', { sessionCode, question, options: validOptions });
      socket.emit('poll-created', { sessionCode, question, options: validOptions });
    } else {
      console.log('Invalid poll data');
    }
  };

  const endSession = () => {
    console.log('Ending session:', { sessionCode });
    socket.emit('session-ended', { sessionCode });
  };

  useEffect(() => {
    const handlePollUpdated = (data) => {
      console.log('Poll updated:', data);
      setResults(data.results);
    };
    socket.on('poll-updated', handlePollUpdated);
    return () => socket.off('poll-updated', handlePollUpdated);
  }, [socket]);

  const chartData = results && {
    labels: results.options,
    datasets: [{
      label: 'Votes',
      data: results.options.map((_, index) => results.responses[index] || 0),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      borderWidth: 1,
    }],
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <div className="mb-4">
        <input
          className="p-2 border rounded w-full"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter poll question"
        />
        {options.map((opt, index) => (
          <input
            key={index}
            className="p-2 border rounded w-full mt-2"
            value={opt}
            onChange={(e) => {
              const newOptions = [...options];
              newOptions[index] = e.target.value;
              setOptions(newOptions);
            }}
            placeholder={`Option ${index + 1}`}
          />
        ))}
        <button
          className="mt-2 p-2 bg-green-500 text-white rounded"
          onClick={() => setOptions([...options, ''])}
        >
          Add Option
        </button>
        <button
          className="mt-2 p-2 bg-blue-500 text-white rounded"
          onClick={createPoll}
          disabled={!question.trim() || !options.some(opt => opt.trim())}
        >
          Create Poll
        </button>
      </div>
      <button
        className="p-2 bg-red-500 text-white rounded"
        onClick={endSession}
      >
        End Session
      </button>
      {results && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Live Results</h3>
          <Bar data={chartData} />
        </div>
      )}
    </motion.div>
  );
};