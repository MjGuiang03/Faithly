import './src/config/db.js'; // Connect to MongoDB + setup indexes + default admin
import app from './src/app.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;

import { startCronJobs } from './src/utils/cronJobs.js';
startCronJobs();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});