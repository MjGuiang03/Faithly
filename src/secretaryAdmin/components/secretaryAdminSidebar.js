import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
    LayoutGrid, Bell, FileText, FolderOpen,
    Settings, LogOut, BarChart
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';

import '../styles/secretaryAdminSidebar.css';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
import { processNewNotifications } from '../../utils/desktopNotify';
import NotificationPrompt from '../../components/NotificationPrompt';

export default function SecretaryAdminSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const currentPath = location.pathname;
    const [unreadCount, setUnreadCount] = useState(0);
    const prevNotifIdsRef = useRef(new Set());

    /* ── Reactive display name (updates when settings page saves) ── */
    const [displayName, setDisplayName] = useState(
        () => localStorage.getItem('adminName') || 'Secretary Admin'
    );
    const [displayEmail, setDisplayEmail] = useState(
        () => localStorage.getItem('adminEmail') || localStorage.getItem('secretaryEmail') || 'secretary@isangdiwa.com'
    );

    useEffect(() => {
        const onProfileUpdate = () => {
            setDisplayName(localStorage.getItem('adminName') || 'Secretary Admin');
            setDisplayEmail(localStorage.getItem('adminEmail') || localStorage.getItem('secretaryEmail') || 'secretary@isangdiwa.com');
        };
        window.addEventListener('admin-profile-updated', onProfileUpdate);
        return () => window.removeEventListener('admin-profile-updated', onProfileUpdate);
    }, []);


    /* ── Fetch admin unread count ── */
    useEffect(() => {
        const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
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
                    const allNotifs = data.notifications || [];
                    const count = allNotifs.filter(n => n.type === 'loan' && !readIds.has(n.id)).length;
                    setUnreadCount(count);

                    /* ── Desktop push notifications ── */
                    const unreadNotifs = allNotifs.filter(n => n.type === 'loan' && !readIds.has(n.id));
                    prevNotifIdsRef.current = processNewNotifications(
                      prevNotifIdsRef.current,
                      unreadNotifs,
                      '/secretary-admin/notifications',
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


    const handleSignOut = () => {
        localStorage.removeItem('secretaryEmail');
        localStorage.removeItem('secretaryRole');
        toast.success('Signed out successfully');
        setShowLogoutModal(false);
        navigate('/');
    };

    return (
        <div className="sec-admin-sidebar">
            {/* Logo */}
            <div className="sec-admin-sidebar-logo">
                <img src={puacLogo} alt="IsangDiwa Logo" className="sec-admin-sidebar-logo-img" />
                <div className="sec-admin-sidebar-logo-text">
                    <h1 className="sec-admin-sidebar-logo-title"><span className="brand-text-isang">Isang</span><span className="brand-text-diwa">Diwa</span></h1>
                    <p className="sec-admin-sidebar-logo-subtitle">Secretary Portal</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sec-admin-sidebar-nav">
                <span className="sec-admin-sidebar-group-label">Core</span>
                <button
                    className={`sec-admin-sidebar-menu-item ${currentPath === '/secretary-admin/dashboard' ? 'active' : ''}`}
                    onClick={() => navigate('/secretary-admin/dashboard')}
                >
                    <span className="sec-admin-sidebar-menu-icon"><LayoutGrid size={18} /></span>
                    <span className="sec-admin-sidebar-menu-label">Dashboard</span>
                </button>

                <button
                    className={`sec-admin-sidebar-menu-item ${currentPath === '/secretary-admin/notifications' ? 'active' : ''}`}
                    onClick={() => navigate('/secretary-admin/notifications')}
                >
                    <span className="sec-admin-sidebar-menu-icon"><Bell size={18} /></span>
                    <span className="sec-admin-sidebar-menu-label">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="sidebar-notif-badge" style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '12px' }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                <span className="sec-admin-sidebar-group-label">Management</span>
                <button
                    className={`sec-admin-sidebar-menu-item ${currentPath === '/secretary-admin/loan-process' ? 'active' : ''}`}
                    onClick={() => navigate('/secretary-admin/loan-process')}
                >
                    <span className="sec-admin-sidebar-menu-icon"><FileText size={18} /></span>
                    <span className="sec-admin-sidebar-menu-label">Loan Processing</span>
                </button>

                <button
                    className={`sec-admin-sidebar-menu-item ${currentPath === '/secretary-admin/records' ? 'active' : ''}`}
                    onClick={() => navigate('/secretary-admin/records')}
                >
                    <span className="sec-admin-sidebar-menu-icon"><FolderOpen size={18} /></span>
                    <span className="sec-admin-sidebar-menu-label">Records</span>
                </button>

                <span className="sec-admin-sidebar-group-label">Analysis</span>
                <button
                    className={`sec-admin-sidebar-menu-item ${currentPath === '/admin/financial-report' ? 'active' : ''}`}
                    onClick={() => navigate('/admin/financial-report')}
                >
                    <span className="sec-admin-sidebar-menu-icon"><BarChart size={18} /></span>
                    <span className="sec-admin-sidebar-menu-label">Automated Reports</span>
                </button>

                <span className="sec-admin-sidebar-group-label">Admin</span>
                <button
                    className={`sec-admin-sidebar-menu-item ${currentPath === '/secretary-admin/settings' ? 'active' : ''}`}
                    onClick={() => navigate('/secretary-admin/settings')}
                >
                    <span className="sec-admin-sidebar-menu-icon"><Settings size={18} /></span>
                    <span className="sec-admin-sidebar-menu-label">Settings</span>
                </button>
            </nav>

            {/* Theme Toggle Section */}
            <div className="sec-admin-sidebar-theme-toggle">
                <div className="sec-theme-switch-wrapper">
                    <span className="sec-theme-switch-label">Dark Mode</span>
                    <label className="sec-toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={theme === 'dark'} 
                            onChange={toggleTheme} 
                        />
                        <span className="sec-toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Profile + Sign Out */}
            <div className="sec-admin-sidebar-profile">
                <div className="sec-admin-sidebar-profile-info">
                    <div className="sec-admin-sidebar-profile-avatar">
                        <p>{displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'SA'}</p>
                    </div>
                    <div className="sec-admin-sidebar-profile-details">
                        <p className="sec-admin-sidebar-profile-name">{displayName}</p>
                        <p className="sec-admin-sidebar-profile-email">
                            {displayEmail}
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowLogoutModal(true)} className="sec-admin-sidebar-signout">
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