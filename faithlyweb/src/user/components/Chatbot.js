import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../styles/Chatbot.css';
import { MapPin, User, X } from 'lucide-react';

/* ─────────────────────────────────────────────
   Knowledge Base
   Each entry has: patterns (keywords to match)
   and responses (array — one is picked randomly)
───────────────────────────────────────────── */
const KB = [
  // ── Greetings ──
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy'],
    responses: [
      "Hello! 👋 I'm FaithBot, your FaithLy assistant. How can I help you today?",
      "Hi there! Welcome to FaithLy support. What can I assist you with?",
    ],
    quickReplies: ['Loans', 'Donations', 'Officer Verification', 'Attendance'],
  },

  // ── Officer Verification ──
  {
    patterns: ['officer', 'verify', 'verification', 'verified', 'officer verification', 'get verified', 'officer status', 'how to verify', 'church officer', 'verify me'],
    responses: [
      "🛡️ **Officer Verification** unlocks access to the **Loans** and **Savings** modules — features exclusively for verified church officers.\n\n**How to get verified:**\n1. From the Home page, look for the **\"Are you an officer?\"** card in your dashboard\n2. Click on it and choose **\"Yes, verify me\"**\n3. A form will appear — enter your **Church ID Number** and select your **Church Position**\n4. Submit the form — our administrators will review it within **3–5 business days**\n5. Once approved, you'll receive a notification and your Savings & Loans features will be unlocked! ✅",
    ],
    quickReplies: ['What positions qualify?', 'How long does verification take?', 'Loans', 'Savings'],
  },
  {
    patterns: ['what positions qualify', 'positions qualify', 'eligible positions', 'officer positions', 'who can verify', 'which position'],
    responses: [
      "The following church positions are eligible for **Officer Verification**:\n\n• Deacon\n• Local Evangelist\n• District Evangelist\n• National Evangelist\n• Assistant Priest\n• Priest\n• Elder\n• District Elder\n• Bishop\n• District Bishop\n• National Bishop\n• Apostle\n\nIf your position isn't listed, please contact your branch administrator.",
    ],
    quickReplies: ['How long does verification take?', 'Apply for a loan', 'Home'],
  },
  {
    patterns: ['how long does verification take', 'verification time', 'how long to verify', 'processing time', 'when will i be verified'],
    responses: [
      "⏱️ Officer verification typically takes **3–5 business days**.\n\nOnce submitted, church administrators will review your Church ID and position. You'll receive a **notification** within the app once your status is approved or if there are any issues.",
    ],
    quickReplies: ['What positions qualify?', 'How do I check my status?', 'Loans'],
  },
  {
    patterns: ['check my status', 'verification status', 'my officer status', 'am i verified', 'is my verification'],
    responses: [
      "To check your verification status:\n\n1. Go to **Home** — if you see Savings and Loans cards on your dashboard, you are **already verified** ✅\n2. If you see the **\"Are you an officer?\"** prompt, your verification is still **pending or not yet submitted**\n3. You can also check your **Notifications** page for updates on your verification request.",
    ],
    quickReplies: ['Officer Verification', 'Notifications', 'Loans'],
  },

  // ── Loans ──
  {
    patterns: ['loan', 'loans', 'borrow', 'apply loan', 'loan application', 'how to apply loan'],
    responses: [
      "💳 **Loans** are available exclusively for **verified church officers**.\n\n**To apply for a loan:**\n1. Ensure you are **officer-verified** first\n2. Navigate to the **Loans** page from the sidebar\n3. Click **\"Apply for a Loan\"**\n4. Fill in the loan amount and preferred repayment terms\n5. Submit and wait for admin approval (usually within 2–3 business days)\n\nOnce approved, the loan will be marked **Active** on your dashboard.",
    ],
    quickReplies: ['Loan requirements', 'Interest rates', 'Repayment schedule', 'Officer Verification'],
  },
  {
    patterns: ['loan requirement', 'loan requirements', 'qualify for loan', 'loan eligibility', 'who can apply'],
    responses: [
      "📋 **Loan Requirements:**\n\n✅ Must be a **verified church officer**\n✅ Must have an **active membership** in PUAC\n✅ No existing **overdue** loan payments\n✅ Valid **Church ID**\n\nIf you meet these requirements, head to the **Loans** page to apply!",
    ],
    quickReplies: ['How to apply', 'Interest rates', 'Officer Verification'],
  },
  {
    patterns: ['interest', 'interest rate', 'loan rate', 'how much interest', 'late penalty', 'penalty'],
    responses: [
      "📊 **Loan Interest & Penalties:**\n\nThe exact interest rates are set by the church administration and will be displayed on your loan application form.\n\n⚠️ **Late Payment Penalty:** A **3× interest penalty** is applied for repayments made more than **3 days past the due date**. Always pay on time to avoid extra charges!\n\nFor the specific rate on your loan, check your **Loan Details** page.",
    ],
    quickReplies: ['How to pay', 'Repayment schedule', 'Loans'],
  },
  {
    patterns: ['repay', 'repayment', 'pay loan', 'loan payment', 'how to pay loan', 'submit payment'],
    responses: [
      "💰 **How to Make a Loan Repayment:**\n\n1. Go to **Loans** in the sidebar\n2. Click on your active loan to view details\n3. Click **\"Make a Payment\"**\n4. Enter the payment amount and upload your **proof of payment** (screenshot/receipt)\n5. Submit — the admin will confirm your payment within the day\n\nYou'll receive a **notification** once your payment is confirmed! ✅",
    ],
    quickReplies: ['Payment methods', 'Late penalty', 'Loan status'],
  },
  {
    patterns: ['loan status', 'check loan', 'loan progress', 'active loan', 'loan balance'],
    responses: [
      "To check your loan status:\n\n1. Click **Loans** in the sidebar\n2. Your dashboard shows **Active Loans**, remaining balance, and next due date\n3. Click on a loan to see full details, repayment history, and upcoming payments\n\nStatusses you may see: `Pending` → `Approved` → `Active` → `Completed`",
    ],
    quickReplies: ['Make a payment', 'Interest rates', 'Home'],
  },

  // ── Savings ──
  {
    patterns: ['savings', 'save', 'saving goals', 'savings goal', 'my savings', 'add savings'],
    responses: [
      "🏦 **Savings** is available for **verified church officers**.\n\n**Features:**\n• Set personalized **savings goals** (e.g., \"Education Fund\", \"Emergency\")\n• Track progress with a visual progress bar\n• Deposit funds and see them reflected after **admin confirmation**\n• View transaction history\n\nGo to **Savings** in the sidebar to get started!",
    ],
    quickReplies: ['How to deposit?', 'Officer Verification', 'Savings goals'],
  },
  {
    patterns: ['deposit savings', 'how to deposit', 'add money savings', 'savings deposit'],
    responses: [
      "To make a savings deposit:\n\n1. Navigate to **Savings** in the sidebar\n2. Click **\"Add Deposit\"** or **\"Deposit Funds\"**\n3. Enter the amount and upload **proof of payment**\n4. Submit — an admin will confirm it within the day\n\nYour total savings balance will update once the deposit is **confirmed**.",
    ],
    quickReplies: ['Savings goals', 'Officer Verification', 'Loans'],
  },

  // ── Donations ──
  {
    patterns: ['donat', 'donation', 'donate', 'giving', 'tithe', 'offering', 'how to donate'],
    responses: [
      "❤️ **How to Make a Donation:**\n\n1. Go to **Donations** in the sidebar\n2. Choose a donation **category** (Tithe, Offering, Building Fund, etc.)\n3. Enter the **amount** and select your payment method\n4. Upload your **proof of payment** (GCash screenshot or bank receipt)\n5. Submit — the admin will confirm and you'll receive a notification\n\n**Accepted Payment Methods:**\n• 📱 GCash\n• 🏦 Bank Transfer\n• 💵 Cash",
    ],
    quickReplies: ['GCash details', 'Bank details', 'Donation categories'],
  },
  {
    patterns: ['gcash', 'g-cash', 'gcash number', 'gcash details', 'gcash payment'],
    responses: [
      "📱 **GCash Donations:**\n\nGCash payment details are provided during the donation process on the **Donations** page. Once you select **GCash** as your method:\n1. The church's GCash number/QR code will be displayed\n2. Complete the payment via your GCash app\n3. **Screenshot** the confirmation\n4. Upload it as proof on the FaithLy donation form\n\nFor specific GCash numbers, please contact your **branch administrator**.",
    ],
    quickReplies: ['Bank transfer', 'How to donate', 'Donation status'],
  },
  {
    patterns: ['bank', 'bank transfer', 'bank account', 'bank details', 'bank payment'],
    responses: [
      "🏦 **Bank Transfer Donations:**\n\nBank account details are shown within the **Donations** page when you select **Bank Transfer** as your payment method.\n\nAfter transferring:\n1. Take a **screenshot** of the transfer confirmation\n2. Return to FaithLy and upload it as your **proof of payment**\n3. Submit and wait for admin confirmation\n\nFor specific bank account numbers, please contact your **branch administrator**.",
    ],
    quickReplies: ['GCash', 'How to donate', 'Donation status'],
  },
  {
    patterns: ['donation status', 'donation confirm', 'check donation', 'my donation', 'donation history'],
    responses: [
      "To check your donation history and status:\n\n1. Go to **Donations** in the sidebar\n2. Your **total donated** amount and history are displayed there\n3. Each donation shows its status: `Pending` or `Confirmed` ✅\n\nYou'll also receive a **notification** when a donation is confirmed by admin.",
    ],
    quickReplies: ['How to donate', 'GCash', 'Bank transfer'],
  },
  {
    patterns: ['donation category', 'donation categories', 'types of donation', 'tithe', 'offering', 'building fund'],
    responses: [
      "📋 **Donation Categories Available:**\n\n• 🙏 **Tithe** — 10% of income, the foundational giving\n• 🎁 **Offering** — Voluntary general offerings\n• 🏛️ **Building Fund** — Supporting church facilities\n• 💡 **Mission Fund** — Supporting outreach activities\n• 🤝 **Special Offering** — One-time special campaigns\n\nSelect the appropriate category when making your donation on the **Donations** page.",
    ],
    quickReplies: ['How to donate', 'GCash', 'Bank transfer'],
  },

  // ── Attendance ──
  {
    patterns: ['attendance', 'attend', 'check in', 'service attendance', 'attendance record', 'my attendance'],
    responses: [
      "📅 **Attendance Tracking:**\n\nYour attendance is **recorded by church administrators** whenever you attend a service. You can:\n\n1. View your full attendance history in the **Attendance** page (sidebar)\n2. See total services attended and monthly count on your **Home** dashboard\n3. Filter by date or service type\n\nFor questions about a specific attendance record, please contact your **branch administrator**.",
    ],
    quickReplies: ['Attendance history', 'Services schedule', 'Branches'],
  },
  {
    patterns: ['attendance history', 'view attendance', 'past attendance', 'attendance record'],
    responses: [
      "To view your attendance history:\n\n1. Click **Attendance** in the sidebar\n2. Your full history of attended services is listed there\n3. The **Home** dashboard also shows a summary — total attended and this month's count\n\nIf you believe a service was not recorded, please contact your branch administrator.",
    ],
    quickReplies: ['Branches', 'Home dashboard', 'Contact admin'],
  },

  // ── Notifications ──
  {
    patterns: ['notification', 'notifications', 'unread', 'alert', 'updates', 'announcements'],
    responses: [
      "🔔 **Notifications** keeps you updated on all your activity:\n\n• Loan application status changes (Pending, Approved, Rejected)\n• Donation confirmation by admin\n• Savings deposit confirmations\n• Attendance records\n• Loan payment reminders\n• Officer verification results\n\nAccess them by clicking **Notifications** (🔔) in the sidebar. Unread items are shown with a badge count.",
    ],
    quickReplies: ['Loans', 'Donations', 'Home'],
  },

  // ── Branches ──
  {
    patterns: ['branch', 'branches', 'location', 'church location', 'address', 'where is the church', 'church address'],
    responses: [
      "🏛️ **PUAC has 9 church branches** across the Philippines.\n\nTo find branch details including:\n• Location & address\n• Contact information\n• Service schedules\n\nVisit the **Branches** page from the sidebar. You'll also see a map of your current branch on the **Home** dashboard.",
    ],
    quickReplies: ['My branch', 'Service schedule', 'Contact admin'],
  },
  {
    patterns: ['my branch', 'which branch', 'what branch', 'my church'],
    responses: [
      "Your assigned branch is shown on your **Home** dashboard under the **\"Your Community\"** section.\n\nYou can update your branch from the **Settings** page. Branch-specific announcements and events are also tailored to your assigned branch.",
    ],
    quickReplies: ['Branches', 'Change branch', 'Settings'],
  },

  // ── Settings ──
  {
    patterns: ['settings', 'profile', 'account', 'update profile', 'change password', 'edit profile'],
    responses: [
      "⚙️ **Settings Page:**\n\nGo to **Settings** in the sidebar to:\n• Update your **profile photo** and personal information\n• Change your **password**\n• Update your **branch** assignment\n• Manage notification preferences\n\nKeep your profile up to date for the best experience!",
    ],
    quickReplies: ['Change password', 'Update branch', 'Home'],
  },
  {
    patterns: ['change password', 'forgot password', 'reset password', 'update password'],
    responses: [
      "🔑 **To Change Your Password:**\n\n1. Go to **Settings** in the sidebar\n2. Scroll to the **Security** section\n3. Enter your **current password** and then your **new password**\n4. Click **Save Changes**\n\n**Forgot your password?** Use the **\"Forgot Password\"** link on the login page — a reset link will be sent to your registered email.",
    ],
    quickReplies: ['Settings', 'Login', 'Home'],
  },

  // ── Contact / Help ──
  {
    patterns: ['contact', 'admin', 'contact admin', 'help', 'support', 'assistance', 'reach out'],
    responses: [
      "📞 **Need to Contact an Administrator?**\n\nFor issues that I can't resolve, please reach out to your **branch administrator** directly through:\n• Your branch's official communication channels\n• In person at your local church branch\n\nYou can find branch contact details on the **Branches** page.",
    ],
    quickReplies: ['Branches', 'Notifications', 'Home'],
  },

  // ── About / What is FaithLy ──
  {
    patterns: ['what is faithly', 'about faithly', 'puac', 'philippine united apostolic', 'about this app', 'what can you do'],
    responses: [
      "🙏 **FaithLy** is the official church portal of the **Philippine United Apostolic Church (PUAC)**.\n\nIt allows members to:\n• 💳 Apply for and manage **Loans** (officers only)\n• 🏦 Set and track **Savings Goals** (officers only)\n• ❤️ Make and track **Donations**\n• 📅 View **Attendance** records\n• 🏛️ Explore **Church Branches**\n• 🔔 Receive real-time **Notifications**\n• 🛡️ Verify **Officer Status**\n\nAll in one secure, encrypted platform! 🔒",
    ],
    quickReplies: ['Loans', 'Donations', 'Officer Verification', 'Attendance'],
  },

  // ── Fallback ──
];

