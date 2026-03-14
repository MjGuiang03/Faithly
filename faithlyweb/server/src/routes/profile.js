import { Router } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { users, otps } from '../config/db.js';
import { authenticateUser } from '../middleware/auth.js';
import { transporter, generateOTP } from '../utils/email.js';

const router  = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/* ================== UPDATE PROFILE ================== */
router.put('/update-profile', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { fullName, phone, branch, position, dateOfBirth } = req.body;

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateData = {};
    if (fullName    !== undefined) updateData.fullName    = fullName;
    if (phone       !== undefined) updateData.phone       = phone;
    if (branch      !== undefined) updateData.branch      = branch;
    if (position    !== undefined) updateData.position    = position;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    await users.updateOne({ email }, { $set: updateData });
    const updatedUser = await users.findOne({ email });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        email:       updatedUser.email,
        fullName:    updatedUser.fullName,
        phone:       updatedUser.phone,
        branch:      updatedUser.branch,
        position:    updatedUser.position,
        gender:      updatedUser.gender,
        birthday:    updatedUser.birthday,
        dateOfBirth: updatedUser.dateOfBirth,
        createdAt:   updatedUser.createdAt,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/* ================== REQUEST EMAIL CHANGE ================== */
router.post('/request-email-change', authenticateUser, async (req, res) => {
  try {
    const currentEmail = req.user.email;
    const { newEmail }  = req.body;

    if (!newEmail) return res.status(400).json({ success: false, message: 'New email is required' });

    const normalizedNew = newEmail.trim().toLowerCase();
    if (normalizedNew === currentEmail.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'New email is the same as your current email' });
    }

    const currentUser = await users.findOne({ email: currentEmail });
    if (currentUser?.lastEmailChangeAt) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      if (new Date(currentUser.lastEmailChangeAt) >= startOfDay) {
        return res.status(429).json({
          success: false,
          message: 'You can only change your email once per day. Please try again tomorrow.'
        });
      }
    }

    const existing = await users.findOne({ email: normalizedNew });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This email is already in use by another account' });
    }

    const otp = generateOTP();
    await otps.deleteMany({ email: currentEmail, type: 'change-email' });
    await otps.insertOne({
      email: currentEmail, newEmail: normalizedNew, otp,
      type: 'change-email', expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(), used: false,
    });

    await transporter.sendMail({
      from:    `"Faithly" <${process.env.EMAIL_USER}>`,
      to:      normalizedNew,
      subject: 'Confirm Your New Email Address',
      html: `
        <h2>Email Change Request</h2>
        <p>We received a request to change your Faithly account email to this address.</p>
        <h1 style="letter-spacing:0.3em">${otp}</h1>
        <p>This code expires in <strong>15 minutes</strong>. If you did not request this, please ignore this email.</p>
      `,
    });

    res.json({ success: true, message: 'Verification code sent to your new email address' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }
});

/* ================== VERIFY EMAIL CHANGE ================== */
router.post('/verify-email-change', authenticateUser, async (req, res) => {
  try {
    const currentEmail = req.user.email;
    const { otp }      = req.body;

    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const record = await otps.findOne({
      email: currentEmail, otp: otp.trim(),
      type: 'change-email', expiresAt: { $gt: new Date() },
    });

    if (!record) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    const newEmail = record.newEmail;
    const taken    = await users.findOne({ email: newEmail });
    if (taken) {
      await otps.deleteMany({ email: currentEmail, type: 'change-email' });
      return res.status(400).json({ success: false, message: 'This email was just taken by another account' });
    }

    await users.updateOne({ email: currentEmail }, { $set: { email: newEmail, lastEmailChangeAt: new Date() } });
    await otps.deleteMany({ email: currentEmail, type: 'change-email' });

    const newToken = jwt.sign({ email: newEmail }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ success: true, message: 'Email updated successfully', newEmail, token: newToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to verify email change' });
  }
});

/* ================== UPLOAD PROFILE PHOTO ================== */
router.put('/upload-photo', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { photoBase64 } = req.body;

    if (!photoBase64) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    // Rough size check: base64 string length * (3/4) is approx bytes
    const approximateBytes = photoBase64.length * 0.75;
    if (approximateBytes > 2 * 1024 * 1024) { // 2MB limit
      return res.status(400).json({ success: false, message: 'Image size exceeds 2MB limit' });
    }

    await users.updateOne(
      { email },
      { $set: { photoUrl: photoBase64 } }
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      photoUrl: photoBase64
    });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

export default router;