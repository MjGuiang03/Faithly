import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { users, admins, otps } from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router     = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/* ================== ADMIN LOGIN ================== */
router.post('/login',
  loginLimiter,
  validate([
    body('email').trim().notEmpty().withMessage('Email required'),
    body('password').notEmpty().withMessage('Password required'),
    body('role').optional().trim()
  ]),
  async (req, res) => {
    try {
      const { email, password, role } = req.body;
      const admin = await admins.findOne({ email });
      if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

      // If a role was specified from the frontend, ensure it matches
      if (role && admin.role !== role) {
        return res.status(400).json({ message: 'Invalid credentials for this role' });
      }

      const match = await bcrypt.compare(password, admin.passwordHash);
      if (!match) return res.status(400).json({ message: 'Invalid credentials' });

      const token = jwt.sign(
        { email: admin.email, role: admin.role },
        JWT_SECRET,
        { expiresIn: '2h', issuer: 'faithly-api', audience: 'faithly-admin' }
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
  }
);

/* ================== GET ALL MEMBERS ================== */
router.get('/members', authenticateAdmin, async (req, res) => {
  try {
    const { search, status, branch, isOfficer } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    const baseQuery = {};
    if (search) {
      baseQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }
    if (branch && branch !== 'all') baseQuery.branch = branch;
    // Officers = verified members (Level 2)
    if (isOfficer === 'true')  baseQuery.verificationStatus = 'verified';
    if (isOfficer === 'false') baseQuery.verificationStatus = { $ne: 'verified' };

    const allUsers   = await users.find(baseQuery).toArray();
    const now        = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const withStatus = allUsers.map(user => {
      let userStatus = 'active';
      if (user.isDeleted) {
        userStatus = 'deactivated';
      } else if (!user.lastLoginAt || new Date(user.lastLoginAt) < oneWeekAgo) {
        userStatus = 'inactive';
      }
      return { ...user, status: userStatus, memberId: user.memberId || `M-${user._id.toString().slice(-5).toUpperCase()}` };
    });

    const allForStats    = await users.find({}).toArray();
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
      officers:     allForStats.filter(u => u.verificationStatus === 'verified').length,
      newThisMonth: allForStats.filter(u => {
        const created = new Date(u.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length
    };

    const filtered     = (status && status !== 'all') ? withStatus.filter(u => u.status === status) : withStatus;
    const totalMembers = filtered.length;
    const totalPages   = Math.ceil(totalMembers / limit) || 1;
    const pageMembers  = filtered.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      members: pageMembers,
      stats,
      pagination: { page, limit, totalMembers, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

/* ================== UPDATE MEMBER ================== */
router.put('/update-member', authenticateAdmin, async (req, res) => {
  try {
    const { email, adminPassword, fullName, phone, branch, position } = req.body;

    if (!email)         return res.status(400).json({ success: false, message: 'Email is required' });
    if (!adminPassword) return res.status(400).json({ success: false, message: 'Admin password is required' });

    const admin = await admins.findOne({ email: req.admin.email });
    if (!admin) return res.status(403).json({ success: false, message: 'Admin not found' });

    const passwordMatch = await bcrypt.compare(adminPassword, admin.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, wrongPassword: true, message: 'Incorrect admin password' });
    }

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
      user: { email: updated.email, fullName: updated.fullName, phone: updated.phone, branch: updated.branch, position: updated.position }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update member' });
  }
});

/* ================== DELETE MEMBER (PERMANENT) ================== */
router.delete('/delete-member-permanent', authenticateAdmin, async (req, res) => {
  try {
    const { email, adminPassword } = req.body;

    if (!email)         return res.status(400).json({ success: false, message: 'Email is required' });
    if (!adminPassword) return res.status(400).json({ success: false, message: 'Admin password is required' });

    const admin = await admins.findOne({ email: req.admin.email });
    if (!admin) return res.status(403).json({ success: false, message: 'Admin not found' });

    const passwordMatch = await bcrypt.compare(adminPassword, admin.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, wrongPassword: true, message: 'Incorrect admin password' });
    }

    const result = await users.deleteOne({ email });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'User not found' });

    await otps.deleteMany({ email });

    res.status(200).json({ success: true, message: 'Member permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
});

/* ================== GET BRANCHES ================== */
router.get('/branches', authenticateAdmin, async (req, res) => {
  try {
    const branches = await users.distinct('branch');
    res.status(200).json({ success: true, branches: branches.filter(b => b) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
});

/* ================== ADMIN - CREATE NEW ADMIN/OFFICER ================== */
router.post('/create-admin', authenticateAdmin, async (req, res) => {
  try {
    // Only the main admin can create other admins/officers
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Main Admin can create accounts' });
    }

    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Role validation
    const validRoles = ['admin', 'loanAdmin', 'secretaryAdmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existingAdmin = await admins.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newAdmin = {
      email,
      passwordHash,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await admins.insertOne(newAdmin);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      admin: { email, role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create account' });
  }
});

export default router;