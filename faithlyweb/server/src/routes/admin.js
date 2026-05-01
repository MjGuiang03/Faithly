import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { users, admins, otps, announcements, savingsTransactions, savingsGoals, loans, loanPayments } from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const baseQuery = {};
    if (search) {
      baseQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } }
      ];
    }
    if (branch && branch !== 'all') baseQuery.branch = branch;
    // Officers = verified members (Level 2)
    if (isOfficer === 'true') baseQuery.verificationStatus = 'verified';
    if (isOfficer === 'false') baseQuery.verificationStatus = { $ne: 'verified' };

    const allUsers = await users.find(baseQuery).toArray();
    const now = new Date();
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

    const allForStats = await users.find({}).toArray();
    const statsWithStatus = allForStats.map(u => {
      if (u.isDeleted) return { ...u, status: 'deactivated' };
      if (!u.lastLoginAt || new Date(u.lastLoginAt) < oneWeekAgo) return { ...u, status: 'inactive' };
      return { ...u, status: 'active' };
    });

    const stats = {
      total: allForStats.length,
      active: statsWithStatus.filter(u => u.status === 'active').length,
      inactive: statsWithStatus.filter(u => u.status === 'inactive').length,
      deactivated: statsWithStatus.filter(u => u.status === 'deactivated').length,
      officers: allForStats.filter(u => u.verificationStatus === 'verified').length,
      newThisMonth: allForStats.filter(u => {
        const created = new Date(u.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length
    };

    let filtered = (status && status !== 'all') ? withStatus.filter(u => u.status === status) : withStatus;
    if (req.query.isNew === 'true') {
      filtered = filtered.filter(u => {
        const created = new Date(u.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      });
    }
    const totalMembers = filtered.length;
    const totalPages = Math.ceil(totalMembers / limit) || 1;
    const pageMembers = filtered.slice(skip, skip + limit);

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
    const { email, adminPassword, fullName, phone, branch, position, newPassword } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
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
    if (phone !== undefined) updateData.phone = phone;
    if (branch !== undefined) updateData.branch = branch;
    if (position !== undefined) updateData.position = position;

    if (newPassword && newPassword.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

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

/* ================== UPDATE MEMBER RFID ================== */
router.post('/update-member-rfid', authenticateAdmin, async (req, res) => {
  try {
    const { email, rfidCardId } = req.body;

    if (!email || !rfidCardId) {
      return res.status(400).json({ success: false, message: 'Email and RFID Card ID are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if this card ID is already registered to someone else
    const owner = await users.findOne({ rfidCardId, email: { $ne: email } });
    if (owner) {
      return res.status(400).json({
        success: false,
        message: `This card is already linked to ${owner.fullName || owner.email}.`
      });
    }

    await users.updateOne({ email }, { $set: { rfidCardId, updatedAt: new Date() } });

    res.status(200).json({
      success: true,
      message: `Successfully linked RFID card to ${user.fullName || user.email}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update RFID card' });
  }
});


/* ================== DELETE MEMBER (PERMANENT) ================== */
router.delete('/delete-member-permanent', authenticateAdmin, async (req, res) => {
  try {
    const { email, adminPassword } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
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
    const { search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Aggregate member counts per branch
    const allUsers = await users.find({}).toArray();

    // Build branch map
    const branchMap = {};
    allUsers.forEach(u => {
      const b = (u.branch || '').trim();
      if (!b) return;
      if (!branchMap[b]) {
        branchMap[b] = { name: b, members: 0, address: u.branchAddress || '', pastor: u.branchPastor || '', status: 'Active', services: 0 };
      }
      branchMap[b].members++;
    });

    let branchList = Object.values(branchMap);

    // Search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      branchList = branchList.filter(b => b.name.toLowerCase().includes(q));
    }

    const totalCount = branchList.length;
    const paged = branchList.slice(skip, skip + limit);

    res.status(200).json({ success: true, branches: paged, totalCount });
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

/* ================== GET ALL ADMINS ================== */
router.get('/admins', authenticateAdmin, async (req, res) => {
  try {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Main Admin can view admin list' });
    }

    const { search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const allAdmins = await admins.find(query).sort({ createdAt: -1 }).toArray();
    const total = allAdmins.length;
    const paged = allAdmins.slice(skip, skip + limit);

    // Remove passwordHash from response
    const safe = paged.map(a => {
      const { passwordHash, ...rest } = a;
      return rest;
    });

    const stats = {
      total: await admins.countDocuments(),
      admins: await admins.countDocuments({ role: 'admin' }),
      loanAdmins: await admins.countDocuments({ role: 'loanAdmin' }),
      secretaryAdmins: await admins.countDocuments({ role: 'secretaryAdmin' }),
    };

    res.status(200).json({
      success: true,
      admins: safe,
      stats,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
});

/* ================== UPDATE ADMIN ROLE / PASSWORD ================== */
router.put('/update-admin', authenticateAdmin, async (req, res) => {
  try {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Main Admin can update accounts' });
    }

    const { email, role, newPassword, adminPassword } = req.body;
    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }
    if (!adminPassword) {
      return res.status(400).json({ success: false, message: 'Admin password is required' });
    }

    // Verify admin password
    const currentAdmin = await admins.findOne({ email: req.admin.email });
    const passwordMatch = await bcrypt.compare(adminPassword, currentAdmin.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, wrongPassword: true, message: 'Incorrect admin password' });
    }

    // Protect the seed super admin from being modified
    const superAdminEmail = process.env.ADMIN_EMAIL;
    if (email === superAdminEmail) {
      return res.status(403).json({ success: false, message: 'Cannot modify the Main Super Admin account' });
    }

    const validRoles = ['admin', 'loanAdmin', 'secretaryAdmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const target = await admins.findOne({ email });
    if (!target) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const updateFields = { role, updatedAt: new Date() };
    if (newPassword && newPassword.trim() !== '') {
      updateFields.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await admins.updateOne({ email }, { $set: updateFields });

    res.status(200).json({ success: true, message: `Account updated successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update admin' });
  }
});

/* ================== DELETE ADMIN ================== */
router.delete('/delete-admin', authenticateAdmin, async (req, res) => {
  try {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Main Admin can delete accounts' });
    }

    const { email, adminPassword } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!adminPassword) {
      return res.status(400).json({ success: false, message: 'Admin password is required' });
    }

    // Verify admin password
    const currentAdmin = await admins.findOne({ email: req.admin.email });
    const passwordMatch = await bcrypt.compare(adminPassword, currentAdmin.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, wrongPassword: true, message: 'Incorrect admin password' });
    }

    // Protect the seed super admin
    const superAdminEmail = process.env.ADMIN_EMAIL;
    if (email === superAdminEmail) {
      return res.status(403).json({ success: false, message: 'Cannot delete the Main Super Admin account' });
    }

    // Cannot delete yourself
    if (email === req.admin.email) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const result = await admins.deleteOne({ email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.status(200).json({ success: true, message: 'Admin account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete admin' });
  }
});

/* ================== ANNOUNCEMENTS - GET ALL ================== */
router.get('/announcements', async (req, res) => {
  try {
    const { branch, admin: isAdmin } = req.query;
    const query = {};

    // For user-facing requests, filter by branch visibility and expiration
    if (!isAdmin) {
      query.$and = [
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
      ];
    }

    const announcementsList = await announcements.find(query).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, announcements: announcementsList });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

/* ================== ANNOUNCEMENTS - CREATE (ADMIN) ================== */
router.post('/announcements', authenticateAdmin, async (req, res) => {
  try {
    const { title, body, category, eventDate, expiresAt, visibility, targetBranches, imageBase64, images, template } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }
    const doc = {
      title,
      body,
      category: category || 'General',
      eventDate: eventDate ? new Date(eventDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      visibility: visibility || 'all',
      targetBranches: Array.isArray(targetBranches) ? targetBranches : [],
      image: imageBase64 || (images && images.length > 0 ? images[0] : null), // Legacy support
      images: Array.isArray(images) ? images : (imageBase64 ? [imageBase64] : []),
      template: template || 'banner',
      createdBy: req.admin.email,
      createdAt: new Date(),
    };
    const result = await announcements.insertOne(doc);
    res.status(201).json({ success: true, message: 'Announcement created', id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

/* ================== ANNOUNCEMENTS - UPDATE (ADMIN) ================== */
router.put('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const { title, body, category, eventDate, expiresAt, visibility, targetBranches, imageBase64, images, template } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }
    const updateDoc = {
      title,
      body,
      category: category || 'General',
      eventDate: eventDate ? new Date(eventDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      visibility: visibility || 'all',
      targetBranches: Array.isArray(targetBranches) ? targetBranches : [],
      image: imageBase64 || (images && images.length > 0 ? images[0] : null), // Legacy support
      images: Array.isArray(images) ? images : (imageBase64 ? [imageBase64] : []),
      template: template || 'banner',
      updatedAt: new Date(),
      updatedBy: req.admin.email,
    };
    const result = await announcements.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.status(200).json({ success: true, message: 'Announcement updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});

/* ================== ANNOUNCEMENTS - DELETE (ADMIN) ================== */
router.delete('/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const result = await announcements.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
});

/* ================== SAVINGS TRANSACTIONS (ADMIN) ================== */
router.get('/savings/deposits', authenticateAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { type: { $in: ['deposit', 'withdrawal'] } };

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { memberName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const deposits = await savingsTransactions.find(query).sort({ date: -1 }).toArray();
    res.json({ success: true, deposits });
  } catch (err) {
    console.error('Failed to fetch savings transactions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch savings transactions' });
  }
});



/* ================== SAVINGS WITHDRAWALS (ADMIN) ================== */
router.get('/savings/withdrawals', authenticateAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { type: 'withdrawal' };

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { memberName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const withdrawals = await savingsTransactions.find(query).sort({ date: -1 }).toArray();
    res.json({ success: true, withdrawals });
  } catch (err) {
    console.error('Failed to fetch savings withdrawals:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch savings withdrawals' });
  }
});

router.put('/savings/withdrawals/:id/confirm', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;

    const txn = await savingsTransactions.findOne({ _id: new ObjectId(id) });
    if (!txn) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    if (txn.type !== 'withdrawal') return res.status(400).json({ success: false, message: 'Transaction is not a withdrawal' });
    if (txn.status === 'confirmed') return res.status(400).json({ success: false, message: 'Already confirmed' });

    // Update Transaction
    await savingsTransactions.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'confirmed', confirmedAt: new Date(), confirmedBy: req.admin.email } });

    // Update Goal - deduct saved amount
    const goal = await savingsGoals.findOne({ _id: txn.goalId });
    if (goal) {
      const newSaved = Math.max(0, (goal.savedAmount || 0) - txn.amount);
      const updates = { savedAmount: newSaved, updatedAt: new Date() };
      // If deducting brings it below target, mark as active again
      if (goal.status === 'completed' && newSaved < goal.targetAmount) {
        updates.status = 'active';
      }
      await savingsGoals.updateOne({ _id: txn.goalId }, { $set: updates });
    }

    res.json({ success: true, message: `Withdrawal of ₱${txn.amount.toLocaleString()} confirmed and deducted from savings.` });
  } catch (err) {
    console.error('Failed to confirm withdrawal:', err);
    res.status(500).json({ success: false, message: 'Failed to confirm withdrawal' });
  }
});

router.put('/savings/withdrawals/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;
    const { reason } = req.body;

    const txn = await savingsTransactions.findOne({ _id: new ObjectId(id) });
    if (!txn) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    if (txn.type !== 'withdrawal') return res.status(400).json({ success: false, message: 'Transaction is not a withdrawal' });
    if (txn.status === 'confirmed') return res.status(400).json({ success: false, message: 'Cannot reject confirmed withdrawal' });

    await savingsTransactions.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'rejected', rejectReason: reason || '', rejectedAt: new Date(), rejectedBy: req.admin.email } });

    res.json({ success: true, message: 'Withdrawal request rejected.' });
  } catch (err) {
    console.error('Failed to reject withdrawal:', err);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal' });
  }
});

/* ================== ADMIN - GET SAVINGS GOALS BY EMAIL ================== */
router.get('/user-savings-goals/:email', authenticateAdmin, async (req, res) => {
  try {
    const email = req.params.email;
    const goals = await savingsGoals.find({ email, status: { $ne: 'completed' } }).toArray();
    res.json({ success: true, goals });
  } catch (err) {
    console.error('Failed to fetch user goals:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user goals' });
  }
});

/* ================== ADMIN - PROCESS WALK-IN SAVINGS DEPOSIT ================== */
router.post('/process-savings-deposit', authenticateAdmin, async (req, res) => {
  try {
    const { email, goalId, amount, paymentMethod, referenceNumber } = req.body;
    if (!email || !goalId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Email, Goal ID, and positive amount are required' });
    }

    const { ObjectId } = await import('mongodb');
    const goal = await savingsGoals.findOne({ _id: new ObjectId(goalId), email });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    // Validate that amount doesn't exceed limit
    const currentSaved = goal.savedAmount || 0;
    const maxAllowed = Math.max(0, goal.targetAmount - currentSaved);
    if (amount > maxAllowed) {
      return res.status(400).json({ success: false, message: `Amount exceeds goal target. Maximum allowed deposit is ₱${maxAllowed.toLocaleString()}` });
    }

    const user = await users.findOne({ email });
    const dt = new Date();

    // 1. Create confirmed transaction
    const txn = {
      email,
      memberName: user?.fullName || 'Unknown Member',
      goalId: new ObjectId(goalId),
      goalName: goal.name,
      type: 'deposit',
      amount: Number(amount),
      description: 'Admin Walk-in Deposit',
      source: 'walk-in',
      paymentMethod: paymentMethod || 'cash',
      referenceNumber: referenceNumber || '',
      proofOfPayment: null,
      status: 'confirmed',
      confirmedAt: dt,
      confirmedBy: req.admin.email,
      date: dt,
    };
    await savingsTransactions.insertOne(txn);

    // 2. Update goal balance
    const newSaved = currentSaved + Number(amount);
    const updates = { savedAmount: newSaved, updatedAt: dt };
    if (newSaved >= goal.targetAmount) updates.status = 'completed';
    await savingsGoals.updateOne({ _id: new ObjectId(goalId) }, { $set: updates });

    res.json({ success: true, message: `Walk-in deposit of ₱${Number(amount).toLocaleString()} processed successfully.` });
  } catch (err) {
    console.error('Process walk-in deposit error:', err);
    res.status(500).json({ success: false, message: 'Failed to process walk-in deposit' });
  }
});

/* ================== ADMIN - PROCESS WALK-IN LOAN PAYMENT ================== */
router.post('/process-loan-payment', authenticateAdmin, async (req, res) => {
  try {
    const { loanId, amount, paymentMethod, referenceNumber } = req.body;
    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Loan ID and positive amount are required' });
    }

    const { ObjectId } = await import('mongodb');
    const loan = await loans.findOne({ _id: new ObjectId(loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.status !== 'active') return res.status(400).json({ success: false, message: 'Only active loans can receive payments' });

    const dt = new Date();

    // 1. Create confirmed payment record
    const payment = {
      loanId: loan.loanId,
      loanObjectId: loan._id,
      email: loan.email,
      memberName: loan.memberName,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'cash',
      referenceNumber: referenceNumber || '',
      proofData: null,
      proofFileName: null,
      status: 'confirmed',
      submittedAt: dt,
      confirmedAt: dt,
      confirmedBy: req.admin.email,
      monthNumber: (loan.paidMonths || 0) + 1,
    };
    await loanPayments.insertOne(payment);

    // 2. Update Loan balance
    const newPaidMonths = (loan.paidMonths || 0) + 1;
    const newBalance = Math.max(0, (loan.remainingBalance || loan.totalRepayment || loan.amount) - Number(amount));
    const isComplete = newPaidMonths >= (loan.termMonths || 12);

    const startDate = new Date(loan.disbursementDate || loan.approvedDate || loan.appliedDate);
    const nextDue = new Date(startDate);
    nextDue.setMonth(startDate.getMonth() + newPaidMonths + 1);

    await loans.updateOne(
      { _id: loan._id },
      {
        $set: {
          remainingBalance: newBalance,
          paidMonths: newPaidMonths,
          status: isComplete ? 'completed' : 'active',
          nextPaymentDate: nextDue,
          nextDueDate: nextDue
        }
      }
    );

    res.json({ success: true, message: `Walk-in payment of ₱${Number(amount).toLocaleString()} processed successfully.` });
  } catch (err) {
    console.error('Process walk-in payment error:', err);
    res.status(500).json({ success: false, message: 'Failed to process walk-in loan payment' });
  }
});
/* ================== ADMIN - CREATE NEW MEMBER DIRECTLY ================== */
router.post('/create-member', authenticateAdmin, async (req, res) => {
  try {
    const { email, password, fullName, phone, branch, position } = req.body;

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ success: false, message: 'Email, Default Password, Full Name, and Phone are required' });
    }

    // Check if user already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash the password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the active, verified user directly
    const newUser = {
      email,
      passwordHash,
      fullName,
      phone,
      branch: branch || 'Bulacan Main',
      position: position || 'member',
      gender: null,
      birthday: null,
      isVerified: true,
      verifiedAt: new Date(),
      createdAt: new Date(),
      failedLoginAttempts: 0,
      lockUntil: null,
      isPermanentlyLocked: false,
    };

    const result = await users.insertOne(newUser);

    // Just in case there is a leftover pending registration or OTP, clear it
    await import('../config/db.js').then(async ({ pendingRegistrations }) => {
      await pendingRegistrations.deleteOne({ email });
    }).catch(() => { });
    await otps.deleteMany({ email });

    res.status(201).json({
      success: true,
      message: 'Member registered successfully',
      user: { _id: result.insertedId, email, fullName, phone, branch, position }
    });
  } catch (err) {
    console.error('Create member error:', err);
    res.status(500).json({ success: false, message: 'Failed to create member' });
  }
});


