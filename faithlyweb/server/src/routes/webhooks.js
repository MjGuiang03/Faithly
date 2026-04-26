import { Router } from 'express';
import { donations, loans, savingsTransactions, savingsGoals, loanPayments } from '../config/db.js';
import { ObjectId } from 'mongodb';

const router = Router();

router.post('/webhooks/paymongo', async (req, res) => {
  try {
    const event = req.body;

    console.log('[PayMongo Webhook] Received Event:', event.data.attributes.type);

    // Event Types from PayMongo:
    // checkout_session.payment.paid -> For Checkout Sessions (Donations, Savings Deposit, Loan Repayments)
    // disbursement.paid -> For Disbursements (Savings Withdrawal, Loan Disbursement)

    if (event.data.attributes.type === 'checkout_session.payment.paid') {
      // For checkout sessions, the ID of the checkout session is in event.data.attributes.data.id
      const checkoutSessionId = event.data.attributes.data.id;
      
      // We will identify the transaction by searching our DBs for this checkoutSessionId (stored as paymongoLinkId)
      
      // 1. Try Donations
      const donation = await donations.findOne({ paymongoLinkId: checkoutSessionId });
      if (donation) {
        await donations.updateOne(
          { _id: donation._id },
          { $set: { status: 'confirmed', confirmedAt: new Date() } }
        );
        console.log(`[Webhook] Confirmed donation ${donation.donationId}`);
        return res.status(200).send('OK');
      }

      // 2. Try Savings Deposits
      const savingsTxn = await savingsTransactions.findOne({ paymongoLinkId: checkoutSessionId });
      if (savingsTxn) {
        // Update Transaction
        await savingsTransactions.updateOne(
          { _id: savingsTxn._id },
          { $set: { status: 'confirmed', confirmedAt: new Date(), confirmedBy: 'System (PayMongo)' } }
        );

        // Update Goal
        const goal = await savingsGoals.findOne({ _id: savingsTxn.goalId });
        if (goal) {
          const newSaved = (goal.savedAmount || 0) + savingsTxn.amount;
          const updates = { savedAmount: newSaved, updatedAt: new Date() };
          if (newSaved >= goal.targetAmount) updates.status = 'completed';
          await savingsGoals.updateOne({ _id: savingsTxn.goalId }, { $set: updates });
        }
        
        console.log(`[Webhook] Confirmed savings deposit to ${savingsTxn.goalName}`);
        return res.status(200).send('OK');
      }

      // 3. Try Loan Payments
      const loanPayment = await loanPayments.findOne({ paymongoLinkId: checkoutSessionId });
      if (loanPayment) {
        // 1. Mark payment as confirmed
        await loanPayments.updateOne(
          { _id: loanPayment._id },
          { $set: { status: 'confirmed', confirmedAt: new Date() } }
        );

        // 2. Apply to loan
        const loan = await loans.findOne({ _id: loanPayment.loanObjectId });
        if (loan) {
          const newPaidMonths = (loan.paidMonths || 0) + 1;
          const paymentAmount = loanPayment.amount || loan.monthlyPayment || 0;
          const newBalance = Math.max(0, (loan.remainingBalance || loan.totalRepayment || loan.amount) - paymentAmount);
          const isComplete = newPaidMonths >= (loan.termMonths || 12);

          const startDate = new Date(loan.disbursementDate || loan.approvedDate || loan.appliedDate);
          const nextDue = new Date(startDate);
          nextDue.setMonth(startDate.getMonth() + newPaidMonths + 1);

          await loans.updateOne(
            { _id: loanPayment.loanObjectId },
            {
              $set: {
                paidMonths: newPaidMonths,
                remainingBalance: newBalance,
                status: isComplete ? 'completed' : 'active',
                nextDueDate: isComplete ? null : nextDue,
                updatedAt: new Date(),
              },
              $push: {
                statusHistory: {
                  status: 'payment_confirmed',
                  date: new Date(),
                  monthNumber: newPaidMonths,
                  amount: paymentAmount,
                  paymentMethod: loanPayment.paymentMethod || 'cash',
                  confirmedBy: 'System (PayMongo)'
                }
              }
            }
          );
          console.log(`[Webhook] Confirmed loan payment for ${loan.loanId}`);
        } else {
          console.log(`[Webhook] Warning: Loan not found for payment ${loanPayment._id}`);
        }
        return res.status(200).send('OK');
      }
    } else if (event.data.attributes.type === 'disbursement.paid') {
        // TODO: Handle Disbursement Success (Withdrawals & Loan Disbursements)
    }

    res.status(200).send('Event received');
  } catch (err) {
    console.error('[Webhook Error]', err);
    res.status(500).send('Webhook error');
  }
});

export default router;
