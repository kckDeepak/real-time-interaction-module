// client/src/components/UserDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pie } from 'react-chartjs-2';

export const UserDashboard = ({ socket, sessionCode, pollId, userId }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  const submitResponse = () => {
    if (pollId && selectedOption !== null && timeLeft > 0) {
      console.log('Submitting response:', { pollId, userId, selectedOption });
      socket.emit('poll-response', { pollId, userId, selectedOption });
    }
  };

  useEffect(() => {
    let timer;
    const handleNewPoll = (data) => {
      console.log('New poll received in UserDashboard:', data);
      if (data.duration && data.question && data.options) {
        setResults({
          question: data.question,
          options: data.options,
          responses: data.options.reduce((acc, _, index) => {
            acc[index] = 0;
            return acc;
          }, {}),
        });
        setTimeLeft(data.duration * 60); // Convert minutes to seconds
        setSelectedOption(null);
      } else {
        console.error('Invalid new-poll data:', data);
      }
    };
    const handlePollUpdated = (data) => {
      console.log('Poll updated received in UserDashboard:', data);
      if (data.results) {
        setResults(data.results);
        setHistory((prev) => [...prev, { ...data.results, timestamp: new Date().toISOString() }]);
      }
    };
    const handlePollEnded = () => {
      console.log('Poll ended in UserDashboard');
      setTimeLeft(0); // Ensure timer stops
    };

    socket.on('new-poll', handleNewPoll);
    socket.on('poll-updated', handlePollUpdated);
    socket.on('poll-ended', handlePollEnded);

    if (pollId && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            socket.emit('poll-ended', { pollId, sessionCode });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
      socket.off('new-poll', handleNewPoll);
      socket.off('poll-updated', handlePollUpdated);
      socket.off('poll-ended', handlePollEnded);
    };
  }, [socket, pollId]); // Only re-run when socket or pollId changes

  const chartData = results && {
    labels: results.options,
    datasets: [{
      data: results.options.map((_, index) => results.responses[index] || 0),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      borderWidth: 1,
    }],
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-bold mb-4">User Dashboard</h2>
      <p>Time Left: {formatTime(timeLeft)}</p>
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
                  disabled={timeLeft === 0}
                />
                {opt}
              </label>
            </div>
          ))}
          <button
            className="mt-2 p-2 bg-yellow-500 text-white rounded"
            onClick={submitResponse}
            disabled={selectedOption === null || timeLeft === 0}
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