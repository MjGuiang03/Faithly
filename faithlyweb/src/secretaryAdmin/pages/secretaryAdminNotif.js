import { useState, useEffect } from 'react';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminNotif.css';

import API from '../../utils/api';

export default function SecretaryAdminNotif() {
    const [activeFilter, setActiveFilter] = useState('all');

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            
            const res = await fetch(`${API}/api/admin/loans`, { headers });
            const data = await res.json();
            
            if (data.success && data.loans) {
                // Notifications for secretary = loans that are approved but not yet disbursed
                const notifs = data.loans
                    .filter(l => l.status === 'active' && !l.disbursed)
                    .map(l => ({
                        id: l._id,
                        loanId: l.loanId,
                        member: l.memberName,
                        amount: l.amount,
                        date: new Date(l.approvedDate || l.appliedDate).toLocaleDateString('en-US'),
                        time: new Date(l.approvedDate || l.appliedDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        isRead: false // Locally stored for UI purposes
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

    const handleMarkAsRead = (id) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
    };

    const handleMarkAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
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
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Mark all as read
                        </button>
                    )}
                </div>

                <p className="sec-admin-notif-subtitle">View approved loans ready for processing</p>

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
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <path d="M36 16C36 12.8174 34.7357 9.76516 32.4853 7.51472C30.2348 5.26428 27.1826 4 24 4C20.8174 4 17.7652 5.26428 15.5147 7.51472C13.2643 9.76516 12 12.8174 12 16C12 30 6 34 6 34H42C42 34 36 30 36 16Z" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M27.46 42C27.11 42.606 26.6032 43.1088 25.9952 43.4589C25.3873 43.8091 24.6995 43.9947 24 43.9947C23.3005 43.9947 22.6127 43.8091 22.0048 43.4589C21.3968 43.1088 20.89 42.606 20.54 42" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p className="sec-admin-notif-empty-text">No notifications found</p>
                        </div>
                    ) : (
                        filteredNotifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`sec-admin-notif-card ${notification.isRead ? 'read' : 'unread'}`}
                            >
                                <div className="sec-admin-notif-card-content">
                                    <div className="sec-admin-notif-card-icon">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M10 0.833333V17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                            <path d="M14.1667 4.16667H7.91667C6.75564 4.16667 5.64223 4.62768 4.82989 5.44002C4.01756 6.25236 3.55656 7.36577 3.55656 8.5268C3.55656 9.68783 4.01756 10.8012 4.82989 11.6136C5.64223 12.4259 6.75564 12.8869 7.91667 12.8869H12.0833C13.2443 12.8869 14.3577 13.3479 15.1701 14.1603C15.9824 14.9726 16.4434 16.086 16.4434 17.247C16.4434 18.4081 15.9824 19.5215 15.1701 20.3338C14.3577 21.1462 13.2443 21.6072 12.0833 21.6072H10" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                        </svg>
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
        </div>
    );
}