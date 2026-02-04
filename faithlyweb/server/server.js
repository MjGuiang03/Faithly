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
const admins = db.collection('admins'); // Add admins collection

console.log('✅ Connected to MongoDB');

/* ================== CREATE DEFAULT ADMIN ================== */
// Create default admin account for testing
const defaultAdmin = await admins.findOne({ email: 'admin' });
if (!defaultAdmin) {
  const adminPasswordHash = await bcrypt.hash('admin', 10);
  await admins.insertOne({
    email: 'admin',
    passwordHash: adminPasswordHash,
    role: 'admin',
    createdAt: new Date()
  });
  console.log('✅ Default admin account created (email: admin, password: admin)');
}

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

    // Prevent email reuse (even for deactivated accounts)
    const existing = await users.findOne({ email });
    if (existing) {
      // Check if account is deactivated (soft deleted)
      if (existing.isDeleted) {
        return res.status(400).json({ 
          message: 'This email was previously registered and deleted. Please use a different email.' 
        });
      } else {
        // Account is active or inactive
        return res.status(400).json({ 
          message: 'Email already exists. Please login or use a different email.' 
        });
      }
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

    // Check if account is deleted (soft delete)
    if (user.isDeleted) {
      return res.status(403).json({ message: 'This account has been deleted. Please sign up again using a different email address.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update lastLoginAt for activity tracking
    await users.updateOne(
      { email },
      { $set: { lastLoginAt: new Date() } }
    );

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

/* ================== DELETE ACCOUNT (SOFT DELETE) ================== */
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

    // Check if already deleted
    if (user.isDeleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Account is already deactivated' 
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

    // Soft delete: mark as deleted instead of removing
    await users.updateOne(
      { email },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date() 
        } 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Account deactivated successfully' 
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

/* ================== ADMIN LOGIN ================== */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await admins.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Invalid admin credentials' });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    res.status(200).json({
      message: 'Admin login successful',
      admin: {
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Admin login failed' });
  }
});

/* ================== ADMIN - GET ALL MEMBERS ================== */
app.get('/api/admin/members', async (req, res) => {
  try {
    const { search, status, branch } = req.query;

    // Build query
    const query = {};

    // Search by name, email, or memberID
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by branch
    if (branch && branch !== 'all') {
      query.branch = branch;
    }

    // Get all users
    const allUsers = await users.find(query).toArray();

    // Calculate status for each user and filter
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let filteredUsers = allUsers.map(user => {
      let userStatus = 'active';
      
      if (user.isDeleted) {
        userStatus = 'deactivated';
      } else if (!user.lastLoginAt || new Date(user.lastLoginAt) < oneWeekAgo) {
        userStatus = 'inactive';
      }

      return {
        ...user,
        status: userStatus,
        memberId: user.memberId || `M-${user._id.toString().slice(-5).toUpperCase()}`
      };
    });

    // Apply status filter
    if (status && status !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }

    // Calculate statistics
    const stats = {
      total: allUsers.length,
      active: filteredUsers.filter(u => u.status === 'active').length,
      inactive: filteredUsers.filter(u => u.status === 'inactive').length,
      deactivated: filteredUsers.filter(u => u.status === 'deactivated').length,
      newThisMonth: allUsers.filter(u => {
        const created = new Date(u.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length
    };

    res.status(200).json({
      success: true,
      members: filteredUsers,
      stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

/* ================== ADMIN - PERMANENTLY DELETE MEMBER ================== */
app.delete('/api/admin/delete-member-permanent', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Delete the user permanently
    const result = await users.deleteOne({ email });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete related OTPs
    await otps.deleteMany({ email });

    res.status(200).json({
      success: true,
      message: 'Member permanently deleted'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete member' });
  }
});

/* ================== ADMIN - GET AVAILABLE BRANCHES ================== */
app.get('/api/admin/branches', async (req, res) => {
  try {
    // Get unique branches from users collection
    const branches = await users.distinct('branch');
    
    res.status(200).json({
      success: true,
      branches: branches.filter(b => b) // Remove null/undefined values
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
});

/* ================== SERVER ================== */
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
});