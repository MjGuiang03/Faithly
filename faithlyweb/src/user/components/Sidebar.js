import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { LayoutGrid, FileText, Heart, Calendar, Building2, Settings, LogOut, Bell, Menu, X, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/Sidebar.css';
import Chatbot from './Chatbot';

import API from '../../utils/api';
const READ_KEY = 'faithly_notif_read';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(() => localStorage.getItem('verificationStatus') || null);
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

  /* ── Fetch officer verification status ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/verification/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setVerificationStatus(data.verificationStatus);
          localStorage.setItem('verificationStatus', data.verificationStatus);
        } else {
          setVerificationStatus('unverified');
          localStorage.setItem('verificationStatus', 'unverified');
        }
      } catch {
        setVerificationStatus('unverified');
      }
    })();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const calcUnread = async () => {
      try {
        const readIds = new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));

        const [lRes, dRes, aRes, sRes, ppRes] = await Promise.all([
          fetch(`${API}/api/loans/my-loans`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/donations/my-donations`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/attendance/my-attendance`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/savings/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/loans/my-pending-payments`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const [lData, dData, aData, sData, ppData] = await Promise.all([
          lRes.ok ? lRes.json() : { loans: [] },
          dRes.ok ? dRes.json() : { donations: [] },
          aRes.ok ? aRes.json() : { attendance: [] },
          sRes.ok ? sRes.json() : { transactions: [] },
          ppRes.ok ? ppRes.json() : { payments: [] },
        ]);

        let count = 0;

        /* Loans → notifications */
        (lData.loans || []).forEach((l) => {
          /* Special: awaiting member approval */
          if (l.status === 'awaiting_member_approval' && l.modifiedTerms) {
            if (!readIds.has(`loan-terms-${l._id}`)) count++;
          }

          if (l.statusHistory && l.statusHistory.length > 0) {
            l.statusHistory.forEach((history) => {
              let idStr = '';
              if (history.status === 'pending') idStr = `loan-pending-${l._id}`;
              else if (history.status === 'approved') idStr = `loan-approved-${l._id}`;
              else if (history.status === 'rejected') idStr = `loan-rejected-${l._id}`;
              else if (history.status === 'processed') idStr = `loan-processed-${l._id}`;
              else if (history.status === 'payment_confirmed') idStr = `loan-payment-${l._id}-${history.monthNumber || history.date}`;

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

          /* Payment reminder */
          if ((l.status === 'active') && l.nextPaymentDate) {
            if (!readIds.has(`loan-reminder-${l._id}`)) count++;
          }
        });

        /* Pending Payments  */
        (ppData.payments || []).forEach((p) => {
          if (!readIds.has(`payment-pending-${p._id}`)) count++;
        });

        /* Donations  */
        (dData.donations || []).forEach((d) => {
          if (!readIds.has(`donation-${d._id}`)) count++;
        });

        /* Savings  */
        (sData.transactions || []).filter(t => t.type === 'deposit').forEach((s) => {
          if (!readIds.has(`savings-${s._id}`)) count++;
        });

        /* Attendance  */
        (aData.attendance || []).forEach((a) => {
          if (!readIds.has(`attendance-${a._id}`)) count++;
        });

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
  }, [profile?.branch]);

  const isOfficer = verificationStatus === 'verified';

  const allNavItems = [
    { path: '/home', icon: <LayoutGrid size={20} />, label: 'Home' },
    { path: '/notifications', icon: <Bell size={20} />, label: 'Notifications', badge: unreadCount },
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

      {isMobile && collapsed && (
        <button
          className="user-sidebar-mobile-toggle-btn"
          onClick={toggleCollapsed}
          title="Open Menu"
        >
          <Menu size={24} />
        </button>
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

      {/* Floating Chat Button */}
      <button
        className={`user-chat-button ${chatOpen ? 'user-chat-button--open' : ''}`}
        onClick={() => setChatOpen(prev => !prev)}
        aria-label={chatOpen ? 'Close chat' : 'Open chat'}
        title={chatOpen ? 'Close chat' : 'Chat with FaithBot'}
      >
        {chatOpen ? (
          <svg fill="none" viewBox="0 0 24 24" width="22" height="22">
            <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg fill="none" viewBox="0 0 24 24" width="24" height="24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        )}
      </button>

      {/* Chatbot */}
      <Chatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />

    </>
  );
}