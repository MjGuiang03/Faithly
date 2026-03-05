import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const app = express();
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests. Please slow down.' }
});

app.use(globalLimiter);
app.use(helmet());
app.use(mongoSanitize());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

/* ================== RATE LIMITERS ================== */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many registration attempts. Please try again later.' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP attempts. Please try again later.' }
});

const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: 'Too many resend requests. Please wait before trying again.' }
});

// Step 1 – request OTP: 5 sends per 15 min
const resetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({ message: 'Too many requests. Please wait 15 minutes before trying again.', retryAfter: options.windowMs / 1000 });
  }
});

// Step 2 – verify OTP: more attempts allowed for typos
const resetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({ message: 'Too many OTP attempts. Please wait 15 minutes before trying again.', retryAfter: options.windowMs / 1000 });
  }
});

// Step 3 – update password: allow retries for validation errors
const resetUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({ message: 'Too many password update attempts. Please wait 15 minutes before trying again.', retryAfter: options.windowMs / 1000 });
  }
});

/* ================== VALIDATION HELPER ================== */
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map(v => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

/* ================== AUTH MIDDLEWARE ================== */
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const admin = await admins.findOne({ email: decoded.email });
    if (!admin) return res.status(403).json({ message: 'Not authorized' });

    req.admin = admin;
    next();

  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

app.use('/api/admin/login', loginLimiter);

/* ================== MONGODB ================== */
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.DB_NAME);

const users      = db.collection('users');
const otps       = db.collection('otps');
const admins     = db.collection('admins');
const loans      = db.collection('loans');
const donations  = db.collection('donations');
const attendance = db.collection('attendance');

console.log('✅ Connected to MongoDB');

/* ================== DATABASE INDEXES ================== */

await users.createIndex({ email: 1 }, { unique: true });
await otps.createIndex({ email: 1 });
await loans.createIndex({ email: 1 });
await loans.createIndex({ loanId: 1 });
await attendance.createIndex({ email: 1 });

/* OTP AUTO DELETE AFTER EXPIRATION */
await otps.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

/* ================== CREATE DEFAULT ADMIN ================== */
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASS;

const defaultAdmin = await admins.findOne({ email: DEFAULT_ADMIN_EMAIL });

if (!defaultAdmin) {
  const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASS, 12);

  await admins.insertOne({
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash: adminPasswordHash,
    role: 'admin',
    createdAt: new Date()
  });
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
app.post('/api/register',
  registerLimiter,
  validate([
    body('fullName')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ max: 50 }).withMessage('Name too long')
      .matches(/^[A-Za-z\s]+$/).withMessage('Name must contain letters only'),

    body('email')
      .trim()
      .toLowerCase()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .isLength({ max: 100 }).withMessage('Email too long'),

    body('phone')
      .trim()
      .notEmpty().withMessage('Phone is required')
      .matches(/^\+63\d{10}$/).withMessage('Phone must be in format +63XXXXXXXXXX'),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8, max: 64 }).withMessage('Password must be 8–64 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a symbol'),

    body('birthday')
      .notEmpty().withMessage('Birthday is required')
      .isISO8601().withMessage('Invalid date format'),

    body('churchId')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Church ID too long')
      .matches(/^[a-zA-Z0-9\-]*$/).withMessage('Church ID contains invalid characters'),

    body('branch')
      .optional()
      .trim()
      .isLength({ max: 50 }),

    body('position')
      .optional()
      .trim()
      .isLength({ max: 50 }),

    body('gender')
      .optional()
      .isIn(['male', 'female']).withMessage('Invalid gender value'),
  ]),
  async (req, res) => {
    try {
      const { email, password, fullName, phone, branch, position, gender, birthday } = req.body;

      const existing = await users.findOne({ email });
      if (existing) {
        if (existing.isDeleted) {
          return res.status(400).json({
            message: 'This email was previously registered and deleted. Please use a different email.'
          });
        } else {
          return res.status(400).json({
            message: 'Unable to complete registration. Please try a different email.'
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
        failedLoginAttempts: 0,
        lockUntil: null,
        isPermanentlyLocked: false,
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
  }
);

/* ================== VERIFY EMAIL OTP ================== */
app.post('/api/verify-otp',
  otpLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
  ]),
  async (req, res) => {
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

      await users.updateOne({ email }, { $set: { isVerified: true } });
      await otps.deleteMany({ email, type: 'verify' });

      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Verification failed' });
    }
  }
);

/* ================== RESEND OTP ================== */
app.post('/api/resend-otp',
  resendOtpLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
  ]),
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await users.findOne({ email });
if (!user) return res.status(400).json({ message: 'Invalid request' });
      if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

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
  }
);

