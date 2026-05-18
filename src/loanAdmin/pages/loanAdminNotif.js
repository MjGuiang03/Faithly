import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';

import '../styles/loanAdminNotif.css';

import API from '../../utils/api';
import { Banknote } from 'lucide-react';


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
    const [detailModal, setDetailModal] = useState(null);

    const token = localStorage.getItem('adminToken');
    const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(async res => {
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) throw new Error('AuthError');
            const data = await res.json();
            throw new Error(data.message || 'Failed to fetch notifications');
        }
        return res.json();
    });

    const { data: notifData, error: notifError, isValidating: loadingNotifs } = useSWR(
        token ? `${API}/api/admin/notifications` : null,
        fetcherSingle,
        { revalidateOnFocus: false, revalidateIfStale: true }
    );

    useEffect(() => {
        if (notifError) {
            if (notifError.message === 'AuthError') {
                navigate('/');
            } else {
                toast.error(notifError.message || 'Network error. Could not load notifications.');
            }
        }
    }, [notifError, navigate]);

    useEffect(() => {
        if (notifData) {
            const readIds = new Set(notifData.readIds || []);
            const activeNotifs = (notifData.notifications || [])
                .filter(n => n.type === 'loan' || n.type === 'savings')
                .map(n => ({ ...n, isRead: readIds.has(n.id) }));
            setNotifications(activeNotifs);
        }
    }, [notifData]);

    useEffect(() => {
        setLoading(loadingNotifs && !notifData);
    }, [loadingNotifs, notifData]);

    useEffect(() => {
        if (!token) { navigate('/'); }
    }, [navigate, token]);

    const getFilteredNotifications = () => {
        if (activeFilter === 'all') return notifications;
        if (activeFilter === 'unread') return notifications.filter(n => !n.isRead);
        if (activeFilter === 'read') return notifications.filter(n => n.isRead);
        return notifications;
    };

    const getUnreadCount = () => {
        return notifications.filter(n => !n.isRead).length;
    };

    const performReadUpdate = async (idsArray) => {
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${API}/api/admin/notifications/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ids: idsArray })
            });
            window.dispatchEvent(new Event("admin-notif-read-update"));
        } catch { /* silent */ }
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
        performReadUpdate([id]);
    };

    const markAllAsRead = () => {
        const ids = notifications.filter(n => !n.isRead).map(n => n.id);
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        if (ids.length > 0) performReadUpdate(ids);
    };

    const filteredNotifications = getFilteredNotifications();

    return (
        <div className="loan-admin-notif-page">
            <LoanAdminSidebar />

            <div className="loan-admin-notif-content">
                {/* ── Page Header ── */}
                <div className="loan-admin-notif-header">
                    <div className="loan-admin-notif-header-left">
                        <h1 className="loan-admin-notif-title">Notifications</h1>
                        {getUnreadCount() > 0 && <span className="admin-notif-badge">{getUnreadCount()}</span>}
                    </div>
                    <p className="loan-admin-notif-subtitle">Manage loan applications and system notifications.</p>
                </div>

                {/* Filters + Action Row */}
                <div className="admin-notif-controls-row">
                    <div className="admin-notif-tabs">
                        {[
                            { key: 'all',    label: 'All' },
                            { key: 'unread', label: 'Unread' },
                            { key: 'read',   label: 'Read' }
                        ].map(({ key, label }) => {
                            const count = key === 'unread' ? getUnreadCount() : 0;
                            return (
                                <button
                                    key={key}
                                    className={`admin-notif-tab${activeFilter === key ? ' admin-notif-tab-active' : ''}`}
                                    onClick={() => { setActiveFilter(key); }}
                                >
                                    {label}
                                    {count > 0 && (
                                        <span className="admin-notif-tab-badge">{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button className="loan-admin-notif-mark-all" onClick={markAllAsRead}>
                        Mark all as read
                    </button>
                </div>

                {/* ── List ── */}
                <div className="loan-admin-notif-list">
                    {loading ? (
                        <p style={{ color: '#9CA3AF', fontSize: 13, padding: '40px 0', textAlign: 'center', fontFamily: 'Inter' }}>Loading notifications…</p>
                    ) : filteredNotifications.length === 0 ? (
                        <p style={{ color: '#9CA3AF', fontSize: 13, padding: '40px 0', textAlign: 'center', fontFamily: 'Inter' }}>No notifications found.</p>
                    ) : (
                        filteredNotifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`loan-admin-notif-card ${notification.isRead ? 'read' : 'unread'}`}
                                onClick={() => {
                                    if (!notification.isRead) markAsRead(notification.id);
                                    setDetailModal(notification);
                                }}
                            >
                                <div className="loan-admin-notif-card-icon">
                                    <Banknote size={20} color="#155DFC" />
                                </div>
                                <div className="loan-admin-notif-card-content">
                                    <div className="loan-admin-notif-card-header">
                                        <h3 className="loan-admin-notif-card-title">{notification.title}</h3>
                                        {!notification.isRead && <span className="loan-admin-notif-unread-dot"></span>}
                                    </div>
                                    <p className="loan-admin-notif-card-message">{notification.message}</p>
                                    <div className="loan-admin-notif-card-footer">
                                        <span className="loan-admin-notif-card-timestamp">{fmtTimestamp(notification.timestamp)}</span>
                                        {!notification.isRead ? (
                                            <span className="loan-admin-notif-status-badge">New</span>
                                        ) : (
                                            <span className="loan-admin-notif-status-badge read">Read</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>


            {/* ── Notification Detail Modal ── */}
            {detailModal && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setDetailModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
                    <div className="loan-admin-mgmt-modal-container" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)' }}>
                        <div className="loan-admin-mgmt-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '0.8px solid #E5E7EB' }}>
                            <h2 className="loan-admin-mgmt-modal-title" style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, margin: 0, color: '#101828' }}>{detailModal.title}</h2>
                            <button className="loan-admin-mgmt-modal-close" onClick={() => setDetailModal(null)} style={{ width: 32, height: 32, border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6A7282' }}>×</button>
                        </div>
                        <div style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '12px', color: '#1E3A8A', background: '#EFF6FF', padding: '2px 8px', borderRadius: 999, fontWeight: 600, textTransform: 'capitalize' }}>
                                    {detailModal.type}
                                </span>
                                <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: 'auto', fontFamily: 'Inter' }}>
                                    {fmtTimestamp(detailModal.timestamp)}
                                </span>
                            </div>
                            <p style={{ fontFamily: 'Inter', fontSize: '14px', color: '#374151', lineHeight: '22px', margin: 0 }}>
                                {detailModal.message}
                            </p>
                        </div>
                        <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                style={{ padding: '10px 20px', background: '#1E3A8A', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
                                onClick={() => setDetailModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
