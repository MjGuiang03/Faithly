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
      appliedDate: new Date(), updatedAt: new Date(),
      statusHistory: [{ status: 'pending', date: new Date() }]
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
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Default to "all" if limit not provided
    const skip  = (page - 1) * limit;

    const findQuery = { email };
    const totalCount = await loans.countDocuments(findQuery);
    const userLoans = await loans.find(findQuery)
      .sort({ appliedDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Stats still need all loans to calculate totals accurately
    const allUserLoans = await loans.find(findQuery).toArray();
    const totalBorrowed    = allUserLoans
      .filter(l => l.disbursed || l.status === 'completed')
      .reduce((sum, l) => sum + l.amount, 0);
    const activeLoans      = allUserLoans.filter(l => l.status === 'active');
    const remainingBalance = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || l.amount), 0);

    res.status(200).json({
      success: true,
      loans: userLoans,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
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

    // Count loans applied this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalThisMonth = await loans.countDocuments({ appliedDate: { $gte: monthStart } });

    const stats = {
      pending:        await loans.countDocuments({ status: 'pending' }),
      active:         await loans.countDocuments({ status: 'active' }),
      completed:      await loans.countDocuments({ status: 'completed' }),
      rejected:       await loans.countDocuments({ status: 'rejected' }),
      totalThisMonth,
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
      { 
        $set: { status: 'active', approvedDate: new Date(), updatedAt: new Date() },
        $push: { statusHistory: { status: 'approved', date: new Date() } }
      }
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
    const { rejectionReason } = req.body;
    const loan = await loans.findOne({ _id: new ObjectId(id) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending loans can be rejected' });
    }

    await loans.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { status: 'rejected', rejectionReason: rejectionReason || '', rejectedDate: new Date(), updatedAt: new Date() },
        $push: { statusHistory: { status: 'rejected', date: new Date(), reason: rejectionReason || '' } }
      }
    );

    res.status(200).json({ success: true, message: 'Loan rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to reject loan' });
  }
});

/* ================== ADMIN - PROCESS LOAN DISBURSEMENT ================== */
router.put('/admin/loans/:id/process', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Payment method is required' });
    }

    const loan = await loans.findOne({ _id: new ObjectId(id) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Ensure the loan is approved/active and hasn't already been disbursed
    if (loan.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active loans can be processed' });
    }
    if (loan.disbursed) {
      return res.status(400).json({ success: false, message: 'This loan has already been disbursed' });
    }

    await loans.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          disbursed: true, 
          disbursementDate: new Date(), 
          paymentMethod, 
          updatedAt: new Date() 
        },
        $push: { statusHistory: { status: 'processed', date: new Date() } }
      }
    );

    res.status(200).json({ success: true, message: 'Loan disbursed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process loan disbursement' });
  }
});

export default router;