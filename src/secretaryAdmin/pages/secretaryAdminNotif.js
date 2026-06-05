import { useState, useEffect } from 'react';
import useSWR from 'swr';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminNotif.css';
import '../../styles/sharedPagination.css';

import API from '../../utils/api';
import { Banknote } from 'lucide-react';


export default function SecretaryAdminNotif() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailModal, setDetailModal] = useState(null);

    const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
    const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

    const { data: notifData, isValidating: loadingNotifs } = useSWR(
        token ? `${API}/api/admin/notifications` : null,
        fetcherSingle,
        { revalidateOnFocus: false, revalidateIfStale: true }
    );

    useEffect(() => {
        if (notifData && notifData.success && notifData.notifications) {
            const readIds = new Set(notifData.readIds || []);
            const notifs = notifData.notifications
                .filter(n => n.type === 'loan')
                .map(n => ({
                    id: n.id,
                    loanId: n.meta?.loanId,
                    member: n.meta?.memberName,
                    amount: n.meta?.amount,
                    title: n.title,
                    message: n.message,
                    date: new Date(n.timestamp).toLocaleDateString('en-US'),
                    time: new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    isRead: readIds.has(n.id)
                }));
            setNotifications(notifs);
        }
    }, [notifData]);

    useEffect(() => {
        setLoading(loadingNotifs && !notifData);
    }, [loadingNotifs, notifData]);

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
    const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
    const paginatedNotifications = filteredNotifications.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleFilterChange = (key) => {
        setActiveFilter(key);
        setCurrentPage(1);
    };

    return (
        <div className="sec-admin-notif-page">
            <SecretaryAdminSidebar />

            <div className="sec-admin-notif-content">
                {/* ── Page Header ── */}
                <div className="sec-admin-notif-header">
                    <div className="sec-admin-notif-header-left">
                        <h1 className="sec-admin-notif-title">Notifications</h1>
                    </div>
                    <p className="sec-admin-notif-subtitle">

                        Process disbursement notifications for approved loan applications.
                    </p>
                </div>

                {/* Filters + Action Row */}
                <div className="admin-notif-controls-row">
                    <div className="admin-notif-tabs">
                        {[
                            { key: 'all',    label: 'All' },
                            { key: 'unread', label: 'Unread' },
                            { key: 'read',   label: 'Read' }
                        ].map(({ key, label }) => {
                            const count = key === 'unread' ? unreadCount : 0;
                            return (
                                <button
                                    key={key}
                                    className={`admin-notif-tab${activeFilter === key ? ' admin-notif-tab-active' : ''}`}
                                    onClick={() => handleFilterChange(key)}
                                >
                                    {label}
                                    {count > 0 && (
                                        <span className="admin-notif-tab-badge">{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button className="sec-admin-notif-mark-all" onClick={handleMarkAllAsRead}>
                        Mark all as read
                    </button>
                </div>

                {/* ── List ── */}
                <div className="sec-admin-notif-list">
                    {loading ? (
                        <p style={{ color: '#9CA3AF', fontSize: 13, padding: '40px 0', textAlign: 'center', fontFamily: 'Inter' }}>Loading notifications…</p>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="sec-admin-notif-empty">
                            <p className="sec-admin-notif-empty-text">No notifications found.</p>
                        </div>
                    ) : (
                        paginatedNotifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`sec-admin-notif-card ${notification.isRead ? 'read' : 'unread'}`}
                                onClick={() => {
                                    if (!notification.isRead) handleMarkAsRead(notification.id);
                                    setDetailModal(notification);
                                }}
                            >
                                <div className="sec-admin-notif-card-icon">
                                    <Banknote size={20} color="#155DFC" />
                                </div>

                                <div className="sec-admin-notif-card-body">
                                    <div className="sec-admin-notif-card-header">
                                        <h3 className="sec-admin-notif-card-title">{notification.title}</h3>
                                        {!notification.isRead && (
                                            <div className="sec-admin-notif-unread-dot"></div>
                                        )}
                                    </div>

                                    <p className="sec-admin-notif-card-message">
                                        {notification.message}
                                    </p>

                                    <div className="sec-admin-notif-card-footer">
                                        <span className="sec-admin-notif-card-timestamp">{notification.date} {notification.time}</span>
                                        {!notification.isRead ? (
                                            <span className="sec-admin-notif-status-badge">New</span>
                                        ) : (
                                            <span className="sec-admin-notif-status-badge read">Read</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="pg-bar">
                        <span className="pg-info">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredNotifications.length)} of {filteredNotifications.length}
                        </span>
                        <div className="pg-controls">
                            <button
                                className="pg-btn"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                ← Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    className={`pg-btn pg-num${currentPage === page ? ' active' : ''}`}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                className="pg-btn"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Notification Detail Modal ── */}
            {detailModal && (
                <div className="sec-admin-notif-modal-overlay" onClick={() => setDetailModal(null)}>
                    <div className="sec-admin-notif-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sec-admin-notif-modal-header-row">
                            <div className="sec-admin-notif-modal-icon-wrapper">
                                <Banknote size={24} />
                            </div>
                            <div className="sec-admin-notif-modal-header-info">
                                <div className="sec-admin-notif-modal-header">
                                    <h2 className="sec-admin-notif-modal-title">{detailModal.title}</h2>
                                    <button className="sec-admin-notif-modal-close" onClick={() => setDetailModal(null)}>
                                        ×
                                    </button>
                                </div>
                                <div className="sec-admin-notif-modal-meta">
                                    <span className="sec-admin-notif-modal-tag">
                                        Loan
                                    </span>
                                    <span className="sec-admin-notif-modal-datetime">
                                        {detailModal.date} • {detailModal.time}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="sec-admin-notif-modal-message-row">
                            <div className="sec-admin-notif-modal-message-box">
                                <p className="sec-admin-notif-modal-message">
                                    {detailModal.message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}