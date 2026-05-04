import { attendance } from './src/config/db.js';

const records = await attendance.find({ sessionId: 'SESS-2026-0005' }).toArray();
console.log('Records for SESS-2026-0005:', JSON.stringify(records, null, 2));
console.log('Total:', records.length);
process.exit(0);
