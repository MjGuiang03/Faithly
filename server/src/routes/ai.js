import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { users, loans, donations, savingsGoals, savingsTransactions, attendance, loanPayments, settings, reportCache, branches } from '../config/db.js';
import { callGemini } from '../utils/gemini.js';

const router = Router();

const categoryMap = {
  'Children Ministry': "Children's Department",
  "Children's Department": "Children's Department",
  'Youth Ministry': 'Youth Department',
  'Youth Department': 'Youth Department',
  'General Fund': 'General Fund',
  "Men's Department": "Men's Department",
  "Women's Department": "Women's Department",
  'Mission Fund': 'Mission Fund'
};

const methodMap = {
  'bank': 'Bank Transfer', 'bank transfer': 'Bank Transfer',
  'gcash': 'GCash', 'e-wallet': 'E-Wallet', 'ewallet': 'E-Wallet',
  'cash': 'Cash', 'check': 'Check', 'cheque': 'Check'
};
const normalizeMethodName = (m) => methodMap[(m || '').toLowerCase()] || m;

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
      const rawCat = d.category || 'General Fund';
      const cat = categoryMap[rawCat] || rawCat;
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

    const systemPrompt = `You are a church management analytics advisor for IsangDiwa.
Given the following operational data, provide exactly 5 insights as a JSON array of objects.
Each object must have: "icon" (a Lucide icon name like "TrendingUp", "TrendingDown", "Users", "DollarSign", "AlertCircle", "CheckCircle", "Calendar", "Activity"), "title" (short 5-8 word title), "detail" (1-2 sentence actionable insight with specific numbers).
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
    const { month, year, startMonth, endMonth } = req.query;
    const reportYear = parseInt(year) || new Date().getFullYear();
    const reportMonth = month !== undefined && month !== '' ? parseInt(month) : null;
    const rStartMonth = startMonth !== undefined && startMonth !== '' ? parseInt(startMonth) : null;
    const rEndMonth = endMonth !== undefined && endMonth !== '' ? parseInt(endMonth) : null;

    // Role-based access
    const role = req.admin.role;

    // Date range
    let startDate, endDate, periodLabel;
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (rStartMonth !== null && rEndMonth !== null) {
      startDate = new Date(reportYear, rStartMonth, 1);
      endDate = new Date(reportYear, rEndMonth + 1, 0, 23, 59, 59);
      periodLabel = `${MONTH_NAMES[rStartMonth]} - ${MONTH_NAMES[rEndMonth]} ${reportYear}`;
    } else if (reportMonth !== null) {
      startDate = new Date(reportYear, reportMonth, 1);
      endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59);
      periodLabel = `${startDate.toLocaleDateString('en-US', { month: 'long' })} ${reportYear}`;
    } else {
      startDate = new Date(reportYear, 0, 1);
      endDate = new Date(reportYear, 11, 31, 23, 59, 59);
      periodLabel = `Full Year ${reportYear}`;
    }

    const dateFilter = { $gte: startDate, $lte: endDate };

    // Previous-period comparison: same period but previous year
    const compareEnabled = req.query.compare === 'true';
    let prevStartDate, prevEndDate, prevPeriodLabel, prevDateFilter;
    if (compareEnabled) {
      const prevYear = reportYear - 1;
      if (rStartMonth !== null && rEndMonth !== null) {
        prevStartDate = new Date(prevYear, rStartMonth, 1);
        prevEndDate = new Date(prevYear, rEndMonth + 1, 0, 23, 59, 59);
        prevPeriodLabel = `${MONTH_NAMES[rStartMonth]} - ${MONTH_NAMES[rEndMonth]} ${prevYear}`;
      } else if (reportMonth !== null) {
        prevStartDate = new Date(prevYear, reportMonth, 1);
        prevEndDate = new Date(prevYear, reportMonth + 1, 0, 23, 59, 59);
        prevPeriodLabel = `${new Date(prevYear, reportMonth).toLocaleDateString('en-US', { month: 'long' })} ${prevYear}`;
      } else {
        prevStartDate = new Date(prevYear, 0, 1);
        prevEndDate = new Date(prevYear, 11, 31, 23, 59, 59);
        prevPeriodLabel = `Full Year ${prevYear}`;
      }
      prevDateFilter = { $gte: prevStartDate, $lte: prevEndDate };
    }

    const type = req.query.type || 'all';
    const communityQuery = req.query.community || '';
    const communities = communityQuery ? communityQuery.split(',').filter(Boolean) : [];
    const provinceQuery = req.query.province || '';
    const provinces = provinceQuery ? provinceQuery.split(',').filter(Boolean) : [];
    
    let branchToProvince = {};
    if (provinces.length > 0) {
      const allBranches = await branches.find({}).toArray();
      allBranches.forEach(b => {
        branchToProvince[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
      });
    }

    const report = { period: periodLabel, startDate, endDate, generatedAt: new Date(), generatedBy: req.admin.email, reportType: type, community: communities.length > 0 ? (communities.length === 1 ? communities[0] : `${communities.length} Selected Communities`) : (provinces.length > 0 ? (provinces.length === 1 ? `Province: ${provinces[0]}` : `${provinces.length} Selected Provinces`) : 'All Communities') };

    // === Donations (Super Admin) ===
    if (role === 'admin') {
      const allMembersMap = {};
      const allMembers = await users.find({}).toArray();
      allMembers.forEach(m => { allMembersMap[m.email] = m; });

      if (type === 'all' || type === 'donations') {
        let donationFilter = { status: 'confirmed', $or: [{ createdAt: dateFilter }, { date: dateFilter }] };
        let periodDonations = await donations.find(donationFilter).toArray();

        // Apply community/province filter BEFORE computing any aggregates
        if (communities.length > 0 || provinces.length > 0) {
          periodDonations = periodDonations.filter(d => {
            const member = allMembersMap[d.email];
            const targetBranch = d.community || member?.branch || 'Unknown';
            if (communities.length > 0) return communities.includes(targetBranch);
            if (provinces.length > 0) return provinces.includes(branchToProvince[targetBranch]);
            return true;
          });
        }

        const donByCategory = {};
        const donByMonth = {};
        const donByBranch = {};
        const donByDonor = {};
        const donByMonthByCommunity = {};
        const donByMonthByProvince = {};
        let donTotal = 0;

        periodDonations.forEach(d => {
          const amt = Number(d.amount) || 0;
          donTotal += amt;

          const rawCat = d.category || 'General Fund';
          const cat = categoryMap[rawCat] || rawCat;
          donByCategory[cat] = (donByCategory[cat] || 0) + amt;

          const dt = new Date(d.createdAt || d.date);
          const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
          donByMonth[mKey] = (donByMonth[mKey] || 0) + amt;

          const member = allMembersMap[d.email];
          const targetBranch = d.community || member?.branch || 'Unknown';
          donByBranch[targetBranch] = (donByBranch[targetBranch] || 0) + amt;

          // Per-community and per-province monthly breakdown
          if (!donByMonthByCommunity[mKey]) donByMonthByCommunity[mKey] = {};
          donByMonthByCommunity[mKey][targetBranch] = (donByMonthByCommunity[mKey][targetBranch] || 0) + amt;

          const targetProv = branchToProvince[targetBranch] || 'Unknown';
          if (!donByMonthByProvince[mKey]) donByMonthByProvince[mKey] = {};
          donByMonthByProvince[mKey][targetProv] = (donByMonthByProvince[mKey][targetProv] || 0) + amt;

          // Track by donor name
          const donorName = d.member || member?.fullName || d.email || 'Unknown';
          if (!donByDonor[donorName]) donByDonor[donorName] = 0;
          donByDonor[donorName] += amt;
        });

      report.donations = {
        total: donTotal,
        count: periodDonations.length,
        byCategory: Object.entries(donByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
          byMonth: Object.entries(donByMonth).map(([month, value]) => ({ month, value })).sort((a, b) => a.month.localeCompare(b.month)),
          byBranch: Object.entries(donByBranch).map(([branch, value]) => ({ branch, value })).sort((a, b) => b.value - a.value),
          byDonor: Object.entries(donByDonor).map(([donor, value]) => ({ donor, value })).sort((a, b) => b.value - a.value).slice(0, 10),
          byMonthByCommunity: donByMonthByCommunity,
          byMonthByProvince: donByMonthByProvince,
        };

        // Member growth for period
        let periodMembers = allMembers.filter(m => {
          const dt = new Date(m.createdAt);
          return dt >= startDate && dt <= endDate;
        });
        // Filter member growth by community/province too
        if (communities.length > 0) {
          periodMembers = periodMembers.filter(m => communities.includes(m.branch));
        } else if (provinces.length > 0) {
          periodMembers = periodMembers.filter(m => provinces.includes(branchToProvince[m.branch]));
        }
        const totalFiltered = communities.length > 0
          ? allMembers.filter(m => communities.includes(m.branch)).length
          : provinces.length > 0
            ? allMembers.filter(m => provinces.includes(branchToProvince[m.branch])).length
            : allMembers.length;
        report.memberGrowth = { newMembers: periodMembers.length, totalMembers: totalFiltered };
      }

      if (type === 'all' || type === 'attendance') {
        // Attendance
        let periodAttendance = await attendance.find({ $or: [{ date: dateFilter }, { createdAt: dateFilter }] }).toArray();

        // Exclude absent records
        periodAttendance = periodAttendance.filter(a => (a.status || 'Present').toLowerCase() !== 'absent');

        // Apply community/province filter BEFORE computing aggregates
        if (communities.length > 0 || provinces.length > 0) {
          periodAttendance = periodAttendance.filter(a => {
            const b = a.community || a.branch || a.userBranch || 'Unknown';
            if (communities.length > 0) return communities.includes(b);
            if (provinces.length > 0) return provinces.includes(branchToProvince[b]);
            return true;
          });
        }

        const attByBranch = {};
        const attByMonth = {};
        const attByMonthByCommunity = {};
        const attByMonthByProvince = {};
        periodAttendance.forEach(a => {
          const b = a.community || a.branch || a.userBranch || 'Unknown';
          attByBranch[b] = (attByBranch[b] || 0) + 1;

          // Track by month
          const dt = a.createdAt ? new Date(a.createdAt) : (a.date ? new Date(a.date) : null);
          if (dt && !isNaN(dt)) {
            const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            attByMonth[mKey] = (attByMonth[mKey] || 0) + 1;

            // Per-community monthly breakdown
            if (!attByMonthByCommunity[mKey]) attByMonthByCommunity[mKey] = {};
            attByMonthByCommunity[mKey][b] = (attByMonthByCommunity[mKey][b] || 0) + 1;

            const targetProv = branchToProvince[b] || 'Unknown';
            if (!attByMonthByProvince[mKey]) attByMonthByProvince[mKey] = {};
            attByMonthByProvince[mKey][targetProv] = (attByMonthByProvince[mKey][targetProv] || 0) + 1;
          }
        });

        // Build attendee names list (for community/province filtered reports)
        const attendees = periodAttendance.map(a => ({
          name: a.member || a.fullName || a.email || 'Unknown',
          branch: a.community || a.branch || a.userBranch || 'Unknown',
          rawDate: a.date ? new Date(a.date) : new Date(0),
          date: a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
          time: a.time || 'N/A',
          status: a.status || 'Present',
          service: a.serviceType || a.service || 'N/A',
        }));

        attendees.sort((a, b) => {
          const compBranch = a.branch.localeCompare(b.branch);
          if (compBranch !== 0) return compBranch;

          const compService = a.service.localeCompare(b.service);
          if (compService !== 0) return compService;

          const compDate = a.rawDate - b.rawDate;
          if (compDate !== 0) return compDate;

          return a.name.localeCompare(b.name);
        });

        report.attendance = {
          totalRecords: periodAttendance.length,
          byBranch: Object.entries(attByBranch).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
          byMonth: Object.entries(attByMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
          byMonthByCommunity: attByMonthByCommunity,
          byMonthByProvince: attByMonthByProvince,
          attendees,
        };
      }
    }

    // === Loans & Savings (Loan Admin ONLY) ===
    if (role === 'loanAdmin') {
      const allMembersMap = {};
      const allMembers = await users.find({}).toArray();
      allMembers.forEach(m => { allMembersMap[m.email] = m; });

      let periodLoans = await loans.find({ appliedDate: dateFilter, status: { $ne: 'cancelled' } }).toArray();
      let periodPayments = await loanPayments.find({ status: 'confirmed', confirmedAt: dateFilter }).toArray();

      // Apply community/province filter
      if (communities.length > 0 || provinces.length > 0) {
        periodLoans = periodLoans.filter(l => {
          const member = allMembersMap[l.email || l.memberEmail];
          const targetBranch = l.branch || member?.branch || 'Unknown';
          if (communities.length > 0) return communities.includes(targetBranch);
          if (provinces.length > 0) return provinces.includes(branchToProvince[targetBranch]);
          return true;
        });

        periodPayments = periodPayments.filter(p => {
          const member = allMembersMap[p.email || p.memberEmail];
          const targetBranch = p.branch || member?.branch || 'Unknown';
          if (communities.length > 0) return communities.includes(targetBranch);
          if (provinces.length > 0) return provinces.includes(branchToProvince[targetBranch]);
          return true;
        });
      }

      const loansByStatus = {};
      let totalApplied = 0;
      let totalDisbursedAmt = 0;
      let totalInterestEarned = 0;

      const loansByMonth = {};
      const paymentsByMonth = {};
      const loansByMonthByCommunity = {};
      const paymentsByMonthByCommunity = {};
      const loansByMonthByProvince = {};
      const paymentsByMonthByProvince = {};

      periodLoans.forEach(l => {
        const s = l.status || 'pending';
        loansByStatus[s] = (loansByStatus[s] || 0) + 1;
        totalApplied += l.amount || 0;
        const loanMember = allMembersMap[l.email || l.memberEmail];
        const loanBranch = l.branch || loanMember?.branch || 'Unknown';
        if (l.disbursed) {
          totalDisbursedAmt += l.amount || 0;
          if (l.disbursementDate) {
            const dt = new Date(l.disbursementDate);
            const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            loansByMonth[mKey] = (loansByMonth[mKey] || 0) + (l.amount || 0);
            if (!loansByMonthByCommunity[mKey]) loansByMonthByCommunity[mKey] = {};
            loansByMonthByCommunity[mKey][loanBranch] = (loansByMonthByCommunity[mKey][loanBranch] || 0) + (l.amount || 0);

            const loanProv = branchToProvince[loanBranch] || 'Unknown';
            if (!loansByMonthByProvince[mKey]) loansByMonthByProvince[mKey] = {};
            loansByMonthByProvince[mKey][loanProv] = (loansByMonthByProvince[mKey][loanProv] || 0) + (l.amount || 0);
          }
        }
      });

      periodPayments.forEach(p => {
        const loan = periodLoans.find(l => l.loanId === p.loanId);
        if (loan && loan.totalInterest && loan.termMonths) {
          totalInterestEarned += loan.totalInterest / loan.termMonths;
        }
        const dt = new Date(p.confirmedAt || p.createdAt || p.date);
        const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        paymentsByMonth[mKey] = (paymentsByMonth[mKey] || 0) + (Number(p.amount) || 0);
        const payMember = allMembersMap[p.email || p.memberEmail];
        const payBranch = p.branch || payMember?.branch || 'Unknown';
        if (!paymentsByMonthByCommunity[mKey]) paymentsByMonthByCommunity[mKey] = {};
        paymentsByMonthByCommunity[mKey][payBranch] = (paymentsByMonthByCommunity[mKey][payBranch] || 0) + (Number(p.amount) || 0);

        const payProv = branchToProvince[payBranch] || 'Unknown';
        if (!paymentsByMonthByProvince[mKey]) paymentsByMonthByProvince[mKey] = {};
        paymentsByMonthByProvince[mKey][payProv] = (paymentsByMonthByProvince[mKey][payProv] || 0) + (Number(p.amount) || 0);
      });
      
      const allMonths = Array.from(new Set([...Object.keys(loansByMonth), ...Object.keys(paymentsByMonth)])).sort();

      // Applications count by month + approval/rejection rate by month
      const appsByMonth = {};
      const appsByMonthByCommunity = {};
      const appsByMonthByProvince = {};
      const approvalByMonth = {};

      periodLoans.forEach(l => {
        const dt = new Date(l.appliedDate || l.createdAt);
        const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        const appMember = allMembersMap[l.email || l.memberEmail];
        const appBranch = l.branch || appMember?.branch || 'Unknown';
        
        // Count applications per month
        if (!appsByMonth[mKey]) appsByMonth[mKey] = 0;
        appsByMonth[mKey]++;

        // Per-community application count
        if (!appsByMonthByCommunity[mKey]) appsByMonthByCommunity[mKey] = {};
        appsByMonthByCommunity[mKey][appBranch] = (appsByMonthByCommunity[mKey][appBranch] || 0) + 1;

        const appProv = branchToProvince[appBranch] || 'Unknown';
        if (!appsByMonthByProvince[mKey]) appsByMonthByProvince[mKey] = {};
        appsByMonthByProvince[mKey][appProv] = (appsByMonthByProvince[mKey][appProv] || 0) + 1;

        // Track approved vs rejected per month
        if (!approvalByMonth[mKey]) approvalByMonth[mKey] = { approved: 0, rejected: 0, total: 0 };
        approvalByMonth[mKey].total++;
        if (['approved', 'active', 'completed', 'disbursed'].includes(l.status)) {
          approvalByMonth[mKey].approved++;
        } else if (l.status === 'rejected') {
          approvalByMonth[mKey].rejected++;
        }
      });

      // Repayment performance: on-time vs late payments by month
      const repaymentByMonth = {};
      periodPayments.forEach(p => {
        const dt = new Date(p.confirmedAt || p.createdAt || p.date);
        const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (!repaymentByMonth[mKey]) repaymentByMonth[mKey] = { onTime: 0, late: 0, total: 0 };
        repaymentByMonth[mKey].total++;
        if (p.isLate) {
          repaymentByMonth[mKey].late++;
        } else {
          repaymentByMonth[mKey].onTime++;
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
        byMonth: allMonths.map(month => ({ month, disbursed: loansByMonth[month] || 0, received: paymentsByMonth[month] || 0 })),
        byMonthByCommunity: { disbursed: loansByMonthByCommunity, collected: paymentsByMonthByCommunity },
        byMonthByProvince: { disbursed: loansByMonthByProvince, collected: paymentsByMonthByProvince },
        applicationsByMonth: Object.entries(appsByMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
        applicationsByMonthByCommunity: appsByMonthByCommunity,
        applicationsByMonthByProvince: appsByMonthByProvince,
        approvalByMonth: Object.entries(approvalByMonth).map(([month, d]) => ({
          month,
          approvalRate: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0,
          rejectionRate: d.total > 0 ? Math.round((d.rejected / d.total) * 100) : 0,
          total: d.total,
        })).sort((a, b) => a.month.localeCompare(b.month)),
        repaymentByMonth: Object.entries(repaymentByMonth).map(([month, d]) => ({
          month,
          onTimeRate: d.total > 0 ? Math.round((d.onTime / d.total) * 100) : 0,
          lateRate: d.total > 0 ? Math.round((d.late / d.total) * 100) : 0,
          onTime: d.onTime,
          late: d.late,
          total: d.total,
        })).sort((a, b) => a.month.localeCompare(b.month)),
      };

      // Savings
      let periodSavingsTxns = await savingsTransactions.find({ 
        type: { $in: ['deposit', 'withdrawal'] }, 
        status: { $in: ['confirmed', 'approved'] }, // withdrawals might be approved
        date: dateFilter 
      }).toArray();
      let allGoals = await savingsGoals.find({}).toArray();

      // Apply community/province filter
      if (communities.length > 0 || provinces.length > 0) {
        periodSavingsTxns = periodSavingsTxns.filter(t => {
          const member = allMembersMap[t.email || t.memberEmail];
          const targetBranch = t.branch || member?.branch || 'Unknown';
          if (communities.length > 0) return communities.includes(targetBranch);
          if (provinces.length > 0) return provinces.includes(branchToProvince[targetBranch]);
          return true;
        });

        allGoals = allGoals.filter(g => {
          const member = allMembersMap[g.email || g.memberEmail];
          const targetBranch = g.branch || member?.branch || 'Unknown';
          if (communities.length > 0) return communities.includes(targetBranch);
          if (provinces.length > 0) return provinces.includes(branchToProvince[targetBranch]);
          return true;
        });
      }

      const totalSaved = allGoals.reduce((s, g) => s + (g.savedAmount || 0), 0);
      const totalTargets = allGoals.reduce((s, g) => s + (g.targetAmount || 0), 0);
      const completedGoals = allGoals.filter(g => g.status === 'completed').length;
      
      const deposits = periodSavingsTxns.filter(t => t.type === 'deposit');
      const withdrawals = periodSavingsTxns.filter(t => t.type === 'withdrawal');
      
      const periodDeposits = deposits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const periodWithdrawals = withdrawals.reduce((s, t) => s + (Number(t.amount) || 0), 0);

      // Group by month
      const savingsByMonth = {};
      periodSavingsTxns.forEach(t => {
        if (!t.date) return;
        const dt = new Date(t.date);
        const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (!savingsByMonth[mKey]) savingsByMonth[mKey] = { deposits: 0, withdrawals: 0 };
        if (t.type === 'deposit') {
          savingsByMonth[mKey].deposits += (Number(t.amount) || 0);
        } else if (t.type === 'withdrawal') {
          savingsByMonth[mKey].withdrawals += (Number(t.amount) || 0);
        }
      });

      report.savings = {
        totalSaved,
        totalTargets,
        overallProgress: totalTargets > 0 ? Math.round((totalSaved / totalTargets) * 100) : 0,
        periodDeposits,
        periodWithdrawals,
        periodDepositCount: deposits.length,
        periodWithdrawalCount: withdrawals.length,
        activeGoals: allGoals.filter(g => g.status === 'active').length,
        completedGoals,
        byMonth: Object.entries(savingsByMonth).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month)),
      };
    }

    // === Disbursements Report (Secretary Admin ONLY) ===
    if (role === 'secretaryAdmin') {
      const allMembersMap = {};
      const allMembers = await users.find({}).toArray();
      allMembers.forEach(m => { allMembersMap[m.email] = m; });

      let disbursedLoans = await loans.find({ 
        disbursed: true, 
        disbursementDate: dateFilter 
      }).toArray();

      // Apply community/province filter
      if (communities.length > 0 || provinces.length > 0) {
        disbursedLoans = disbursedLoans.filter(l => {
          const member = allMembersMap[l.email || l.memberEmail];
          const targetBranch = l.branch || member?.branch || 'Unknown';
          if (communities.length > 0) return communities.includes(targetBranch);
          if (provinces.length > 0) return provinces.includes(branchToProvince[targetBranch]);
          return true;
        });
      }

      const totalDisbursed = disbursedLoans.reduce((s, l) => s + (l.amount || 0), 0);
      
      const disbByMonth = {};
      const disbByMonthByCommunity = {};
      const disbByMonthByProvince = {};
      const disbByMethod = {};
      const disbByCommunity = {};
      const disbByUser = {};
      
      disbursedLoans.forEach(l => {
        const member = allMembersMap[l.email || l.memberEmail];
        const branch = l.branch || member?.branch || 'Unknown';

        if (l.disbursementDate) {
          const dt = new Date(l.disbursementDate);
          const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
          disbByMonth[mKey] = (disbByMonth[mKey] || 0) + (l.amount || 0);
          if (!disbByMonthByCommunity[mKey]) disbByMonthByCommunity[mKey] = {};
          disbByMonthByCommunity[mKey][branch] = (disbByMonthByCommunity[mKey][branch] || 0) + (l.amount || 0);
          
          const prov = branchToProvince[branch] || 'Unknown';
          if (!disbByMonthByProvince[mKey]) disbByMonthByProvince[mKey] = {};
          disbByMonthByProvince[mKey][prov] = (disbByMonthByProvince[mKey][prov] || 0) + (l.amount || 0);
        }
        const method = normalizeMethodName(l.disbursementMethod || l.paymentMethod || 'Bank Transfer');
        disbByMethod[method] = (disbByMethod[method] || 0) + (l.amount || 0);

        // Aggregate by community
        disbByCommunity[branch] = (disbByCommunity[branch] || 0) + (l.amount || 0);

        // Aggregate by user
        const userName = l.memberName || member?.fullName || 'Unknown';
        disbByUser[userName] = (disbByUser[userName] || 0) + (l.amount || 0);
      });
      
      report.secretary = {
        disbursements: {
          totalAmount: totalDisbursed,
          count: disbursedLoans.length,
          byMonth: Object.entries(disbByMonth).map(([month, value]) => ({ month, value })).sort((a, b) => a.month.localeCompare(b.month)),
          byMonthByCommunity: disbByMonthByCommunity,
          byMonthByProvince: disbByMonthByProvince,
          byMethod: Object.entries(disbByMethod).map(([method, value]) => ({ method, value })).sort((a, b) => b.value - a.value),
          byCommunity: Object.entries(disbByCommunity).map(([community, value]) => ({ community, value })).sort((a, b) => b.value - a.value).slice(0, 5),
          byUser: Object.entries(disbByUser).map(([user, value]) => ({ user, value })).sort((a, b) => b.value - a.value).slice(0, 5),
          loans: disbursedLoans.map(l => ({
            id: l.loanId,
            member: l.memberName,
            amount: l.amount,
            date: l.disbursementDate
          }))
        }
      };
    }

    // === Year-over-Year Comparison ===
    if (compareEnabled) {
      const comparison = { prevPeriod: prevPeriodLabel, currentPeriod: periodLabel };

      if (role === 'admin') {
        // Compare donations
        let prevDonations = await donations.find({ status: 'confirmed', $or: [{ createdAt: prevDateFilter }, { date: prevDateFilter }] }).toArray();
        if (communities.length > 0 || provinces.length > 0) {
          const allMembersMap2 = {};
          (await users.find({}).toArray()).forEach(m => { allMembersMap2[m.email] = m; });
          prevDonations = prevDonations.filter(d => {
            const member = allMembersMap2[d.email];
            const targetBranch = d.community || member?.branch || 'Unknown';
            if (communities.length > 0) return communities.includes(targetBranch);
            if (provinces.length > 0) return provinces.includes(branchToProvince[targetBranch]);
            return true;
          });
        }
        const prevDonTotal = prevDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);

        let prevAttendance = await attendance.find({ $or: [{ date: prevDateFilter }, { createdAt: prevDateFilter }] }).toArray();
        prevAttendance = prevAttendance.filter(a => (a.status || 'Present').toLowerCase() !== 'absent');
        if (communities.length > 0 || provinces.length > 0) {
          prevAttendance = prevAttendance.filter(a => {
            const b = a.community || a.branch || a.userBranch || 'Unknown';
            if (communities.length > 0) return communities.includes(b);
            if (provinces.length > 0) return provinces.includes(branchToProvince[b]);
            return true;
          });
        }

        comparison.donations = {
          current: report.donations?.total || 0,
          previous: prevDonTotal,
          change: prevDonTotal > 0 ? Math.round(((report.donations?.total || 0) - prevDonTotal) / prevDonTotal * 100) : null,
          currentCount: report.donations?.count || 0,
          previousCount: prevDonations.length
        };
        comparison.attendance = {
          current: report.attendance?.totalRecords || 0,
          previous: prevAttendance.length,
          change: prevAttendance.length > 0 ? Math.round(((report.attendance?.totalRecords || 0) - prevAttendance.length) / prevAttendance.length * 100) : null
        };
      }

      if (role === 'loanAdmin') {
        let prevLoans = await loans.find({ appliedDate: prevDateFilter, status: { $ne: 'cancelled' } }).toArray();
        let prevPayments = await loanPayments.find({ status: 'confirmed', confirmedAt: prevDateFilter }).toArray();
        
        if (communities.length > 0 || provinces.length > 0) {
          const allMembersMap2 = {};
          (await users.find({}).toArray()).forEach(m => { allMembersMap2[m.email] = m; });
          
          prevLoans = prevLoans.filter(l => {
            const member = allMembersMap2[l.email || l.memberEmail];
            const branch = l.branch || member?.branch || 'Unknown';
            if (communities.length > 0) return communities.includes(branch);
            if (provinces.length > 0) return provinces.includes(branchToProvince[branch]);
            return true;
          });
          
          prevPayments = prevPayments.filter(p => {
            const member = allMembersMap2[p.email || p.memberEmail];
            const branch = member?.branch || 'Unknown';
            if (communities.length > 0) return communities.includes(branch);
            if (provinces.length > 0) return provinces.includes(branchToProvince[branch]);
            return true;
          });
        }

        const prevTotalDisbursed = prevLoans.filter(l => l.disbursed).reduce((s, l) => s + (l.amount || 0), 0);
        const prevTotalCollected = prevPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

        comparison.loans = {
          currentApps: report.loans?.totalApplications || 0,
          previousApps: prevLoans.length,
          changeApps: prevLoans.length > 0 ? Math.round(((report.loans?.totalApplications || 0) - prevLoans.length) / prevLoans.length * 100) : null,
          currentDisbursed: report.loans?.totalDisbursed || 0,
          previousDisbursed: prevTotalDisbursed,
          changeDisbursed: prevTotalDisbursed > 0 ? Math.round(((report.loans?.totalDisbursed || 0) - prevTotalDisbursed) / prevTotalDisbursed * 100) : null,
          currentCollected: report.loans?.totalPaymentsReceived || 0,
          previousCollected: prevTotalCollected,
          changeCollected: prevTotalCollected > 0 ? Math.round(((report.loans?.totalPaymentsReceived || 0) - prevTotalCollected) / prevTotalCollected * 100) : null
        };
      }

      if (role === 'secretaryAdmin') {
        let prevDisbursedLoans = await loans.find({ disbursed: true, disbursementDate: prevDateFilter }).toArray();
        
        if (communities.length > 0 || provinces.length > 0) {
          const allMembersMap2 = {};
          (await users.find({}).toArray()).forEach(m => { allMembersMap2[m.email] = m; });
          
          prevDisbursedLoans = prevDisbursedLoans.filter(l => {
            const member = allMembersMap2[l.email || l.memberEmail];
            const branch = l.branch || member?.branch || 'Unknown';
            if (communities.length > 0) return communities.includes(branch);
            if (provinces.length > 0) return provinces.includes(branchToProvince[branch]);
            return true;
          });
        }

        const prevTotalDisb = prevDisbursedLoans.reduce((s, l) => s + (l.amount || 0), 0);

        comparison.disbursements = {
          current: report.secretary?.disbursements?.totalAmount || 0,
          previous: prevTotalDisb,
          change: prevTotalDisb > 0 ? Math.round(((report.secretary?.disbursements?.totalAmount || 0) - prevTotalDisb) / prevTotalDisb * 100) : null,
          currentCount: report.secretary?.disbursements?.count || 0,
          previousCount: prevDisbursedLoans.length
        };
      }

      report.comparison = comparison;
    }

    // === AI Executive Summary with Caching ===
    const cacheKey = `report_v2_${role}_${req.query.type || 'all'}_${rStartMonth !== null ? rStartMonth : reportMonth !== null ? reportMonth : 'full'}_${rEndMonth !== null ? rEndMonth : 'full'}_${reportYear}_${communities.join('-') || 'all'}_${provinces.join('-') || 'all'}_${compareEnabled ? 'compare' : 'nocompare'}`;
    
    const cached = await reportCache.findOne({ cacheKey });
    const isOld = cached && (new Date() - new Date(cached.updatedAt) > 24 * 60 * 60 * 1000); 

    if (cached && !isOld && !req.query.refresh) {
      report.executiveSummary = cached.summary;
    } else {
      try {
        const reportDataText = JSON.stringify(report, null, 2);
        const summaryPrompt = `You are a senior financial analyst for IsangDiwa.
        Summarize the following financial data for "${periodLabel}" into a highly concise executive summary.
        Format:
        1. Start with a bold one-sentence overall performance statement.
        2. Provide exactly 3 bullet points highlighting the most critical metrics or trends.
        3. End with one short actionable recommendation.
        Keep the entire response under 100 words. Use ₱ for currency.`;

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
