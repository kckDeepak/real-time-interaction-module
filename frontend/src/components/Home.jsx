import { useNavigate } from 'react-router-dom';

const Home = ({ socket }) => {
  const navigate = useNavigate();

  const handleCreatePoll = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.sessionCode) {
        navigate(`/admin/${data.sessionCode}`);
      } else {
        throw new Error('No session code returned');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Ensure the server is running on localhost:5000 or try again.');
    }
  };

  const handleAnswerPoll = () => {
    const sessionCode = prompt('Enter session ID:');
    if (sessionCode) {
      navigate(`/user/${sessionCode}`);
    }
  };

  // socket is retained for potential future use (e.g., real-time session updates)
  // eslint-disable-next-line no-unused-vars
  const _unusedSocket = socket; // Suppresses the warning without affecting functionality

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-6">Welcome to the Poll App</h1>
      <button
        onClick={handleCreatePoll}
        className="m-2 p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Create Poll
      </button>
      <button
        onClick={handleAnswerPoll}
        className="m-2 p-3 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Answer Poll
      </button>
    </div>
  );
};

export default Home;