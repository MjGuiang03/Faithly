import { loans, loanPayments } from './src/config/db.js';

async function run() {
  try {
    console.log("Running /admin/loans logic...");
    const skip = 0;
    const limit = 10;
    const query = { status: { $ne: 'cancelled' } };

    const totalCount = await loans.countDocuments(query);
    console.log("Total Count:", totalCount);

    const allLoans = await loans.find(query).sort({ appliedDate: -1 }).skip(skip).limit(limit).toArray();
    console.log("Loans length:", allLoans.length);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const disbursedLoans = await loans.find({ disbursed: true }).toArray();
    const totalDisbursed = disbursedLoans.reduce((sum, l) => sum + (l.amount || 0), 0);
    console.log("Disbursed Loans sum:", totalDisbursed);

    const stats = {
      pending:        await loans.countDocuments({ status: 'pending' }),
      approved:       await loans.countDocuments({ status: 'approved' }),
      active:         await loans.countDocuments({ status: 'active' }),
      completed:      await loans.countDocuments({ status: 'completed' }),
      rejected:       await loans.countDocuments({ status: 'rejected' }),
      totalThisMonth: await loans.countDocuments({ appliedDate: { $gte: monthStart }, status: { $ne: 'cancelled' } }),
      totalDisbursed
    };

    console.log("Stats:", stats);

    console.log("enriching...");
    allLoans.map(enrichLoanWithNextPayment);
    console.log("Done enriching!");

  } catch (err) {
    console.error("ERROR DETECTED:", err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

function enrichLoanWithNextPayment(loan) {
  if (loan.status !== 'active') return loan;
  const term = loan.termMonths || 12;
  const paidMonths = loan.paidMonths || 0;
  if (paidMonths >= term) return loan;

  if (!loan.disbursementDate) return loan;

  const startDate = new Date(loan.disbursementDate);
  const nextDue = new Date(startDate);
  nextDue.setMonth(startDate.getMonth() + paidMonths + 1);

  const cutoffDate = new Date(nextDue);
  cutoffDate.setDate(nextDue.getDate() + 3);
  cutoffDate.setHours(23, 59, 59, 999);

  let upcomingPaymentAmount = loan.monthlyPayment;
  let isLate = false;

  if (Date.now() > cutoffDate.getTime()) {
      isLate = true;
      const principalPerMonth = (loan.amount || 0) / term;
      let interestPerMonth;
      if (loan.totalInterest != null && loan.totalInterest > 0) {
        interestPerMonth = loan.totalInterest / term;
      } else {
        let rate = loan.interestRate || 0.02;
        if (rate > 1) rate = rate / 100;
        interestPerMonth = (loan.amount || 0) * rate;
      }
      const penaltyInterestPerMonth = (loan.amount || 0) * 0.03;
      upcomingPaymentAmount = principalPerMonth + penaltyInterestPerMonth;
  }

  return { ...loan, nextPaymentDate: nextDue, upcomingPaymentAmount, isLate };
}

run();
