import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
    LayoutGrid, Bell, FileText, FolderOpen,
    BarChart3, Settings, LogOut
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';

import '../styles/secretaryAdminSidebar.css';

import API from '../../utils/api';
const SEC_ADMIN_READ_KEY = 'faithly_admin_read_notifications';

export default function SecretaryAdminSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const currentPath = location.pathname;
    const [unreadCount, setUnreadCount] = useState(0);

    /* ── Fetch admin unread count ── */
    useEffect(() => {
        const token = localStorage.getItem('secretaryToken'); // Note: Make sure they authenticate using secretaryToken or adminToken
        if (!token) return;

        const calcUnread = async () => {
            try {
                const readIds = new Set(JSON.parse(localStorage.getItem(SEC_ADMIN_READ_KEY) || '[]'));
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

        const onUpdate = () => calcUnread();
        window.addEventListener('admin-notif-read-update', onUpdate);
        window.addEventListener('storage', (e) => {
            if (e.key === SEC_ADMIN_READ_KEY) calcUnread();
        });
        
        // Poll every 30 seconds for live updates
        const intervalId = setInterval(calcUnread, 30000);
        
        return () => {
             window.removeEventListener('admin-notif-read-update', onUpdate);
             window.removeEventListener('storage', calcUnread);
             clearInterval(intervalId);
        };
    }, []);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={20} />, path: '/secretary-admin/dashboard' },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={20} />, path: '/secretary-admin/notifications' },
        { id: 'loan-processing', label: 'Loan Processing', icon: <FileText size={20} />, path: '/secretary-admin/loan-process' },
        { id: 'records', label: 'Records', icon: <FolderOpen size={20} />, path: '/secretary-admin/records' },
        { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} />, path: '/secretary-admin/reports' },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/secretary-admin/settings' },
    ];

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
                <img src={puacLogo} alt="FaithLy Logo" className="sec-admin-sidebar-logo-img" />
                <div className="sec-admin-sidebar-logo-text">
                    <h1 className="sec-admin-sidebar-logo-title">FaithLy</h1>
                    <p className="sec-admin-sidebar-logo-subtitle">Secretary Portal</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sec-admin-sidebar-nav">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        className={`sec-admin-sidebar-menu-item ${currentPath === item.path ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="sec-admin-sidebar-menu-icon">{item.icon}</span>
                        <span className="sec-admin-sidebar-menu-label">{item.label}</span>
                        {item.id === 'notifications' && unreadCount > 0 && (
                            <span className="sidebar-notif-badge" style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '12px' }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Profile + Sign Out */}
            <div className="sec-admin-sidebar-profile">
                <div className="sec-admin-sidebar-profile-info">
                    <div className="sec-admin-sidebar-profile-avatar">
                        <p>SA</p>
                    </div>
                    <div className="sec-admin-sidebar-profile-details">
                        <p className="sec-admin-sidebar-profile-name">Secretary Admin</p>
                        <p className="sec-admin-sidebar-profile-email">
                            {localStorage.getItem('secretaryEmail') || 'secretary@faithly.com'}
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
        </div>
    );
}