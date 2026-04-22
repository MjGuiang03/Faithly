import { Router } from 'express';
import { ObjectId } from 'mongodb';

import { users, savingsGoals, savingsTransactions, loans } from '../config/db.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

/* ================== GET SAVINGS OVERVIEW (Unified) ================== */
router.get('/savings/overview', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { txnLimit = 5 } = req.query;

    // 1. Fetch Goals
    const goals = await savingsGoals.find({ email }).sort({ createdAt: -1 }).toArray();
    const totalSavings = goals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);

    // 2. This month's deposits
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthDeposits = await savingsTransactions.aggregate([
      { $match: { email, type: 'deposit', status: 'confirmed', date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray();
    const thisMonth = monthDeposits[0]?.total || 0;

    // 3. Active Loans (for max loanable calculation)
    const activeLoans = await loans.find({ email, status: 'active' }).toArray();
    const existingBalance = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || l.amount || 0), 0);
    const maxLoanable = Math.max(0, totalSavings * 2 - existingBalance);

    // 4. Recent Transactions
    const transactions = await savingsTransactions
      .find({ email })
      .sort({ date: -1 })
      .limit(parseInt(txnLimit))
      .toArray();
    
    const txnTotal = await savingsTransactions.countDocuments({ email });

    res.json({
      success: true,
      stats: {
        totalSavings,
        thisMonth,
        activeGoals: goals.filter(g => g.status !== 'completed').length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
        maxLoanable
      },
      goals,
      transactions,
      txnTotal
    });
  } catch (err) {
    console.error('Savings overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch savings overview' });
  }
});

/* ================== GET SAVINGS STATS ================== */
router.get('/savings/stats', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;

    // All goals
    const goals = await savingsGoals.find({ email }).toArray();
    const totalSavings = goals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);

    // This month's deposits
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthDeposits = await savingsTransactions.aggregate([
      { $match: { email, type: 'deposit', status: 'confirmed', date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray();
    const thisMonth = monthDeposits[0]?.total || 0;

    const activeGoals = goals.filter(g => g.status !== 'completed').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;

    // Pending savings calculation
    const pendingDeposits = await savingsTransactions.aggregate([
      { $match: { email, type: 'deposit', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray();
    const pendingSavings = pendingDeposits[0]?.total || 0;

    // Max loanable (2x savings)
    const activeLoans = await loans.find({ email, status: 'active' }).toArray();
    const existingBalance = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || l.amount || 0), 0);
    const maxLoanable = Math.max(0, totalSavings * 2 - existingBalance);

    res.json({
      success: true,
      stats: { totalSavings, pendingSavings, thisMonth, activeGoals, completedGoals, maxLoanable },
    });
  } catch (err) {
    console.error('Savings stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch savings stats' });
  }
});

/* ================== GET SAVINGS GOALS ================== */
router.get('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const goals = await savingsGoals.find({ email }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, goals });
  } catch (err) {
    console.error('Savings goals error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch savings goals' });
  }
});

/* ================== CREATE SAVINGS GOAL ================== */
router.post('/savings/goals', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { name, targetAmount, monthlyContribution, targetDate, color, iconType } = req.body;

    if (!name || !targetAmount) {
      return res.status(400).json({ success: false, message: 'Name and target amount are required' });
    }

    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const goal = {
      email,
      memberName: user.fullName,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      monthlyContribution: Number(monthlyContribution) || 0,
      targetDate: targetDate ? new Date(targetDate) : null,
      color: color || 'blue',
      iconType: iconType || 'default',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await savingsGoals.insertOne(goal);
    res.status(201).json({ success: true, message: 'Goal created', goalId: result.insertedId });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
});

/* ================== UPDATE SAVINGS GOAL ================== */
router.put('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { id } = req.params;
    const { name, targetAmount, monthlyContribution, targetDate, color, iconType } = req.body;

    const goal = await savingsGoals.findOne({ _id: new ObjectId(id), email });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (targetAmount !== undefined) updates.targetAmount = Number(targetAmount);
    if (monthlyContribution !== undefined) updates.monthlyContribution = Number(monthlyContribution);
    if (targetDate !== undefined) updates.targetDate = targetDate ? new Date(targetDate) : null;
    if (color !== undefined) updates.color = color;
    if (iconType !== undefined) updates.iconType = iconType;
    updates.updatedAt = new Date();

    // Check if goal is now completed
    const saved = goal.savedAmount || 0;
    if (updates.targetAmount && saved >= updates.targetAmount) {
      updates.status = 'completed';
    }

    await savingsGoals.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.json({ success: true, message: 'Goal updated' });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
});

/* ================== DELETE SAVINGS GOAL ================== */
router.delete('/savings/goals/:id', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { id } = req.params;

    const result = await savingsGoals.deleteOne({ _id: new ObjectId(id), email });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
});

