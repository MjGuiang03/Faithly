import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  LayoutGrid, Bell, Users, Heart,
  Calendar, Building2, BarChart3, Settings, LogOut,
  ChevronDown, ChevronUp
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/AdminSidebar.css';

import API from '../../utils/api';
const ADMIN_READ_KEY = 'faithly_admin_read_notifications';

export default function AdminSidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  const [isMembersOpen, setIsMembersOpen] = useState(() => {
    return location.pathname.startsWith('/admin/members') || location.pathname.startsWith('/admin/officerverification');
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    toast.success('Signed out successfully');
    setShowLogoutModal(false);
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

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

    const onUpdate = () => {
      calcUnread();
      fetchPendingVerifications();
    };
    const onStorage = (e) => {
      if (e.key === ADMIN_READ_KEY) calcUnread();
    };
    window.addEventListener('admin-notif-read-update', onUpdate);
    window.addEventListener('storage', onStorage);
    
    // Poll every 30 seconds for live updates
    const intervalId = setInterval(() => {
      calcUnread();
      fetchPendingVerifications();
    }, 30000);
    
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
        <button
          onClick={() => navigate('/admin/dashboard')}
          className={`admin-sidebar-nav-button ${isActive('/admin/dashboard') || location.pathname === '/admin' ? 'active' : ''}`}
        >
          <LayoutGrid size={20} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => navigate('/admin/notification')}
          className={`admin-sidebar-nav-button ${isActive('/admin/notification') ? 'active' : ''}`}
        >
          <Bell size={20} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        <div className={`admin-sidebar-dropdown ${isMembersOpen ? 'open' : ''}`}>
          <button
            onClick={() => setIsMembersOpen(!isMembersOpen)}
            className={`admin-sidebar-nav-button ${isActive('/admin/members') || isActive('/admin/officerverification') ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Members</span>
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
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/admin/donations')}
          className={`admin-sidebar-nav-button ${isActive('/admin/donations') ? 'active' : ''}`}
        >
          <Heart size={20} />
          <span>Donations</span>
        </button>

        <button
          onClick={() => navigate('/admin/attendance')}
          className={`admin-sidebar-nav-button ${isActive('/admin/attendance') ? 'active' : ''}`}
        >
          <Calendar size={20} />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => navigate('/admin/branches')}
          className={`admin-sidebar-nav-button ${isActive('/admin/branches') ? 'active' : ''}`}
        >
          <Building2 size={20} />
          <span>Branches</span>
        </button>

        <button
          onClick={() => navigate('/admin/reports')}
          className={`admin-sidebar-nav-button ${isActive('/admin/reports') ? 'active' : ''}`}
        >
          <BarChart3 size={20} />
          <span>Reports</span>
        </button>

        <button
          onClick={() => navigate('/admin/settings')}
          className={`admin-sidebar-nav-button ${isActive('/admin/settings') ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
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