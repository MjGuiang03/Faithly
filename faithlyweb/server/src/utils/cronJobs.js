import cron from 'node-cron';
import { loans } from '../config/db.js';
import { notifyUser } from './notifyHelpers.js';

export const startCronJobs = () => {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily loan due date checks...');
    try {
      const activeLoans = await loans.find({ status: 'active' }).toArray();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (const loan of activeLoans) {
        if (!loan.nextDueDate) continue;

        const dueDate = new Date(loan.nextDueDate);
        const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        
        const diffTime = dueDay - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let reminderType = null;
        let title = '';
        let message = '';
        let htmlMsg = '';

        if (diffDays === 3) {
          reminderType = '3_days';
          title = 'Upcoming Loan Payment';
          message = `Your loan payment for ${loan.loanId} is due in 3 days.`;
          htmlMsg = `<h2>Payment Reminder</h2><p>Your loan payment for ${loan.loanId} is due on ${dueDate.toLocaleDateString()}. Please ensure you have sufficient funds.</p>`;
        } else if (diffDays === 1) {
          reminderType = '1_day';
          title = 'Loan Payment Tomorrow';
          message = `Your loan payment for ${loan.loanId} is due tomorrow.`;
          htmlMsg = `<h2>Payment Reminder</h2><p>Your loan payment for ${loan.loanId} is due tomorrow (${dueDate.toLocaleDateString()}).</p>`;
        } else if (diffDays === 0) {
          reminderType = 'today';
          title = 'Loan Payment Due Today';
          message = `Your loan payment for ${loan.loanId} is due today!`;
          htmlMsg = `<h2>Payment Due Today</h2><p>Your loan payment for ${loan.loanId} is due today. Please make your payment to avoid late penalties.</p>`;
        } else if (diffDays < 0 && diffDays >= -3) {
          reminderType = 'overdue';
          title = 'Loan Payment Overdue';
          message = `Your loan payment for ${loan.loanId} is overdue by ${Math.abs(diffDays)} day(s).`;
          htmlMsg = `<h2>Payment Overdue</h2><p>Your loan payment for ${loan.loanId} is overdue. Please pay immediately to avoid a 3% penalty applied after 3 days.</p>`;
        }

        if (reminderType) {
          await notifyUser(
            loan.email,
            'loan',
            title,
            htmlMsg,
            message,
            `/loans/${loan.loanId}`
          );
          console.log(`[Cron] Sent ${reminderType} reminder for loan ${loan.loanId}`);
        }
      }
    } catch (error) {
      console.error('[Cron Error] Failed to process loan due dates:', error);
    }
  });

  console.log('[Cron] Loan due date scheduler initialized.');
};
