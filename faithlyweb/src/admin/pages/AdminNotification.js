import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '../styles/AdminNotification.css';

const API = process.env.REACT_APP_API_URL;
const STORAGE_KEY = 'faithly_admin_read_notifications';
const PER_PAGE = 10;

const fmtTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins} hour${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days  < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const loadReadSet = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
};

const saveReadSet = (set) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
};

// Icon components
const DonationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 17.5C10 17.5 2.5 12.5 2.5 7.08333C2.5 5.85181 2.98874 4.67054 3.86609 3.79318C4.74345 2.91583 5.92472 2.42708 7.15625 2.42708C8.38778 2.42708 9.82292 3.125 10 5C10.1771 3.125 11.6122 2.42708 12.8438 2.42708C14.0753 2.42708 15.2565 2.91583 16.1339 3.79318C17.0113 4.67054 17.5 5.85181 17.5 7.08333C17.5 12.5 10 17.5 10 17.5Z" stroke="#E60076" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MemberIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="6.5" r="3" stroke="#9810FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.8333 17.5C15.8333 14.2783 13.2217 11.6667 10 11.6667C6.77834 11.6667 4.16667 14.2783 4.16667 17.5" stroke="#9810FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AttendanceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const VerificationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 1.66667L12.5 4.16667H15.8333V7.5L18.3333 10L15.8333 12.5V15.8333H12.5L10 18.3333L7.5 15.8333H4.16667V12.5L1.66667 10L4.16667 7.5V4.16667H7.5L10 1.66667Z" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 10L9.16667 11.6667L12.5 8.33333" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7.5" stroke="#EF4444" strokeWidth="1.5"/>
    <path d="M10 6.5V10.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="13.5" r="0.5" fill="#EF4444"/>
  </svg>
);

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [readIds,       setReadIds]       = useState(loadReadSet);
  const [filter,        setFilter]        = useState('all');
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) { navigate('/admin/login'); return; }
    fetchNotifications();
  }, [navigate]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/admin/notifications`, {
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
  };

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

  const getIcon = (type) => {
    switch (type) {
      case 'donation': return <DonationIcon />;
      case 'member': return <MemberIcon />;
      case 'attendance': return <AttendanceIcon />;
      case 'verification': return <VerificationIcon />;
      case 'alert': return <AlertIcon />;
      default: return <MemberIcon />;
    }
  };

  const getIconBg = (type) => {
    switch (type) {
      case 'donation': return 'admin-notif-icon-donation';
      case 'member': return 'admin-notif-icon-member';
      case 'attendance': return 'admin-notif-icon-attendance';
      case 'verification': return 'admin-notif-icon-verification';
      case 'alert': return 'admin-notif-icon-alert';
      default: return 'admin-notif-icon-member';
    }
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
              Mark all as read
            </button>
          )}
        </div>
        <p className="admin-notif-subtitle">
          Member registrations, donations, and attendance check-ins
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
              >
                <div className={`admin-notif-icon ${getIconBg(n.type)}`}>
                  {getIcon(n.type)}
                </div>

                <div className="admin-notif-content">
                  <h3 className="admin-notif-title-text">{n.title}</h3>
                  <p className="admin-notif-message">{n.message}</p>
                  
                  <div className="admin-notif-footer">
                    <span className="admin-notif-timestamp">{fmtTime(n.timestamp)}</span>
                    <div className="admin-notif-actions">
                      {!n.isRead ? (
                        <>
                          <span className="admin-notif-unread-label">Unread</span>
                          <button
                            className="admin-notif-mark-read-btn"
                            onClick={() => markAsRead(n.id)}
                          >
                            Mark as read
                          </button>
                        </>
                      ) : null}
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
    </div>
  );
}
