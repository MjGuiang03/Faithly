import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ================== MONGODB ================== */
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.DB_NAME);

const users = db.collection('users');
const otps = db.collection('otps');

console.log('✅ Connected to MongoDB');

/* ================== EMAIL ================== */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Faithly" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Email Verification Code',
    html: `<h2>Your OTP Code</h2><h1>${otp}</h1><p>Expires in 15 minutes</p>`
  });
};

/* ================== REGISTER (SIGNUP) ================== */
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, branch, position, gender, birthday } = req.body;

    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await users.insertOne({
      email,
      passwordHash,
      fullName,
      phone,
      branch,
      position,
      gender,
      birthday,
      isVerified: false,
      createdAt: new Date()
    });

    const otp = generateOTP();

    await otps.deleteMany({ email, type: 'verify' });

    await otps.insertOne({
      email,
      otp,
      type: 'verify',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await sendOTP(email, otp);

    res.json({ message: 'Signup successful. OTP sent to email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

/* ================== VERIFY EMAIL OTP ================== */
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await otps.findOne({
      email,
      otp,
      type: 'verify',
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await users.updateOne(
      { email },
      { $set: { isVerified: true } }
    );

    await otps.deleteMany({ email, type: 'verify' });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

/* ================== RESEND OTP ================== */
app.post('/api/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = generateOTP();

    await otps.deleteMany({ email, type: 'verify' });

    await otps.insertOne({
      email,
      otp,
      type: 'verify',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await sendOTP(email, otp);

    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
});

/* ================== LOGIN ================== */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json({
      message: 'Login successful',
      user: {
        email: user.email,
        fullName: user.fullName,
        full_name: user.fullName,
        phone: user.phone,
        branch: user.branch,
        position: user.position,
        gender: user.gender,
        birthday: user.birthday,
        created_at: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

/* ================== SERVER ================== */
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
});