/* ================== DEPOSIT TO SAVINGS ================== */
router.post('/savings/deposit', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { goalId, amount, description, source, paymentMethod, referenceNumber, proofOfPayment } = req.body;

    if (!goalId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Goal and a positive amount are required' });
    }

    const goal = await savingsGoals.findOne({ _id: new ObjectId(goalId), email });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const depositAmount = Number(amount);

    // Fetch user to get memberName for the admin views
    const user = await users.findOne({ email });

    // Create transaction record
    const txn = {
      email,
      memberName: user?.fullName || 'Unknown Member',
      goalId: new ObjectId(goalId),
      goalName: goal.name,
      type: 'deposit',
      amount: depositAmount,
      description: description || 'Deposit',
      source: source || 'Manual',
      paymentMethod: paymentMethod || 'cash',
      referenceNumber: referenceNumber || '',
      proofOfPayment: proofOfPayment || null,
      status: 'pending',
      date: new Date(),
    };
    await savingsTransactions.insertOne(txn);

    res.json({
      success: true,
      message: `₱${depositAmount.toLocaleString()} deposit submitted for ${goal.name} (Pending Admin Approval)`,
      newSavedAmount: goal.savedAmount || 0,
    });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ success: false, message: 'Failed to process deposit' });
  }
});

/* ================== WITHDRAW FROM SAVINGS ================== */
router.post('/savings/withdraw', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { goalId, amount, reason } = req.body;

    if (!goalId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Goal and a positive amount are required' });
    }

    const goal = await savingsGoals.findOne({ _id: new ObjectId(goalId), email });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const withdrawAmount = Number(amount);

    if ((goal.savedAmount || 0) < withdrawAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient savings balance for this withdrawal' });
    }

    const user = await users.findOne({ email });

    // Create withdrawal transaction (pending admin approval)
    const txn = {
      email,
      memberName: user?.fullName || 'Unknown Member',
      goalId: new ObjectId(goalId),
      goalName: goal.name,
      type: 'withdrawal',
      amount: withdrawAmount,
      description: reason || 'Withdrawal request',
      source: 'Manual',
      status: 'pending',
      date: new Date(),
    };
    await savingsTransactions.insertOne(txn);

    res.json({
      success: true,
      message: `₱${withdrawAmount.toLocaleString()} withdrawal request submitted for ${goal.name} (Pending Admin Approval)`,
    });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ success: false, message: 'Failed to process withdrawal' });
  }
});

/* ================== GET SAVINGS TRANSACTIONS ================== */
router.get('/savings/transactions', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { page = 1, limit = 10, goalId } = req.query;
    const p = parseInt(page);
    const l = parseInt(limit);
    const skip = (p - 1) * l;

    const query = { email };
    if (goalId && ObjectId.isValid(goalId)) {
      query.goalId = new ObjectId(goalId);
    }

    const totalCount = await savingsTransactions.countDocuments(query);
    const transactions = await savingsTransactions
      .find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(l)
      .toArray();

    res.json({ success: true, transactions, totalCount, currentPage: p });
  } catch (err) {
    console.error('Savings transactions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

/* ================== TRANSFER BETWEEN GOALS ================== */
router.post('/savings/transfer', authenticateUser, async (req, res) => {
  try {
    const email = req.user.email;
    const { fromGoalId, toGoalId, amount, note } = req.body;

    if (!fromGoalId || !toGoalId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Source, destination, and a positive amount are required' });
    }
    if (fromGoalId === toGoalId) {
      return res.status(400).json({ success: false, message: 'Source and destination must be different goals' });
    }

    const fromGoal = await savingsGoals.findOne({ _id: new ObjectId(fromGoalId), email });
    const toGoal = await savingsGoals.findOne({ _id: new ObjectId(toGoalId), email });

    if (!fromGoal) return res.status(404).json({ success: false, message: 'Source goal not found' });
    if (!toGoal) return res.status(404).json({ success: false, message: 'Destination goal not found' });

    const transferAmount = Number(amount);
    if ((fromGoal.savedAmount || 0) < transferAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance in source goal' });
    }

    // Deduct from source
    const fromNewSaved = (fromGoal.savedAmount || 0) - transferAmount;
    const fromUpdates = { savedAmount: fromNewSaved, updatedAt: new Date() };
    if (fromGoal.status === 'completed' && fromNewSaved < fromGoal.targetAmount) {
      fromUpdates.status = 'active';
    }
    await savingsGoals.updateOne({ _id: new ObjectId(fromGoalId) }, { $set: fromUpdates });

    // Add to destination
    const toNewSaved = (toGoal.savedAmount || 0) + transferAmount;
    const toUpdates = { savedAmount: toNewSaved, updatedAt: new Date() };
    if (toNewSaved >= toGoal.targetAmount) toUpdates.status = 'completed';
    await savingsGoals.updateOne({ _id: new ObjectId(toGoalId) }, { $set: toUpdates });

    // Create two transaction records
    const now = new Date();
    const desc = note || `Transfer from ${fromGoal.name} to ${toGoal.name}`;
    await savingsTransactions.insertMany([
      {
        email, goalId: new ObjectId(fromGoalId), goalName: fromGoal.name,
        type: 'withdrawal', amount: transferAmount,
        description: desc, source: 'Transfer', date: now,
      },
      {
        email, goalId: new ObjectId(toGoalId), goalName: toGoal.name,
        type: 'deposit', amount: transferAmount,
        description: desc, source: 'Transfer', date: now,
      },
    ]);

    res.json({
      success: true,
      message: `₱${transferAmount.toLocaleString()} transferred from ${fromGoal.name} to ${toGoal.name}`,
    });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ success: false, message: 'Failed to process transfer' });
  }
});

export default router;
