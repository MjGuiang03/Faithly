import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { Building2, Calendar, FileText, Heart, LayoutGrid, LogOut, Menu, Settings, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/Sidebar.css';

import { isOfficerPosition } from '../../utils/officerPositions';

export default function Sidebar({ collapsed, setCollapsed, toggleCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
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

  const isOfficer = isOfficerPosition(profile?.position);

  const allNavItems = [
    { path: '/home', icon: <LayoutGrid size={20} />, label: 'Home' },
    { path: '/savings', icon: <Wallet size={20} />, label: 'Savings', officerOnly: true },
    { path: '/loans', icon: <FileText size={20} />, label: 'Loans', officerOnly: true },
    { path: '/donation', icon: <Heart size={20} />, label: 'Donations' },
    { path: '/attendance', icon: <Calendar size={20} />, label: 'Attendance' },
    { path: '/branches', icon: <Building2 size={20} />, label: 'Branches' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const navItems = allNavItems.filter(item => !item.officerOnly || isOfficer);

  return (
    <>
      {isMobile && !collapsed && (
        <div className="user-sidebar-mobile-overlay" onClick={() => setCollapsed(true)} />
      )}

      <div className={`user-sidebar ${collapsed ? 'user-sidebar-collapsed' : ''}`}>
        {isMobile && !collapsed && (
          <button 
            className="user-sidebar-close-mobile" 
            onClick={() => setCollapsed(true)}
            aria-label="Close sidebar"
          >
            <X size={24} color="white" />
          </button>
        )}

        {/* Logo + Toggle button inside */}
        <div className="user-sidebar-logo">
          <div className="user-sidebar-logo-content">
            <div className="user-sidebar-logo-image">
              <img alt="PUAC Logo" src={puacLogo} />
            </div>
            {!collapsed && (
              <div className="user-sidebar-logo-text">
                <h1>FaithLy</h1>
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

        {/* Navigation — clicking these ONLY navigates, never touches collapsed */}
        <div className="user-sidebar-nav">
          {navItems.map(({ path, icon, label }) => (
            <button
              key={path}
              onClick={() => handleNavClick(path)}
              className={`user-sidebar-nav-button ${isActive(path) ? 'active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className="user-sidebar-nav-icon">{icon}</span>
              {!collapsed && <span>{label}</span>}
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

      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="user-logout-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
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

    </>
  );
}