import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, PieController, Tooltip, Legend } from 'chart.js';
import { ErrorBoundary } from 'react-error-boundary';

// Register Chart.js components
ChartJS.register(ArcElement, PieController, Tooltip, Legend);

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong with the chart:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export const UserDashboard = ({ socket, sessionCode, pollId, userId }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults] = useState({ question: 'Loading...', options: [], responses: {} });
  const [history, setHistory] = useState([]);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    console.log('UserDashboard useEffect - pollId:', pollId, 'History Length:', history.length);

    const handleNewPoll = (data) => {
      console.log('New poll received:', data);
      if (data.question && Array.isArray(data.options)) {
        setResults({
          question: data.question,
          options: data.options,
          responses: data.options.reduce((acc, _, index) => {
            acc[index] = 0;
            return acc;
          }, {}),
        });
        setSelectedOption(null);
      } else {
        console.error('Invalid new-poll data:', data);
        setResults({ question: 'Error loading poll', options: [], responses: {} });
      }
    };
    const handlePollUpdated = (data) => {
      console.log('Poll updated received:', data);
      if (data.results) {
        setResults(data.results);
        setHistory((prev) => {
          const newHistory = [{ ...data.results, timestamp: new Date().toISOString() }, ...prev].slice(0, 5); // Limit to 5, prepend new entry
          return newHistory;
        });
      }
    };
    const handlePollResponse = (data) => {
      console.log('Poll response received:', data);
      if (data.results) {
        setResults(data.results);
      } else if (data.error) {
        console.error('Poll response error:', data.error);
      }
    };
    const handleError = (data) => {
      console.log('Error received:', data);
    };

    socket.on('new-poll', handleNewPoll);
    socket.on('poll-updated', handlePollUpdated);
    socket.on('poll-response', handlePollResponse);
    socket.on('error', handleError);

    if (pollId) {
      console.log('Requesting initial poll data for pollId:', pollId);
      socket.emit('request-poll', { sessionCode, userId, pollId });
    }

    return () => {
      socket.off('new-poll', handleNewPoll);
      socket.off('poll-updated', handlePollUpdated);
      socket.off('poll-response', handlePollResponse);
      socket.off('error', handleError);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
        console.log('Chart instance destroyed');
      }
    };
  }, [socket, pollId, sessionCode, userId, history.length]);

  useEffect(() => {
    if (chartContainerRef.current && results.options.length > 0) {
      const ctx = chartContainerRef.current.getContext('2d');
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      chartInstanceRef.current = new ChartJS(ctx, {
        type: 'pie',
        data: {
          labels: results.options,
          datasets: [{
            data: results.options.map((_, index) => results.responses[index] || 0),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 }, // Disable animation to reduce re-render impact
        },
      });
      console.log('Chart initialized, DOM children:', chartContainerRef.current.parentElement.childElementCount);
    }
  }, [results]);

  const submitResponse = () => {
    if (pollId && selectedOption !== null) {
      console.log('Submitting response:', { pollId, userId, selectedOption });
      socket.emit('poll-response', { pollId, userId, selectedOption }, (error) => {
        if (error) console.error('Response submission failed:', error);
      });
      setSelectedOption(null);
    }
  };

  console.log('UserDashboard render - pollId:', pollId, 'Results Length:', Object.keys(results.responses).length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-2xl mx-auto"
      style={{ minHeight: '100vh', maxHeight: '100vh', overflowY: 'auto' }} // Strict height constraint
    >
      <h2 className="text-2xl font-bold mb-4">User Dashboard</h2>
      {pollId && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Poll: {results.question}</h3>
          {results.options.length > 0 ? (
            results.options.map((opt, index) => (
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
            ))
          ) : (
            <p>No options available</p>
          )}
          <button
            className="mt-2 p-2 bg-yellow-500 text-white rounded"
            onClick={submitResponse}
            disabled={selectedOption === null}
          >
            Submit Response
          </button>
        </div>
      )}
      {results.options.length > 0 && (
        <div className="mt-4" style={{ height: '300px', overflowY: 'hidden' }}>
          <h3 className="text-lg font-semibold">Live Results</h3>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <canvas
              ref={chartContainerRef}
              style={{ height: '100%', width: '100%' }}
            />
          </ErrorBoundary>
        </div>
      )}
      {history.length > 0 && (
        <div className="mt-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <h3 className="text-lg font-semibold">Poll History</h3>
          {history.map((h, index) => (
            <div key={index} className="p-2 border rounded mt-2" style={{ maxHeight: '40px', overflowY: 'hidden' }}>
              <p>{h.question} - {new Date(h.timestamp).toLocaleString()}</p>
              <pre>{JSON.stringify(h.responses, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};