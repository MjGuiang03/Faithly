import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import svgPaths from "../../imports/svg-icons";
import '../styles/loanAdminNotif.css';

import API from '../../utils/api';

const fmtTimestamp = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
    }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
};

export default function LoanAdminNotif() {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('all');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) { navigate('/admin/login'); return; }

        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API}/api/admin/notifications`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        navigate('/admin/login');
                        return;
                    }
                    toast.error(data.message || 'Failed to fetch notifications');
                    return;
                }

                // Filter only loan-related notifications
                const loanNotifs = (data.notifications || [])
                    .filter(n => n.type === 'loan')
                    .map(n => ({ ...n, isRead: false }));

                setNotifications(loanNotifs);
            } catch (err) {
                toast.error('Network error. Could not load notifications.');
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [navigate]);

    const getFilteredNotifications = () => {
        if (activeFilter === 'all') return notifications;
        if (activeFilter === 'unread') return notifications.filter(n => !n.isRead);
        if (activeFilter === 'read') return notifications.filter(n => n.isRead);
        return notifications;
    };

    const getUnreadCount = () => {
        return notifications.filter(n => !n.isRead).length;
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    };

    const filteredNotifications = getFilteredNotifications();

    return (
        <div className="loan-admin-notif-page">
            <LoanAdminSidebar />

            <div className="loan-admin-notif-content">
                {/* Header */}
                <div className="loan-admin-notif-header">
                    <div className="loan-admin-notif-header-left">
                        <h1 className="loan-admin-notif-title">
                            Loan Notifications
                            {getUnreadCount() > 0 && (
                                <span className="loan-admin-notif-badge">{getUnreadCount()} New</span>
                            )}
                        </h1>
                        <p className="loan-admin-notif-subtitle">View all loan-related notifications and updates</p>
                    </div>
                    <button className="loan-admin-notif-mark-all" onClick={markAllAsRead}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d={svgPaths.p2ba21180} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            <path d={svgPaths.p12d41400} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        </svg>
                        Mark all as read
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="loan-admin-notif-filters">
                    <button
                        className={`loan-admin-notif-filter ${activeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`loan-admin-notif-filter ${activeFilter === 'unread' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('unread')}
                    >
                        Unread
                        {getUnreadCount() > 0 && (
                            <span className="loan-admin-notif-filter-count">{getUnreadCount()}</span>
                        )}
                    </button>
                    <button
                        className={`loan-admin-notif-filter ${activeFilter === 'read' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('read')}
                    >
                        Read
                    </button>
                </div>

                {/* Notifications List */}
                <div className="loan-admin-notif-list">
                    {loading ? (
                        <p style={{ color: '#9CA3AF', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Loading notifications…</p>
                    ) : filteredNotifications.length === 0 ? (
                        <p style={{ color: '#9CA3AF', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No loan notifications found.</p>
                    ) : (
                        filteredNotifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`loan-admin-notif-card ${notification.isRead ? 'read' : 'unread'}`}
                            >
                                <div className="loan-admin-notif-card-icon">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d={svgPaths.p3713e00} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                        <path d={svgPaths.pd2076c0} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                        <path d="M8.33333 7.5H6.66667" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                        <path d="M13.3333 10.8333H6.66667" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                        <path d="M13.3333 14.1667H6.66667" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                    </svg>
                                </div>
                                <div className="loan-admin-notif-card-content">
                                    <div className="loan-admin-notif-card-header">
                                        <h3 className="loan-admin-notif-card-title">{notification.title}</h3>
                                        {!notification.isRead && <span className="loan-admin-notif-unread-dot"></span>}
                                    </div>
                                    <p className="loan-admin-notif-card-message">{notification.message}</p>
                                    <div className="loan-admin-notif-card-footer">
                                        <p className="loan-admin-notif-card-timestamp">{fmtTimestamp(notification.timestamp)}</p>
                                        {!notification.isRead && (
                                            <button
                                                className="loan-admin-notif-card-mark-read"
                                                onClick={() => markAsRead(notification.id)}
                                            >
                                                Mark as read
                                            </button>
                                        )}
                                        {notification.isRead && (
                                            <span className="loan-admin-notif-card-read-badge">Read</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
