import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log('✅ Connected to MongoDB');

const db = client.db(process.env.DB_NAME);

export const users         = db.collection('users');
export const otps          = db.collection('otps');
export const admins        = db.collection('admins');
export const loans         = db.collection('loans');
export const donations     = db.collection('donations');
export const attendance    = db.collection('attendance');
export const verifications = db.collection('verifications');

/* ================== DATABASE INDEXES ================== */
await users.createIndex({ email: 1 }, { unique: true });
await otps.createIndex({ email: 1 });
await loans.createIndex({ email: 1 });
await loans.createIndex({ loanId: 1 });
await attendance.createIndex({ email: 1 });
await verifications.createIndex({ email: 1 });
await otps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* ================== CREATE DEFAULT ADMIN ================== */
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DEFAULT_ADMIN_PASS  = process.env.ADMIN_PASS;

const defaultAdmin = await admins.findOne({ email: DEFAULT_ADMIN_EMAIL });

if (!defaultAdmin) {
  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASS, 12);
  await admins.insertOne({
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash: adminPasswordHash,
    role: 'admin',
    createdAt: new Date()
  });
  console.log('✅ Default admin created');
}