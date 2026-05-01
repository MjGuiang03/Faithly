import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { users, loans, donations, savingsGoals, attendance } from '../config/db.js';
import { callGeminiChat } from '../utils/gemini.js';

const router = Router();

/* ── FaithLy Knowledge Base (system context for AI) ── */
const FAITHLY_KB = `
You are **FaithBot**, the official AI assistant for **FaithLy** — the digital church portal of the Philippine United Apostolic Church (PUAC).

## Your Personality
- Warm, professional, and spiritually encouraging
- Use emojis sparingly but naturally (👋, ✅, 📋, etc.)
- Be concise — keep responses under 150 words unless the user asks for detail
- You can respond in **Tagalog, Filipino, or Taglish** if the user writes in Filipino. Match the user's language.
- Always suggest 2-4 quick reply topics at the end of your response in a JSON array

## FaithLy Platform Features

### Officer Verification
- Church officers can get verified by: Home > "Are you an officer?" card > Submit Church ID Number + Position
- Eligible positions: Deacon, Local Evangelist, District Evangelist, National Evangelist, Assistant Priest, Priest, Elder, District Elder, Bishop, District Bishop, National Bishop, Apostle
- Verification takes 3-5 business days
- Verified officers unlock Loans and Savings features

### Loans (Officers Only)
- Apply via Loans page > "Apply for a Loan"
- Loan types: Personal (2× savings, 2%/mo), Emergency (1.5× savings, 1.5%/mo), Short-Term (1× savings, 1%/mo)
- Application flow: Pending → Approved → Active → Completed
- Late payment penalty: 3% flat interest if payment is >3 days past due
- Payments via E-Wallet, Bank Transfer, or Cash with proof upload

### Savings (Officers Only)
- Set personalized savings goals
- Track progress with visual progress bar
- Deposit via E-Wallet, Bank, or Cash
- Withdrawals require admin approval

### Donations (All Members)
- Categories: General Fund, Children's Department, Men's Department, Women's Department, Youth Department, Mission Fund
- Payment methods: E-Wallet, Bank Transfer, Cash
- Upload proof of payment
- Payment gateway (PayMongo) available for digital payments

### Attendance
- Recorded by church administrators
- View history in Attendance page
- Summary shown on Home dashboard

### Branches
- PUAC has multiple branches across the Philippines
- Find branch details, locations, and service schedules on the Branches page

### Settings
- Update profile, change password, manage notifications
- Branch assignment can be updated

### Notifications
- Real-time updates for: loan status, donation confirmations, payment reminders, attendance records, verification results
- Email and push notification support

## Response Format Rules
- Use **bold** for important terms
- Use bullet points for lists
- End EVERY response with a JSON line: QUICK_REPLIES:["Topic1","Topic2","Topic3"]
- The quick replies should be relevant follow-up topics
`;

/* ── Fallback keyword matching (same as original Chatbot.js) ── */
const KB = [
  { patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'kumusta', 'magandang umaga', 'magandang hapon'], responses: ["Hello! 👋 I'm FaithBot, your FaithLy assistant. How can I help you today?"], quickReplies: ['Loans', 'Donations', 'Officer Verification', 'Attendance'] },
  { patterns: ['officer', 'verify', 'verification', 'verified'], responses: ["🛡️ **Officer Verification** unlocks Loans & Savings. Go to Home > 'Are you an officer?' card > submit your Church ID and Position. Takes 3-5 business days."], quickReplies: ['What positions qualify?', 'Loans', 'Savings'] },
  { patterns: ['loan', 'loans', 'borrow', 'apply loan', 'utang', 'hulugan'], responses: ["💳 **Loans** are for verified officers. Go to Loans > Apply for a Loan. Choose type, set amount & term, then submit for admin review."], quickReplies: ['Loan requirements', 'Interest rates', 'Repayment'] },
  { patterns: ['savings', 'save', 'ipon'], responses: ["🏦 **Savings** is for verified officers. Set goals, track progress, and deposit funds through the Savings page."], quickReplies: ['How to deposit?', 'Officer Verification'] },
  { patterns: ['donat', 'donation', 'donate', 'giving', 'tithe', 'offering', 'handog', 'ikapu'], responses: ["❤️ Go to Donations > choose a category > enter amount > upload proof of payment. Methods: E-Wallet, Bank, Cash."], quickReplies: ['Donation categories', 'E-Wallet details'] },
  { patterns: ['attendance', 'attend', 'check in'], responses: ["📅 Your attendance is recorded by administrators. View it in the Attendance page or your Home dashboard."], quickReplies: ['Branches', 'Home'] },
  { patterns: ['branch', 'location', 'address', 'simbahan', 'church'], responses: ["🏛️ Visit the Branches page to find locations, contact info, and service schedules."], quickReplies: ['My branch', 'Attendance'] },
  { patterns: ['settings', 'profile', 'password', 'account'], responses: ["⚙️ Go to Settings to update your profile, change password, or manage notifications."], quickReplies: ['Change password', 'Home'] },
  { patterns: ['notification', 'alert', 'updates'], responses: ["🔔 Notifications keep you updated on loans, donations, attendance, and more. Check the Notifications page."], quickReplies: ['Loans', 'Donations'] },
];

