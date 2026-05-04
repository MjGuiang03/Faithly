import { attendance } from './src/config/db.js';

attendance.find({})
  .sort({ createdAt: -1 })
  .limit(5)
  .toArray()
  .then(console.log)
  .catch(console.error)
  .finally(() => process.exit(0));
