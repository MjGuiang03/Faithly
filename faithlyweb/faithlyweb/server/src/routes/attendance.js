import { Router } from 'express';

import { users, attendance } from '../config/db.js';
import { authenticateUser } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

/* ================== USER - CHECK IN ================== */
router.post('/attendance/checkin', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { service, branch, method } = req.body;

    if (!service || !branch) {
      return res.status(400).json({ success: false, message: 'Service and branch are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const count    = await attendance.countDocuments();
    const recordId = `A-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const now      = new Date();

    const newRecord = {
      recordId, email, member: user.fullName, service, branch,
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
router.get('/attendance/my-attendance', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const userAttendance = await attendance.find({ email }).sort({ createdAt: -1 }).toArray();

    const now = new Date();
    const thisMonth = userAttendance.filter(a =>
      new Date(a.createdAt).getMonth() === now.getMonth() &&
      new Date(a.createdAt).getFullYear() === now.getFullYear()
    );

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
router.get('/admin/attendance', authenticateAdmin, async (req, res) => {
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
    allAttendance.forEach(a => { serviceMap[a.service] = (serviceMap[a.service] || 0) + 1; });

    const serviceValues = Object.values(serviceMap);
    const avgPerService = serviceValues.length > 0
      ? Math.round(serviceValues.reduce((s, v) => s + v, 0) / serviceValues.length)
      : 0;

    const branchMap = {};
    allAttendance.forEach(a => { branchMap[a.branch] = (branchMap[a.branch] || 0) + 1; });
    const topBranch = Object.entries(branchMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    res.status(200).json({
      success: true,
      attendance: allAttendance,
      stats: { total: allAttendance.length, thisWeek: thisWeek.length, avgPerService, topBranch },
      byService: Object.entries(serviceMap).map(([service, count]) => ({ service, count })),
      byBranch:  Object.entries(branchMap).map(([branch, count]) => ({ branch, count }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

export default router;