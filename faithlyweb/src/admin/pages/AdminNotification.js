import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '../styles/AdminNotification.css';

import API from '../../utils/api';
import { CalendarDays, Heart, PlusCircle } from 'lucide-react';

const PER_PAGE = 10;

const fmtTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const datePart = d.toLocaleDateString('en-CA');
  const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} ${timePart}`;
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [readIds,       setReadIds]       = useState(new Set());
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [detailModal,   setDetailModal]   = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setReadIds(new Set(data.readIds || []));
      } else {
        toast.error('Failed to load notifications');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/');
      return;
    }
    fetchNotifications();
  }, [navigate, fetchNotifications]);

  // Derive isRead from state set
  const enriched = notifications.map(n => ({ ...n, isRead: readIds.has(n.id) }));

  const unreadCount = enriched.filter(n => !n.isRead).length;

  const filtered = enriched.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const totalPages   = Math.ceil(filtered.length / PER_PAGE);
  const paginated    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const performReadUpdate = async (idsArray) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API}/api/admin/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: idsArray })
      });
      // Fire an event in case AdminSidebar wants to re-fetch
      window.dispatchEvent(new Event("admin-notif-read-update"));
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = useCallback((id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      performReadUpdate([id]);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    setReadIds(new Set(allIds));
    performReadUpdate(allIds);
  }, [notifications]);


  const getIconBg = (type) => {
    if (type === 'donation' || type === 'savings') return 'admin-notif-icon-donation';
    if (type === 'member')     return 'admin-notif-icon-member';
    if (type === 'attendance') return 'admin-notif-icon-attendance';
    return '';
  };

  return (
    <div className="admin-notif-main">
      {/* Header */}
      <div className="admin-notif-header">
        <div className="admin-notif-title-row">
          <div className="admin-notif-title-group">
            <h1 className="admin-notif-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="admin-notif-badge">{unreadCount} New</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button className="admin-notif-mark-all-btn" onClick={markAllAsRead}>
              <PlusCircle size={20} color="#155DFC" />
              Mark all as read
            </button>
          )}
        </div>
        <p className="admin-notif-subtitle">
          Member registrations, donations, savings deposits, and attendance check-ins
        </p>
      </div>

      {/* Filter Tabs matching User Design */}
      <div className="admin-notif-tabs" style={{ margin: '0 24px 16px', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', display: 'flex' }}>
        {[
          { key: 'all',        label: 'All' },
          { key: 'member',     label: 'Members' },
          { key: 'donation',   label: 'Donations' },
          { key: 'savings',    label: 'Savings' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'loan',       label: 'Loans' }
        ].map(({ key, label }) => {
          const count = enriched.filter(n => (key === 'all' ? true : n.type === key) && !n.isRead).length;
          return (
            <button
              key={key}
              className={`admin-notif-tab${typeFilter === key ? ' admin-notif-tab-active' : ''}`}
              onClick={() => { setTypeFilter(key); setPage(1); }}
            >
              {label}
              {count > 0 && (
                <span className="admin-notif-tab-badge">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="admin-notif-empty">Loading notifications…</div>
      ) : paginated.length === 0 ? (
        <div className="admin-notif-empty">
          No notifications found.
        </div>
      ) : (
        <>
          <div className="admin-notif-list">
            {paginated.map((n) => (
              <div
                key={n.id}
                className={`admin-notif-item${!n.isRead ? ' admin-notif-item-unread' : ''}`}
                onClick={() => {
                  if (!n.isRead) markAsRead(n.id);
                  setDetailModal(n);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className={`admin-notif-icon ${getIconBg(n.type)}`}>
                  {(n.type === 'donation' || n.type === 'savings') && (
                    <Heart size={20} color="#E60076" />
                  )}
                  {n.type === 'member' && (
                    <CalendarDays size={20} color="#9810FA" />
                  )}
                  {n.type === 'attendance' && (
                    <CalendarDays size={20} color="#15803D" />
                  )}
                </div>

                <div className="admin-notif-content">
                  <div className="admin-notif-content-header">
                    <h3 className={`admin-notif-content-title${n.isRead ? ' admin-notif-content-title-read' : ''}`}>
                      {n.title}
                    </h3>
                    {!n.isRead && <div className="admin-notif-unread-indicator" />}
                  </div>

                  <p className={`admin-notif-content-message${n.isRead ? ' admin-notif-content-message-read' : ''}`}>
                    {n.message}
                  </p>

                  <div className="admin-notif-content-footer">
                    <span className="admin-notif-timestamp">{fmtTime(n.timestamp)}</span>
                    <div className="admin-notif-actions">
                      {!n.isRead ? (
                        <>
                          <span className="admin-notif-unread-badge">Unread</span>
                          <button
                            className="admin-notif-mark-read-btn"
                            onClick={() => markAsRead(n.id)}
                          >
                            Mark as read
                          </button>
                        </>
                      ) : (
                        <span className="admin-notif-read-badge">Read</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="admin-notif-pagination">
              <span className="admin-notif-page-info">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="admin-notif-page-controls">
                <button
                  className="admin-notif-page-btn"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`admin-notif-page-btn${p === page ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >{p}</button>
                ))}
                <button
                  className="admin-notif-page-btn"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === totalPages}
                >›</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Notification Detail Modal ── */}
      {detailModal && (
        <div className="admin-notif-modal-overlay" onClick={() => setDetailModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="admin-notif-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)' }}>
            <div className="admin-notif-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '0.8px solid #E5E7EB' }}>
              <h2 className="admin-notif-modal-title" style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, margin: 0, color: '#101828' }}>{detailModal.title}</h2>
              <button className="admin-notif-modal-close" onClick={() => setDetailModal(null)} style={{ width: 32, height: 32, border: 'none', background: '#F3F4F6', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6A7282' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#1E3A8A', background: '#EFF6FF', padding: '2px 8px', borderRadius: 999, fontWeight: 600, textTransform: 'capitalize' }}>
                  {detailModal.type}
                </span>
                <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: 'auto', fontFamily: 'Inter' }}>
                  {fmtTime(detailModal.timestamp)}
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