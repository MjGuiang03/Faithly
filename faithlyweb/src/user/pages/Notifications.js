import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';

import '../styles/Notifications.css';
import API from '../../utils/api';
import { Circle, User, Users } from 'lucide-react';


const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Persisted read access via db

export default function Notifications() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [rawItems, setRawItems] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);

  /* ── Terms review modal state ── */
  const [termsModal, setTermsModal] = useState(null);  // the loan object
  const [termsLoading, setTermsLoading] = useState(false);

  /* ── Fetch real data from all 3 endpoints ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const hdrs = { Authorization: `Bearer ${token}` };

    try {
      const [lRes, dRes, aRes, sRes, ppRes, readRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans`, { headers: hdrs }),
        fetch(`${API}/api/donations/my-donations`, { headers: hdrs }),
        fetch(`${API}/api/attendance/my-attendance`, { headers: hdrs }),
        fetch(`${API}/api/savings/transactions`, { headers: hdrs }),
        fetch(`${API}/api/loans/my-pending-payments`, { headers: hdrs }),
        fetch(`${API}/api/read-notifications`, { headers: hdrs }),
      ]);

      const [lData, dData, aData, sData, ppData, readData] = await Promise.all([
        lRes.ok ? lRes.json() : { loans: [] },
        dRes.ok ? dRes.json() : { donations: [] },
        aRes.ok ? aRes.json() : { attendance: [] },
        sRes.ok ? sRes.json() : { transactions: [] },
        ppRes.ok ? ppRes.json() : { payments: [] },
        readRes.ok ? readRes.json() : { readIds: [] },
      ]);
      setReadIds(new Set(readData.readIds || []));

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
              items.push({
                ...hBase, id: `loan-pending-${l._id}`,
                title: 'Loan Application Submitted',
                message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} is under review.`,
              });
            } else if (history.status === 'approved') {
              items.push({
                ...hBase, id: `loan-approved-${l._id}`,
                title: 'Loan Application Approved',
                message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} has been approved by the loan officer.`,
              });
            } else if (history.status === 'rejected') {
              items.push({
                ...hBase, id: `loan-rejected-${l._id}`,
                title: 'Loan Application Rejected',
                message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} was not approved.${history.reason ? ` Reason: ${history.reason}` : ''}`,
              });
            } else if (history.status === 'processed') {
              items.push({
                ...hBase, id: `loan-processed-${l._id}`,
                title: 'Loan Disbursed',
                message: `Your loan ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} has been disbursed via ${(l.paymentMethod || 'cash').toUpperCase()}.`,
                proofData: l.proofData || null,
              });
            } else if (history.status === 'payment_confirmed') {
              items.push({
                ...hBase, id: `loan-payment-${l._id}-${history.monthNumber || hBase.timestamp}`,
                title: 'Payment Confirmed',
                message: `Your Month #${history.monthNumber || ''} payment of ₱${Number(history.amount || l.monthlyPayment || 0).toLocaleString()} via ${(history.paymentMethod || 'cash').toUpperCase()} has been confirmed by the loan admin.`,
              });
            }
          });
        } else {
          // Fallback for older loans without statusHistory
          if (l.status === 'approved' || l.status === 'active') {
            items.push({
              ...base, id: `loan-approved-${l._id}`,
              title: 'Loan Application Approved',
              message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} has been approved and is ready for release.`,
            });
          } else if (l.status === 'pending') {
            items.push({
              ...base, id: `loan-pending-${l._id}`,
              title: 'Loan Application Submitted',
              message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} is under review.`,
            });
          } else if (l.status === 'rejected') {
            items.push({
              ...base, id: `loan-rejected-${l._id}`,
              title: 'Loan Application Update',
              message: `Your loan application ${l.loanId ? `#${l.loanId}` : ''} for ₱${Number(l.amount).toLocaleString()} was not approved.`,
            });
          } else if (l.status === 'completed') {
            items.push({
              ...base, id: `loan-done-${l._id}`,
              title: 'Loan Completed',
              message: `Your loan ${l.loanId ? `#${l.loanId}` : ''} has been fully paid. Thank you!`,
            });
          }
        }

        /* Payment reminder for active loans */
        if ((l.status === 'active') && l.nextPaymentDate) {
          items.push({
            ...base,
            id: `loan-reminder-${l._id}`,
            title: 'Payment Reminder',
            timestamp: l.nextPaymentDate,
            message: `Your loan payment of ₱${Number(l.monthlyPayment || l.amount).toLocaleString()} is due on ${new Date(l.nextPaymentDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}. Please settle on time to avoid penalties.`,
          });
        }
      });

      /* Pending Payments → notifications */
      (ppData.payments || []).forEach((p) => {
        items.push({
          id: `payment-pending-${p._id}`,
          type: 'payment_pending',
          timestamp: p.submittedAt,
          title: 'Payment Submitted — Awaiting Confirmation',
          message: `Your Month #${p.monthNumber} payment of ₱${Number(p.amount).toLocaleString()} via ${(p.paymentMethod || 'cash').toUpperCase()} has been submitted and is pending admin confirmation.`,
          paymentData: p,
        });
      });

      /* Donations → notifications */
      (dData.donations || []).forEach((d) => {
        if (d.status === 'confirmed') {
          items.push({
            id: `donation-${d._id}`,
            type: 'donation',
            timestamp: d.confirmedAt || d.createdAt || d.date,
            title: 'Donation Received',
            message: `Thank you! Your donation of ₱${Number(d.amount).toLocaleString()} to the ${d.category} has been received and recorded.`,
          });
        }
      });

      /* Savings → notifications */
      (sData.transactions || []).filter(t => t.type === 'deposit').forEach((s) => {
        items.push({
          id: `savings-${s._id}`,
          type: 'savings',
          timestamp: s.date,
          title: 'Savings Deposit',
          message: `A deposit of ₱${Number(s.amount).toLocaleString()} was added to ${s.goalName}.`,
        });
      });

      /* Attendance → notifications */
      (aData.attendance || []).forEach((a) => {
        items.push({
          id: `attendance-${a._id}`,
          type: 'attendance',
          timestamp: a.createdAt || a.date,
          title: 'Attendance Recorded',
          message: `Your attendance for ${a.service || 'Sunday Service'}${a.date ? ` on ${new Date(a.date || a.createdAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''} has been successfully recorded.`,
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

  const performReadUpdate = async (idsArray) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/api/read-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: idsArray })
      });
      // Ping the sidebar so it re-fetches its unread
      window.dispatchEvent(new Event("admin-notif-read-update"));
    } catch { /* silent */ }
  };

  const markAsRead = (id) => {
    setReadIds((prev) => {
      const s = new Set(prev);
      s.add(id);
      performReadUpdate([id]);
      return s;
    });
  };

  const markAllAsRead = () => {
    const idsToMark = notifications.filter(n => !n.isRead).map(n => n.id);
    if (idsToMark.length === 0) return;
    performReadUpdate(idsToMark);
    setReadIds((prev) => {
      const s = new Set(prev);
      idsToMark.forEach(id => s.add(id));
      return s;
    });
  };

  /* ── UI helpers ── */
  const getIcon = (type) => {
    if (type === 'payment_pending') return (
      <div className="user-notif-icon" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <User size={18} color="#EA580C" />
      </div>
    );
    if (type === 'loan') return (
      <div className="user-notif-icon user-notif-icon-loan">
        <User size={18} color="#B45309" />
      </div>
    );
    if (type === 'donation') return (
      <div className="user-notif-icon user-notif-icon-donation">
        <User size={18} color="#BE185D" />
      </div>
    );
    if (type === 'savings') return (
      <div className="user-notif-icon" style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <User size={18} color="#16A34A" />
      </div>
    );
    if (type === 'attendance') return (
      <div className="user-notif-icon user-notif-icon-attendance">
        <User size={18} color="#1D4ED8" />
      </div>
    );
    return null;
  };

  const badgeClass = (type) =>
    type === 'loan' ? 'user-notif-badge-loan'
      : type === 'donation' ? 'user-notif-badge-donation'
        : type === 'savings' ? 'user-notif-badge-attendance'
          : type === 'payment_pending' ? 'user-notif-badge-loan'
          : 'user-notif-badge-attendance';

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
    type === 'loan' ? 'Loan'
      : type === 'donation' ? 'Donation'
        : type === 'savings' ? 'Savings'
          : type === 'payment_pending' ? 'Payment'
            : 'Attendance';

  return (
    <div className="user-home-layout">
      <Sidebar />
      <div className="user-main-content">

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
            { key: 'all', label: 'All' },
            { key: 'attendance', label: 'Attendance' },
            { key: 'loan', label: 'Loan Transaction' },
            { key: 'payment_pending', label: 'Pending Payments' },
            { key: 'donation', label: 'Donations' },
            { key: 'savings', label: 'Savings' },
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
          <div className="user-notif-skeleton-list">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="user-notif-skeleton-card">
                {/* Icon */}
                <div className="user-notif-skeleton-icon user-notif-skel" />

                {/* Body */}
                <div className="user-notif-skeleton-body">
                  {/* Title row + badge */}
                  <div className="user-notif-skeleton-header">
                    <div className="user-notif-skel" style={{ height: '14px', width: '45%', borderRadius: '4px' }} />
                    <div className="user-notif-skel" style={{ height: '18px', width: '60px', borderRadius: '999px' }} />
                  </div>

                  {/* Message lines */}
                  <div className="user-notif-skel" style={{ height: '12px', width: '90%', borderRadius: '4px' }} />
                  <div className="user-notif-skel" style={{ height: '12px', width: '70%', borderRadius: '4px' }} />

                  {/* Timestamp */}
                  <div className="user-notif-skeleton-footer">
                    <div className="user-notif-skel" style={{ height: '11px', width: '80px', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="user-notif-empty">
            <User size={40} color="#d1d5dc" />
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
                <Users size={24} color="#6B7280" />
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
                {termsLoading ? <span className="btn-spinner" /> : 'Agree to Terms'}
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
              {/* Payment pending detail view */}
              {detailModal.type === 'payment_pending' && detailModal.paymentData && (
                <div style={{ marginTop: '16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 700, color: '#C2410C', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Details</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><div style={{ fontFamily: 'Inter', fontSize: '11px', color: '#9CA3AF' }}>Loan ID</div><div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{detailModal.paymentData.loanId}</div></div>
                    <div><div style={{ fontFamily: 'Inter', fontSize: '11px', color: '#9CA3AF' }}>Month #</div><div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{detailModal.paymentData.monthNumber}</div></div>
                    <div><div style={{ fontFamily: 'Inter', fontSize: '11px', color: '#9CA3AF' }}>Amount</div><div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 700, color: '#EA580C' }}>₱{Number(detailModal.paymentData.amount).toLocaleString()}</div></div>
                    <div><div style={{ fontFamily: 'Inter', fontSize: '11px', color: '#9CA3AF' }}>Method</div><div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>{detailModal.paymentData.paymentMethod}</div></div>
                    <div style={{ gridColumn: '1 / -1' }}><div style={{ fontFamily: 'Inter', fontSize: '11px', color: '#9CA3AF' }}>Submitted</div><div style={{ fontFamily: 'Inter', fontSize: '13px', color: '#374151' }}>{detailModal.paymentData.submittedAt ? new Date(detailModal.paymentData.submittedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div></div>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Circle size={12} color="#EA580C" />
                    <span style={{ fontFamily: 'Inter', fontSize: '11px', color: '#EA580C', fontWeight: 600 }}>Pending admin confirmation</span>
                  </div>
                  {detailModal.paymentData.proofData && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontFamily: 'Inter', fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>Proof of Payment</div>
                      <img
                        src={detailModal.paymentData.proofData}
                        alt="Payment proof"
                        onClick={() => window.open(detailModal.paymentData.proofData, '_blank')}
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #FED7AA', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </div>
              )}
              {detailModal.proofData && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>Disbursement Proof</p>
                  <img
                    src={detailModal.proofData}
                    alt="Disbursement proof"
                    style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer' }}
                    onClick={() => window.open(detailModal.proofData, '_blank')}
                  />
                </div>
              )}
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