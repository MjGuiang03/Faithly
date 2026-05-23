import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../styles/Chatbot.css';
import { Send, X, Sparkles } from 'lucide-react';
import API from '../../utils/api';


/* ─────────────────────────────────────────────
   Fallback Knowledge Base (used when AI is unavailable)
───────────────────────────────────────────── */
const KB_SHARED = [
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'magandang umaga', 'magandang hapon'],
    responses: ["Hello! 👋 I'm IsangDiwa Chatbot, your Faithly assistant. How can I help you today?"],
    quickReplies: ['Donations', 'Savings', 'Attendance', 'Branches']
  },
  {
    patterns: ['savings', 'save', 'ipon', 'savings goal'],
    responses: ["🏦 **Savings:**\n\nYou can set personal savings goals, track progress, and deposit via Gateway or Manual.\n\nGo to **Savings** to manage your goals."],
    quickReplies: ['Donations', 'Attendance']
  },
  {
    patterns: ['donat', 'donation', 'donate', 'giving', 'tithe', 'offering', 'handog', 'ikapu'],
    responses: ["❤️ **Donations** are open to all members!\n\n**Categories:** General Fund, Children's Dept, Men's Dept, Women's Dept, Youth Dept, Mission Fund\n\n**Methods:**\n- **Gateway:** GCash, Maya, Card, Bank (auto-confirmed)\n- **Manual:** Cash or Bank Transfer — upload proof; admin confirms\n\nGo to **Donations** → choose category → enter amount → select payment method."],
    quickReplies: ['Attendance', 'Branches']
  },
  {
    patterns: ['attendance', 'attend', 'check in', 'presensya'],
    responses: ["📅 Attendance is recorded by administrators via **manual entry** or **RFID tap**.\n\nYou cannot log your own attendance. View your history on the **Attendance** page or your Home dashboard."],
    quickReplies: ['Branches', 'Donations']
  },
  {
    patterns: ['branch', 'location', 'address', 'simbahan', 'church', 'community'],
    responses: ["🏛️ IsangDiwa has multiple branches across the Philippines. Visit the **Branches** page to find locations, contact info, and service schedules."],
    quickReplies: ['Attendance', 'Donations']
  },
  {
    patterns: ['settings', 'profile', 'password', 'account', 'update profile'],
    responses: ["👤 To view or update your profile, click your **name or avatar on the sidebar** — it will take you to your profile page where you can edit your info and change your password."],
    quickReplies: ['Donations', 'Savings', 'Attendance']
  },
  {
    patterns: ['notification', 'alert', 'updates', 'abiso'],
    responses: ["🔔 **Notifications** keep you updated on:\n- Donation confirmations/rejections\n- Savings updates\n- Attendance records\n\nCheck the **Notifications** page for all updates."],
    quickReplies: ['Donations', 'Savings', 'Attendance']
  },
  {
    patterns: ['what is faithly', 'about faithly', 'isangdiwa', 'ano ang faithly', 'what is isangdiwa', 'portal'],
    responses: ["🙏 **Faithly** is the official digital portal of the **Philippine United Apostolic Church (IsangDiwa)**.\n\nAll members can manage donations, savings, attendance, and branches. **Church officers** also get access to loans."],
    quickReplies: ['Donations', 'Savings', 'Attendance']
  },
];

const KB_OFFICER_ONLY = [
  {
    patterns: ['loan', 'loans', 'borrow', 'apply loan', 'utang', 'hulugan', 'pautang'],
    responses: ["💳 **Loan Application:**\n\nGo to **Loans** → **Apply for a Loan** → fill in loan type, amount, and term → upload required documents → submit for admin review."],
    quickReplies: ['Loan statuses', 'Late payment', 'Donations']
  },
  {
    patterns: ['late', 'penalty', 'overdue', 'missed payment', 'late payment'],
    responses: ["⚠️ **Late Payment Penalty:**\nIf a loan payment is not made within **3 days** of the due date, a **3% flat interest penalty** replaces the regular interest for that month.\n\nCheck your due date in the Loan Detail page."],
    quickReplies: ['Loans', 'Loan statuses']
  },
];