/* ================== LOGIN ================== */
/*
  Lock tier logic (stored in MongoDB):

  TIER 1 (first set of 3 attempts):
  ─ Attempts 1–2  → invalid credentials warning ("X attempt(s) remaining")
  ─ Attempt 3     → lock account for 5 minutes

  After 5-min lock expires:
  TIER 2 (second set of 3 attempts):
  ─ Attempts 4–5  → invalid credentials warning ("X attempt(s) remaining")
  ─ Attempt 6     → lock account for 30 minutes + recommend password reset

  After 30-min lock expires:
  TIER 3:
  ─ Attempt 7+    → permanently lock account (requires password reset)

  Successful login → resets all counters
  Password reset   → resets all counters
*/
app.post('/api/login', loginLimiter,
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

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email not verified' });
    }

    const now = new Date();

    // ── PERMANENT LOCK ──────────────────────────────────────────────────────
    if (user.isPermanentlyLocked) {
      return res.status(403).json({
        message: 'Your account has been permanently locked due to too many failed login attempts. Please reset your password to regain access.',
        locked: true,
        permanent: true
      });
    }

    // ── TIMED LOCK (still active) ───────────────────────────────────────────
    if (user.lockUntil && user.lockUntil > now) {
      const remainingMs = user.lockUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const attempts = user.failedLoginAttempts || 0;

      if (attempts >= 6) {
        return res.status(403).json({
          message: `Your account is locked for ${remainingMinutes} more minute(s) due to too many failed attempts. We strongly recommend resetting your password.`,
          locked: true,
          lockUntil: user.lockUntil,
          remainingSeconds,
          recommendReset: true
        });
      }

      return res.status(403).json({
        message: `Account locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`,
        locked: true,
        lockUntil: user.lockUntil,
        remainingSeconds
      });
    }

    // ── PASSWORD CHECK ──────────────────────────────────────────────────────
    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: attempts };

      // Tier 3 → permanent lock on 7th attempt
      if (attempts >= 7) {
        updateData.isPermanentlyLocked = true;
        updateData.lockUntil = null;
        await users.updateOne({ email }, { $set: updateData });

        return res.status(403).json({
          message: 'Your account has been permanently locked. Please reset your password to regain access.',
          locked: true,
          permanent: true
        });
      }

      // Tier 2 → 30-minute lock on exactly the 6th attempt
      if (attempts === 6) {
        updateData.lockUntil = new Date(now.getTime() + 30 * 60 * 1000);
        await users.updateOne({ email }, { $set: updateData });

        return res.status(403).json({
          message: 'Too many failed login attempts. Your account has been locked for 30 minutes. We strongly recommend resetting your password.',
          locked: true,
          lockUntil: updateData.lockUntil,
          remainingSeconds: 30 * 60,
          recommendReset: true
        });
      }

      // Tier 1 → 5-minute lock on exactly the 3rd attempt
      if (attempts === 3) {
        updateData.lockUntil = new Date(now.getTime() + 5 * 60 * 1000);
        await users.updateOne({ email }, { $set: updateData });

        return res.status(403).json({
          message: 'Too many failed login attempts. Your account has been locked for 5 minutes.',
          locked: true,
          lockUntil: updateData.lockUntil,
          remainingSeconds: 5 * 60
        });
      }

      await users.updateOne({ email }, { $set: updateData });

      const attemptsInCurrentTier = attempts <= 3 ? attempts : attempts - 3;
      const remaining = 3 - attemptsInCurrentTier;

      return res.status(400).json({
        message: `Invalid credentials. ${remaining} attempt(s) remaining before your account is locked.`
      });
    }

    // ── SUCCESSFUL LOGIN → reset all lock state ─────────────────────────────
    await users.updateOne(
      { email },
      {
        $set: {
          lastLoginAt: now,
          failedLoginAttempts: 0,
          lockUntil: null,
          isPermanentlyLocked: false
        }
      }
    );

    const token = jwt.sign(
  { email: user.email, role: 'user' },
  JWT_SECRET,
  {
    expiresIn: '1h',
    issuer: 'faithly-api',
    audience: 'faithly-users'
  }
);

    res.status(200).json({
      message: 'Login successful',
      token,
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
app.put('/api/update-profile', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { fullName, phone, branch, position } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone)    updateData.phone    = phone;
    if (branch)   updateData.branch   = branch;
    if (position) updateData.position = position;

    await users.updateOne({ email }, { $set: updateData });

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
app.post('/api/reset-password-request',
  resetRequestLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
  ]),
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await users.findOne({ email });
if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const otp = generateOTP();
      await otps.deleteMany({ email, type: 'reset-password' });
      await otps.insertOne({
        email,
        otp,
        type: 'reset-password',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

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

/* ================== PASSWORD RESET - VERIFY OTP ================== */
app.post('/api/reset-password-verify-otp',
  resetVerifyLimiter,
  validate([
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
  ]),
  async (req, res) => {
    try {
      const { email, otp } = req.body;

      const record = await otps.findOne({
        email,
        otp,
        type: 'reset-password',
        expiresAt: { $gt: new Date() }
      });

      if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

      res.json({ message: 'OTP verified successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Verification failed' });
    }
  }
);

/* ================== PASSWORD RESET - UPDATE PASSWORD ================== */
app.post('/api/reset-password-update',
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

      const record = await otps.findOne({
        email,
        otp,
        type: 'reset-password',
        expiresAt: { $gt: new Date() }
      });

      if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await users.updateOne(
        { email },
        {
          $set: {
            passwordHash,
            failedLoginAttempts: 0,
            lockUntil: null,
            isPermanentlyLocked: false
          }
        }
      );

      await otps.deleteMany({ email, type: 'reset-password' });

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to update password' });
    }
  }
);

/* ================== DELETE ACCOUNT (SOFT DELETE) ================== */
app.delete('/api/delete-account', authenticateUser, async (req, res) => {
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
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

/* ================== ADMIN LOGIN ================== */
app.post('/api/admin/login',
  loginLimiter,
  validate([
    body('email').trim().notEmpty().withMessage('Email required'),
    body('password').notEmpty().withMessage('Password required')
  ]),
  async (req, res) => {
  try {
    const { email, password } = req.body;

   const admin = await admins.findOne({ email });
if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

const match = await bcrypt.compare(password, admin.passwordHash);
if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
  { email: admin.email, role: 'admin' },
  JWT_SECRET,
  {
    expiresIn: '2h',
    issuer: 'faithly-api',
    audience: 'faithly-admin'
  }
);

    res.status(200).json({
      message: 'Admin login successful',
      token,
      admin: { email: admin.email, role: admin.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Admin login failed' });
  }
});

/* ================== ADMIN - GET ALL MEMBERS ================== */
app.get('/api/admin/members', authenticateAdmin, async (req, res) => {
  try {
    const { search, status, branch } = req.query;

    // ── Pagination params ─────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    // ── Base query (no status filter yet – status is computed in-app) ─────
    const baseQuery = {};

    if (search) {
      baseQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }

    if (branch && branch !== 'all') {
      baseQuery.branch = branch;
    }

    // ── Fetch all matching docs to compute status (status is derived) ─────
    const allUsers = await users.find(baseQuery).toArray();

    const now        = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const withStatus = allUsers.map(user => {
      let userStatus = 'active';
      if (user.isDeleted) {
        userStatus = 'deactivated';
      } else if (!user.lastLoginAt || new Date(user.lastLoginAt) < oneWeekAgo) {
        userStatus = 'inactive';
      }

      return {
        ...user,
        status:   userStatus,
        memberId: user.memberId || `M-${user._id.toString().slice(-5).toUpperCase()}`
      };
    });

    // ── Global stats (always based on ALL users, unfiltered by status) ────
    const allForStats = await users.find({}).toArray();
    const statsWithStatus = allForStats.map(u => {
      if (u.isDeleted) return { ...u, status: 'deactivated' };
      if (!u.lastLoginAt || new Date(u.lastLoginAt) < oneWeekAgo) return { ...u, status: 'inactive' };
      return { ...u, status: 'active' };
    });

    const stats = {
      total:        allForStats.length,
      active:       statsWithStatus.filter(u => u.status === 'active').length,
      inactive:     statsWithStatus.filter(u => u.status === 'inactive').length,
      deactivated:  statsWithStatus.filter(u => u.status === 'deactivated').length,
      newThisMonth: allForStats.filter(u => {
        const created = new Date(u.createdAt);
        return created.getMonth()    === now.getMonth() &&
               created.getFullYear() === now.getFullYear();
      }).length
    };

    // ── Apply status filter ───────────────────────────────────────────────
    const filtered = (status && status !== 'all')
      ? withStatus.filter(u => u.status === status)
      : withStatus;

    // ── Paginate ──────────────────────────────────────────────────────────
    const totalMembers = filtered.length;
    const totalPages   = Math.ceil(totalMembers / limit) || 1;
    const pageMembers  = filtered.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      members: pageMembers,
      stats,
      pagination: {
        page,
        limit,
        totalMembers,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});


/* ================== ADMIN - UPDATE MEMBER ================== */
/*
  Add this route to server.js alongside the other /api/admin routes.

  PUT /api/admin/update-member
  Body: { email, fullName, phone, branch, position }
*/
/* ================== ADMIN - UPDATE MEMBER (with password check) ========= */
app.put('/api/admin/update-member', authenticateAdmin, async (req, res) => {
  try {
    const { email, adminPassword, fullName, phone, branch, position } = req.body;

    if (!email)         return res.status(400).json({ success: false, message: 'Email is required' });
    if (!adminPassword) return res.status(400).json({ success: false, message: 'Admin password is required' });

    // ── Verify admin password ────────────────────────────────────────────
    const admin = await admins.findOne({ email: req.admin.email });
    if (!admin) return res.status(403).json({ success: false, message: 'Admin not found' });

    const passwordMatch = await bcrypt.compare(adminPassword, admin.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, wrongPassword: true, message: 'Incorrect admin password' });
    }

    // ── Find member ──────────────────────────────────────────────────────
    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone    !== undefined) updateData.phone    = phone;
    if (branch   !== undefined) updateData.branch   = branch;
    if (position !== undefined) updateData.position = position;

    await users.updateOne({ email }, { $set: updateData });

    const updated = await users.findOne({ email });

    res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      user: {
        email:    updated.email,
        fullName: updated.fullName,
        phone:    updated.phone,
        branch:   updated.branch,
        position: updated.position
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update member' });
  }
});

/* ================== ADMIN - DELETE MEMBER (with password check) ========= */
app.delete('/api/admin/delete-member-permanent', authenticateAdmin, async (req, res) => {
  try {
    const { email, adminPassword } = req.body;

    if (!email)         return res.status(400).json({ success: false, message: 'Email is required' });
    if (!adminPassword) return res.status(400).json({ success: false, message: 'Admin password is required' });

    // ── Verify admin password ────────────────────────────────────────────
    const admin = await admins.findOne({ email: req.admin.email });
    if (!admin) return res.status(403).json({ success: false, message: 'Admin not found' });

    const passwordMatch = await bcrypt.compare(adminPassword, admin.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, wrongPassword: true, message: 'Incorrect admin password' });
    }

    // ── Delete member ────────────────────────────────────────────────────
    const result = await users.deleteOne({ email });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'User not found' });

    await otps.deleteMany({ email });

    res.status(200).json({ success: true, message: 'Member permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
});

/* ================== ADMIN - GET AVAILABLE BRANCHES ================== */
app.get('/api/admin/branches', authenticateAdmin, async (req, res) => {
  try {
    const branches = await users.distinct('branch');
    res.status(200).json({ success: true, branches: branches.filter(b => b) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
});

/* ============================================================
   ==================== LOAN ROUTES ==========================
   ============================================================ */

/* ================== USER - APPLY FOR LOAN ================== */
app.post('/api/loans/apply', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { amount, purpose, termMonths } = req.body;

    if (!email || !amount || !purpose) {
      return res.status(400).json({ success: false, message: 'Amount and purpose are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const count  = await loans.countDocuments();
    const loanId = `LN-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newLoan = {
      loanId,
      email,
      memberName: user.fullName,
      amount:     Number(amount),
      purpose,
      termMonths: termMonths || 12,
      status:     'pending',
      appliedDate: new Date(),
      updatedAt:   new Date()
    };

    await loans.insertOne(newLoan);
    res.status(201).json({ success: true, message: 'Loan application submitted', loanId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to apply for loan' });
  }
});

/* ================== USER - GET MY LOANS ================== */
app.get('/api/loans/my-loans', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const userLoans = await loans.find({ email }).sort({ appliedDate: -1 }).toArray();

    const totalBorrowed     = userLoans.reduce((sum, l) => sum + l.amount, 0);
    const activeLoans       = userLoans.filter(l => l.status === 'active');
    const remainingBalance  = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || l.amount), 0);

    res.status(200).json({
      success: true,
      loans: userLoans,
      stats: { totalBorrowed, remainingBalance, activeCount: activeLoans.length }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
});

/* ================== ADMIN - GET ALL LOANS ================== */
app.get('/api/admin/loans', authenticateAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { memberName: { $regex: search, $options: 'i' } },
        { loanId:     { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } }
      ];
    }

    const allLoans = await loans.find(query).sort({ appliedDate: -1 }).toArray();

    const totalDisbursedResult = await loans.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const stats = {
      pending:       await loans.countDocuments({ status: 'pending' }),
      active:        await loans.countDocuments({ status: 'active' }),
      completed:     await loans.countDocuments({ status: 'completed' }),
      totalDisbursed: totalDisbursedResult[0]?.total || 0
    };

    res.status(200).json({ success: true, loans: allLoans, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
});

/* ================== ADMIN - APPROVE LOAN ================== */
app.put('/api/admin/loans/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await loans.findOne({ _id: new ObjectId(id) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    if (loan.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending loans can be approved' });
    }

    await loans.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'active', approvedDate: new Date(), updatedAt: new Date() } }
    );

    res.status(200).json({ success: true, message: 'Loan approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to approve loan' });
  }
});

/* ================== ADMIN - REJECT LOAN ================== */
app.put('/api/admin/loans/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await loans.findOne({ _id: new ObjectId(id) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    if (loan.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending loans can be rejected' });
    }

    await loans.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'rejected', rejectedDate: new Date(), updatedAt: new Date() } }
    );

    res.status(200).json({ success: true, message: 'Loan rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to reject loan' });
  }
});

/* ============================================================
   ================== DONATION ROUTES ========================
   ============================================================ */

/* ================== USER - MAKE A DONATION ================== */
app.post('/api/donations', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { amount, category, paymentMethod, isRecurring } = req.body;

    if (!email || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Amount and category are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const count      = await donations.countDocuments();
    const donationId = `D-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newDonation = {
      donationId,
      email,
      member:    user.fullName,
      amount:    Number(amount),
      category,
      method:    paymentMethod || 'Credit Card',
      type:      isRecurring ? 'Recurring' : 'One-time',
      date:      new Date(),
      createdAt: new Date()
    };

    await donations.insertOne(newDonation);
    res.status(201).json({ success: true, message: 'Donation recorded successfully', donationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
});

/* ================== USER - GET MY DONATIONS ================== */
app.get('/api/donations/my-donations', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const userDonations = await donations.find({ email }).sort({ createdAt: -1 }).toArray();

    const totalDonated = userDonations.reduce((sum, d) => sum + d.amount, 0);

    const now = new Date();
    const thisYearDonations = userDonations.filter(
      d => new Date(d.createdAt).getFullYear() === now.getFullYear()
    );
    const thisYearTotal = thisYearDonations.reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({
      success: true,
      donations: userDonations,
      stats: { totalDonated, thisYearTotal, totalCount: userDonations.length }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
});

/* ================== ADMIN - GET ALL DONATIONS ================== */
app.get('/api/admin/donations', authenticateAdmin, async (req, res) => {
  try {
    const { search, status, branch } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.type = status === 'recurring' ? 'Recurring' : 'One-time';
    }

    if (search) {
      query.$or = [
        { member:     { $regex: search, $options: 'i' } },
        { donationId: { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } }
      ];
    }

    const allDonations = await donations.find(query).sort({ createdAt: -1 }).toArray();

    const now = new Date();
    const thisMonthDonations = allDonations.filter(d => {
      const date = new Date(d.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const recurringDonations = allDonations.filter(d => d.type === 'Recurring');

    const stats = {
      total:      allDonations.reduce((sum, d) => sum + d.amount, 0),
      thisMonth:  thisMonthDonations.reduce((sum, d) => sum + d.amount, 0),
      recurring:  recurringDonations.reduce((sum, d) => sum + d.amount, 0),
      totalCount: allDonations.length
    };

    const categoryMap = {};
    allDonations.forEach(d => {
      if (!categoryMap[d.category]) {
        categoryMap[d.category] = { name: d.category, amount: 0, count: 0 };
      }
      categoryMap[d.category].amount += d.amount;
      categoryMap[d.category].count  += 1;
    });
    const categories = Object.values(categoryMap);

    res.status(200).json({ success: true, donations: allDonations, stats, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
});

/* ============================================================
   ================= ATTENDANCE ROUTES =======================
   ============================================================ */

/* ================== USER - RECORD ATTENDANCE (CHECK IN) ================== */
app.post('/api/attendance/checkin', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { service, branch, method } = req.body;

    if (!email || !service || !branch) {
      return res.status(400).json({ success: false, message: 'Service and branch are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const count    = await attendance.countDocuments();
    const recordId = `A-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const now      = new Date();

    const newRecord = {
      recordId,
      email,
      member:  user.fullName,
      service,
      branch,
      method:    method || 'QR',
      date:      now.toLocaleDateString('en-US'),
      time:      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: now
    };

    await attendance.insertOne(newRecord);
    res.status(201).json({ success: true, message: 'Attendance recorded successfully', recordId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record attendance' });
  }
});

/* ================== USER - GET MY ATTENDANCE ================== */
app.get('/api/attendance/my-attendance', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const userAttendance = await attendance.find({ email }).sort({ createdAt: -1 }).toArray();

    const now = new Date();
    const thisMonth = userAttendance.filter(a => {
      return new Date(a.createdAt).getMonth() === now.getMonth() &&
             new Date(a.createdAt).getFullYear() === now.getFullYear();
    });

    res.status(200).json({
      success: true,
      attendance: userAttendance,
      stats: { total: userAttendance.length, thisMonth: thisMonth.length }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

/* ================== ADMIN - GET ALL ATTENDANCE ================== */
app.get('/api/admin/attendance', authenticateAdmin, async (req, res) => {
  try {
    const { search, service, branch, method } = req.query;
    const query = {};

    if (service) query.service = service;
    if (branch)  query.branch  = branch;
    if (method)  query.method  = method;

    if (search) {
      query.$or = [
        { member:   { $regex: search, $options: 'i' } },
        { recordId: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } }
      ];
    }

    const allAttendance = await attendance.find(query).sort({ createdAt: -1 }).toArray();

    const now        = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek   = allAttendance.filter(a => new Date(a.createdAt) >= oneWeekAgo);

    const serviceMap = {};
    allAttendance.forEach(a => {
      serviceMap[a.service] = (serviceMap[a.service] || 0) + 1;
    });

    const serviceValues = Object.values(serviceMap);
    const avgPerService = serviceValues.length > 0
      ? Math.round(serviceValues.reduce((s, v) => s + v, 0) / serviceValues.length)
      : 0;

    const branchMap = {};
    allAttendance.forEach(a => {
      branchMap[a.branch] = (branchMap[a.branch] || 0) + 1;
    });
    const topBranch = Object.entries(branchMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const stats    = { total: allAttendance.length, thisWeek: thisWeek.length, avgPerService, topBranch };
    const byService = Object.entries(serviceMap).map(([service, count]) => ({ service, count }));
    const byBranch  = Object.entries(branchMap).map(([branch, count]) => ({ branch, count }));

    res.status(200).json({ success: true, attendance: allAttendance, stats, byService, byBranch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

/* ================== REQUEST EMAIL CHANGE (sends OTP to NEW email) ======= */
app.post('/api/request-email-change', authenticateUser, async (req, res) => {
  try {
    const currentEmail = req.user.email;
    const { newEmail } = req.body;

    if (!newEmail) return res.status(400).json({ success: false, message: 'New email is required' });

    const normalizedNew = newEmail.trim().toLowerCase();

    // Same as current?
    if (normalizedNew === currentEmail.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'New email is the same as your current email' });
    }

    // Daily email change limit — 1 per day
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

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

    // Already taken?
    const existing = await users.findOne({ email: normalizedNew });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This email is already in use by another account' });
    }

    // Generate & send OTP to the NEW email address
    const otp = generateOTP();
    await otps.deleteMany({ email: currentEmail, type: 'change-email' });
    await otps.insertOne({
  email:      currentEmail,
  newEmail:   normalizedNew,
  otp,
  type:       'change-email',
  expiresAt:  new Date(Date.now() + 15 * 60 * 1000),
  createdAt:  new Date(),   // ← this is what the limit check queries against
  used:       false,
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

/* ================== VERIFY EMAIL CHANGE OTP + UPDATE EMAIL ============= */
app.post('/api/verify-email-change', authenticateUser, async (req, res) => {
  try {
    const currentEmail = req.user.email;
    const { otp } = req.body;

    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const record = await otps.findOne({
      email:    currentEmail,
      otp:      otp.trim(),
      type:     'change-email',
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const newEmail = record.newEmail;

    // Double-check new email is still available
    const taken = await users.findOne({ email: newEmail });
    if (taken) {
      await otps.deleteMany({ email: currentEmail, type: 'change-email' });
      return res.status(400).json({ success: false, message: 'This email was just taken by another account' });
    }

    // Update the user's email
    await users.updateOne(
  { email: currentEmail },
  { $set: { email: newEmail, lastEmailChangeAt: new Date() } }
);

    // Clean up OTP
    await otps.deleteMany({ email: currentEmail, type: 'change-email' });
    
    // Issue a new token with the updated email
    const newToken = jwt.sign({ email: newEmail }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      success:  true,
      message:  'Email updated successfully',
      newEmail,
      token:    newToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to verify email change' });
  }
});

/* ================== UPDATE PROFILE (extended — includes community/branch) */
// NOTE: This replaces the existing /api/update-profile route.
// The existing route already handles branch; this version also accepts
// dateOfBirth and ensures community (sent as `branch`) is saved.
app.put('/api/update-profile', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { fullName, phone, branch, position, dateOfBirth } = req.body;

    const user = await users.findOne({ email });
    

    const updateData = {};
    if (fullName    !== undefined) updateData.fullName    = fullName;
    if (phone       !== undefined) updateData.phone       = phone;
    if (branch      !== undefined) updateData.branch      = branch;      // community
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
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/* ================== SERVER ================== */
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
});