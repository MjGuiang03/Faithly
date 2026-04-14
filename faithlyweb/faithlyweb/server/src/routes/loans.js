import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { users, loans } from '../config/db.js';
import { authenticateUser } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

/* ================== USER - APPLY FOR LOAN ================== */
router.post('/loans/apply', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { amount, purpose, termMonths } = req.body;

    if (!amount || !purpose) {
      return res.status(400).json({ success: false, message: 'Amount and purpose are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const count  = await loans.countDocuments();
    const loanId = `LN-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newLoan = {
      loanId, email, memberName: user.fullName, amount: Number(amount),
      purpose, termMonths: termMonths || 12, status: 'pending',
      appliedDate: new Date(), updatedAt: new Date()
    };

    await loans.insertOne(newLoan);
    res.status(201).json({ success: true, message: 'Loan application submitted', loanId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to apply for loan' });
  }
});

/* ================== USER - GET MY LOANS ================== */
router.get('/loans/my-loans', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const userLoans = await loans.find({ email }).sort({ appliedDate: -1 }).toArray();

    const totalBorrowed    = userLoans.reduce((sum, l) => sum + l.amount, 0);
    const activeLoans      = userLoans.filter(l => l.status === 'active');
    const remainingBalance = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || l.amount), 0);

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
router.get('/admin/loans', authenticateAdmin, async (req, res) => {
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
      pending:        await loans.countDocuments({ status: 'pending' }),
      active:         await loans.countDocuments({ status: 'active' }),
      completed:      await loans.countDocuments({ status: 'completed' }),
      totalDisbursed: totalDisbursedResult[0]?.total || 0
    };

    res.status(200).json({ success: true, loans: allLoans, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
});

/* ================== ADMIN - APPROVE LOAN ================== */
router.put('/admin/loans/:id/approve', authenticateAdmin, async (req, res) => {
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
router.put('/admin/loans/:id/reject', authenticateAdmin, async (req, res) => {
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

export default router;