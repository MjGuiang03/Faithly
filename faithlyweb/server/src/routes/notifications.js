import { Router } from 'express';
import { users, donations, attendance } from '../config/db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

/* ================== GET ALL NOTIFICATIONS ================== */
// Builds a unified notification feed from donations, members, attendance
router.get('/notifications', authenticateAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit) || 100);

    // Fetch recent events in parallel
    const [recentDonations, recentMembers, recentAttendance] = await Promise.all([
      donations.find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
      users.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(limit).toArray(),
      attendance.find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
    ]);

    const notifications = [];

    // Donations → notification
    recentDonations.forEach(d => {
      notifications.push({
        id:        `donation-${d._id}`,
        type:      'donation',
        title:     'Donation received',
        message:   `${d.member} donated ₱${Number(d.amount).toLocaleString()} to ${d.category}.`,
        timestamp: d.createdAt || d.date,
        isRead:    false,
        meta: {
          donationId: d.donationId,
          member:     d.member,
          amount:     d.amount,
          category:   d.category,
          method:     d.method,
        }
      });
    });

    // Members → notification (new registrations)
    recentMembers.forEach(m => {
      notifications.push({
        id:        `member-${m._id}`,
        type:      'member',
        title:     'New member registered',
        message:   `${m.fullName} has been successfully registered as a new member.`,
        timestamp: m.createdAt,
        isRead:    false,
        meta: {
          memberId: m.memberId,
          name:     m.fullName,
          branch:   m.branch,
          position: m.position,
        }
      });
    });

    // Attendance → notification
    recentAttendance.forEach(a => {
      notifications.push({
        id:        `attendance-${a._id}`,
        type:      'attendance',
        title:     'Attendance check-in recorded',
        message:   `${a.member} checked in to ${a.service} at ${a.branch}.`,
        timestamp: a.createdAt,
        isRead:    false,
        meta: {
          recordId: a.recordId,
          member:   a.member,
          service:  a.service,
          branch:   a.branch,
          method:   a.method,
        }
      });
    });

    // Sort all by most recent
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      notifications,
      total: notifications.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

export default router;