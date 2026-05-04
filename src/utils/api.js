const API_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5000' : (process.env.REACT_APP_API_URL || window.location.origin)).replace(/\/$/, "");

export default API_URL;
