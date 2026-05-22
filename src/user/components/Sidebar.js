import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { Building2, Calendar, FileText, Heart, LayoutGrid, Menu, Settings, Wallet, X, LogOut, Bell } from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/Sidebar.css';
import API from '../../utils/api';

import { isOfficerPosition } from '../../utils/officerPositions';

export default function Sidebar({ collapsed, setCollapsed, toggleCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const token = localStorage.getItem('token');
  
  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  // collapsed state moved to UserLayout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
  }, [setCollapsed]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const res = await fetch(`${API}/api/notifications/feed`, { headers });
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) return;

      const data = await res.json();
      if (!data.success) return;

      const { readIds: readIdsFromData, payments, loans: loansDataFeed, donations: donationsDataFeed, attendance: attendanceDataFeed, savings: savingsDataFeed } = data;
      const currentReadIds = new Set(readIdsFromData || []);
      const items = [];

      if (loansDataFeed) {
        loansDataFeed.forEach(l => {
          if (l.status === 'awaiting_member_approval') items.push({ id: `loan-terms-${l._id}` });
          if (l.status === 'approved') items.push({ id: `loan-app-${l._id}` });
          if (l.status === 'active' && l.disbursed) {
            const term = l.termMonths || 12;
            const paidMonths = l.paidMonths || 0;
            if (paidMonths < term && l.disbursementDate) {
              const startDate = new Date(l.disbursementDate);
              const nextDue = new Date(startDate);
              nextDue.setMonth(startDate.getMonth() + paidMonths + 1);
              const cutoffDate = new Date(nextDue);
              cutoffDate.setDate(nextDue.getDate() + 3);
              cutoffDate.setHours(23, 59, 59, 999);
              if (Date.now() > cutoffDate.getTime()) items.push({ id: `loan-late-${l._id}-${paidMonths}` });
            }
            items.push({ id: `loan-disbursed-${l._id}` });
          }
          if (l.status === 'rejected') items.push({ id: `loan-rejected-${l._id}` });
        });
      }
      if (payments) {
        payments.forEach(p => {
          if (p.status === 'pending') items.push({ id: `payment-pending-${p._id}` });
          if (p.status === 'confirmed') items.push({ id: `payment-confirmed-${p._id}` });
          if (p.status === 'rejected') items.push({ id: `payment-rejected-${p._id}` });
        });
      }
      if (donationsDataFeed) {
        donationsDataFeed.filter(d => d.status === 'confirmed').forEach(d => {
          items.push({ id: `don-${d._id}` });
        });
      }
      if (attendanceDataFeed) {
        attendanceDataFeed.slice(0, 5).forEach(a => {
          items.push({ id: `att-${a._id}` });
        });
      }
      if (savingsDataFeed) {
        savingsDataFeed.filter(s => s.type === 'deposit' && s.status === 'confirmed').forEach(s => items.push({ id: `sav-${s._id}` }));
        savingsDataFeed.filter(s => s.type === 'withdrawal' && s.status === 'confirmed').forEach(s => items.push({ id: `sav-wd-${s._id}` }));
      }

      setUnreadNotifCount(items.filter(it => !currentReadIds.has(it.id)).length);
    } catch (err) {
      console.error('Failed to fetch sidebar notifications:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000); // Poll every 2 mins
    window.addEventListener("admin-notif-read-update", fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener("admin-notif-read-update", fetchNotifications);
    };
  }, [fetchNotifications]);

  const handleNavClick = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setCollapsed(true); // Auto-close sidebar on mobile after clicking link
    }
  };



  const isActive = (path) => location.pathname === path;

  const isOfficer = isOfficerPosition(profile?.position);

  const allNavItems = [
    { path: '/home', icon: <LayoutGrid size={20} />, label: 'Home' },
    { path: '/savings', icon: <Wallet size={20} />, label: 'Savings' },
    { path: '/loans', icon: <FileText size={20} />, label: 'Loans', officerOnly: true },
    { path: '/donation', icon: <Heart size={20} />, label: 'Donations' },
    { path: '/attendance', icon: <Calendar size={20} />, label: 'Attendance' },
    { path: '/branches', icon: <Building2 size={20} />, label: 'Communities' },
    { path: '/notifications', icon: <Bell size={20} />, label: 'Notifications' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const navItems = allNavItems.filter(item => !item.officerOnly || isOfficer);

  return (
    <>
      {isMobile && !collapsed && (
        <div className="user-sidebar-mobile-overlay" onClick={() => setCollapsed(true)} />
      )}

      <div className={`user-sidebar ${collapsed ? 'user-sidebar-collapsed' : ''}`}>

        {/* Logo + Toggle button inside */}
        <div className="user-sidebar-logo">
          <div className="user-sidebar-logo-content">
            <div className="user-sidebar-logo-image">
              <img alt="PUAC Logo" src={puacLogo} />
            </div>
            {!collapsed && (
              <div className="user-sidebar-logo-text">
                <h1>IsangDiwa</h1>
                <p>Member Portal</p>
              </div>
            )}
            <button
              className="user-sidebar-toggle-btn"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          </div>
        </div>

        {/* Navigation — grouped with dividers */}
        <div className="user-sidebar-nav">
          {/* Main */}
          {navItems.filter(n => ['/home'].includes(n.path)).map(({ path, icon, label }) => (
            <button key={path} onClick={() => handleNavClick(path)} className={`user-sidebar-nav-button ${isActive(path) ? 'active' : ''}`} title={collapsed ? label : undefined}>
              <span className="user-sidebar-nav-icon">{icon}</span>
              {!collapsed && <span>{label}</span>}
            </button>
          ))}

          {!collapsed && <div className="user-sidebar-divider"><span>Finance</span></div>}
          {collapsed && <div className="user-sidebar-divider-dot" />}
          {navItems.filter(n => ['/savings', '/loans', '/donation'].includes(n.path)).map(({ path, icon, label }) => (
            <button key={path} onClick={() => handleNavClick(path)} className={`user-sidebar-nav-button ${isActive(path) ? 'active' : ''}`} title={collapsed ? label : undefined}>
              <span className="user-sidebar-nav-icon">{icon}</span>
              {!collapsed && <span>{label}</span>}
            </button>
          ))}

          {!collapsed && <div className="user-sidebar-divider"><span>Activity</span></div>}
          {collapsed && <div className="user-sidebar-divider-dot" />}
          {navItems.filter(n => ['/attendance', '/branches'].includes(n.path)).map(({ path, icon, label }) => (
            <button key={path} onClick={() => handleNavClick(path)} className={`user-sidebar-nav-button ${isActive(path) ? 'active' : ''}`} title={collapsed ? label : undefined}>
              <span className="user-sidebar-nav-icon">{icon}</span>
              {!collapsed && <span>{label}</span>}
            </button>
          ))}

          {!collapsed && <div className="user-sidebar-divider"><span>System</span></div>}
          {collapsed && <div className="user-sidebar-divider-dot" />}
          {navItems.filter(n => ['/notifications', '/settings'].includes(n.path)).map(({ path, icon, label }) => (
            <button key={path} onClick={() => handleNavClick(path)} className={`user-sidebar-nav-button ${isActive(path) ? 'active' : ''}`} title={collapsed ? label : undefined}>
              <span className="user-sidebar-nav-icon">{icon}</span>
              {!collapsed && <span>{label}</span>}
              {path === '/notifications' && unreadNotifCount > 0 && (
                <span className="user-sidebar-notif-badge">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Profile Section */}
        <div className="user-sidebar-profile">
          <div 
            className={`user-sidebar-profile-info ${collapsed ? 'collapsed' : ''}`}
            onClick={() => handleNavClick('/profile')}
            title={collapsed ? 'Profile' : undefined}
          >
            <div className="user-sidebar-profile-avatar">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
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
            className={`user-sidebar-profile-signout ${collapsed ? 'collapsed' : ''}`}
            onClick={() => setShowLogoutModal(true)}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="user-logout-modal-overlay">
          <div className="user-logout-modal-content">
            <h2 className="user-logout-modal-title">Confirm Logout</h2>
            <p className="user-logout-modal-message">Are you sure you want to log out of your account?</p>
            <div className="user-logout-modal-actions">
              <button 
                className="user-logout-modal-cancel" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button 
                className="user-logout-modal-confirm" 
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}