// client/src/components/UserDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pie } from 'react-chartjs-2';

export const UserDashboard = ({ socket, sessionCode, pollId, userId }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults] = useState(null);

  const submitResponse = () => {
    if (pollId && selectedOption !== null) {
      console.log('Submitting response:', { pollId, userId, selectedOption });
      socket.emit('poll-response', { pollId, userId, selectedOption });
    }
  };

  useEffect(() => {
    const handleNewPoll = (data) => {
      console.log('New poll received:', data);
      // Initialize results with new poll data
      setResults({
        question: data.question,
        options: data.options,
        responses: data.options.reduce((acc, _, index) => {
          acc[index] = 0;
          return acc;
        }, {}),
      });
      setSelectedOption(null);
    };
    const handlePollUpdated = (data) => {
      console.log('Poll updated received:', data);
      setResults(data.results);
    };
    socket.on('new-poll', handleNewPoll);
    socket.on('poll-updated', handlePollUpdated);
    return () => {
      socket.off('new-poll', handleNewPoll);
      socket.off('poll-updated', handlePollUpdated);
    };
  }, [socket]);

  const chartData = results && {
    labels: results.options,
    datasets: [{
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
      <h2 className="text-2xl font-bold mb-4">User Dashboard</h2>
      {pollId && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Poll: {results?.question || 'Loading...'}</h3>
          {results?.options && results.options.map((opt, index) => (
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
            className="mt-2 p-2 bg-yellow-500 text-white rounded"
            onClick={submitResponse}
            disabled={selectedOption === null}
          >
            Submit Response
          </button>
        </div>
      )}
      {results && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Live Results</h3>
          <Pie data={chartData} />
        </div>
      )}
    </motion.div>
  );
};