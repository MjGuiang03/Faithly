import { useState, useEffect } from 'react';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminNotif.css';

import API from '../../utils/api';
import { Bell } from 'lucide-react';


export default function SecretaryAdminNotif() {
    const [activeFilter, setActiveFilter] = useState('all');

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailModal, setDetailModal] = useState(null);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            
            const res = await fetch(`${API}/api/admin/notifications`, { headers });
            const data = await res.json();
            
            if (data.success && data.notifications) {
                const readIds = new Set(data.readIds || []);
                const notifs = data.notifications
                    .filter(n => n.type === 'loan')
                    .map(n => ({
                        id: n.id,
                        loanId: n.meta?.loanId,
                        member: n.meta?.memberName,
                        amount: n.meta?.amount,
                        date: new Date(n.timestamp).toLocaleDateString('en-US'),
                        time: new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        isRead: readIds.has(n.id)
                    }));
                setNotifications(notifs);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const performReadUpdate = async (idsArray) => {
        try {
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            await fetch(`${API}/api/admin/notifications/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ids: idsArray })
            });
            window.dispatchEvent(new Event("admin-notif-read-update"));
        } catch { /* silent */ }
    };

    const handleMarkAsRead = (id) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
        performReadUpdate([id]);
    };

    const handleMarkAllAsRead = () => {
        const ids = notifications.filter(n => !n.isRead).map(n => n.id);
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        if (ids.length > 0) performReadUpdate(ids);
    };

    const getFilteredNotifications = () => {
        if (activeFilter === 'unread') {
            return notifications.filter(n => !n.isRead);
        } else if (activeFilter === 'read') {
            return notifications.filter(n => n.isRead);
        }
        return notifications;
    };

    const filteredNotifications = getFilteredNotifications();

    return (
        <div className="sec-admin-notif-page">
            <SecretaryAdminSidebar />

            <div className="sec-admin-notif-content">
                {/* Header */}
                <div className="sec-admin-notif-header">
                    <div className="sec-admin-notif-header-left">
                        <h1 className="sec-admin-notif-title">Notifications</h1>
                        {unreadCount > 0 && (
                            <div className="sec-admin-notif-badge">{unreadCount} New</div>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="sec-admin-notif-mark-all"
                            onClick={handleMarkAllAsRead}
                        >
                            <Bell size={20} color="#155DFC" />
                            Mark all as read
                        </button>
                    )}
                </div>



                {/* Filter Tabs */}
                <div className="sec-admin-notif-filters">
                    <button
                        className={`sec-admin-notif-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`sec-admin-notif-filter-btn ${activeFilter === 'unread' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('unread')}
                    >
                        Unread
                        {unreadCount > 0 && (
                            <span className="sec-admin-notif-filter-badge">{unreadCount}</span>
                        )}
                    </button>
                    <button
                        className={`sec-admin-notif-filter-btn ${activeFilter === 'read' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('read')}
                    >
                        Read
                    </button>
                </div>

                {/* Notifications List */}
                <div className="sec-admin-notif-list">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading notifications...</div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="sec-admin-notif-empty">
                            <Bell size={48} color="#D1D5DB" />
                            <p className="sec-admin-notif-empty-text">No notifications found</p>
                        </div>
                    ) : (
                        filteredNotifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`sec-admin-notif-card ${notification.isRead ? 'read' : 'unread'}`}
                                onClick={() => {
                                    if (!notification.isRead) handleMarkAsRead(notification.id);
                                    setDetailModal(notification);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="sec-admin-notif-card-content">
                                    <div className="sec-admin-notif-card-icon">
                                        <Bell size={20} color="#155DFC" />
                                    </div>

                                    <div className="sec-admin-notif-card-body">
                                        <div className="sec-admin-notif-card-header">
                                            <h3 className="sec-admin-notif-card-title">Loan Approved</h3>
                                            {!notification.isRead && (
                                                <div className="sec-admin-notif-unread-dot"></div>
                                            )}
                                        </div>

                                        <p className="sec-admin-notif-card-message">
                                            Loan LN-{notification.loanId} for {notification.member} (₱{Number(notification.amount).toLocaleString()}) has been approved by the Loan Admin. Please process the disbursement.
                                        </p>

                                        <div className="sec-admin-notif-card-footer">
                                            <p className="sec-admin-notif-card-timestamp">{notification.date} {notification.time}</p>

                                            {notification.isRead ? (
                                                <span className="sec-admin-notif-status-badge read">Read</span>
                                            ) : (
                                                <div className="sec-admin-notif-card-actions">
                                                    <span className="sec-admin-notif-status-badge unread">Unread</span>
                                                    <button
                                                        className="sec-admin-notif-mark-read"
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                    >
                                                        Mark as read
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Notification Detail Modal ── */}
            {detailModal && (
                <div className="sec-admin-mgmt-modal-overlay" onClick={() => setDetailModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
                    <div className="sec-admin-mgmt-modal-container" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)' }}>
                        <div className="sec-admin-mgmt-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '0.8px solid #E5E7EB' }}>
                            <h2 className="sec-admin-mgmt-modal-title" style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, margin: 0, color: '#101828' }}>Loan Approved</h2>
                            <button className="sec-admin-mgmt-modal-close" onClick={() => setDetailModal(null)} style={{ width: 32, height: 32, border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6A7282' }}>×</button>
                        </div>
                        <div style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <span style={{ fontSize: '12px', color: '#1E3A8A', background: '#EFF6FF', padding: '2px 8px', borderRadius: 999, fontWeight: 600, textTransform: 'capitalize' }}>
                                    Loan
                                </span>
                                <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: 'auto', fontFamily: 'Inter' }}>
                                    {detailModal.date} {detailModal.time}
                                </span>
                            </div>
                            <p style={{ fontFamily: 'Inter', fontSize: '14px', color: '#374151', lineHeight: '22px', margin: 0 }}>
                                Loan LN-{detailModal.loanId} for {detailModal.member} (₱{Number(detailModal.amount).toLocaleString()}) has been approved by the Loan Admin. Please process the disbursement.
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