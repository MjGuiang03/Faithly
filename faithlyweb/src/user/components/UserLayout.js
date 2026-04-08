import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import UserHeader from './UserHeader';
import Chatbot from './Chatbot';
import NotificationPrompt from '../../components/NotificationPrompt';
import { MessageCircle, X, Menu } from 'lucide-react';
import { useEffect } from 'react';

export default function UserLayout() {
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true' || window.innerWidth < 1024;
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="user-home-layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed}
        toggleCollapsed={toggleSidebar}
      />
      
      <div className="user-main-content">
        <UserHeader 
          collapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar} 
        />
        <div className="user-page-container">
          <Outlet />
        </div>
      </div>

      <NotificationPrompt />

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
