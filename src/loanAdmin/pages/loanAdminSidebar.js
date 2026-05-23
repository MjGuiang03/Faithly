import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  LayoutGrid, Bell, FileText, CreditCard, AlertTriangle, Settings, LogOut, PiggyBank, BarChart
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/loanAdminSidebar.css';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
import { processNewNotifications } from '../../utils/desktopNotify';
import NotificationPrompt from '../../components/NotificationPrompt';

export default function LoanAdminSidebar() {
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevNotifIdsRef = useRef(new Set());
  const [showLogoutModal, setShowLogoutModal] = useState(false);


  const handleSignOut = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    toast.success('Signed out successfully');
    setShowLogoutModal(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  /* ── Fetch admin unread count ── */
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const calcUnread = async () => {
      try {
        const res  = await fetch(`${API}/api/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          const readIds = new Set(data.readIds || []);
          const loanNotifs = (data.notifications || []).filter(n => n.type === 'loan');
          const count = loanNotifs.filter(n => !readIds.has(n.id)).length;
          setUnreadCount(count);

          /* ── Desktop push notifications ── */
          const unreadNotifs = loanNotifs.filter(n => !readIds.has(n.id));
          prevNotifIdsRef.current = processNewNotifications(
            prevNotifIdsRef.current,
            unreadNotifs,
            '/loan-admin/notifications',
            (path) => { window.location.href = path; }
          );
        }
      } catch { /* silent */ }
    };

    calcUnread();

    const onUpdate = () => calcUnread();
    window.addEventListener('admin-notif-read-update', onUpdate);
    
    // Poll every 30 seconds for live updates
    const intervalId = setInterval(calcUnread, 60000);
    
    return () => {
      window.removeEventListener('admin-notif-read-update', onUpdate);
      window.removeEventListener('storage', calcUnread);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="loan-admin-sidebar">
      <div className="loan-admin-sidebar-logo">
        <div className="loan-admin-sidebar-logo-content">
          <div className="loan-admin-sidebar-logo-image">
            <img alt="IsangDiwa Logo" src={puacLogo} />
          </div>
          <div className="loan-admin-sidebar-logo-text">
            <h1>IsangDiwa</h1>
            <p>Loan Admin Portal</p>
          </div>
        </div>
      </div>

      <div className="loan-admin-sidebar-nav">
        <span className="loan-admin-sidebar-group-label">Core</span>
        <button
          onClick={() => navigate('/loan-admin/dashboard')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/dashboard') ? 'active' : ''}`}
        >
          <LayoutGrid size={20} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => navigate('/loan-admin/notifications')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/notifications') ? 'active' : ''}`}
        >
          <Bell size={20} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        <span className="loan-admin-sidebar-group-label">Management</span>
        <button
          onClick={() => navigate('/loan-admin/loan-management')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/loan-management') ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>Loan Management</span>
        </button>

        <button
          onClick={() => navigate('/loan-admin/payments/loans')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/payments/loans') || isActive('/loan-admin/payments') ? 'active' : ''}`}
        >
          <CreditCard size={20} />
          <span>Payments</span>
        </button>

        <button
          onClick={() => navigate('/loan-admin/payments/savings')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/payments/savings') ? 'active' : ''}`}
        >
          <PiggyBank size={20} />
          <span>Savings</span>
        </button>

        <span className="loan-admin-sidebar-group-label">Analysis</span>
        <button
          onClick={() => navigate('/loan-admin/delinquency')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/delinquency') ? 'active' : ''}`}
        >
          <AlertTriangle size={20} />
          <span>Delinquency Reports</span>
        </button>

        <button
          onClick={() => navigate('/admin/financial-report')}
          className={`loan-admin-sidebar-nav-button ${isActive('/admin/financial-report') ? 'active' : ''}`}
        >
          <BarChart size={20} />
          <span>Automated Reports</span>
        </button>

        <span className="loan-admin-sidebar-group-label">Admin</span>
        <button
          onClick={() => navigate('/loan-admin/settings')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/settings') ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>

      {/* Theme Toggle Section */}
      <div className="loan-admin-sidebar-theme-toggle">
        <div className="loan-theme-switch-wrapper">
          <span className="loan-theme-switch-label">Dark Mode</span>
          <label className="loan-toggle-switch">
            <input 
              type="checkbox" 
              checked={theme === 'dark'} 
              onChange={toggleTheme} 
            />
            <span className="loan-toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="loan-admin-sidebar-profile">
        <div className="loan-admin-sidebar-profile-info">
          <div className="loan-admin-sidebar-profile-avatar">
            <p>LA</p>
          </div>
          <div className="loan-admin-sidebar-profile-details">
            <p className="loan-admin-sidebar-profile-name">Loan Admin</p>
            <p className="loan-admin-sidebar-profile-email">
              {localStorage.getItem('adminEmail') || 'loans@faithly.com'}
            </p>
          </div>
        </div>
        <button onClick={() => setShowLogoutModal(true)} className="loan-admin-sidebar-profile-signout">
          <LogOut size={20} />
          Sign Out
        </button>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal-content">
            <h2 className="logout-modal-title">Confirm Logout</h2>
            <p className="logout-modal-message">Are you sure you want to log out?</p>
            <div className="logout-modal-actions">
              <button className="logout-modal-cancel" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="logout-modal-confirm" onClick={handleSignOut}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
      <NotificationPrompt />
    </div>
  );
}
