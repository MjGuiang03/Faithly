import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  LayoutGrid, Bell, FileText, CreditCard, AlertTriangle, Settings, LogOut,
  ChevronDown, PiggyBank, FileBarChart2
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/loanAdminSidebar.css';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
const LOAN_ADMIN_READ_KEY = 'faithly_admin_read_notifications'; // Uses the same key if they share the notifications endpoint, or a distinct one if needed. Let's use the same

export default function LoanAdminSidebar() {
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(
    location.pathname.startsWith('/loan-admin/payments')
  );

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
        const readIds = new Set(JSON.parse(localStorage.getItem(LOAN_ADMIN_READ_KEY) || '[]'));
        const res  = await fetch(`${API}/api/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          const count = (data.notifications || [])
                .filter(n => n.type === 'loan')  // LoanAdmins only see loan notifications
                .filter(n => !readIds.has(n.id))
                .length;
          setUnreadCount(count);
        }
      } catch { /* silent */ }
    };

    calcUnread();

    const onUpdate = () => calcUnread();
    window.addEventListener('admin-notif-read-update', onUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === LOAN_ADMIN_READ_KEY) calcUnread();
    });
    
    // Poll every 30 seconds for live updates
    const intervalId = setInterval(calcUnread, 30000);
    
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
            <img alt="PUAC Logo" src={puacLogo} />
          </div>
          <div className="loan-admin-sidebar-logo-text">
            <h1>FaithLy</h1>
            <p>Loan Admin Portal</p>
          </div>
        </div>
      </div>

      <div className="loan-admin-sidebar-nav">
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

        <button
          onClick={() => navigate('/loan-admin/loan-management')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/loan-management') ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>Loan Management</span>
        </button>

        {/* Payments Dropdown */}
        <div className="loan-admin-sidebar-dropdown">
          <button
            onClick={() => setPaymentsOpen(o => !o)}
            className={`loan-admin-sidebar-nav-button ${
              location.pathname.startsWith('/loan-admin/payments') ? 'active' : ''
            }`}
          >
            <CreditCard size={20} />
            <span>Payments</span>
            <ChevronDown
              size={16}
              className={`loan-admin-dropdown-chevron ${paymentsOpen ? 'open' : ''}`}
            />
          </button>
          {paymentsOpen && (
            <div className="loan-admin-sidebar-subnav">
              <button
                onClick={() => navigate('/loan-admin/payments/loans')}
                className={`loan-admin-sidebar-subnav-button ${
                  location.pathname === '/loan-admin/payments/loans' ? 'active' : ''
                }`}
              >
                <FileBarChart2 size={16} />
                <span>Loans</span>
              </button>
              <button
                onClick={() => navigate('/loan-admin/payments/savings')}
                className={`loan-admin-sidebar-subnav-button ${
                  location.pathname === '/loan-admin/payments/savings' ? 'active' : ''
                }`}
              >
                <PiggyBank size={16} />
                <span>Savings</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/loan-admin/delinquency')}
          className={`loan-admin-sidebar-nav-button ${isActive('/loan-admin/delinquency') ? 'active' : ''}`}
        >
          <AlertTriangle size={20} />
          <span>Delinquency Reports</span>
        </button>

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
    </div>
  );
}
