import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { users, donations } from '../config/db.js';
import { authenticateUser, authenticateAdmin } from '../middleware/auth.js';

const router = Router();

/* ================== USER - MAKE A DONATION ================== */
router.post('/donations', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { amount, category, paymentMethod, isRecurring, proofImage } = req.body;

    if (!amount || !category || !proofImage) {
      return res.status(400).json({ success: false, message: 'Amount, category, and proof of payment are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const count      = await donations.countDocuments();
    const donationId = `D-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newDonation = {
      donationId,
      email,
      member: user.fullName,
      amount: Number(amount),
      category,
      method: paymentMethod || 'GCash',
      type: isRecurring ? 'Recurring' : 'One-time',
      status: 'pending',          // requires admin confirmation
      proofImage: proofImage || null,
      date: new Date(),
      createdAt: new Date(),
    };

    await donations.insertOne(newDonation);
    res.status(201).json({ success: true, message: 'Donation submitted and pending confirmation', donationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
});

/* ================== USER - GET MY DONATIONS ================== */
router.get('/donations/my-donations', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { category } = req.query;
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const findQuery = { email };
    if (category) findQuery.category = category;
    if (req.query.paymentMethod) findQuery.method = req.query.paymentMethod;

    const totalCount    = await donations.countDocuments(findQuery);
    const userDonations = await donations.find(findQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Stats: only count confirmed donations in totalDonated
    const allUserDonations = await donations.find(findQuery).toArray();
    const totalDonated = allUserDonations
      .filter(d => d.status === 'confirmed')
      .reduce((sum, d) => sum + d.amount, 0);

    const now = new Date();
    const confirmedDonations = allUserDonations.filter(d => d.status === 'confirmed');
    const thisYearTotal = confirmedDonations
      .filter(d => new Date(d.createdAt).getFullYear() === now.getFullYear())
      .reduce((sum, d) => sum + d.amount, 0);

    const categoryBreakdown = {};
    allUserDonations.forEach(d => {
      const cat = d.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(d.amount) || 0);
    });

    res.status(200).json({
      success: true,
      donations: userDonations,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      stats: { totalDonated, thisYearTotal, totalCount: confirmedDonations.length, categoryBreakdown }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
});

/* ================== ADMIN - GET ALL DONATIONS ================== */
router.get('/admin/donations', authenticateAdmin, async (req, res) => {
  try {
    const { search, status, page: qPage, limit: qLimit } = req.query;
    const page  = parseInt(qPage)  || 1;
    const limit = parseInt(qLimit) || 10;
    const skip  = (page - 1) * limit;

    const query = {};
    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = { $ne: 'rejected' };
      } else {
        query.status = status; // 'pending' | 'confirmed' | 'rejected'
      }
    }

    if (search) {
      query.$or = [
        { member:     { $regex: search, $options: 'i' } },
        { donationId: { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } }
      ];
    }

    const totalCount   = await donations.countDocuments(query);
    const allDonations = await donations.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Stats from ALL confirmed donations (for totals)
    const allForStats = await donations.find({}).toArray();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfWeek  = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const confirmedAll = allForStats.filter(d => d.status === 'confirmed');
    const thisMonthDons = confirmedAll.filter(d => new Date(d.createdAt) >= startOfMonth);
    const lastMonthDons = confirmedAll.filter(d => {
      const dDate = new Date(d.createdAt);
      return dDate >= startOfLastMonth && dDate <= endOfLastMonth;
    });
    const thisWeekDons  = confirmedAll.filter(d => new Date(d.createdAt) >= startOfWeek);

    const thisMonth   = thisMonthDons.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const lastMonth   = lastMonthDons.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const thisWeek    = thisWeekDons.reduce((s, d) => s + (Number(d.amount) || 0), 0);

    let percentageChange = 0;
    if (lastMonth === 0) {
      percentageChange = thisMonth > 0 ? 100 : 0;
    } else {
      percentageChange = ((thisMonth - lastMonth) / lastMonth) * 100;
    }
    const formattedPercentage = (percentageChange > 0 ? '+' : '') + Math.round(percentageChange) + '%';
    const totalAmount = confirmedAll.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const uniqueEmails = new Set(confirmedAll.map(d => d.email)).size;
    const avgDonation  = confirmedAll.length > 0 ? Math.round(totalAmount / confirmedAll.length) : 0;
    const pendingCount = allForStats.filter(d => !d.status || d.status === 'pending').length;
    const rejectedCount = allForStats.filter(d => d.status === 'rejected').length;

    const stats = {
      totalCount: confirmedAll.length,
      total: totalAmount,
      thisMonth,
      thisWeek,
      percentageChange: formattedPercentage,
      totalDonors: uniqueEmails,
      avgDonation,
      pendingCount,
      rejectedCount,
    };

    res.status(200).json({
      success: true,
      donations: allDonations,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
});

/* ================== ADMIN - CONFIRM DONATION ================== */
router.put('/admin/donations/:id/confirm', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await donations.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'confirmed', confirmedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    res.status(200).json({ success: true, message: 'Donation confirmed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to confirm donation' });
  }
});

/* ================== ADMIN - REJECT DONATION ================== */
router.put('/admin/donations/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await donations.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'rejected', rejectReason: reason || '', rejectedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    res.status(200).json({ success: true, message: 'Donation rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to reject donation' });
  }
});

export default router;