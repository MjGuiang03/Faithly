const API_URL = (process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin)).replace(/\/$/, "");

export default API_URL;
