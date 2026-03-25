import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import svgPaths from '../../imports/svg-icons';
import '../styles/Notifications.css';
import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

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
  const [detailModal,    setDetailModal]    = useState(null);

  /* ── Terms review modal state ── */
  const [termsModal, setTermsModal] = useState(null);  // the loan object
  const [termsLoading, setTermsLoading] = useState(false);

  /* ── Fetch real data from all 3 endpoints ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const hdrs  = { Authorization: `Bearer ${token}` };

    try {
      const [lRes, dRes, aRes, sRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans`,           { headers: hdrs }),
        fetch(`${API}/api/donations/my-donations`,   { headers: hdrs }),
        fetch(`${API}/api/attendance/my-attendance`, { headers: hdrs }),
        fetch(`${API}/api/savings/transactions`,     { headers: hdrs }),
      ]);

      const [lData, dData, aData, sData] = await Promise.all([
        lRes.ok ? lRes.json() : { loans: [] },
        dRes.ok ? dRes.json() : { donations: [] },
        aRes.ok ? aRes.json() : { attendance: [] },
        sRes.ok ? sRes.json() : { transactions: [] },
      ]);

      const items = [];

      /* Loans → notifications */
      (lData.loans || []).forEach((l) => {
        const base = { id: `loan-${l._id}`, type: 'loan', timestamp: l.appliedDate || l.createdAt };

        /* Special: awaiting member approval */
        if (l.status === 'awaiting_member_approval' && l.modifiedTerms) {
          items.push({
            ...base,
            id: `loan-terms-${l._id}`,
            type: 'loan',
            title: 'Loan Terms Modified — Review Required',
            message: `The loan officer has proposed new terms for your loan ${l.loanId ? `#${l.loanId}` : ''}. Tap to review and respond.`,
            timestamp: l.modifiedTerms.proposedDate || l.updatedAt,
            actionRequired: true,
            loanData: l,
          });
        }

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

      /* Savings → notifications */
      (sData.transactions || []).filter(t => t.type === 'deposit').forEach((s) => {
        items.push({
          id:        `savings-${s._id}`,
          type:      'savings',
          timestamp: s.date,
          title:     'Savings Deposit',
          message:   `A deposit of ₱${Number(s.amount).toLocaleString()} was added to ${s.goalName}.`,
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
    if (type === 'donation' || type === 'savings') return (
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
    type === 'loan' ? 'user-notif-badge-loan' : (type === 'donation' || type === 'savings') ? 'user-notif-badge-donation' : 'user-notif-badge-attendance';

  const cardClass = (type, isRead, actionRequired) => {
    if (actionRequired) return 'user-notif-card user-notif-card-action';
    if (isRead) return 'user-notif-card user-notif-card-read';
    return `user-notif-card user-notif-card-${type}`;
  };

  const handleTermsResponse = async (accepted) => {
    if (!termsModal) return;
    setTermsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/loans/${termsModal._id}/respond-terms`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || 'Failed'); return; }
      setTermsModal(null);
      fetchAll();
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setTermsLoading(false);
    }
  };

  const badgeLabel = (type) =>
    type === 'loan' ? 'Loan' : type === 'donation' ? 'Donation' : type === 'savings' ? 'Savings' : 'Attendance';

  return (
    <div className="user-notif-page">
      <Sidebar />
      <div className="user-notif-main">

        {/* Header */}
        <div className="user-notifications-page-header">
          <div className="user-notifications-header-left">
            <div className="user-notifications-title-row">
              <h1 className="user-notifications-page-title">Notifications</h1>
              {unreadCount('all') > 0 && (
                <span className="user-notifications-count-pill">{unreadCount('all')}</span>
              )}
            </div>
          </div>
          <button className="user-notifications-mark-all-btn" onClick={markAllAsRead}>
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
            { key: 'savings',    label: 'Savings'          },
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
              <div
                key={n.id}
                className={cardClass(n.type, n.isRead, n.actionRequired)}
                onClick={() => {
                  if (!n.isRead) markAsRead(n.id);
                  if (n.actionRequired && n.loanData) {
                    setTermsModal(n.loanData);
                  } else {
                    setDetailModal(n);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {getIcon(n.type)}
                <div className="user-notif-body">
                  <div className="user-notif-body-header">
                    <p className={`user-notif-body-title${n.isRead ? ' read' : ''}`}>{n.title}</p>
                    <span className={`user-notif-type-badge ${badgeClass(n.type)}`}>{badgeLabel(n.type)}</span>
                    {n.actionRequired && <span className="user-notif-action-pill">Action Required</span>}
                    {!n.isRead && !n.actionRequired && <span className="user-notif-dot" />}
                  </div>
                  <p className="user-notif-msg">{n.message}</p>
                  <div className="user-notif-footer">
                    <span className="user-notif-time">{fmtAgo(n.timestamp)}</span>
                    {n.actionRequired && (
                      <span className="user-notif-review-hint">Tap to review →</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Terms Review Modal ── */}
      {termsModal && (
        <div className="user-terms-modal-overlay" onClick={() => !termsLoading && setTermsModal(null)}>
          <div className="user-terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-terms-modal-header">
              <h2 className="user-terms-modal-title">Loan Terms Modified</h2>
              <button className="user-terms-modal-close" onClick={() => setTermsModal(null)}>×</button>
            </div>

            <p className="user-terms-modal-desc">
              The loan officer has proposed new terms for your loan application
              <strong> {termsModal.loanId}</strong>. Please review the changes below.
            </p>

            <div className="user-terms-compare">
              {/* Original */}
              <div className="user-terms-column user-terms-column--original">
                <h4 className="user-terms-column-title">Original Terms</h4>
                <div className="user-terms-row"><span>Amount</span><strong>{fmt(termsModal.amount)}</strong></div>
                <div className="user-terms-row"><span>Term</span><strong>{termsModal.termMonths} months</strong></div>
                <div className="user-terms-row"><span>Monthly Payment</span><strong>{fmt(termsModal.monthlyPayment)}</strong></div>
                <div className="user-terms-row"><span>Total Interest</span><strong>{fmt(termsModal.totalInterest)}</strong></div>
                <div className="user-terms-row"><span>Total Repayment</span><strong>{fmt(termsModal.totalRepayment)}</strong></div>
              </div>

              {/* Arrow */}
              <div className="user-terms-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>

              {/* Proposed */}
              <div className="user-terms-column user-terms-column--proposed">
                <h4 className="user-terms-column-title">Proposed Terms</h4>
                <div className="user-terms-row"><span>Amount</span><strong>{fmt(termsModal.modifiedTerms?.approvedAmount)}</strong></div>
                <div className="user-terms-row"><span>Term</span><strong>{termsModal.modifiedTerms?.repaymentTerm} months</strong></div>
                <div className="user-terms-row"><span>Monthly Payment</span><strong>{fmt(termsModal.modifiedTerms?.monthlyPayment)}</strong></div>
                <div className="user-terms-row"><span>Total Interest</span><strong>{fmt(termsModal.modifiedTerms?.totalInterest)}</strong></div>
                <div className="user-terms-row"><span>Total Repayment</span><strong>{fmt(termsModal.modifiedTerms?.totalRepayment)}</strong></div>
              </div>
            </div>

            <div className="user-terms-modal-actions">
              <button
                className="user-terms-btn user-terms-btn--decline"
                onClick={() => handleTermsResponse(false)}
                disabled={termsLoading}
              >
                Decline
              </button>
              <button
                className="user-terms-btn user-terms-btn--agree"
                onClick={() => handleTermsResponse(true)}
                disabled={termsLoading}
              >
                {termsLoading ? 'Processing…' : 'Agree to Terms'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Detail Modal ── */}
      {detailModal && (
        <div className="user-terms-modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="user-terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-terms-modal-header">
              <h2 className="user-terms-modal-title">{detailModal.title}</h2>
              <button className="user-terms-modal-close" onClick={() => setDetailModal(null)}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                {getIcon(detailModal.type)}
                <span className={`user-notif-type-badge ${badgeClass(detailModal.type)}`} style={{ fontSize: '12px' }}>
                  {badgeLabel(detailModal.type)}
                </span>
                <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: 'auto', fontFamily: 'Inter, sans-serif' }}>
                  {detailModal.timestamp
                    ? new Date(detailModal.timestamp).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#374151', lineHeight: '22px', margin: 0 }}>
                {detailModal.message}
              </p>
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="user-terms-btn user-terms-btn--agree"
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