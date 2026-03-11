import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import { users, otps } from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { resetRequestLimiter, resetVerifyLimiter, resetUpdateLimiter } from '../middleware/rateLimiter.js';
import { transporter, generateOTP } from '../utils/email.js';

const router = Router();

/* ================== REQUEST OTP ================== */
router.post('/reset-password-request',
  resetRequestLimiter,
  validate([body('email').trim().isEmail().withMessage('Invalid email')]),
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await users.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const otp = generateOTP();
      await otps.deleteMany({ email, type: 'reset-password' });
      await otps.insertOne({ email, otp, type: 'reset-password', expiresAt: new Date(Date.now() + 15 * 60 * 1000) });

      await transporter.sendMail({
        from: `"Faithly" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Code',
        html: `<h2>Password Reset OTP</h2><h1>${otp}</h1><p>This code expires in 15 minutes.</p>`
      });

      res.json({ message: 'OTP sent to your email' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  }
);

/* ================== VERIFY OTP ================== */
router.post('/reset-password-verify-otp',
  resetVerifyLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
  ]),
  async (req, res) => {
    try {
      const { email, otp } = req.body;
      const record = await otps.findOne({ email, otp, type: 'reset-password', expiresAt: { $gt: new Date() } });
      if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

      res.json({ message: 'OTP verified successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Verification failed' });
    }
  }
);

/* ================== UPDATE PASSWORD ================== */
router.post('/reset-password-update',
  resetUpdateLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
    body('newPassword')
      .isLength({ min: 8, max: 64 }).withMessage('Password must be 8–64 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a symbol'),
  ]),
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const record = await otps.findOne({ email, otp, type: 'reset-password', expiresAt: { $gt: new Date() } });
      if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await users.updateOne({ email }, {
        $set: { passwordHash, failedLoginAttempts: 0, lockUntil: null, isPermanentlyLocked: false }
      });
      await otps.deleteMany({ email, type: 'reset-password' });

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to update password' });
    }
  }
);

export default router;