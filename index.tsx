
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Environment variable for API Key
// In a real build setup (like Vite or Create React App), process.env.API_KEY would be replaced.
// For a raw HTML/JS setup, this needs to be defined globally, e.g., in a <script> tag in index.html:
// <script> window.process = { env: { API_KEY: "YOUR_API_KEY_HERE" } }; </script>
// The instructions state to assume process.env.API_KEY is available.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
