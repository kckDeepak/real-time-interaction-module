// client/src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bar } from 'react-chartjs-2';

export const AdminDashboard = ({ socket, sessionCode }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(5); // Default 5 minutes
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);

  const createPoll = () => {
    const validOptions = options.filter(opt => opt.trim()).slice(0, 2);
    if (question.trim() && validOptions.length && duration > 0) {
      console.log('Creating poll:', { sessionCode, question, options: validOptions, duration });
    //   socket.emit('poll-created', { sessionCode, question, options: validOptions, duration });
    } else {
      console.log('Invalid poll data or duration');
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
      if (data.results) {
        setHistory((prev) => [...prev, { ...data.results, timestamp: new Date().toISOString() }]);
      }
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
        <input
          type="number"
          className="mt-2 p-2 border rounded w-full"
          value={duration}
          onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
          placeholder="Duration in minutes"
          min="1"
        />
        <button
          className="mt-2 p-2 bg-blue-500 text-white rounded"
          onClick={createPoll}
          disabled={!question.trim() || !options.some(opt => opt.trim()) || duration <= 0}
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
      {history.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Poll History</h3>
          {history.map((h, index) => (
            <div key={index} className="p-2 border rounded mt-2">
              <p>{h.question} - {new Date(h.timestamp).toLocaleString()}</p>
              <pre>{JSON.stringify(h.responses, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};