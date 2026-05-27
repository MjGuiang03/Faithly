import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URL = process.env.MONGODB_URL;
const DB_NAME = process.env.DB_NAME;

async function run() {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    const db = client.db(DB_NAME);

    // Delete everything linked to @example.com
    const dummyFilter = { email: { $regex: '@example.com$' } };

    const delUsers = await db.collection('users').deleteMany(dummyFilter);
    console.log(`🗑️ Deleted ${delUsers.deletedCount} dummy users.`);

    const delDonations = await db.collection('donations').deleteMany(dummyFilter);
    console.log(`🗑️ Deleted ${delDonations.deletedCount} dummy donations.`);

    const delGoals = await db.collection('savings_goals').deleteMany(dummyFilter);
    console.log(`🗑️ Deleted ${delGoals.deletedCount} dummy savings goals.`);

    const delDeposits = await db.collection('savings_transactions').deleteMany(dummyFilter);
    console.log(`🗑️ Deleted ${delDeposits.deletedCount} dummy savings deposits.`);

    const delLoans = await db.collection('loans').deleteMany(dummyFilter);
    console.log(`🗑️ Deleted ${delLoans.deletedCount} dummy loans.`);

    const delPayments = await db.collection('loan_payments').deleteMany(dummyFilter);
    console.log(`🗑️ Deleted ${delPayments.deletedCount} dummy loan payments.`);

    const delAtt = await db.collection('attendance').deleteMany(dummyFilter);
    console.log(`🗑️ Deleted ${delAtt.deletedCount} dummy attendance records.`);

    console.log("✅ Cleanup Complete! Database has been reverted to its original state.");
  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  } finally {
    await client.close();
  }
}

run();
