import { Router } from 'express';
import { announcements } from '../config/db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

/* ================== GET UPCOMING ANNOUNCEMENTS/SERVICES ================== */
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    // Fetch announcements that are either scheduled for the future or categorized as 'service'
    const upcoming = await announcements.find({
      $or: [
        { type: 'service', date: { $gte: now.toISOString().split('T')[0] } },
        { type: 'announcement', status: 'active' }
      ]
    }).sort({ date: 1, createdAt: -1 }).limit(10).toArray();

    res.status(200).json({ success: true, announcements: upcoming });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

/* ================== ADMIN - CREATE ANNOUNCEMENT ================== */
router.post('/create', authenticateAdmin, async (req, res) => {
  try {
    const { title, message, type, date, branch } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const newAnnouncement = {
      title,
      message,
      type: type || 'announcement', // 'announcement' or 'service'
      date: date || new Date().toISOString().split('T')[0],
      branch: branch || 'All Branches',
      status: 'active',
      createdAt: new Date()
    };

    await announcements.insertOne(newAnnouncement);
    res.status(201).json({ success: true, message: 'Announcement created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

export default router;