const KB_MEMBER_BLOCK = [
  {
    patterns: ['loan', 'loans', 'borrow', 'apply loan', 'utang', 'hulugan', 'pautang',
               'late', 'penalty', 'overdue', 'missed payment', 'late payment'],
    responses: ["🚫 **Loans are only available to church officers.**\n\nAs a regular member, you do not have access to this feature."],
    quickReplies: ['Savings', 'Donations', 'Attendance']
  },
];

function getLocalResponse(input, isOfficer) {
  const normalized = input.toLowerCase().trim();
  // Check role-specific KB first
  const roleKB = isOfficer ? KB_OFFICER_ONLY : KB_MEMBER_BLOCK;
  for (const entry of roleKB) {
    if (entry.patterns.some(p => normalized.includes(p))) {
      return { text: entry.responses[0], quickReplies: entry.quickReplies };
    }
  }
  for (const entry of KB_SHARED) {
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
  quickReplies: ['Donations', 'Savings', 'Attendance', 'Branches'],
  timestamp: new Date(),
};

export default function Chatbot({ isOpen, onClose }) {
  const { profile } = useAuth();
  const firstName = profile?.fullName?.split(' ')[0] || 'there';
  const token = localStorage.getItem('token');

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOfficer, setIsOfficer] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isAI, setIsAI] = useState(true);
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
        if (data.isOfficer !== undefined) setIsOfficer(data.isOfficer);
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply,
          quickReplies: data.quickReplies || ['Donations', 'Savings', 'Attendance', 'Branches'],
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
      const fallback = getLocalResponse(userText, isOfficer);
      const defaultReplies = isOfficer
        ? ['Loans', 'Donations', 'Savings', 'Attendance']
        : ['Donations', 'Savings', 'Attendance', 'Branches'];

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: fallback?.text || "I'm not sure I understand that. Could you try rephrasing?\n\nHere are some things I can help with:",
        quickReplies: fallback?.quickReplies || defaultReplies,
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

  // Render a single text segment: handles **bold** inline
  const renderInline = (text, keyPrefix) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
      }
      return <span key={`${keyPrefix}-s${i}`}>{part}</span>;
    });
  };

  // Full markdown renderer: bullet lists, numbered lists, bold, plain text
  const renderText = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let listItems = [];
    let listType = null; // 'ul' or 'ol'

    const flushList = () => {
      if (listItems.length === 0) return;
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} style={{ margin: '4px 0 4px 16px', paddingLeft: '4px' }}>
            {listItems.map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} style={{ margin: '4px 0 4px 16px', paddingLeft: '4px', listStyleType: 'disc' }}>
            {listItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    };

    lines.forEach((line, idx) => {
      const bulletMatch = line.match(/^[-*]\s+(.+)/);
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);

      if (bulletMatch) {
        if (listType === 'ol') flushList();
        listType = 'ul';
        listItems.push(renderInline(bulletMatch[1], `ul-item-${idx}`));
      } else if (numberedMatch) {
        if (listType === 'ul') flushList();
        listType = 'ol';
        listItems.push(renderInline(numberedMatch[2], `ol-item-${idx}`));
      } else {
        flushList();
        if (line.trim() === '') {
          elements.push(<br key={`br-${idx}`} />);
        } else {
          elements.push(
            <span key={`line-${idx}`} style={{ display: 'block' }}>
              {renderInline(line, `line-${idx}`)}
            </span>
          );
        }
      }
    });

    flushList();
    return elements;
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
                IsangDiwa Chatbot
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
                    👋 Hi <strong>{firstName}</strong>! I'm <strong>IsangDiwa Chatbot</strong>, your AI-powered Faithly assistant.
                    I can help with <strong>donations</strong>, <strong>savings</strong>, <strong>attendance</strong>, and more.
                    {' '}Type anything to get started!
                  </p>
                ) : (
                  <div className="cb-bubble-text">
                    {msg.text ? renderText(msg.text) : null}
                  </div>
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
            placeholder="Ask me anything about IsangDiwa..."
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
