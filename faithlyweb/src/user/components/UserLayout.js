import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Chatbot from './Chatbot';
import { MessageCircle, X } from 'lucide-react';

export default function UserLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="user-home-layout">
      <Sidebar chatOpen={chatOpen} setChatOpen={setChatOpen} />
      
      <div className="user-main-content">
        <Outlet />
      </div>

      {/* Floating Chat Button */}
      <button
        className={`user-chat-button ${chatOpen ? 'user-chat-button--open' : ''}`}
        onClick={() => setChatOpen(prev => !prev)}
        aria-label={chatOpen ? 'Close chat' : 'Open chat'}
        title={chatOpen ? 'Close chat' : 'Chat with FaithBot'}
      >
        {chatOpen ? (
          <X size={22} color="white" />
        ) : (
          <MessageCircle size={24} color="white" />
        )}
      </button>

      {/* Chatbot */}
      <Chatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
