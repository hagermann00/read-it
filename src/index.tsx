import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Index mounting...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Index mounted successfully.");
} catch (e) {
    console.error("Mounting failed:", e);
}