/* ================== ADMIN - GET DSS ANALYSIS ================== */
router.get('/loans/:id/dss-analysis', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Loan ID' });
    }

    const loan = await loans.findOne({ _id: new ObjectId(id) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const user = await users.findOne({ email: loan.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // 1. Eligibility Check
    const officerPositions = [
      'Deacon', 'Local Evangelist', 'District Evangelist', 'National Evangelist',
      'Assistant Priest', 'Priest', 'Elder', 'District Elder',
      'Bishop', 'District Bishop', 'National Bishop', 'Apostle',
    ];
    const isOfficer = officerPositions.some(p => p.toLowerCase() === (user.position || '').trim().toLowerCase());
    const isVerified = user.verificationStatus === 'verified' || user.isVerified === true;

    // - Savings >= ₱1,000
    const userGoals = await savingsGoals.find({ email: loan.email }).toArray();
    const totalSavings = userGoals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);
    const savingsOk = totalSavings >= 1000;

    // - No overdue or unpaid loans (excluding current)
    const otherLoans = await loans.find({ email: loan.email, _id: { $ne: new ObjectId(id) } }).toArray();
    const hasOverdue = otherLoans.some(l => l.isLate === true);
    const unpaidLoans = otherLoans.filter(l => l.status === 'active' || l.remainingBalance > 0);

    // - Information is valid (Selfie + ID) -- Using the files metadata or path
    const infoValid = !!(loan.selfieData || loan.selfieFileName) && !!(loan.idData || loan.idFileName);

    // 2. Loan Capacity
    const LOAN_CONFIG = {
      'personal': { multiplier: 2, min: 5000 },
      'emergency': { multiplier: 1.5, min: 5000 },
      'short-term': { multiplier: 1, min: 5000 }
    };
    const config = LOAN_CONFIG[loan.loanType] || LOAN_CONFIG['personal'];
    const currentBalance = unpaidLoans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

    // Formula: Savings * Multiplier
    const maxLoanable = Math.max(0, totalSavings * config.multiplier);
    const requestedOk = loan.amount <= maxLoanable && loan.amount >= config.min;

    // 3. Risk Level
    const payments = await loanPayments.find({ email: loan.email, status: 'confirmed' }).toArray();
    const historyLate = payments.some(p => p.isLate);
    const currentlyLate = loan.isLate || hasOverdue;

    let riskTier = 'Low Risk';
    let riskColor = 'green';
    let riskLevel = 1;

    if (currentlyLate) {
      riskTier = 'High Risk';
      riskColor = 'red';
      riskLevel = 3;
    } else if (historyLate) {
      riskTier = 'Moderate Risk';
      riskColor = 'yellow';
      riskLevel = 2;
    }

    // 4. Recommendation
    const eligible = isOfficer && isVerified && savingsOk && !hasOverdue && infoValid && requestedOk;
    let recommendationText = "";

    if (eligible) {
      recommendationText = "Based on the member's savings and repayment history, this application appears eligible for approval.";
    } else if (!isOfficer || !isVerified) {
      recommendationText = "This application may be declined: Applicant is not a verified officer.";
    } else if (!savingsOk) {
      recommendationText = "This application may be declined: Insufficient savings (below ₱1,000).";
    } else if (hasOverdue) {
      recommendationText = "The system recommends closer review — this member has an active delinquency record.";
    } else if (!requestedOk) {
      if (loan.amount < config.min) {
        recommendationText = `Minimum loan amount is ₱${config.min.toLocaleString()}.`;
      } else {
        recommendationText = "Amount exceeds calculated loan capacity based on savings multiplier.";
      }
    } else {
      recommendationText = "The system recommends reviewing missing documentation or historical profile.";
    }

    res.json({
      success: true,
      analysis: {
        eligibility: {
          isOfficer: isOfficer && isVerified,
          savingsOk,
          noOverdue: !hasOverdue,
          infoValid
        },
        capacity: {
          totalSavings,
          multiplier: config.multiplier,
          currentBalance,
          maxLoanable,
          requestedOk,
          requestedAmount: loan.amount
        },
        risk: {
          tier: riskTier,
          color: riskColor,
          level: riskLevel,
          hasHistoryLate: historyLate
        },
        recommendation: recommendationText,
        isEligible: eligible
      }
    });

  } catch (err) {
    console.error('DSS Analysis Error:', err);
    res.status(500).json({ success: false, message: 'DSS Analysis failed' });
  }
});

