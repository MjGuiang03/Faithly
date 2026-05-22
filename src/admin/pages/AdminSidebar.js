import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  LayoutGrid, Bell, Users, Heart,
  Settings, LogOut,
  Megaphone, MapPin, Calendar, UserCog, BarChart
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/AdminSidebar.css';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
import { processNewNotifications } from '../../utils/desktopNotify';

export default function AdminSidebar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevNotifIdsRef = useRef(new Set());
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = () => {
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
        const res = await fetch(`${API}/api/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          const readIds = new Set(data.readIds || []);
          const allNotifs = data.notifications || [];
          const count = allNotifs.filter(n => !readIds.has(n.id)).length;
          setUnreadCount(count);

          /* ── Desktop push notifications ── */
          const unreadNotifs = allNotifs.filter(n => !readIds.has(n.id));
          prevNotifIdsRef.current = processNewNotifications(
            prevNotifIdsRef.current,
            unreadNotifs,
            '/admin/notification',
            (path) => { window.location.href = path; }
          );
        }
      } catch { /* silent */ }
    };

    calcUnread();



    const onUpdate = () => { calcUnread(); };
    window.addEventListener('admin-notif-read-update', onUpdate);
    const intervalId = setInterval(() => { calcUnread(); }, 60000);
    return () => {
      window.removeEventListener('admin-notif-read-update', onUpdate);
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
            <h1>IsangDiwa</h1>
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
          <LayoutGrid size={18} />
          <span>Dashboard</span>
        </button>

        {/* ── Notification ── */}
        <button
          onClick={() => navigate('/admin/notification')}
          className={`admin-sidebar-nav-button ${isActive('/admin/notification') ? 'active' : ''}`}
        >
          <Bell size={18} />
          <span>Notification</span>
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {/* ── People ── */}
        <span className="admin-sidebar-group-label">People</span>
        <button
          onClick={() => navigate('/admin/members')}
          className={`admin-sidebar-nav-button ${isActive('/admin/members') ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Member List</span>
        </button>
        <button
          onClick={() => navigate('/admin/branches')}
          className={`admin-sidebar-nav-button ${isActive('/admin/branches') ? 'active' : ''}`}
        >
          <MapPin size={18} />
          <span>Communities</span>
        </button>

        {/* ── Finance & Activity ── */}
        <span className="admin-sidebar-group-label">Finance & Activity</span>
        <button
          onClick={() => navigate('/admin/donations')}
          className={`admin-sidebar-nav-button ${isActive('/admin/donations') ? 'active' : ''}`}
        >
          <Heart size={18} />
          <span>Donations</span>
        </button>
        <button
          onClick={() => navigate('/admin/attendance')}
          className={`admin-sidebar-nav-button ${isActive('/admin/attendance') ? 'active' : ''}`}
        >
          <Calendar size={18} />
          <span>Attendance</span>
        </button>
        <button
          onClick={() => navigate('/admin/financial-report')}
          className={`admin-sidebar-nav-button ${isActive('/admin/financial-report') ? 'active' : ''}`}
        >
          <BarChart size={18} />
          <span>Automated Reports</span>
        </button>

        {/* ── Communication ── */}
        <span className="admin-sidebar-group-label">Communication</span>
        <button
          onClick={() => navigate('/admin/announcements')}
          className={`admin-sidebar-nav-button ${isActive('/admin/announcements') ? 'active' : ''}`}
        >
          <Megaphone size={18} />
          <span>Announcements</span>
        </button>

        {/* ── Admin ── */}
        <span className="admin-sidebar-group-label">Admin</span>
        {localStorage.getItem('adminRole') === 'admin' && (
          <button
            onClick={() => navigate('/admin/users')}
            className={`admin-sidebar-nav-button ${isActive('/admin/users') ? 'active' : ''}`}
          >
            <UserCog size={18} />
            <span>User Management</span>
          </button>
        )}
        <button
          onClick={() => navigate('/admin/settings')}
          className={`admin-sidebar-nav-button ${isActive('/admin/settings') ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

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