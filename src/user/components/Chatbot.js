import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../styles/Chatbot.css';
import { Send, X, Sparkles } from 'lucide-react';
import API from '../../utils/api';


/* ─────────────────────────────────────────────
   Fallback Knowledge Base (used when AI is unavailable)
───────────────────────────────────────────── */
const KB = [
  { patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'magandang umaga'], responses: ["Hello! 👋 I'm FaithBot, your FaithLy assistant. How can I help you today?"], quickReplies: ['Loans', 'Donations', 'Attendance'] },
  { patterns: ['officer', 'verify', 'verification', 'verified', 'get verified'], responses: ["🛡️ **Officer Verification** unlocks access to the **Loans** and **Savings** modules.\n\n**How to get verified:**\n1. From the Home page, look for the **\"Are you an officer?\"** card\n2. Click **\"Yes, verify me\"**\n3. Enter your **Church ID Number** and select your **Church Position**\n4. Submit — administrators will review it within **3–5 business days**"], quickReplies: ['What positions qualify?', 'Loans', 'Savings'] },
  { patterns: ['loan', 'loans', 'borrow', 'apply loan', 'utang', 'hulugan'], responses: ["💳 **Loans** are available exclusively for **verified church officers**.\n\nGo to **Loans** > **Apply for a Loan** > choose type, amount, and term > submit for admin review."], quickReplies: ['Loan requirements', 'Interest rates'] },
  { patterns: ['savings', 'save', 'ipon'], responses: ["🏦 **Savings** is for **verified church officers**. Set personalized goals, track progress, and deposit funds."], quickReplies: ['How to deposit?'] },
  { patterns: ['donat', 'donation', 'donate', 'giving', 'tithe', 'offering', 'handog'], responses: ["❤️ Go to **Donations** > choose a category > enter amount > upload proof. Methods: E-Wallet, Bank, Cash."], quickReplies: ['Donation categories', 'E-Wallet details'] },
  { patterns: ['attendance', 'attend', 'check in'], responses: ["📅 Attendance is recorded by administrators. View your history in the **Attendance** page."], quickReplies: ['Branches', 'Home'] },
  { patterns: ['branch', 'location', 'address', 'simbahan'], responses: ["🏛️ Visit the **Branches** page to find locations, contact info, and service schedules."], quickReplies: ['My branch', 'Attendance'] },
  { patterns: ['settings', 'profile', 'password', 'account'], responses: ["⚙️ Go to **Settings** to update profile, change password, or manage notifications."], quickReplies: ['Change password', 'Home'] },
  { patterns: ['notification', 'alert', 'updates'], responses: ["🔔 Check **Notifications** for loan updates, donation confirmations, and more."], quickReplies: ['Loans', 'Donations'] },
  { patterns: ['what is faithly', 'about faithly', 'puac', 'ano ang faithly'], responses: ["🙏 **FaithLy** is the official church portal of the **Philippine United Apostolic Church (PUAC)**. It lets members manage loans, savings, donations, attendance, and more — all in one platform."], quickReplies: ['Loans', 'Donations'] },
];

const FALLBACK_REPLIES = ['Loans', 'Donations', 'Attendance', 'Branches'];

function getLocalResponse(input) {
  const normalized = input.toLowerCase().trim();
  for (const entry of KB) {
    if (entry.patterns.some(p => normalized.includes(p))) {
      return { text: entry.responses[0], quickReplies: entry.quickReplies };
    }
  }
  return null;
}

const INITIAL_MESSAGE = {
  id: 1,
  sender: 'bot',
  text: null,
  greeting: true,
  quickReplies: ['Loans', 'Donations', 'Attendance', 'Branches'],
  timestamp: new Date(),
};

export default function Chatbot({ isOpen, onClose }) {
  const { profile } = useAuth();
  const firstName = profile?.fullName?.split(' ')[0] || 'there';
  const token = localStorage.getItem('token');

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isAI, setIsAI] = useState(true); // Track if last response was AI
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

  const sendMessage = async (text) => {
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

    try {
      // Build history for context (last 8 messages)
      const history = [...messages, userMsg]
        .filter(m => m.text && !m.greeting)
        .slice(-8)
        .map(m => ({ sender: m.sender, text: m.text }));

      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userText, history }),
      });

      if (!res.ok) throw new Error('API failed');

      const data = await res.json();

      if (data.success) {
        setIsAI(data.source === 'ai');
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply,
          quickReplies: data.quickReplies || FALLBACK_REPLIES,
          isAI: data.source === 'ai',
          timestamp: new Date(),
        };
        setIsTyping(false);
        setMessages(prev => [...prev, botMsg]);
        return;
      }
      throw new Error('API returned failure');
    } catch (err) {
      // Fallback to local keyword matching
      console.warn('[Chatbot] AI unavailable, using fallback:', err.message);
      const fallback = getLocalResponse(userText);

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: fallback?.text || "I'm not sure I understand that. Could you try rephrasing?\n\nHere are some things I can help with:",
        quickReplies: fallback?.quickReplies || FALLBACK_REPLIES,
        isAI: false,
        timestamp: new Date(),
      };
      setIsAI(false);
      setIsTyping(false);
      setMessages(prev => [...prev, botMsg]);
    }
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
              <Sparkles size={20} color="#fff" />
            </div>
            <div className="cb-header-info">
              <p className="cb-header-name">
                FaithBot
                <span className="cb-ai-badge">AI</span>
              </p>
              <span className="cb-header-status">
                <span className="cb-live-dot" />
                Online
              </span>
            </div>
          </div>
          <button className="cb-close-btn" onClick={onClose} aria-label="Close chat">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="cb-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`cb-msg-row cb-msg-row--${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="cb-bot-avatar">
                  <Sparkles size={12} color="#fff" />
                </div>
              )}
              <div className={`cb-bubble cb-bubble--${msg.sender}`}>
                {msg.greeting ? (
                  <p className="cb-bubble-text">
                    👋 Hi <strong>{firstName}</strong>! I'm <strong>FaithBot</strong>, your AI-powered FaithLy assistant.
                    I can help you with loans, donations, attendance, and more.
                    I also understand Tagalog! What would you like to know?
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
                <div className="cb-bubble-meta">
                  {msg.sender === 'bot' && msg.isAI && (
                    <span className="cb-ai-indicator">
                      <Sparkles size={10} /> AI
                    </span>
                  )}
                  <span className="cb-bubble-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="cb-msg-row cb-msg-row--bot">
              <div className="cb-bot-avatar">
                <Sparkles size={12} color="#fff" />
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
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
