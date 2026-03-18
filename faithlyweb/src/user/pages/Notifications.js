import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import svgPaths from '../../imports/svg-icons';
import '../styles/Notifications.css';
import API from '../../utils/api';

const fmtAgo = (date) => {
  if (!date) return '';
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins} minute${mins  > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours  > 1 ? 's' : ''} ago`;
  if (days  <  7) return `${days} day${days     > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const READ_KEY = 'faithly_notif_read';
const getReadSet = () => new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
const saveReadSet = (s, newUnreadCount) => { 
  localStorage.setItem(READ_KEY, JSON.stringify([...s])); 
  window.dispatchEvent(new CustomEvent('notif-read-update', { detail: newUnreadCount })); 
};

export default function Notifications() {
  const [activeFilter,   setActiveFilter]   = useState('all');
  const [rawItems,       setRawItems]       = useState([]);
  const [readIds,        setReadIds]        = useState(getReadSet);
  const [loading,        setLoading]        = useState(true);

  /* ── Fetch real data from all 3 endpoints ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const hdrs  = { Authorization: `Bearer ${token}` };

    try {
      const [lRes, dRes, aRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans`,           { headers: hdrs }),
        fetch(`${API}/api/donations/my-donations`,   { headers: hdrs }),
        fetch(`${API}/api/attendance/my-attendance`, { headers: hdrs }),
      ]);

      const [lData, dData, aData] = await Promise.all([
        lRes.ok ? lRes.json() : { loans: [] },
        dRes.ok ? dRes.json() : { donations: [] },
        aRes.ok ? aRes.json() : { attendance: [] },
      ]);

      const items = [];

      /* Loans → notifications */
      (lData.loans || []).forEach((l) => {
        const base = { id: `loan-${l._id}`, type: 'loan', timestamp: l.appliedDate || l.createdAt };

        if (l.statusHistory && l.statusHistory.length > 0) {
          l.statusHistory.forEach((history) => {
            const hBase = { ...base, timestamp: history.date };
            if (history.status === 'pending') {
              items.push({ ...hBase, id: `loan-pending-${l._id}`,
                title:   'Loan Application Submitted',
                message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} is under review.`,
              });
            } else if (history.status === 'approved') {
              items.push({ ...hBase, id: `loan-approved-${l._id}`,
                title:   'Loan Application Approved',
                message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} has been approved by the loan officer.`,
              });
            } else if (history.status === 'rejected') {
              items.push({ ...hBase, id: `loan-rejected-${l._id}`,
                title:   'Loan Application Rejected',
                message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} was not approved.${history.reason ? ` Reason: ${history.reason}` : ''}`,
              });
            } else if (history.status === 'processed') {
              items.push({ ...hBase, id: `loan-processed-${l._id}`,
                title:   'Loan Processed',
                message: `Your loan ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} has been processed and disbursed by the secretary.`,
              });
            }
          });
        } else {
          // Fallback for older loans without statusHistory
          if (l.status === 'approved' || l.status === 'active') {
            items.push({ ...base, id: `loan-approved-${l._id}`,
              title:   'Loan Application Approved',
              message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} has been approved and is ready for release.`,
            });
          } else if (l.status === 'pending') {
            items.push({ ...base, id: `loan-pending-${l._id}`,
              title:   'Loan Application Submitted',
              message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} is under review.`,
            });
          } else if (l.status === 'rejected') {
            items.push({ ...base, id: `loan-rejected-${l._id}`,
              title:   'Loan Application Update',
              message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} was not approved.`,
            });
          } else if (l.status === 'completed') {
            items.push({ ...base, id: `loan-done-${l._id}`,
              title:   'Loan Completed',
              message: `Your loan ${l.loanId ? `#${l.loanId}` : ''} has been fully paid. Thank you!`,
            });
          }
        }

        /* Payment reminder for active loans */
        if ((l.status === 'active') && l.nextPaymentDate) {
          items.push({ ...base,
            id:        `loan-reminder-${l._id}`,
            title:     'Payment Reminder',
            timestamp: l.nextPaymentDate,
            message:   `Your loan payment of ₱${Number(l.monthlyPayment || l.amount).toLocaleString()} is due on ${new Date(l.nextPaymentDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}. Please settle on time to avoid penalties.`,
          });
        }
      });

      /* Donations → notifications */
      (dData.donations || []).forEach((d) => {
        items.push({
          id:        `donation-${d._id}`,
          type:      'donation',
          timestamp: d.createdAt || d.date,
          title:     'Donation Received',
          message:   `Thank you! Your donation of ₱${Number(d.amount).toLocaleString()} to the ${d.category} has been received and recorded.`,
        });
      });

      /* Attendance → notifications */
      (aData.attendance || []).forEach((a) => {
        items.push({
          id:        `attendance-${a._id}`,
          type:      'attendance',
          timestamp: a.createdAt || a.date,
          title:     'Attendance Recorded',
          message:   `Your attendance for ${a.service || 'Sunday Service'}${a.date ? ` on ${new Date(a.date || a.createdAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''} has been successfully recorded.`,
        });
      });

      /* Sort newest first */
      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRawItems(items);
    } catch (err) {
      console.error('Notifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Derived state ── */
  const notifications = rawItems.map((n) => ({ ...n, isRead: readIds.has(n.id) }));

  const filtered = activeFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === activeFilter);

  const unreadCount = (type) =>
    type === 'all'
      ? notifications.filter((n) => !n.isRead).length
      : notifications.filter((n) => n.type === type && !n.isRead).length;

  const markAsRead = (id) => {
    setReadIds((prev) => { 
      const s = new Set(prev); 
      s.add(id); 
      // Calculate remaining unread instantly
      const remainingUnread = notifications.filter(n => !s.has(n.id)).length;
      saveReadSet(s, remainingUnread); 
      return s; 
    });
  };

  const markAllAsRead = () => {
    setReadIds((prev) => {
      const s = new Set(prev);
      notifications.forEach((n) => s.add(n.id));
      saveReadSet(s, 0); // 0 remaining since we marked all as read
      return s;
    });
  };

  /* ── UI helpers ── */
  const getIcon = (type) => {
    if (type === 'loan') return (
      <div className="user-notif-icon user-notif-icon-loan">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d={svgPaths.p34ee3000} stroke="#B45309" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
          <path d={svgPaths.p3054b580} stroke="#B45309" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
          <path d="M7.5 9.75H12" stroke="#B45309" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
          <path d="M7.5 12.75H12" stroke="#B45309" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
        </svg>
      </div>
    );
    if (type === 'donation') return (
      <div className="user-notif-icon user-notif-icon-donation">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d={svgPaths.p31f28900} stroke="#BE185D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
        </svg>
      </div>
    );
    if (type === 'attendance') return (
      <div className="user-notif-icon user-notif-icon-attendance">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M6 1.5V4.5" stroke="#1D4ED8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
          <path d="M12 1.5V4.5" stroke="#1D4ED8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
          <path d={svgPaths.p5193100} stroke="#1D4ED8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
          <path d="M2.25 7.5H15.75" stroke="#1D4ED8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
        </svg>
      </div>
    );
    return null;
  };

  const badgeClass = (type) =>
    type === 'loan' ? 'user-notif-badge-loan' : type === 'donation' ? 'user-notif-badge-donation' : 'user-notif-badge-attendance';

  const cardClass = (type, isRead) => {
    if (isRead) return 'user-notif-card user-notif-card-read';
    return `user-notif-card user-notif-card-${type}`;
  };

  const badgeLabel = (type) =>
    type === 'loan' ? 'Loan' : type === 'donation' ? 'Donation' : 'Attendance';

  return (
    <div className="user-notif-page">
      <Sidebar />
      <div className="user-notif-main">

        {/* Header */}
        <div className="user-notif-header">
          <div className="user-notif-header-left">
            <div className="user-notif-title-row">
              <h1 className="user-notif-title">Notifications</h1>
              {unreadCount('all') > 0 && (
                <span className="user-notif-count-pill">{unreadCount('all')}</span>
              )}
            </div>
            <p className="user-notif-subtitle">
              Stay up to date with your loans, donations, and attendance activity.
            </p>
          </div>
          <button className="user-notif-mark-all-btn" onClick={markAllAsRead}>
            Mark all as read
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="user-notif-filters">
          {[
            { key: 'all',        label: 'All'              },
            { key: 'attendance', label: 'Attendance'       },
            { key: 'loan',       label: 'Loan Transaction' },
            { key: 'donation',   label: 'Donations'        },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`user-notif-filter-btn${activeFilter === key ? ' active' : ''}`}
              onClick={() => setActiveFilter(key)}
            >
              {label}
              {unreadCount(key) > 0 && (
                <span className="user-notif-filter-pill">{unreadCount(key)}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p className="user-notif-loading">Loading notifications…</p>
        ) : filtered.length === 0 ? (
          <div className="user-notif-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#d1d5dc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#d1d5dc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="user-notif-list">
            {filtered.map((n) => (
              <div key={n.id} className={cardClass(n.type, n.isRead)}>
                {getIcon(n.type)}
                <div className="user-notif-body">
                  <div className="user-notif-body-header">
                    <p className={`user-notif-body-title${n.isRead ? ' read' : ''}`}>{n.title}</p>
                    <span className={`user-notif-type-badge ${badgeClass(n.type)}`}>{badgeLabel(n.type)}</span>
                    {!n.isRead && <span className="user-notif-dot" />}
                  </div>
                  <p className="user-notif-msg">{n.message}</p>
                  <div className="user-notif-footer">
                    <span className="user-notif-time">{fmtAgo(n.timestamp)}</span>
                    {!n.isRead && (
                      <button className="user-notif-mark-btn" onClick={() => markAsRead(n.id)}>
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}