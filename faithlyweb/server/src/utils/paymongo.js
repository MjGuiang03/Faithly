import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const encodedKey = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64');

export const paymongoApi = axios.create({
  baseURL: 'https://api.paymongo.com/v1',
  headers: {
    Authorization: `Basic ${encodedKey}`,
    'Content-Type': 'application/json',
  },
});

export const generatePaymentLink = async (amount, description, referenceId = '', paymentMethod = '', successUrl = 'http://localhost:3000/home', cancelUrl = 'http://localhost:3000/home', billing = null) => {
  try {
    // Force specific payment methods based on UI selection
    let methodTypes = ['card', 'gcash', 'paymaya', 'dob']; // default shows all
    if (paymentMethod === 'GCash') {
      methodTypes = ['gcash', 'paymaya']; // e-wallets
    } else if (paymentMethod === 'Bank') {
      methodTypes = ['dob', 'card']; // online banking and cards
    }

    const attributes = {
      line_items: [
        {
          currency: 'PHP',
          amount: Math.round(amount * 100), // Convert to centavos
          name: description,
          quantity: 1
        }
      ],
      payment_method_types: methodTypes,
      description: description,
      reference_number: referenceId,
      send_email_receipt: true,
      show_description: true,
      show_line_items: true,
      success_url: successUrl,
      cancel_url: cancelUrl
    };

    // Pre-fill customer info so users don't have to re-type
    if (billing) {
      attributes.billing = {};
      if (billing.name) attributes.billing.name = billing.name;
      if (billing.email) attributes.billing.email = billing.email;
      if (billing.phone) attributes.billing.phone = billing.phone;
    }

    const response = await paymongoApi.post('/checkout_sessions', {
      data: { attributes }
    });
    return response.data.data;
  } catch (error) {
    console.error('PayMongo Checkout Error:', error.response?.data || error.message);
    throw new Error('Failed to generate PayMongo checkout session');
  }
};

/* ── PayMongo Disbursement via Workflow API ── */
const PAYMONGO_WALLET_ID = process.env.PAYMONGO_WALLET_ID || '';
const PAYMONGO_MERCHANT_NAME = process.env.PAYMONGO_MERCHANT_NAME || 'FaithLy';

// BIC codes for common Philippine e-wallets and banks
const BIC_CODES = {
  gcash: 'GXCHPHM2XXX',
  paymaya: 'MAYAPHM2XXX',
  bpi: 'BOPIPHMMXXX',
  bdo: 'ABORPHMM',
  metrobank: 'MABORMMXXX',
  unionbank: 'UBPHPHMMXXX',
  landbank: 'TLBPPHMM',
  chinabank: 'CHBKPHMMXXX',
};

/**
 * Send money from PayMongo wallet to a user's GCash or bank account.
 * Uses the PayMongo Workflow API.
 */
export const sendPaymongoTransfer = async ({ amount, accountNumber, accountName, method, referenceId, bankCode }) => {
  try {
    // SIMULATION MODE FOR CAPSTONE DEMO
    // If using the dummy wallet ID, simulate a successful transfer instantly
    if (PAYMONGO_WALLET_ID === 'wallet_test_123') {
      console.log(`[SIMULATION] PayMongo transfer of ₱${amount} to ${accountName} (${accountNumber}) via ${method} successful.`);
      return { 
        success: true, 
        data: { 
          id: `sim_txn_${Date.now()}`,
          status: 'success',
          simulated: true,
          message: 'Simulated successful transfer for Capstone demonstration'
        } 
      };
    }

    const amountCentavos = Math.round(amount * 100);
    const bic = method === 'gcash' ? BIC_CODES.gcash : (BIC_CODES[bankCode] || BIC_CODES.bpi);

    const workflowDef = `version: 1
name: "loan-disbursement-${referenceId}"
description: "Loan disbursement to ${accountName}"
steps:
  - name: "disburse-${referenceId}"
    send_money:
      provider: "auto"
      source:
        type: "wallet"
        account: "${PAYMONGO_WALLET_ID}"
        account_name: "${PAYMONGO_MERCHANT_NAME}"
      destination:
        type: "bank"
        account: "${accountNumber}"
        account_name: "${accountName}"
        bic: "${bic}"
      amount: "${amountCentavos}"
      currency: "PHP"
      purpose: "99"
      notes: "FaithLy Loan Disbursement - ${referenceId}"`;

    const response = await axios.post(
      'https://workflow-api.paymongo.com/v1/workflows',
      workflowDef,
      {
        headers: {
          Authorization: `Basic ${encodedKey}`,
          'Content-Type': 'text/plain',
        },
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('PayMongo Transfer Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.errors?.[0]?.detail || error.message };
  }
};
