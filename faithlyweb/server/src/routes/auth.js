import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { users, otps, pendingRegistrations } from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter, registerLimiter, otpLimiter, resendOtpLimiter } from '../middleware/rateLimiter.js';
import { authenticateUser } from '../middleware/auth.js';
import { generateOTP, sendOTP } from '../utils/email.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/* ================== REGISTER ================== */
router.post('/register',
  registerLimiter,
  validate([
    body('fullName').trim().notEmpty().withMessage('Full name is required')
      .isLength({ max: 50 }).withMessage('Name too long')
      .matches(/^[A-Za-z\s]+$/).withMessage('Name must contain letters only'),
    body('email').trim().toLowerCase().notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .isLength({ max: 100 }).withMessage('Email too long'),
    body('phone').trim().notEmpty().withMessage('Phone is required')
      .matches(/^\+63\d{10}$/).withMessage('Phone must be in format +63XXXXXXXXXX'),
    body('password').notEmpty().withMessage('Password is required')
      .isLength({ min: 8, max: 64 }).withMessage('Password must be 8–64 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a symbol'),
    body('birthday').notEmpty().withMessage('Birthday is required')
      .isISO8601().withMessage('Invalid date format'),
    body('churchId').optional().trim().isLength({ max: 20 }).withMessage('Church ID too long')
      .matches(/^[a-zA-Z0-9\-]*$/).withMessage('Church ID contains invalid characters'),
    body('branch').optional().trim().isLength({ max: 50 }),
    body('position').optional().trim().isLength({ max: 50 }),
    body('gender').optional().isIn(['male', 'female']).withMessage('Invalid gender value'),
  ]),
  async (req, res) => {
    try {
      console.log('📝 Registration payload:', req.body);
      const { email, password, fullName, phone, branch, position, gender, birthday } = req.body;

      const existingUser = await users.findOne({ email });
      if (existingUser) {
        if (existingUser.isDeleted) {
          return res.status(400).json({
            message: 'This email was previously registered and deleted. Please use a different email.'
          });
        }
        return res.status(400).json({
          message: 'Unable to complete registration. This email is already registered.'
        });
      }

      // Check if there's an existing pending registration
      await pendingRegistrations.deleteOne({ email });

      const passwordHash = await bcrypt.hash(password, 10);
      await pendingRegistrations.insertOne({
        email, passwordHash, fullName, phone, branch, position, gender, birthday,
        isVerified: false, failedLoginAttempts: 0, lockUntil: null,
        isPermanentlyLocked: false, createdAt: new Date()
      });

      const otp = generateOTP();
      await otps.deleteMany({ email, type: 'verify' });
      await otps.insertOne({ email, otp, type: 'verify', expiresAt: new Date(Date.now() + 15 * 60 * 1000) });

      await sendOTP(email, otp);
      res.json({ message: 'Signup successful. OTP sent to email.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error during signup' });
    }
  }
);

/* ================== VERIFY EMAIL OTP ================== */
router.post('/verify-otp',
  otpLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
  ]),
  async (req, res) => {
    try {
      const { email, otp } = req.body;
      const record = await otps.findOne({ email, otp, type: 'verify', expiresAt: { $gt: new Date() } });

      if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

      // Find from pending
      const pendingData = await pendingRegistrations.findOne({ email });
      if (!pendingData) {
        // Double check if already verified moved to users
        const alreadyVerified = await users.findOne({ email });
        if (alreadyVerified) return res.json({ message: 'Email already verified' });
        return res.status(400).json({ message: 'No registration data found for this email' });
      }

      // Move to users
      await users.insertOne({
        ...pendingData,
        isVerified: true,
        verifiedAt: new Date()
      });

      // Cleanup
      await pendingRegistrations.deleteOne({ email });
      await otps.deleteMany({ email, type: 'verify' });

      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Verification failed' });
    }
  }
);

