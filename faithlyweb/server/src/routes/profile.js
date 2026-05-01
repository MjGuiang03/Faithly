import { Router } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { users, otps, loans, loanPayments, donations, attendance, savingsTransactions, announcements } from '../config/db.js';
import { authenticateUser } from '../middleware/auth.js';
import { sendOTP, generateOTP } from '../utils/email.js';

const router  = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/* ================== UPDATE PROFILE ================== */
router.put('/update-profile', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { fullName, phone, branch, position, dateOfBirth, emailNotifications, pushNotifications, notifPrefs, pushSubscription, expoPushToken } = req.body;

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateData = {};
    if (fullName    !== undefined) updateData.fullName    = fullName;
    if (phone       !== undefined) updateData.phone       = phone;
    if (branch      !== undefined) updateData.branch      = branch;
    if (position    !== undefined) updateData.position    = position;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) updateData.pushNotifications = pushNotifications;
    if (notifPrefs !== undefined) updateData.notifPrefs = notifPrefs;
    if (pushSubscription !== undefined) updateData.pushSubscription = pushSubscription;
    if (expoPushToken !== undefined) updateData.expoPushToken = expoPushToken;

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
        emailNotifications: updatedUser.emailNotifications,
        pushNotifications: updatedUser.pushNotifications,
        notifPrefs: updatedUser.notifPrefs,
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

    await sendOTP(normalizedNew, otp, 'Confirm Your New Email Address', 'Email Change Request');

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

/* ================== UPLOAD PROFILE PHOTO (Multipart - Mobile) ================== */
import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

router.put('/upload-photo-file', authenticateUser, upload.single('photo'), async (req, res) => {
  try {
    const email = req.user.email;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo file is required' });
    }

    // Convert the file buffer to base64 data URI (stored same as web version)
    const mimeType = req.file.mimetype || 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');
    const photoUrl = `data:${mimeType};base64,${base64}`;

    await users.updateOne(
      { email },
      { $set: { photoUrl } }
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      photoUrl
    });
  } catch (err) {
    console.error('Error uploading photo file:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Image size exceeds 2MB limit' });
    }
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

/* ================== GET CURRENT USER PROFILE ================== */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Return user profile without sensitive fields
    const { passwordHash, failedLoginAttempts, lockUntil, isPermanentlyLocked, ...safeUser } = user;
    res.status(200).json({ success: true, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

/* ================== NOTIFICATIONS READ STATE ================== */
router.get('/read-notifications', authenticateUser, async (req, res) => {
  try {
    const user = await users.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, readIds: user.readNotifications || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch read notifications' });
  }
});

router.post('/read-notifications', authenticateUser, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    await users.updateOne(
      { email: req.user.email },
      { $addToSet: { readNotifications: { $each: ids } } }
    );
    res.json({ success: true, message: 'Read state updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update read status' });
  }
});

/* ================== UNIFIED NOTIFICATIONS FEED ================== */
router.get('/notifications/feed', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const limit = 10;

    /* 1. Fetch user to get their branch for filtering */
    const userReq = await users.findOne({ email });
    const branch = userReq?.branch || '';

    const [pendingPayments, userLoans, userDonations, userAttendance, userSavings, recentAnnouncements] = await Promise.all([
      loanPayments.find({ email, status: 'pending' }).sort({ submittedAt: -1 }).limit(limit).toArray(),
      loans.find({ email }).sort({ updatedAt: -1 }).limit(limit).toArray(),
      donations.find({ email }).sort({ updatedAt: -1 }).limit(limit).toArray(),
      attendance.find({ email }).sort({ createdAt: -1 }).limit(limit).toArray(),
      savingsTransactions.find({ email }).sort({ date: -1 }).limit(limit).toArray(),
      announcements.find({
        $and: [
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: null },
              { expiresAt: { $gt: new Date() } }
            ]
          },
          {
            $or: [
              { visibility: 'all' },
              { visibility: { $exists: false } },
              { visibility: null },
              { targetBranches: branch }
            ]
          }
        ]
      }).sort({ createdAt: -1 }).limit(limit).toArray(),
    ]);

    const filteredAnnouncements = recentAnnouncements;

    res.json({
      success: true,
      readIds: userReq?.readNotifications || [],
      payments:   pendingPayments,
      loans:      userLoans,
      donations:  userDonations,
      attendance: userAttendance,
      savings:    userSavings,
      announcements: filteredAnnouncements
    });
  } catch (err) {
    console.error('Notification feed error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notification feed' });
  }
});

/* ================== SAVED PAYMENT ACCOUNTS ================== */
router.get('/saved-accounts', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const accounts = [];
    const seen = new Set();

    // 1. From user's manually saved accounts
    const user = await users.findOne({ email });
    if (user?.savedAccounts && Array.isArray(user.savedAccounts)) {
      for (const sa of user.savedAccounts) {
        const key = `${sa.method}-${sa.accountNumber}`;
        if (!seen.has(key)) {
          seen.add(key);
          accounts.push({
            method: sa.method,
            accountNumber: sa.accountNumber,
            accountName: sa.accountName || '',
            source: 'Saved',
            label: sa.label || `${sa.accountName || ''} - ${sa.accountNumber}`.trim(),
          });
        }
      }
    }

    // 2. From savings withdrawals (have sendMethod, accountNumber, accountName)
    const withdrawals = await savingsTransactions
      .find({ email, type: 'withdrawal', status: 'confirmed', accountNumber: { $exists: true, $ne: '' } })
      .sort({ date: -1 })
      .limit(20)
      .toArray();

    for (const w of withdrawals) {
      const key = `${w.sendMethod || 'gcash'}-${w.accountNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        accounts.push({
          method: w.sendMethod || 'gcash',
          accountNumber: w.accountNumber,
          accountName: w.accountName || '',
          source: 'Savings Withdrawal',
          label: `${w.accountName || ''} - ${w.accountNumber}`.trim(),
        });
      }
    }

    // 3. From user profile (phone as GCash)
    if (user?.phone) {
      const key = `gcash-${user.phone}`;
      if (!seen.has(key)) {
        seen.add(key);
        accounts.push({
          method: 'gcash',
          accountNumber: user.phone,
          accountName: user.fullName || '',
          source: 'Profile',
          label: `${user.fullName || ''} - ${user.phone}`.trim(),
        });
      }
    }

    res.json({ success: true, accounts });
  } catch (err) {
    console.error('Failed to fetch saved accounts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch saved accounts' });
  }
});

/* ================== SAVE A NEW PAYMENT ACCOUNT ================== */
router.post('/saved-accounts', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { method, accountNumber, accountName, label } = req.body;

    if (!method || !accountNumber) {
      return res.status(400).json({ success: false, message: 'Method and account number are required' });
    }

    const user = await users.findOne({ email });
    const existing = (user?.savedAccounts || []);

    // Check for duplicates
    const isDuplicate = existing.some(a => a.method === method && a.accountNumber === accountNumber);
    if (isDuplicate) {
      return res.json({ success: true, message: 'Account already saved' });
    }

    const newAccount = {
      method,
      accountNumber,
      accountName: accountName || '',
      label: label || `${accountName || ''} - ${accountNumber}`.trim(),
      addedAt: new Date(),
    };

    await users.updateOne({ email }, { $push: { savedAccounts: newAccount } });

    res.json({ success: true, message: 'Account saved successfully' });
  } catch (err) {
    console.error('Failed to save account:', err);
    res.status(500).json({ success: false, message: 'Failed to save account' });
  }
});

export default router;