import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { LayoutGrid, FileText, Heart, Calendar, Building2, Settings, LogOut, Bell, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/Sidebar.css';

import API from '../../utils/api';
const READ_KEY = 'faithly_notif_read';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ONLY way to change collapsed manually — the toggle button
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (mobile) {
        setCollapsed(true); // Always keep folded on mobile initially
      } else if (window.innerWidth < 1024) {
        setCollapsed(true); // Keep folded on tablet
      } else {
        // Only expand automatically if they didn't manually collapse it
        const userPreference = localStorage.getItem('sidebar_collapsed');
        if (userPreference !== 'true') setCollapsed(false);
      }
    };

    // Run once on mount
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setCollapsed(true); // Auto-close sidebar on mobile after clicking link
    }
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success('Signed out successfully');
      navigate('/');
    }
    setShowLogoutModal(false);
  };

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const calcUnread = async () => {
      try {
        const readIds = new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));

        const [lRes, dRes, aRes] = await Promise.all([
          fetch(`${API}/api/loans/my-loans`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/donations/my-donations`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/attendance/my-attendance`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const [lData, dData, aData] = await Promise.all([
          lRes.ok ? lRes.json() : { loans: [] },
          dRes.ok ? dRes.json() : { donations: [] },
          aRes.ok ? aRes.json() : { attendance: [] },
        ]);

        let count = 0;
        (lData.loans || []).forEach((l) => {
          if (l.statusHistory && l.statusHistory.length > 0) {
            l.statusHistory.forEach((history) => {
              let idStr = '';
              if (history.status === 'pending') idStr = `loan-pending-${l._id}`;
              else if (history.status === 'approved') idStr = `loan-approved-${l._id}`;
              else if (history.status === 'rejected') idStr = `loan-rejected-${l._id}`;
              else if (history.status === 'processed') idStr = `loan-processed-${l._id}`;
              
              if (idStr && !readIds.has(idStr)) count++;
            });
          } else {
            let idStr = '';
            if (l.status === 'approved' || l.status === 'active') idStr = `loan-approved-${l._id}`;
            else if (l.status === 'pending') idStr = `loan-pending-${l._id}`;
            else if (l.status === 'rejected') idStr = `loan-rejected-${l._id}`;
            else if (l.status === 'completed') idStr = `loan-done-${l._id}`;

            if (idStr && !readIds.has(idStr)) count++;
          }

          if (l.status === 'active' && l.nextPaymentDate) {
            if (!readIds.has(`loan-reminder-${l._id}`)) count++;
          }
        });
        (dData.donations || []).forEach((d) => { if (!readIds.has(`donation-${d._id}`)) count++; });
        (aData.attendance || []).forEach((a) => { if (!readIds.has(`attendance-${a._id}`)) count++; });

        setUnreadCount(count);
      } catch { /* silent */ }
    };

    calcUnread();
    
    // Fast-path: When Notifications.js updates, it sends the exact new count via `detail`
    const handleLocalUpdate = (e) => {
      if (e.detail !== undefined) {
        setUnreadCount(e.detail);
      } else {
        calcUnread();
      }
    };
    
    window.addEventListener('notif-read-update', handleLocalUpdate);
    window.addEventListener('storage', (e) => {
      // If another tab or component updates the read key, recalculate
      if (e.key === READ_KEY) calcUnread();
    });
    
    // Poll every 30 seconds for new notifications
    const intervalId = setInterval(calcUnread, 30000);
    
    return () => {
      window.removeEventListener('notif-read-update', handleLocalUpdate);
      window.removeEventListener('storage', calcUnread);
      clearInterval(intervalId);
    };
  }, []);

  const navItems = [
    { path: '/home', icon: <LayoutGrid size={20} />, label: 'Home' },
    { path: '/notifications', icon: <Bell size={20} />, label: 'Notifications', badge: unreadCount },
    { path: '/loans', icon: <FileText size={20} />, label: 'Loans' },
    { path: '/donation', icon: <Heart size={20} />, label: 'Donations' },
    { path: '/attendance', icon: <Calendar size={20} />, label: 'Attendance' },
    { path: '/branches', icon: <Building2 size={20} />, label: 'Branches' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <>
      {isMobile && !collapsed && (
        <div className="user-sidebar-mobile-overlay" onClick={() => setCollapsed(true)} />
      )}
      
      {/* Toggle button is OUTSIDE the sidebar div so overflow:hidden never clips it */}
      <button
        className="user-sidebar-toggle-btn"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{ 
          left: isMobile ? '16px' : (collapsed ? '58px' : '242px'),
          top: isMobile ? '16px' : '20px',
          zIndex: 100 // keep above overlay
        }}
      >
        {isMobile ? (
          collapsed ? <Menu size={20} /> : <X size={20} />
        ) : (
          collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />
        )}
      </button>

      <div className={`user-sidebar ${collapsed ? 'user-sidebar-collapsed' : ''}`}>

        {/* Logo */}
        <div className="user-sidebar-logo">
          <div className="user-sidebar-logo-content">
            <div className="user-sidebar-logo-image">
              <img alt="PUAC Logo" src={puacLogo} />
            </div>
            {!collapsed && (
              <div className="user-sidebar-logo-text">
                <h1>FaithLy</h1>
                <p>Member Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation — clicking these ONLY navigates, never touches collapsed */}
        <div className="user-sidebar-nav">
          {navItems.map(({ path, icon, label, badge }) => (
            <button
              key={path}
              onClick={() => handleNavClick(path)}
              className={`user-sidebar-nav-button ${isActive(path) ? 'active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className="user-sidebar-nav-icon">{icon}</span>
              {!collapsed && <span>{label}</span>}
              {badge > 0 && (
                <span className="user-sidebar-notif-badge">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="user-sidebar-profile">
          <div
            className={`user-sidebar-profile-info ${isActive('/settings') ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
            onClick={() => navigate('/settings')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/settings')}
            title={collapsed ? profile?.fullName || 'Settings' : undefined}
          >
            <div className="user-sidebar-profile-avatar">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <p>{profile?.fullName?.charAt(0)?.toUpperCase() || 'M'}</p>
              )}
            </div>
            {!collapsed && (
              <div className="user-sidebar-profile-details">
                <p className="user-sidebar-profile-name">{profile?.fullName || 'Member'}</p>
                <p className="user-sidebar-profile-email">{user?.email || 'member@puac.org'}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className={`user-sidebar-profile-signout ${collapsed ? 'collapsed' : ''}`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={20} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>

        {/* Logout Modal */}
        {showLogoutModal && (
          <div className="user-logout-modal-overlay">
            <div className="user-logout-modal-content">
              <h2 className="user-logout-modal-title">Confirm Logout</h2>
              <p className="user-logout-modal-message">Are you sure you want to log out?</p>
              <div className="user-logout-modal-actions">
                <button className="user-logout-modal-cancel" onClick={() => setShowLogoutModal(false)}>Cancel</button>
                <button className="user-logout-modal-confirm" onClick={handleSignOut}>Sign Out</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}