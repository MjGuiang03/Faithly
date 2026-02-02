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

    res.status(200).json({
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

/* ================== UPDATE PROFILE ================== */
app.put('/api/update-profile', async (req, res) => {
  try {
    const { email, fullName, phone, branch, position } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user in database
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare update object (only editable fields)
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (branch) updateData.branch = branch;
    if (position) updateData.position = position;

    // Update user profile (gender and birthday are NOT updated)
    await users.updateOne({ email }, { $set: updateData });

    // Get updated user
    const updatedUser = await users.findOne({ email });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        branch: updatedUser.branch,
        position: updatedUser.position,
        gender: updatedUser.gender,
        birthday: updatedUser.birthday,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/* ================== PASSWORD RESET - REQUEST OTP ================== */
app.post('/api/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP for password reset
    const otp = generateOTP();

    // Delete any existing password reset OTPs
    await otps.deleteMany({ email, type: 'reset-password' });

    // Store new OTP
    await otps.insertOne({
      email,
      otp,
      type: 'reset-password',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    // Send OTP email
    await transporter.sendMail({
      from: `\"Faithly\" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Code',
      html: `<h2>Password Reset OTP</h2><h1>${otp}</h1><p>This code expires in 15 minutes. If you didn't request a password reset, please ignore this email.</p>`
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

/* ================== PASSWORD RESET - VERIFY OTP ================== */
app.post('/api/reset-password-verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await otps.findOne({
      email,
      otp,
      type: 'reset-password',
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

/* ================== PASSWORD RESET - UPDATE PASSWORD ================== */
app.post('/api/reset-password-update', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP one more time
    const record = await otps.findOne({
      email,
      otp,
      type: 'reset-password',
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await users.updateOne(
      { email },
      { $set: { passwordHash } }
    );

    // Delete the used OTP
    await otps.deleteMany({ email, type: 'reset-password' });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update password' });
  }
});

/* ================== DELETE ACCOUNT ================== */
app.delete('/api/delete-account', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await users.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password is incorrect' 
      });
    }

    // Delete the user account
    await users.deleteOne({ email });

    // Delete related OTPs
    await otps.deleteMany({ email });

    // Optional: Delete related data (loans, donations, attendance records, etc.)
    // await db.collection('loans').deleteMany({ userEmail: email });
    // await db.collection('donations').deleteMany({ userEmail: email });
    // await db.collection('attendance').deleteMany({ userEmail: email });

    res.status(200).json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

/* ================== SERVER ================== */
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
});