/* ================== RESEND OTP ================== */
router.post('/resend-otp',
  resendOtpLimiter,
  validate([body('email').trim().isEmail().withMessage('Invalid email')]),
  async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await users.findOne({ email });
      if (user && user.isVerified) return res.status(400).json({ message: 'Email already verified' });

      const pending = await pendingRegistrations.findOne({ email });
      if (!pending) return res.status(400).json({ message: 'Invalid request or registration expired' });

      const otp = generateOTP();
      await otps.deleteMany({ email, type: 'verify' });
      await otps.insertOne({ email, otp, type: 'verify', expiresAt: new Date(Date.now() + 15 * 60 * 1000) });

      await sendOTP(email, otp);
      res.json({ message: 'OTP resent successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to resend OTP' });
    }
  }
);

/* ================== LOGIN ================== */
router.post('/login',
  loginLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required')
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await users.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      if (user.isDeleted) {
        return res.status(403).json({
          message: 'This account has been deleted. Please sign up again using a different email address.'
        });
      }

      if (!user.isVerified) return res.status(403).json({ message: 'Email not verified' });

      const now = new Date();

      if (user.isPermanentlyLocked) {
        return res.status(403).json({
          message: 'Your account has been permanently locked due to too many failed login attempts. Please reset your password to regain access.',
          locked: true, permanent: true
        });
      }

      if (user.lockUntil && user.lockUntil > now) {
        const remainingMs      = user.lockUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const attempts         = user.failedLoginAttempts || 0;

        if (attempts >= 6) {
          return res.status(403).json({
            message: `Your account is locked for ${remainingMinutes} more minute(s) due to too many failed attempts. We strongly recommend resetting your password.`,
            locked: true, lockUntil: user.lockUntil, remainingSeconds, recommendReset: true
          });
        }

        return res.status(403).json({
          message: `Account locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`,
          locked: true, lockUntil: user.lockUntil, remainingSeconds
        });
      }

      const match = await bcrypt.compare(password, user.passwordHash);

      if (!match) {
        const attempts   = (user.failedLoginAttempts || 0) + 1;
        const updateData = { failedLoginAttempts: attempts };

        if (attempts >= 7) {
          updateData.isPermanentlyLocked = true;
          updateData.lockUntil = null;
          await users.updateOne({ email }, { $set: updateData });
          return res.status(403).json({
            message: 'Your account has been permanently locked. Please reset your password to regain access.',
            locked: true, permanent: true
          });
        }

        if (attempts === 6) {
          updateData.lockUntil = new Date(now.getTime() + 30 * 60 * 1000);
          await users.updateOne({ email }, { $set: updateData });
          return res.status(403).json({
            message: 'Too many failed login attempts. Your account has been locked for 30 minutes. We strongly recommend resetting your password.',
            locked: true, lockUntil: updateData.lockUntil, remainingSeconds: 30 * 60, recommendReset: true
          });
        }

        if (attempts === 3) {
          updateData.lockUntil = new Date(now.getTime() + 5 * 60 * 1000);
          await users.updateOne({ email }, { $set: updateData });
          return res.status(403).json({
            message: 'Too many failed login attempts. Your account has been locked for 5 minutes.',
            locked: true, lockUntil: updateData.lockUntil, remainingSeconds: 5 * 60
          });
        }

        await users.updateOne({ email }, { $set: updateData });
        const attemptsInCurrentTier = attempts <= 3 ? attempts : attempts - 3;
        const remaining = 3 - attemptsInCurrentTier;
        return res.status(400).json({
          message: `Invalid credentials. ${remaining} attempt(s) remaining before your account is locked.`
        });
      }

      await users.updateOne({ email }, {
        $set: { lastLoginAt: now, failedLoginAttempts: 0, lockUntil: null, isPermanentlyLocked: false }
      });

      const token = jwt.sign(
        { email: user.email, role: 'user' },
        JWT_SECRET,
        { expiresIn: '1h', issuer: 'faithly-api', audience: 'faithly-users' }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          email: user.email, fullName: user.fullName, full_name: user.fullName,
          phone: user.phone, branch: user.branch, position: user.position,
          gender: user.gender, birthday: user.birthday, created_at: user.createdAt
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Login failed' });
    }
  }
);

/* ================== DELETE ACCOUNT (SOFT DELETE) ================== */
router.delete('/delete-account', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.isDeleted) {
      return res.status(400).json({ success: false, message: 'Account is already deactivated' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Password is incorrect' });
    }

    await users.updateOne({ email }, { $set: { isDeleted: true, deletedAt: new Date() } });
    res.status(200).json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

export default router;