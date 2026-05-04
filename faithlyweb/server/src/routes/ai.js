import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { users, loans, donations, savingsGoals, savingsTransactions, attendance, loanPayments, settings, reportCache } from '../config/db.js';
import { callGemini } from '../utils/gemini.js';

const router = Router();

/* ================== AI INSIGHTS — ADMIN DASHBOARD ================== */
router.get('/ai-insights', authenticateAdmin, async (req, res) => {
  try {
    // Check cache first (6-hour TTL)
    const cached = await settings.findOne({ _id: 'ai_insights_cache' });
    if (cached && cached.generatedAt) {
      const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
      if (ageMs < 6 * 60 * 60 * 1000 && !req.query.refresh) {
        return res.json({ success: true, insights: cached.insights, cached: true, generatedAt: cached.generatedAt });
      }
    }

    // Aggregate metrics
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [allMembers, allDonations, allAttendance] = await Promise.all([
      users.find({ isDeleted: { $ne: true } }).toArray(),
      donations.find({ status: 'confirmed' }).toArray(),
      attendance.find({}).toArray(),
    ]);

    // Members
    const activeMembers = allMembers.filter(m => {
      const s = (m.status || '').toLowerCase();
      return s === 'active' || s === 'verified';
    });
    const newThisMonth = activeMembers.filter(m => new Date(m.createdAt) >= thisMonthStart).length;
    const newLastMonth = activeMembers.filter(m => new Date(m.createdAt) >= lastMonthStart && new Date(m.createdAt) <= lastMonthEnd).length;

    // Branch distribution
    const branchCounts = {};
    activeMembers.forEach(m => {
      const b = m.branch || 'Unknown';
      branchCounts[b] = (branchCounts[b] || 0) + 1;
    });

    // Donations
    const donationsThisMonth = allDonations.filter(d => new Date(d.createdAt || d.date) >= thisMonthStart);
    const donationsLastMonth = allDonations.filter(d => {
      const dt = new Date(d.createdAt || d.date);
      return dt >= lastMonthStart && dt <= lastMonthEnd;
    });
    const totalDonThisMonth = donationsThisMonth.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalDonLastMonth = donationsLastMonth.reduce((s, d) => s + (Number(d.amount) || 0), 0);

    // Category breakdown
    const catTotals = {};
    allDonations.forEach(d => {
      const cat = d.category || 'General Fund';
      catTotals[cat] = (catTotals[cat] || 0) + (Number(d.amount) || 0);
    });

    // Attendance this month vs last
    const attThisMonth = allAttendance.filter(a => new Date(a.date || a.createdAt) >= thisMonthStart);
    const attLastMonth = allAttendance.filter(a => {
      const dt = new Date(a.date || a.createdAt);
      return dt >= lastMonthStart && dt <= lastMonthEnd;
    });

    const metricsText = `
Church Management Data Summary (as of ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}):

MEMBERS:
- Total active members: ${activeMembers.length}
- New this month: ${newThisMonth}
- New last month: ${newLastMonth}
- Branch distribution: ${Object.entries(branchCounts).map(([b, c]) => `${b}: ${c}`).join(', ')}

DONATIONS:
- This month total: ₱${totalDonThisMonth.toLocaleString()}
- Last month total: ₱${totalDonLastMonth.toLocaleString()}
- Month-over-month change: ${totalDonLastMonth > 0 ? ((totalDonThisMonth - totalDonLastMonth) / totalDonLastMonth * 100).toFixed(1) : 'N/A'}%
- By category: ${Object.entries(catTotals).map(([c, v]) => `${c}: ₱${v.toLocaleString()}`).join(', ')}

ATTENDANCE:
- Records this month: ${attThisMonth.length}
- Records last month: ${attLastMonth.length}
`;

    const systemPrompt = `You are a church management analytics advisor for the Philippine United Apostolic Church (PUAC).
Given the following operational data, provide exactly 5 insights as a JSON array of objects.
Each object must have: "icon" (a single icon/emoji), "title" (short 5-8 word title), "detail" (1-2 sentence actionable insight with specific numbers).
Focus on: trends, anomalies, actionable recommendations, and comparisons.
Respond ONLY with the JSON array, no markdown fences, no other text.`;

    const aiText = await callGemini(systemPrompt, metricsText, { maxTokens: 800, temperature: 0.6, responseMimeType: 'application/json' });

    let insights = [];
    if (aiText) {
      try {
        // Clean up response — remove markdown fences if present
        const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        insights = JSON.parse(cleaned);
      } catch (e) {
        console.error('[AI Insights] Failed to parse AI response:', e.message);
        // Fallback static insights
        insights = [
          { icon: '📊', title: 'Data Analysis Unavailable', detail: 'AI insights could not be generated at this time. Please try refreshing.' }
        ];
      }
    } else {
      insights = [
        { icon: '📊', title: 'AI Service Temporarily Unavailable', detail: 'The AI insights service is currently unavailable. Your dashboard data is still accurate and up-to-date.' }
      ];
    }

    // Cache the results
    await settings.updateOne(
      { _id: 'ai_insights_cache' },
      { $set: { insights, generatedAt: new Date() } },
      { upsert: true }
    );

    res.json({ success: true, insights, cached: false, generatedAt: new Date() });
  } catch (err) {
    console.error('[AI Insights Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to generate insights' });
  }
});


