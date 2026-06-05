import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './user/styles/globals.css'; // Global responsive sidebar behaviors
import './user/styles/userDark.css'; // User dark mode overrides
import './admin/styles/adminDark.css'; // Admin dark mode overrides
import './loanAdmin/styles/loanAdminDark.css'; // Loan Admin dark mode overrides
import './secretaryAdmin/styles/secretaryAdminDark.css'; // Secretary Admin dark mode overrides
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