/* ================== ADMIN - GET LOAN PAYMENTS ================== */
router.get('/loans/payments', authenticateAdmin, async (req, res) => {
  try {
    const { loanPayments, loans, users } = await import('../config/db.js');
    const { status, limit } = req.query;
    let query = {};
    if (status) query.status = status;
    
    const payments = await loanPayments.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 100)
      .toArray();

    const enriched = await Promise.all(payments.map(async p => {
        const user = await users.findOne({ email: p.email });
        const loan = await loans.findOne({ loanId: p.loanId });
        return {
            ...p,
            memberName: user ? user.fullName : 'Unknown',
            loanPurpose: loan ? loan.purpose : 'Unknown'
        };
    }));

    res.json({ success: true, payments: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch loan payments' });
  }
});

/* ================== SETTINGS (ADMIN) ================== */
router.get('/settings', authenticateAdmin, async (req, res) => {
  try {
    const { settings } = await import('../config/db.js');
    const config = await settings.findOne({ _id: 'global' });
    res.json({ success: true, settings: config });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

router.post('/settings', authenticateAdmin, async (req, res) => {
  try {
    const { settings } = await import('../config/db.js');
    const { paymentApprovalMethod } = req.body;
    await settings.updateOne(
      { _id: 'global' },
      { $set: { paymentApprovalMethod, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

/* ================== MANUAL APPROVAL - DONATIONS ================== */
router.put('/donations/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { donations } = await import('../config/db.js');
    const result = await donations.updateOne(
      { _id: new ObjectId(req.params.id), status: 'pending' },
      { $set: { status: 'confirmed', confirmedAt: new Date(), confirmedBy: req.admin.email } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Donation not found or not pending' });
    res.json({ success: true, message: 'Donation approved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve donation' });
  }
});

router.put('/donations/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { donations } = await import('../config/db.js');
    const { reason } = req.body;
    const result = await donations.updateOne(
      { _id: new ObjectId(req.params.id), status: 'pending' },
      { $set: { status: 'rejected', rejectReason: reason || 'Admin review', rejectedAt: new Date(), rejectedBy: req.admin.email } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Donation not found or not pending' });
    res.json({ success: true, message: 'Donation rejected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject donation' });
  }
});

/* ================== MANUAL APPROVAL - SAVINGS DEPOSITS ================== */
router.put('/savings/deposits/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { savingsTransactions, savingsGoals } = await import('../config/db.js');
    const txn = await savingsTransactions.findOne({ _id: new ObjectId(req.params.id), status: 'pending' });
    if (!txn) return res.status(404).json({ success: false, message: 'Deposit not found or not pending' });

    // Update Transaction
    await savingsTransactions.updateOne(
      { _id: txn._id },
      { $set: { status: 'confirmed', confirmedAt: new Date(), confirmedBy: req.admin.email } }
    );

    // Update Goal Balance
    const goal = await savingsGoals.findOne({ _id: txn.goalId });
    if (goal) {
      const newSaved = (goal.savedAmount || 0) + txn.amount;
      const updates = { savedAmount: newSaved, updatedAt: new Date() };
      if (newSaved >= goal.targetAmount) updates.status = 'completed';
      await savingsGoals.updateOne({ _id: txn.goalId }, { $set: updates });
    }
    res.json({ success: true, message: 'Deposit approved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve deposit' });
  }
});

router.put('/savings/deposits/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { savingsTransactions } = await import('../config/db.js');
    const { reason } = req.body;
    const result = await savingsTransactions.updateOne(
      { _id: new ObjectId(req.params.id), status: 'pending' },
      { $set: { status: 'rejected', rejectReason: reason || 'Admin review', rejectedAt: new Date(), rejectedBy: req.admin.email } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Deposit not found or not pending' });
    res.json({ success: true, message: 'Deposit rejected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject deposit' });
  }
});

/* ================== MANUAL APPROVAL - LOAN PAYMENTS ================== */
router.put('/loans/payments/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { loanPayments, loans } = await import('../config/db.js');
    const payment = await loanPayments.findOne({ _id: new ObjectId(req.params.id), status: 'pending' });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found or not pending' });

    await loanPayments.updateOne(
      { _id: payment._id },
      { $set: { status: 'confirmed', confirmedAt: new Date(), confirmedBy: req.admin.email } }
    );

    // Update Loan balance
    const loanObjectId = payment.loanObjectId ? new ObjectId(payment.loanObjectId) : payment.loanId; // fallback
    const loan = await loans.findOne({ _id: loanObjectId });
    if (loan) {
      const newPaidMonths = (loan.paidMonths || 0) + 1;
      const newBalance = Math.max(0, (loan.remainingBalance || loan.totalRepayment || loan.amount) - Number(payment.amount));
      const isComplete = newPaidMonths >= (loan.termMonths || 12);

      const startDate = new Date(loan.disbursementDate || loan.approvedDate || loan.appliedDate || new Date());
      const nextDue = new Date(startDate);
      nextDue.setMonth(startDate.getMonth() + newPaidMonths + 1);

      await loans.updateOne(
        { _id: loan._id },
        {
          $set: {
            remainingBalance: newBalance,
            paidMonths: newPaidMonths,
            status: isComplete ? 'completed' : 'active',
            nextPaymentDate: nextDue,
            nextDueDate: nextDue
          }
        }
      );
    }
    res.json({ success: true, message: 'Loan payment approved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve loan payment' });
  }
});

router.put('/loans/payments/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { ObjectId } = await import('mongodb');
    const { loanPayments } = await import('../config/db.js');
    const { reason } = req.body;
    const result = await loanPayments.updateOne(
      { _id: new ObjectId(req.params.id), status: 'pending' },
      { $set: { status: 'rejected', rejectReason: reason || 'Admin review', rejectedAt: new Date(), rejectedBy: req.admin.email } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Payment not found or not pending' });
    res.json({ success: true, message: 'Loan payment rejected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject loan payment' });
  }
});

export default router;

