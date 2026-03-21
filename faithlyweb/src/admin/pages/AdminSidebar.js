import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  LayoutGrid, Bell, Users, Heart,
  Settings, LogOut,
  ChevronDown, ChevronUp, Megaphone
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/AdminSidebar.css';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
const ADMIN_READ_KEY = 'faithly_admin_read_notifications';

export default function AdminSidebar() {
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  const [isMembersOpen,  setIsMembersOpen]  = useState(() =>
    location.pathname.startsWith('/admin/members') || location.pathname.startsWith('/admin/officerverification')
  );
  const [isFinanceOpen,  setIsFinanceOpen]  = useState(() =>
    location.pathname.startsWith('/admin/donations') || location.pathname.startsWith('/admin/attendance')
  );
  const [isCommsOpen,    setIsCommsOpen]    = useState(() =>
    location.pathname.startsWith('/admin/announcements')
  );
  const [isAdminOpen,    setIsAdminOpen]    = useState(() =>
    location.pathname.startsWith('/admin/reports') ||
    location.pathname.startsWith('/admin/users') ||
    location.pathname.startsWith('/admin/settings')
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    toast.success('Signed out successfully');
    setShowLogoutModal(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;
  const isGroupActive = (...paths) => paths.some(p => location.pathname.startsWith(p));

  /* ── Fetch admin unread count ── */
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const calcUnread = async () => {
      try {
        const readIds = new Set(JSON.parse(localStorage.getItem(ADMIN_READ_KEY) || '[]'));
        const res  = await fetch(`${API}/api/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          const count = (data.notifications || []).filter(n => !readIds.has(n.id)).length;
          setUnreadCount(count);
        }
      } catch { /* silent */ }
    };

    calcUnread();
    
    const fetchPendingVerifications = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        const res = await fetch(`${API}/api/admin/verifications?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          setPendingVerificationsCount(data.stats?.pending || 0);
        }
      } catch { /* silent */ }
    };

    fetchPendingVerifications();

    const onUpdate = () => { calcUnread(); fetchPendingVerifications(); };
    const onStorage = (e) => { if (e.key === ADMIN_READ_KEY) calcUnread(); };
    window.addEventListener('admin-notif-read-update', onUpdate);
    window.addEventListener('storage', onStorage);
    const intervalId = setInterval(() => { calcUnread(); fetchPendingVerifications(); }, 30000);
    return () => {
      window.removeEventListener('admin-notif-read-update', onUpdate);
      window.removeEventListener('storage', onStorage);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-content">
          <div className="admin-sidebar-logo-image">
            <img alt="PUAC Logo" src={puacLogo} />
          </div>
          <div className="admin-sidebar-logo-text">
            <h1>FaithLy</h1>
            <p>Main Admin Portal</p>
          </div>
        </div>
      </div>

      <div className="admin-sidebar-nav">

        {/* ── Dashboard ── */}
        <button
          onClick={() => navigate('/admin/dashboard')}
          className={`admin-sidebar-nav-button ${isActive('/admin/dashboard') || location.pathname === '/admin' ? 'active' : ''}`}
        >
          <LayoutGrid size={20} />
          <span>Dashboard</span>
        </button>

        {/* ── Notification ── */}
        <button
          onClick={() => navigate('/admin/notification')}
          className={`admin-sidebar-nav-button ${isActive('/admin/notification') ? 'active' : ''}`}
        >
          <Bell size={20} />
          <span>Notification</span>
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {/* ── People ── */}
        <div className={`admin-sidebar-dropdown ${isMembersOpen ? 'open' : ''}`}>
          <button
            onClick={() => setIsMembersOpen(!isMembersOpen)}
            className={`admin-sidebar-nav-button ${isGroupActive('/admin/members', '/admin/officerverification', '/admin/branches') ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>People</span>
            <span className="admin-sidebar-chevron">
              {isMembersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {isMembersOpen && (
            <div className="admin-sidebar-dropdown-content">
              <button
                onClick={() => navigate('/admin/members')}
                className={`admin-sidebar-sub-button ${isActive('/admin/members') ? 'active' : ''}`}
              >
                <span>Member List</span>
              </button>
              <button
                onClick={() => navigate('/admin/officerverification')}
                className={`admin-sidebar-sub-button ${isActive('/admin/officerverification') ? 'active' : ''}`}
              >
                <span>Officer Verification</span>
                {pendingVerificationsCount > 0 && (
                  <span className="sidebar-notif-badge">{pendingVerificationsCount}</span>
                )}
              </button>
              <button
                onClick={() => navigate('/admin/branches')}
                className={`admin-sidebar-sub-button ${isActive('/admin/branches') ? 'active' : ''}`}
              >
                <span>Branches</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Finance & Activity ── */}
        <div className={`admin-sidebar-dropdown ${isFinanceOpen ? 'open' : ''}`}>
          <button
            onClick={() => setIsFinanceOpen(!isFinanceOpen)}
            className={`admin-sidebar-nav-button ${isGroupActive('/admin/donations', '/admin/attendance') ? 'active' : ''}`}
          >
            <Heart size={20} />
            <span>Finance & Activity</span>
            <span className="admin-sidebar-chevron">
              {isFinanceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {isFinanceOpen && (
            <div className="admin-sidebar-dropdown-content">
              <button
                onClick={() => navigate('/admin/donations')}
                className={`admin-sidebar-sub-button ${isActive('/admin/donations') ? 'active' : ''}`}
              >
                <span>Donations</span>
              </button>
              <button
                onClick={() => navigate('/admin/attendance')}
                className={`admin-sidebar-sub-button ${isActive('/admin/attendance') ? 'active' : ''}`}
              >
                <span>Attendance</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Communication ── */}
        <div className={`admin-sidebar-dropdown ${isCommsOpen ? 'open' : ''}`}>
          <button
            onClick={() => setIsCommsOpen(!isCommsOpen)}
            className={`admin-sidebar-nav-button ${isGroupActive('/admin/announcements') ? 'active' : ''}`}
          >
            <Megaphone size={20} />
            <span>Communication</span>
            <span className="admin-sidebar-chevron">
              {isCommsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {isCommsOpen && (
            <div className="admin-sidebar-dropdown-content">
              <button
                onClick={() => navigate('/admin/announcements')}
                className={`admin-sidebar-sub-button ${isActive('/admin/announcements') ? 'active' : ''}`}
              >
                <span>Announcements</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Admin ── */}
        <div className={`admin-sidebar-dropdown ${isAdminOpen ? 'open' : ''}`}>
          <button
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className={`admin-sidebar-nav-button ${isGroupActive('/admin/reports', '/admin/users', '/admin/settings') ? 'active' : ''}`}
          >
            <Settings size={20} />
            <span>Admin</span>
            <span className="admin-sidebar-chevron">
              {isAdminOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {isAdminOpen && (
            <div className="admin-sidebar-dropdown-content">
              <button
                onClick={() => navigate('/admin/reports')}
                className={`admin-sidebar-sub-button ${isActive('/admin/reports') ? 'active' : ''}`}
              >
                <span>Reports</span>
              </button>
              {localStorage.getItem('adminRole') === 'admin' && (
                <button
                  onClick={() => navigate('/admin/users')}
                  className={`admin-sidebar-sub-button ${isActive('/admin/users') ? 'active' : ''}`}
                >
                  <span>User Management</span>
                </button>
              )}
              <button
                onClick={() => navigate('/admin/settings')}
                className={`admin-sidebar-sub-button ${isActive('/admin/settings') ? 'active' : ''}`}
              >
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Theme Toggle Section */}
      <div className="admin-sidebar-theme-toggle">
        <div className="admin-theme-switch-wrapper">
          <span className="admin-theme-switch-label">Dark Mode</span>
          <label className="admin-toggle-switch">
            <input 
              type="checkbox" 
              checked={theme === 'dark'} 
              onChange={toggleTheme} 
            />
            <span className="admin-toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="admin-sidebar-profile">
        <div className="admin-sidebar-profile-info">
          <div className="admin-sidebar-profile-avatar">
            <p>A</p>
          </div>
          <div className="admin-sidebar-profile-details">
            <p className="admin-sidebar-profile-name">Admin</p>
            <p className="admin-sidebar-profile-email">
              {localStorage.getItem('adminEmail')}
            </p>
          </div>
        </div>
        <button onClick={() => setShowLogoutModal(true)} className="admin-sidebar-profile-signout">
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