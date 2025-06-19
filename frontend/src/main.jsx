import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Optional: Include global styles if you have them

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);