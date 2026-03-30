import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '../styles/AdminNotification.css';
import svgPaths from "../../imports/svg-icons";

import API from '../../utils/api';
const STORAGE_KEY = 'faithly_admin_read_notifications';
const PER_PAGE = 10;

const fmtTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const datePart = d.toLocaleDateString('en-CA');
  const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} ${timePart}`;
};

const loadReadSet = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
};

const saveReadSet = (set) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); window.dispatchEvent(new Event("admin-notif-read-update"));
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [readIds,       setReadIds]       = useState(loadReadSet);
  const [filter,        setFilter]        = useState('all');
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

  // Derive isRead from persisted set
  const enriched = notifications.map(n => ({ ...n, isRead: readIds.has(n.id) }));

  const unreadCount = enriched.filter(n => !n.isRead).length;

  const filtered = enriched.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read')   return  n.isRead;
    return true;
  });

  const totalPages   = Math.ceil(filtered.length / PER_PAGE);
  const paginated    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const markAsRead = useCallback((id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadSet(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      saveReadSet(next);
      return next;
    });
  }, [notifications]);

  // Reset page when filter changes
  const handleFilterChange = (f) => {
    setFilter(f);
    setPage(1);
  };

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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d={svgPaths.p32ddfd00} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Mark all as read
            </button>
          )}
        </div>
        <p className="admin-notif-subtitle">
          Member registrations, donations, savings deposits, and attendance check-ins
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="admin-notif-tabs">
        {['all', 'unread', 'read'].map(f => (
          <button
            key={f}
            className={`admin-notif-tab${filter === f ? ' admin-notif-tab-active' : ''}`}
            onClick={() => handleFilterChange(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'unread' && unreadCount > 0 && (
              <span className="admin-notif-tab-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="admin-notif-empty">Loading notifications…</div>
      ) : paginated.length === 0 ? (
        <div className="admin-notif-empty">
          {filter === 'unread' ? 'All caught up — no unread notifications.' : 'No notifications found.'}
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#E60076" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {n.type === 'member' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#9810FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="#9810FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {n.type === 'attendance' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="16" y1="2" x2="16" y2="6" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round"/>
                      <line x1="8" y1="2" x2="8" y2="6" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round"/>
                      <line x1="3" y1="10" x2="21" y2="10" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
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