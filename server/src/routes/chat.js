import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { users, donations, attendance, loans, savingsGoals } from '../config/db.js';
import { callGeminiChat } from '../utils/gemini.js';

const router = Router();

/* ── PUAC Knowledge Base (system context for AI) ── */
const PUAC_KB = `
You are **PUAC Chatbot**, the official AI assistant for **PUAC** (Philippine United Apostolic Church) — the digital church portal.

## Your Personality
- Warm, professional, and spiritually encouraging
- Use emojis sparingly but naturally (👋, ✅, 📋, etc.)
- Be concise — keep responses under 150 words unless the user asks for detail
- **Always respond in English by default.** Only switch to Tagalog/Filipino/Taglish if the user clearly writes in Filipino first.
- Always suggest 2-4 quick reply topics at the end of your response in a JSON array

## PUAC Platform Features

### Donations (All Members)
- Categories: General Fund, Children's Department, Men's Department, Women's Department, Youth Department, Mission Fund
- Payment methods: Payment Gateway (PayMongo), Manual (Cash, Bank Transfer)
- Upload proof of payment for manual transactions

### Savings
- Members can set up personal savings goals
- Deposit to savings using Gateway or Manual

### Loans
- Members can apply for loans subject to approval
- View loan status, balance, and next due date
- Pay loans via Gateway or Manual

### Attendance
- Methods: Admin manual entry, RFID tap
- View history in Attendance page
- Summary shown on Home dashboard

### Branches
- PUAC has multiple branches across the Philippines
- Find branch details, locations, and service schedules on the Branches page

### Settings
- Update profile, change password, manage notifications
- Branch assignment can be updated

### Notifications
- Real-time updates for: donation confirmations, attendance records, loan updates
- Email and push notification support

## Response Format Rules
- Use **bold** for important terms
- Use bullet points for lists
- End EVERY response with a JSON line: QUICK_REPLIES:["Topic1","Topic2","Topic3"]
- The quick replies should be relevant follow-up topics
`;

/* ── Fallback keyword matching (same as original Chatbot.js) ── */
const KB = [
  { patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'kumusta', 'magandang umaga', 'magandang hapon'], responses: ["Hello! 👋 I'm PUAC Chatbot, your PUAC assistant. How can I help you today?"], quickReplies: ['Donations', 'Savings', 'Loans'] },
  { patterns: ['save', 'saving', 'savings', 'ipon'], responses: ["💰 You can set up personal savings goals and deposit securely via Payment Gateway or Manual."], quickReplies: ['Donations', 'Loans'] },
  { patterns: ['loan', 'borrow', 'utang'], responses: ["💳 Members can apply for loans. You can check your loan status, balance, and pay via Gateway or Manual."], quickReplies: ['Savings', 'Donations'] },
  { patterns: ['donat', 'donation', 'donate', 'giving', 'tithe', 'offering', 'handog', 'ikapu'], responses: ["❤️ Go to Donations > choose a category > enter amount. Methods: Payment Gateway or Manual."], quickReplies: ['Donation categories', 'Savings'] },
  { patterns: ['attendance', 'attend', 'check in'], responses: ["📅 Your attendance is recorded via Admin manual entry or RFID tap. View it in the Attendance page or your Home dashboard."], quickReplies: ['Branches', 'Home'] },
  { patterns: ['branch', 'location', 'address', 'simbahan', 'church'], responses: ["🏛️ Visit the Branches page to find locations, contact info, and service schedules."], quickReplies: ['My branch', 'Attendance'] },
  { patterns: ['settings', 'profile', 'password', 'account'], responses: ["⚙️ Go to Settings to update your profile, change password, or manage notifications."], quickReplies: ['Change password', 'Home'] },
  { patterns: ['notification', 'alert', 'updates'], responses: ["🔔 Notifications keep you updated on donations, attendance, loans, and more. Check the Notifications page."], quickReplies: ['Donations', 'Attendance'] },
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
  let quickReplies = ['Donations', 'Savings', 'Loans', 'Attendance'];

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
      const userDonations = await donations.find({ email, status: 'confirmed' }).toArray();
      const userAttendance = await attendance.find({ email }).toArray();
      const userLoans = await loans.find({ email }).toArray();
      const userSavings = await savingsGoals.find({ email }).toArray();

      const totalDonated = userDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const activeLoans = userLoans.filter(l => l.status === 'approved' || l.status === 'disbursed').length;
      const totalSaved = userSavings.reduce((sum, g) => sum + (Number(g.savedAmount) || 0), 0);

      userContext = `
## Current User Context (${user?.fullName || 'Member'})
- Branch: ${user?.branch || 'Unknown'}
- Position: ${user?.position || 'Member'}
- Total Donations: ₱${totalDonated.toLocaleString()}
- Total Saved: ₱${totalSaved.toLocaleString()}
- Active Loans: ${activeLoans}
- Attendance Records: ${userAttendance.length} services

Use this data to give personalized answers when relevant. Do NOT expose sensitive data unprompted.
`;
    } catch (err) {
      console.error('[Chat] Failed to fetch user context:', err.message);
    }

    // Try AI first
    const systemPrompt = PUAC_KB + userContext;
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
      quickReplies: ['Donations', 'Savings', 'Loans', 'Attendance'],
      source: 'fallback',
    });
  } catch (err) {
    console.error('[Chat Error]:', err);
    res.status(500).json({ success: false, message: 'Chat failed' });
  }
});

export default router;
