import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '../styles/AdminNotification.css';

import API from '../../utils/api';
import { CalendarDays, Heart, Banknote } from 'lucide-react';

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

  const token = localStorage.getItem('adminToken');
  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

  const { data: notifData, isValidating: loadingNotifs } = useSWR(
    token ? `${API}/api/admin/notifications` : null,
    fetcherSingle,
    { revalidateOnFocus: false, revalidateIfStale: true }
  );

  useEffect(() => {
    if (notifData) {
        if (notifData.success) {
            setNotifications(notifData.notifications || []);
            setReadIds(new Set(notifData.readIds || []));
        } else {
            toast.error('Failed to load notifications');
        }
    }
  }, [notifData]);

  useEffect(() => {
    setLoading(loadingNotifs && !notifData);
  }, [loadingNotifs, notifData]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

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




  return (
    <div className="admin-notif-main">
      {/* ── Header ── */}
      <div className="admin-notif-header">
        <div className="admin-notif-title-row">
          <div className="admin-notif-title-group">
            <h1 className="admin-notif-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="admin-notif-badge">{unreadCount}</span>
            )}
          </div>
        </div>
        <p className="admin-notif-subtitle">
          Manage member registrations, donations, and attendance check-ins.
        </p>
      </div>

      {/* ── Filter Controls Row ── */}
      <div className="admin-notif-controls-row">
        <div className="admin-notif-tabs">
          {[
            { key: 'all',        label: 'All' },
            { key: 'member',     label: 'Members' },
            { key: 'donation',   label: 'Donations' },
            { key: 'attendance', label: 'Attendance' }
          ].map(({ key, label }) => {
            const count = enriched.filter(n => (key === 'all' ? true : n.type === key) && !n.isRead).length;
            return (
              <button
                key={key}
                className={`admin-notif-tab${typeFilter === key ? ' admin-notif-tab-active' : ''}`}
                onClick={() => { setTypeFilter(key); setPage(1); }}
              >
                {label}
                {count > 0 && <span className="admin-notif-tab-badge">{count}</span>}
              </button>
            );
          })}
        </div>
        
        <button className="admin-notif-mark-all-btn" onClick={markAllAsRead}>
          Mark all as read
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="admin-notif-empty">Loading notifications…</div>
      ) : paginated.length === 0 ? (
        <div className="admin-notif-empty">No notifications found.</div>
      ) : (
        <>
          <div className="admin-notif-list">
            {paginated.map((n) => (
              <div
                key={n.id}
                className={`admin-notif-item ${!n.isRead ? 'admin-notif-item-unread' : ''}`}
                onClick={() => {
                  if (!n.isRead) markAsRead(n.id);
                  setDetailModal(n);
                }}
              >
                <div className={`admin-notif-icon admin-notif-icon-${n.type}`}>
                  {n.type === 'loan' ? <Banknote size={20} color="#155DFC" /> :
                   (n.type === 'donation' || n.type === 'savings') ? <Heart size={20} color="#155DFC" /> :
                   <CalendarDays size={20} color="#155DFC" />}
                </div>

                <div className="admin-notif-content">
                  <div className="admin-notif-content-header">
                    <h3 className={`admin-notif-content-title ${n.isRead ? 'admin-notif-content-title-read' : ''}`}>
                      {n.title}
                    </h3>
                    {!n.isRead && <div className="admin-notif-unread-indicator" />}
                  </div>

                  <p className={`admin-notif-content-message ${n.isRead ? 'admin-notif-content-message-read' : ''}`}>
                    {n.message}
                  </p>

                  <div className="admin-notif-content-footer">
                    <span className="admin-notif-timestamp">{fmtTime(n.timestamp)}</span>
                    <div className="admin-notif-actions">
                      {!n.isRead ? (
                        <span className="admin-notif-unread-badge">New</span>
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
                    className={`admin-notif-page-btn ${p === page ? 'active' : ''}`}
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
        <div className="admin-notif-modal-overlay admin-notif-overlay-style" onClick={() => setDetailModal(null)}>
          <div className="admin-notif-modal admin-notif-modal-style" onClick={(e) => e.stopPropagation()}>
            <div className="admin-notif-modal-header admin-notif-modal-header-style">
              <h2 className="admin-notif-modal-title admin-notif-title-style">{detailModal.title}</h2>
              <button className="admin-notif-modal-close admin-notif-close-btn-style" onClick={() => setDetailModal(null)}>×</button>
            </div>
            <div className="admin-notif-pad-20-24">
              <div className="admin-notif-meta-row">
                <span className="admin-notif-type-badge">
                  {detailModal.type}
                </span>
                <span className="admin-notif-date-style">
                  {fmtTime(detailModal.timestamp)}
                </span>
              </div>
              <p className="admin-notif-desc-style">
                {detailModal.message}
              </p>
            </div>
            <div className="admin-notif-footer-style">
              <button
                className="admin-notif-action-btn-style"
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