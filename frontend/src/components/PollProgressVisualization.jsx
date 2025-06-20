import React, { useState, useEffect } from 'react';

const PollProgressVisualization = ({ socket, pollId }) => {
  const [voteCounts, setVoteCounts] = useState({});

  useEffect(() => {
    console.log('PollProgressVisualization mounted with pollId:', pollId, 'socket.connected:', socket.connected);
    const handlePollUpdated = (data) => {
      console.log('PollProgressVisualization received poll-updated data:', data);
      if (data.pollId === pollId) {
        const totalVotes = Object.values(data.results.responses).reduce((sum, count) => sum + count, 0);
        const newVoteCounts = data.results.options.reduce((acc, option, index) => {
          const voteCount = data.results.responses[index.toString()] || 0;
          acc[option] = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          return acc;
        }, {});
        setVoteCounts(newVoteCounts);
      }
    };

    // Register listener immediately
    socket.on('poll-updated', handlePollUpdated);

    // Cleanup on unmount
    return () => {
      console.log('PollProgressVisualization unmounted with pollId:', pollId);
      socket.off('poll-updated', handlePollUpdated);
    };
  }, [socket, pollId]); // Dependency on pollId to re-run if it changes

  return (
    <div style={{ height: '300px', width: '100%', position: 'relative' }}>
      <h3 className="text-lg font-semibold mb-2">Live Poll Results</h3>
      {Object.keys(voteCounts).length > 0 ? (
        <div>
          {Object.entries(voteCounts).map(([option, percentage], index) => (
            <div key={index} className="mb-2">
              <span className="mr-2">{option}: {percentage.toFixed(1)}%</span>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: `${percentage}%`, transition: 'width 0.5s' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No data available yet. Submit a response to see results.</p>
      )}
    </div>
  );
};

export default PollProgressVisualization;