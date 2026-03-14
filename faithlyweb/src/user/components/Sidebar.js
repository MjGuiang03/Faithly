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
          const ids = [`loan-approved-${l._id}`, `loan-pending-${l._id}`, `loan-rejected-${l._id}`, `loan-done-${l._id}`];
          if (l.status === 'active' && l.nextPaymentDate) ids.push(`loan-reminder-${l._id}`);
          ids.forEach(id => { if (!readIds.has(id)) count++; });
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
        <div className="sidebar-mobile-overlay" onClick={() => setCollapsed(true)} />
      )}
      
      {/* Toggle button is OUTSIDE the sidebar div so overflow:hidden never clips it */}
      <button
        className="sidebar-toggle-btn"
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

      <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-content">
            <div className="sidebar-logo-image">
              <img alt="PUAC Logo" src={puacLogo} />
            </div>
            {!collapsed && (
              <div className="sidebar-logo-text">
                <h1>FaithLy</h1>
                <p>Member Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation — clicking these ONLY navigates, never touches collapsed */}
        <div className="sidebar-nav">
          {navItems.map(({ path, icon, label, badge }) => (
            <button
              key={path}
              onClick={() => handleNavClick(path)}
              className={`sidebar-nav-button ${isActive(path) ? 'active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className="sidebar-nav-icon">{icon}</span>
              {!collapsed && <span>{label}</span>}
              {badge > 0 && (
                <span className="sidebar-notif-badge">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="sidebar-profile">
          <div
            className={`sidebar-profile-info ${isActive('/settings') ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
            onClick={() => navigate('/settings')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/settings')}
            title={collapsed ? profile?.fullName || 'Settings' : undefined}
          >
            <div className="sidebar-profile-avatar">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <p>{profile?.fullName?.charAt(0)?.toUpperCase() || 'M'}</p>
              )}
            </div>
            {!collapsed && (
              <div className="sidebar-profile-details">
                <p className="sidebar-profile-name">{profile?.fullName || 'Member'}</p>
                <p className="sidebar-profile-email">{user?.email || 'member@puac.org'}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className={`sidebar-profile-signout ${collapsed ? 'collapsed' : ''}`}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={20} />
            {!collapsed && 'Sign Out'}
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
    </>
  );
}