const FALLBACK = [
  "I'm not sure I understand that. Could you try rephrasing?\n\nHere are some things I can help with:",
  "Hmm, I don't have specific information on that yet. Here are some topics I can assist with:",
  "I didn't quite catch that! Let me show you what I can help you with:",
];

const FALLBACK_QUICK_REPLIES = ['Loans', 'Donations', 'Attendance', 'Officer Verification', 'Branches'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getResponse(input) {
  const normalized = input.toLowerCase().trim();

  for (const entry of KB) {
    const matched = entry.patterns.some(p => normalized.includes(p));
    if (matched) {
      return {
        text: pickRandom(entry.responses),
        quickReplies: entry.quickReplies || [],
      };
    }
  }

  return {
    text: pickRandom(FALLBACK),
    quickReplies: FALLBACK_QUICK_REPLIES,
    isFallback: true,
  };
}

const INITIAL_MESSAGE = {
  id: 1,
  sender: 'bot',
  text: null,
  greeting: true,
  quickReplies: ['Loans', 'Donations', 'Attendance', 'Officer Verification', 'Branches'],
  timestamp: new Date(),
};

export default function Chatbot({ isOpen, onClose }) {
  const { profile } = useAuth();
  const firstName = profile?.fullName?.split(' ')[0] || 'there';

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = (text) => {
    const userText = text || input.trim();
    if (!userText) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate bot thinking delay
    const delay = 600 + Math.random() * 600;
    setTimeout(() => {
      const { text: responseText, quickReplies, isFallback } = getResponse(userText);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: responseText,
        quickReplies,
        isFallback,
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, botMsg]);
    }, delay);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Convert markdown-like bold (**text**) to JSX
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="cb-overlay" onClick={onClose}>
      <div className="cb-window" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-brand">
            <div className="cb-avatar">
              <X size={20} />
            </div>
            <div className="cb-header-info">
              <p className="cb-header-name">FaithBot</p>
              <span className="cb-header-status">
                <span className="cb-live-dot" />
                Online
              </span>
            </div>
          </div>
          <button className="cb-close-btn" onClick={onClose} aria-label="Close chat">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="cb-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`cb-msg-row cb-msg-row--${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="cb-bot-avatar">
                  <User size={20} />
                </div>
              )}
              <div className={`cb-bubble cb-bubble--${msg.sender}`}>
                {msg.greeting ? (
                  <p className="cb-bubble-text">
                    👋 Hi <strong>{firstName}</strong>! I'm <strong>FaithBot</strong>, your FaithLy assistant.
                    I can help you with loans, donations, attendance, officer verification, and more.
                    What would you like to know?
                  </p>
                ) : (
                  <p className="cb-bubble-text">
                    {msg.text?.split('\n').map((line, i) => (
                      <span key={i}>
                        {renderText(line)}
                        {i < msg.text.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                )}
                <span className="cb-bubble-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="cb-msg-row cb-msg-row--bot">
              <div className="cb-bot-avatar">
                <User size={20} />
              </div>
              <div className="cb-bubble cb-bubble--bot cb-typing-bubble">
                <span className="cb-typing-dot" />
                <span className="cb-typing-dot" />
                <span className="cb-typing-dot" />
              </div>
            </div>
          )}

          {/* Quick replies of last bot message */}
          {!isTyping && messages.length > 0 && (() => {
            const lastBot = [...messages].reverse().find(m => m.sender === 'bot');
            if (!lastBot?.quickReplies?.length) return null;
            return (
              <div className="cb-quick-replies">
                {lastBot.quickReplies.map(qr => (
                  <button key={qr} className="cb-quick-btn" onClick={() => sendMessage(qr)}>
                    {qr}
                  </button>
                ))}
              </div>
            );
          })()}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="cb-input-bar">
          <input
            ref={inputRef}
            className="cb-input"
            placeholder="Ask me anything about FaithLy..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            disabled={isTyping}
          />
          <button
            className="cb-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <MapPin size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
