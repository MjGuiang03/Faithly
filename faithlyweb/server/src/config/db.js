import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables
const requiredEnv = ['MONGODB_URI', 'DB_NAME', 'JWT_SECRET'];
requiredEnv.forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ CRITICAL ERROR: Environment variable "${env}" is missing.`);
    process.exit(1);
  }
});

let client;
try {
  client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  console.log('✅ Connected to MongoDB');
} catch (error) {
  console.error('❌ MongoDB Connection Error:', error.message);
  process.exit(1);
}

const db = client.db(process.env.DB_NAME);

export const users         = db.collection('users');
export const otps          = db.collection('otps');
export const admins        = db.collection('admins');
export const loans         = db.collection('loans');
export const donations     = db.collection('donations');
export const attendance    = db.collection('attendance');
export const verifications       = db.collection('verifications');
export const pendingRegistrations = db.collection('pending_registrations');
export const announcements      = db.collection('announcements');


/* ================== DATABASE INDEXES ================== */
await users.createIndex({ email: 1 }, { unique: true });
await otps.createIndex({ email: 1 });
await loans.createIndex({ email: 1 });
await loans.createIndex({ loanId: 1 });
await attendance.createIndex({ email: 1 });
await verifications.createIndex({ email: 1 });
await otps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// TTL index for pending registrations (auto-delete if not verified within 24 hours)
await pendingRegistrations.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
await pendingRegistrations.createIndex({ email: 1 }, { unique: true });
await announcements.createIndex({ createdAt: -1 });


/* ================== CREATE DEFAULT ADMINS ================== */
const adminSeeds = [
  { email: process.env.ADMIN_EMAIL,           password: process.env.ADMIN_PASS,           role: 'admin' },
  { email: process.env.LOAN_ADMIN_EMAIL,      password: process.env.LOAN_ADMIN_PASS,      role: 'loanAdmin' },
  { email: process.env.SECRETARY_ADMIN_EMAIL, password: process.env.SECRETARY_ADMIN_PASS, role: 'secretaryAdmin' },
];

for (const seed of adminSeeds) {
  if (!seed.email || !seed.password) continue;
  const exists = await admins.findOne({ email: seed.email });
  if (!exists) {
    const hash = await bcrypt.hash(seed.password, 12);
    await admins.insertOne({
      email: seed.email,
      passwordHash: hash,
      role: seed.role,
      createdAt: new Date()
    });
    console.log(`✅ ${seed.role} admin created (${seed.email})`);
  } else {
    // Ensure password matches environment variable
    const match = await bcrypt.compare(seed.password, exists.passwordHash);
    if (!match) {
      const hash = await bcrypt.hash(seed.password, 12);
      await admins.updateOne(
        { email: seed.email },
        { $set: { passwordHash: hash, updatedAt: new Date() } }
      );
      console.log(`🔄 ${seed.role} admin password updated to match environment variable`);
    }
  }
}