function getKeywordResponse(input) {
  const normalized = input.toLowerCase().trim();
  for (const entry of KB) {
    if (entry.patterns.some(p => normalized.includes(p))) {
      return { text: entry.responses[0], quickReplies: entry.quickReplies };
    }
  }
  return null;
}

/* ── Parse quick replies from AI response ── */
function parseAIResponse(text) {
  let reply = text;
  let quickReplies = ['Loans', 'Donations', 'Attendance', 'Branches'];

  // Extract QUICK_REPLIES JSON from the end
  const qrMatch = text.match(/QUICK_REPLIES:\s*\[([^\]]+)\]/i);
  if (qrMatch) {
    try {
      quickReplies = JSON.parse(`[${qrMatch[1]}]`);
      reply = text.replace(/QUICK_REPLIES:\s*\[[^\]]+\]/i, '').trim();
    } catch { /* keep defaults */ }
  }

  return { reply, quickReplies };
}

/* ================== POST /api/chat ================== */
router.post('/chat', authenticateUser, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const email = req.user.email;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Fetch user's real-time data for context
    let userContext = '';
    try {
      const user = await users.findOne({ email });
      const userLoans = await loans.find({ email }).toArray();
      const userDonations = await donations.find({ email, status: 'confirmed' }).toArray();
      const userSavings = await savingsGoals.find({ email }).toArray();
      const userAttendance = await attendance.find({ email }).toArray();

      const activeLoans = userLoans.filter(l => l.status === 'active');
      const totalDonated = userDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const totalSaved = userSavings.reduce((sum, g) => sum + (g.savedAmount || 0), 0);
      const isOfficer = user?.verificationStatus === 'verified';

      userContext = `
## Current User Context (${user?.fullName || 'Member'})
- Branch: ${user?.branch || 'Unknown'}
- Position: ${user?.position || 'Member'}
- Officer Status: ${isOfficer ? 'Verified ✅' : 'Not verified'}
- Active Loans: ${activeLoans.length} ${activeLoans.length > 0 ? `(Balance: ₱${activeLoans.reduce((s, l) => s + (l.remainingBalance || 0), 0).toLocaleString()})` : ''}
- Total Donations: ₱${totalDonated.toLocaleString()}
- Total Savings: ₱${totalSaved.toLocaleString()}
- Attendance Records: ${userAttendance.length} services
${activeLoans.length > 0 ? `- Next Loan Payment: ${activeLoans[0].nextDueDate ? new Date(activeLoans[0].nextDueDate).toLocaleDateString() : 'Check Loans page'}` : ''}

Use this data to give personalized answers when relevant. Do NOT expose sensitive data unprompted.
`;
    } catch (err) {
      console.error('[Chat] Failed to fetch user context:', err.message);
    }

    // Try AI first
    const systemPrompt = FAITHLY_KB + userContext;
    const chatHistory = history.slice(-8).map(m => ({
      role: m.sender === 'user' ? 'user' : 'bot',
      text: m.text || '',
    }));

    const aiResponse = await callGeminiChat(systemPrompt, chatHistory, message);

    if (aiResponse) {
      const { reply, quickReplies } = parseAIResponse(aiResponse);
      return res.json({ success: true, reply, quickReplies, source: 'ai' });
    }

    // Fallback to keyword matching
    const fallback = getKeywordResponse(message);
    if (fallback) {
      return res.json({ success: true, reply: fallback.text, quickReplies: fallback.quickReplies, source: 'fallback' });
    }

    // Ultimate fallback
    return res.json({
      success: true,
      reply: "I'm not sure I understand that. Could you try rephrasing?\n\nHere are some things I can help with:",
      quickReplies: ['Loans', 'Donations', 'Attendance', 'Officer Verification', 'Branches'],
      source: 'fallback',
    });
  } catch (err) {
    console.error('[Chat Error]:', err);
    res.status(500).json({ success: false, message: 'Chat failed' });
  }
});

export default router;