/* ================== FINANCIAL REPORT — ADMIN ================== */
router.get('/financial-report', authenticateAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const reportYear = parseInt(year) || new Date().getFullYear();
    const reportMonth = month !== undefined && month !== '' ? parseInt(month) : null;

    // Role-based access
    const role = req.admin.role;

    // Date range
    let startDate, endDate, periodLabel;
    if (reportMonth !== null) {
      startDate = new Date(reportYear, reportMonth, 1);
      endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);
      periodLabel = `${startDate.toLocaleDateString('en-US', { month: 'long' })} ${reportYear}`;
    } else {
      startDate = new Date(reportYear, 0, 1);
      endDate = new Date(reportYear, 11, 31, 23, 59, 59);
      periodLabel = `Full Year ${reportYear}`;
    }

    const dateFilter = { $gte: startDate, $lte: endDate };

    const report = { period: periodLabel, startDate, endDate, generatedAt: new Date(), generatedBy: req.admin.email };

    // === Donations (Super Admin) ===
    if (role === 'admin') {
      const periodDonations = await donations.find({ status: 'confirmed', $or: [{ createdAt: dateFilter }, { date: dateFilter }] }).toArray();

      const donByCategory = {};
      const donByMonth = {};
      const donByBranch = {};
      let donTotal = 0;

      const allMembersMap = {};
      const allMembers = await users.find({}).toArray();
      allMembers.forEach(m => { allMembersMap[m.email] = m; });

      periodDonations.forEach(d => {
        const amt = Number(d.amount) || 0;
        donTotal += amt;

        const cat = d.category || 'General Fund';
        donByCategory[cat] = (donByCategory[cat] || 0) + amt;

        const dt = new Date(d.createdAt || d.date);
        const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        donByMonth[mKey] = (donByMonth[mKey] || 0) + amt;

        const member = allMembersMap[d.email];
        const branch = member?.branch || 'Unknown';
        donByBranch[branch] = (donByBranch[branch] || 0) + amt;
      });

      report.donations = {
        total: donTotal,
        count: periodDonations.length,
        byCategory: Object.entries(donByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        byMonth: Object.entries(donByMonth).map(([month, value]) => ({ month, value })).sort((a, b) => a.month.localeCompare(b.month)),
        byBranch: Object.entries(donByBranch).map(([branch, value]) => ({ branch, value })).sort((a, b) => b.value - a.value),
      };

      // Member growth for period
      const periodMembers = allMembers.filter(m => {
        const dt = new Date(m.createdAt);
        return dt >= startDate && dt <= endDate;
      });
      report.memberGrowth = { newMembers: periodMembers.length, totalMembers: allMembers.length };

      // Attendance (Moved from Secretary)
      const periodAttendance = await attendance.find({ date: dateFilter }).toArray();
      const attByBranch = {};
      periodAttendance.forEach(a => {
        const b = a.branch || 'Unknown';
        attByBranch[b] = (attByBranch[b] || 0) + 1;
      });
      report.attendance = {
        totalRecords: periodAttendance.length,
        byBranch: Object.entries(attByBranch).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      };
    }

    // === Loans & Savings (Loan Admin ONLY) ===
    if (role === 'loanAdmin') {
      const periodLoans = await loans.find({ appliedDate: dateFilter, status: { $ne: 'cancelled' } }).toArray();
      const periodPayments = await loanPayments.find({ status: 'confirmed', confirmedAt: dateFilter }).toArray();

      const loansByStatus = {};
      let totalApplied = 0;
      let totalDisbursedAmt = 0;
      let totalInterestEarned = 0;

      periodLoans.forEach(l => {
        const s = l.status || 'pending';
        loansByStatus[s] = (loansByStatus[s] || 0) + 1;
        totalApplied += l.amount || 0;
        if (l.disbursed) totalDisbursedAmt += l.amount || 0;
      });

      periodPayments.forEach(p => {
        const loan = periodLoans.find(l => l.loanId === p.loanId);
        if (loan && loan.totalInterest && loan.termMonths) {
          totalInterestEarned += loan.totalInterest / loan.termMonths;
        }
      });

      report.loans = {
        totalApplications: periodLoans.length,
        totalAmountApplied: totalApplied,
        totalDisbursed: totalDisbursedAmt,
        totalPaymentsReceived: periodPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        totalInterestEarned: Math.round(totalInterestEarned),
        paymentsCount: periodPayments.length,
        byStatus: Object.entries(loansByStatus).map(([status, count]) => ({ status, count })),
      };

      // Savings
      const periodSavingsTxns = await savingsTransactions.find({ type: 'deposit', status: 'confirmed', date: dateFilter }).toArray();
      const allGoals = await savingsGoals.find({}).toArray();
      const totalSaved = allGoals.reduce((s, g) => s + (g.savedAmount || 0), 0);
      const totalTargets = allGoals.reduce((s, g) => s + (g.targetAmount || 0), 0);
      const completedGoals = allGoals.filter(g => g.status === 'completed').length;
      const periodDeposits = periodSavingsTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);

      report.savings = {
        totalSaved,
        totalTargets,
        overallProgress: totalTargets > 0 ? Math.round((totalSaved / totalTargets) * 100) : 0,
        periodDeposits,
        periodDepositCount: periodSavingsTxns.length,
        activeGoals: allGoals.filter(g => g.status === 'active').length,
        completedGoals,
      };
    }

    // === Disbursements Report (Secretary Admin ONLY) ===
    if (role === 'secretaryAdmin') {
      const disbursedLoans = await loans.find({ 
        disbursed: true, 
        disbursementDate: dateFilter 
      }).toArray();
      const totalDisbursed = disbursedLoans.reduce((s, l) => s + (l.amount || 0), 0);
      
      report.secretary = {
        disbursements: {
          totalAmount: totalDisbursed,
          count: disbursedLoans.length,
          loans: disbursedLoans.map(l => ({
            id: l.loanId,
            member: l.memberName,
            amount: l.amount,
            date: l.disbursementDate
          }))
        }
      };
    }

    // === AI Executive Summary with Caching ===
    const cacheKey = `report_${role}_${reportMonth !== null ? reportMonth : 'full'}_${reportYear}`;
    
    const cached = await reportCache.findOne({ cacheKey });
    const isOld = cached && (new Date() - new Date(cached.updatedAt) > 24 * 60 * 60 * 1000); 

    if (cached && !isOld && !req.query.refresh) {
      report.executiveSummary = cached.summary;
    } else {
      try {
        const reportDataText = JSON.stringify(report, null, 2);
        const summaryPrompt = `You are a financial report writer for a church organization (Philippine United Apostolic Church).
        Given the following financial data for the period "${periodLabel}", write a professional executive summary in 3-4 paragraphs.
        Include: key highlights, notable trends, areas of concern, and recommendations.
        Use Philippine Peso (₱) for currency. Be specific with numbers from the data.
        Write in a formal but accessible tone suitable for church leadership.`;

        const aiSummary = await callGemini(summaryPrompt, reportDataText, { maxTokens: 800, temperature: 0.4 });
        
        if (aiSummary) {
          report.executiveSummary = aiSummary;
          await reportCache.updateOne(
            { cacheKey },
            { $set: { cacheKey, summary: aiSummary, updatedAt: new Date() } },
            { upsert: true }
          );
        } else {
          throw new Error('Empty AI response');
        }
      } catch (aiErr) {
        console.error('[AI Summary Cache Error]:', aiErr);
        report.executiveSummary = cached?.summary || 'Executive summary generation is temporarily unavailable. Please review the detailed data sections below.';
      }
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error('[Financial Report Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to generate financial report' });
  }
});

export default router;
