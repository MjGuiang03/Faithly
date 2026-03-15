import { Router } from 'express';

import { users, donations } from '../config/db.js';
import { authenticateUser } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

/* ================== USER - MAKE A DONATION ================== */
router.post('/donations', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { amount, category, paymentMethod, isRecurring } = req.body;

    if (!amount || !category) {
      return res.status(400).json({ success: false, message: 'Amount and category are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const count      = await donations.countDocuments();
    const donationId = `D-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newDonation = {
      donationId, email, member: user.fullName,
      amount: Number(amount), category,
      method: paymentMethod || 'Credit Card',
      type: isRecurring ? 'Recurring' : 'One-time',
      date: new Date(), createdAt: new Date()
    };

    await donations.insertOne(newDonation);
    res.status(201).json({ success: true, message: 'Donation recorded successfully', donationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record donation' });
  }
});

/* ================== USER - GET MY DONATIONS ================== */
router.get('/donations/my-donations', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip  = (page - 1) * limit;

    const findQuery = { email };
    const totalCount = await donations.countDocuments(findQuery);
    const userDonations = await donations.find(findQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Stats need full set or aggregation
    const allUserDonations = await donations.find(findQuery).toArray();
    const totalDonated = allUserDonations.reduce((sum, d) => sum + d.amount, 0);
    const now = new Date();
    const thisYearTotal = allUserDonations
      .filter(d => new Date(d.createdAt).getFullYear() === now.getFullYear())
      .reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({
      success: true,
      donations: userDonations,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      stats: { totalDonated, thisYearTotal, totalCount: allUserDonations.length }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
});

/* ================== ADMIN - GET ALL DONATIONS ================== */
router.get('/admin/donations', authenticateAdmin, async (req, res) => {
  try {
    const { search, status } = req.query;
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
      if (!categoryMap[d.category]) categoryMap[d.category] = { name: d.category, amount: 0, count: 0 };
      categoryMap[d.category].amount += d.amount;
      categoryMap[d.category].count  += 1;
    });

    res.status(200).json({
      success: true,
      donations: allDonations,
      stats,
      categories: Object.values(categoryMap)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch donations' });
  }
});

export default router;