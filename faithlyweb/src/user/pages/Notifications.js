import { useState, useEffect, useCallback } from 'react';
import '../styles/Notifications.css';
import API from '../../utils/api';
import { Banknote, Bell, CalendarDays, Circle, Heart, ChevronDown, ChevronUp, Check } from 'lucide-react';


const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtTime = (date, isReminder) => {
  if (!date) return '';
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  const diffAgo = now.getTime() - target.getTime();

  if (isReminder) {
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
    if (days === 0) return 'Due today';
    if (days > 0 && days <= 14) return `Due in ${days} day${days !== 1 ? 's' : ''}`;
  }

  const mins = Math.floor(diffAgo / 60000);
  const hours = Math.floor(diffAgo / 3600000);
  const daysAgo = Math.floor(diffAgo / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (daysAgo < 7) return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
  return target.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Persisted read access via db

export default function Notifications() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [rawItems, setRawItems] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedSimple, setExpandedSimple] = useState(new Set());

  const [prefs] = useState(() => {
    const saved = localStorage.getItem('notif_prefs');
    return saved ? JSON.parse(saved) : {
      loan: true,
      payment_pending: true,
      announcement: true,
      attendance: true,
      savings: true,
      donation: true
    };
  });

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
            // For historical notifications, we use the status at that time
            const hBase = { ...base, timestamp: history.date, loanData: { ...l, status: history.status } };
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

        if ((l.status === 'active') && l.nextPaymentDate) {
          const isOverdue = new Date(l.nextPaymentDate) < new Date();
          items.push({
            ...base,
            id: `loan-reminder-${l._id}`,
            title: 'Payment Reminder',
            timestamp: l.nextPaymentDate,
            isReminder: true,
            isUrgent: isOverdue,
            loanData: l, // Bug fix: passing loanData for payment reminder
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
            id: `donation-confirmed-${d._id}`,
            type: 'donation',
            timestamp: d.confirmedAt || d.createdAt || d.date,
            title: 'Donation Confirmed — Thank You!',
            message: `Blessings! Your donation of ₱${Number(d.amount).toLocaleString()} for ${d.category} has been confirmed. We truly appreciate your support for the ministry.`,
            amount: d.amount,
            category: d.category
          });
        } else if (d.status === 'rejected') {
          items.push({
            id: `donation-rejected-${d._id}`,
            type: 'donation',
            timestamp: d.rejectedAt || d.updatedAt || d.date,
            title: 'Donation Update — Action Required',
            message: `We were unable to confirm your donation of ₱${Number(d.amount).toLocaleString()} for ${d.category}. ${d.rejectReason ? `Reason: ${d.rejectReason}` : 'Please review your submission details.'}`,
            amount: d.amount,
            category: d.category,
            isUrgent: true
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
          amount: s.amount,
          goalName: s.goalName
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
          service: a.service,
          recordedBy: a.recordedBy // if available
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
  const notifications = rawItems
    .map((n) => ({ ...n, isRead: readIds.has(n.id) }))
    .filter(n => prefs[n.type] !== false);

  const getFilteredItems = () => {
    let base = notifications;
    if (activeFilter === 'unread') return base.filter(n => !n.isRead);
    if (activeFilter === 'loans_payments') return base.filter(n => ['loan', 'payment_pending'].includes(n.type));
    if (activeFilter === 'activity') return base.filter(n => ['attendance', 'savings', 'donation'].includes(n.type));
    return base;
  };

  const filtered = getFilteredItems();

  const getUnreadCount = (tabKey) => {
    if (tabKey === 'all') return notifications.filter(n => !n.isRead).length;
    if (tabKey === 'unread') return notifications.filter(n => !n.isRead).length;
    if (tabKey === 'loans_payments') return notifications.filter(n => !n.isRead && ['loan', 'payment_pending'].includes(n.type)).length;
    if (tabKey === 'activity') return notifications.filter(n => !n.isRead && ['attendance', 'savings', 'donation'].includes(n.type)).length;
    return 0;
  };

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
      <div className="user-notif-icon" style={{ background: '#EEF2FF', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Banknote size={18} color="#155DFC" />
      </div>
    );
    if (type === 'loan') return (
      <div className="user-notif-icon user-notif-icon-loan">
        <Banknote size={18} color="#155DFC" />
      </div>
    );
    if (type === 'donation') return (
      <div className="user-notif-icon user-notif-icon-donation">
        <Heart size={18} color="#155DFC" />
      </div>
    );
    if (type === 'savings') return (
      <div className="user-notif-icon" style={{ background: '#EEF2FF', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CalendarDays size={18} color="#155DFC" />
      </div>
    );
    if (type === 'attendance') return (
      <div className="user-notif-icon user-notif-icon-attendance">
        <CalendarDays size={18} color="#155DFC" />
      </div>
    );
    if (type === 'announcement') return (
      <div className="user-notif-icon" style={{ background: '#EEF2FF', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bell size={18} color="#155DFC" />
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

  const cardClass = (n) => {
    let classes = 'user-notif-card';
    if (n.actionRequired) classes += ' user-notif-card-action';
    if (n.isRead) classes += ' user-notif-card-read';
    if (n.type === 'announcement') classes += ' user-notif-card-announcement';
    if (n.isUrgent) classes += ' user-notif-card-urgent';
    return classes;
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
            : type === 'announcement' ? 'Announcement'
              : 'Attendance';

  /* ── Grouping & Collapsing Logic ── */
  const { pinned, groups } = (() => {
    const pinnedItems = notifications.filter(n => n.actionRequired);
    const others = filtered.filter(n => !n.actionRequired);

    const g = { today: [], yesterday: [], earlier: [] };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    others.forEach(item => {
      const date = new Date(item.timestamp);
      if (date >= startOfToday) g.today.push(item);
      else if (date >= startOfYesterday) g.yesterday.push(item);
      else g.earlier.push(item);
    });

    const collapse = (list) => {
      const counts = {};
      list.forEach(i => counts[i.type] = (counts[i.type] || 0) + 1);

      const result = [];
      const seen = new Set();
      list.forEach(i => {
        if (counts[i.type] >= 3) {
          if (!seen.has(i.type)) {
            const items = list.filter(x => x.type === i.type);
            result.push({
              id: `summary-${i.type}-${i.timestamp}`,
              isSummary: true,
              type: i.type,
              count: counts[i.type],
              items: items,
              timestamp: items[0].timestamp
            });
            seen.add(i.type);
          }
        } else {
          result.push(i);
        }
      });
      return result;
    };

    return {
      pinned: pinnedItems,
      groups: {
        today: collapse(g.today),
        yesterday: collapse(g.yesterday),
        earlier: collapse(g.earlier)
      }
    };
  })();

  const emptyStates = {
    all: { msg: "You're all caught up!", hint: "Check back later for updates." },
    loans_payments: { msg: "No loan updates or payments yet.", hint: "Visit the Loans page to apply for a loan or manage payments." },
    announcements: { msg: "No new announcements.", hint: "Stay tuned for church-wide updates." },
    activity: { msg: "No recent activity recorded.", hint: "Visit the Donations, Savings or Attendance pages to get started." },
    unread: { msg: "No unread notifications.", hint: "Good job! You've seen everything." }
  };
  const simpleTypes = ['attendance', 'savings', 'donation', 'announcement'];

  const renderCard = (n) => {
    const isSimple = simpleTypes.includes(n.type) && !n.actionRequired;
    const isExpanded = expandedSimple.has(n.id);

    return (
      <NotificationCard
        key={n.id}
        n={n}
        isSimple={isSimple}
        isExpanded={isExpanded}
        onMarkRead={() => markAsRead(n.id)}
        onClick={() => {
          if (!n.isRead) markAsRead(n.id);
          if (n.actionRequired && n.loanData) {
            setTermsModal(n.loanData);
          } else if (isSimple) {
            setExpandedSimple(prev => {
              const next = new Set(prev);
              if (next.has(n.id)) next.delete(n.id);
              else next.add(n.id);
              return next;
            });
          } else {
            setDetailModal(n);
          }
        }}
      />
    );
  };

  const renderSummary = (summary) => {
    const isExpanded = expandedGroups.has(summary.id);
    return (
      <div key={summary.id} className="user-notif-summary-group">
        <div
          className={`user-notif-summary-card ${isExpanded ? 'expanded' : ''}`}
          onClick={() => {
            setExpandedGroups(prev => {
              const next = new Set(prev);
              if (next.has(summary.id)) next.delete(summary.id);
              else next.add(summary.id);
              return next;
            });
          }}
        >
          <div className="user-notif-summary-info">
            <div className={`user-notif-summary-icon-stack ${summary.type}`}>
              {getIcon(summary.type)}
            </div>
            <p className="user-notif-summary-text">
              <span className="user-notif-summary-count">{summary.count}</span> new {badgeLabel(summary.type).toLowerCase()}{summary.count > 1 ? 's' : ''}
            </p>
          </div>
          <div className="user-notif-summary-toggle">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
        {isExpanded && (
          <div className="user-notif-summary-expanded">
            {summary.items.map(n => renderCard(n))}
          </div>
        )}
      </div>
    );
  };

  const NotificationCard = ({ n, isSimple, isExpanded, onMarkRead, onClick }) => {
    const [touchStart, setTouchStart] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const handleTouchStart = (e) => {
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
      if (touchStart === null) return;
      const currentTouch = e.targetTouches[0].clientX;
      const diff = currentTouch - touchStart;
      if (diff < -10) {
        setIsSwiping(true);
        setSwipeOffset(Math.max(diff, -100));
      } else {
        setSwipeOffset(0);
      }
    };

    const handleTouchEnd = () => {
      if (swipeOffset <= -80) {
        onMarkRead();
      }
      setSwipeOffset(0);
      setTouchStart(null);
      setTimeout(() => setIsSwiping(false), 50);
    };

    return (
      <div className={`user-notif-card-outer ${isExpanded ? 'expanded' : ''}`}>
        <div className="user-notif-swipe-reveal">
          <div className="user-notif-swipe-btn">
            <Check size={20} color="white" />
            <span>Read</span>
          </div>
        </div>
        <div
          className={cardClass(n)}
          style={{ transform: `translateX(${swipeOffset}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => !isSwiping && onClick()}
        >
          {getIcon(n.type)}
          <div className="user-notif-body">
            <div className="user-notif-body-header">
              <p className={`user-notif-body-title${n.isRead ? ' read' : ''}`}>
                {n.title}
              </p>
              <div className="user-notif-header-badges">
                {n.type === 'announcement' && <span className="user-notif-admin-label">From admin</span>}
                <span className={`user-notif-type-badge ${badgeClass(n.type)}`}>
                  {badgeLabel(n.type)}
                </span>
                {n.actionRequired && <span className="user-notif-action-pill">Action Required</span>}
              </div>

              <div className="user-notif-header-right">
                {!n.isRead && (
                  <button
                    className="user-notif-quick-read"
                    onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                    title="Mark as read"
                  >
                    <div className="quick-read-dot" />
                    <Check size={14} className="quick-read-icon" />
                  </button>
                )}
                {isSimple && (
                  <ChevronDown
                    size={16}
                    className={`user-notif-chevron ${isExpanded ? 'rotated' : ''}`}
                  />
                )}
              </div>
            </div>
            <p className="user-notif-msg">{n.message}</p>
            <div className="user-notif-footer">
              <span className="user-notif-time">{fmtTime(n.timestamp, n.isReminder)}</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                {n.isRead && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    background: '#EFF6FF',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    marginBottom: '2px'
                  }}>
                    <Check size={12} color="#2563EB" strokeWidth={4} />
                    <span style={{ fontSize: '10px', color: '#2563EB', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Read</span>
                  </div>
                )}
                {n.actionRequired && (
                  <span className="user-notif-review-hint" style={{ fontSize: '11px' }}>Tap to review →</span>
                )}
                {isSimple && !isExpanded && (
                  <span className="user-notif-expand-hint" style={{ fontSize: '11px' }}>Tap to expand ↓</span>
                )}
              </div>
            </div>

            {/* In-place expansion content for simple types */}
            {isSimple && (
              <div className={`user-notif-expandable-content ${isExpanded ? 'expanded' : ''}`}>
                <div className="user-notif-expandable-inner">
                  {n.type === 'attendance' && (
                    <div className="user-notif-detail-grid small">
                      <div><label>Service</label><span>{n.service || 'Sunday Service'}</span></div>
                      <div><label>Recorded On</label><span>{new Date(n.timestamp).toLocaleDateString()}</span></div>
                    </div>
                  )}
                  {n.type === 'savings' && (
                    <div className="user-notif-detail-grid small">
                      <div><label>Goal</label><span>{n.goalName || 'General Savings'}</span></div>
                      <div><label>Amount</label><span className="text-blue">₱{Number(n.amount || 0).toLocaleString()}</span></div>
                      <div><label>Date</label><span>{new Date(n.timestamp).toLocaleDateString()}</span></div>
                    </div>
                  )}
                  {n.type === 'donation' && (
                    <div className="user-notif-detail-grid small">
                      <div><label>Category</label><span>{n.category || 'Tithe'}</span></div>
                      <div><label>Amount</label><span className="text-pink">₱{Number(n.amount || 0).toLocaleString()}</span></div>
                      <div><label>Date</label><span>{new Date(n.timestamp).toLocaleDateString()}</span></div>
                    </div>
                  )}
                  {n.type === 'announcement' && (
                    <div className="user-notif-full-message">
                      {n.message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="user-notifications-container">

        {/* Header */}
        <div className="user-notifications-page-header">
          <div className="user-notifications-header-left">
            <div className="user-notifications-title-row">
              <h1 className="user-notifications-page-title">Notifications</h1>
              {getUnreadCount('all') > 0 && (
                <span className="user-notifications-count-pill" style={{ backgroundColor: '#EF4444' }}>{getUnreadCount('all')}</span>
              )}
            </div>
          </div>
        </div>


        {/* Controls Row: Filters + Mark All */}
        <div className="user-notif-controls-row">
          <div className="user-notif-filters">
            {[
              { key: 'all', label: 'All' },
              { key: 'loans_payments', label: 'Loans & Payments' },
              { key: 'activity', label: 'Activity' },
              { key: 'unread', label: 'Unread' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`user-notif-filter-btn${activeFilter === key ? ' active' : ''}`}
                onClick={() => setActiveFilter(key)}
              >
                {label}
                {getUnreadCount(key) > 0 && (
                  <span className="user-notif-filter-pill">{getUnreadCount(key)}</span>
                )}
              </button>
            ))}
          </div>

          <button className="user-notifications-mark-all-btn" onClick={markAllAsRead}>
            Mark all as read
          </button>
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
            <div className="user-notif-empty-icon">
              <Bell size={48} strokeWidth={1.5} color="#2563EB" />
            </div>
            <h3>{emptyStates[activeFilter]?.msg}</h3>
            <p>{emptyStates[activeFilter]?.hint}</p>
            {activeFilter !== 'all' && (
              <button className="user-notif-empty-btn" onClick={() => setActiveFilter('all')}>
                Show all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="user-notif-list">

            {/* Pinned Section */}
            {pinned.length > 0 && (
              <div className="user-notif-section">
                <div className="user-notif-section-label">Action Required</div>
                {pinned.map(n => renderCard(n))}
              </div>
            )}

            {/* Time-based Sections */}
            {['today', 'yesterday', 'earlier'].map(key => (
              groups[key].length > 0 && (
                <div key={key} className="user-notif-section">
                  <div className="user-notif-section-label">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </div>
                  {groups[key].map(n => n.isSummary ? renderSummary(n) : renderCard(n))}
                </div>
              )
            ))}

            <div className="user-notif-bottom-spacer" />
          </div>
        )}

      </div>

      {/* ── Terms Review Modal ── */}
      {termsModal && (
        <div className="user-terms-modal-overlay" onClick={() => !termsLoading && setTermsModal(null)}>
          <div className="user-terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-notif-modal-drag-handle" />
            <div className="user-terms-modal-header with-bg">
              <h2 className="user-terms-modal-title">Loan Terms Modified</h2>
              <button className="user-terms-modal-close" onClick={() => setTermsModal(null)}>×</button>
            </div>

            <div className="user-notif-modal-subheader">
              <span className={`user-notif-type-badge ${badgeClass('loan')}`}>
                {badgeLabel('loan')}
              </span>
              <span className="user-notif-modal-time">
                {termsModal.modifiedTerms?.proposedDate ? new Date(termsModal.modifiedTerms.proposedDate).toLocaleDateString() : ''}
              </span>
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
                <Banknote size={24} color="#6B7280" />
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

      {/* ── Notification Detail Modal (Loans/Payments) ── */}
      {detailModal && (
        <div className="user-terms-modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="user-terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-notif-modal-drag-handle" />
            <div className="user-terms-modal-header with-bg">
              <h2 className="user-terms-modal-title">{detailModal.title}</h2>
              <button className="user-terms-modal-close" onClick={() => setDetailModal(null)}>×</button>
            </div>

            <div className="user-notif-modal-body">
              <div className="user-notif-modal-subheader">
                <span className={`user-notif-type-badge ${badgeClass(detailModal.type)}`}>
                  {badgeLabel(detailModal.type)}
                </span>
                <span className="user-notif-modal-time">
                  {detailModal.timestamp
                    ? new Date(detailModal.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </div>

              {/* LOAN SPECIFIC CONTENT */}
              {detailModal.type === 'loan' && (
                <div className="user-notif-rich-content">
                  {/* Status Stepper */}
                  <div className="user-notif-stepper">
                    {[
                      { label: 'Submitted', key: 'submitted' },
                      { label: 'Review', key: 'review' },
                      { label: 'Approved', key: 'approved' },
                      { label: 'Disbursed', key: 'disbursed' },
                      { label: 'Completed', key: 'completed' }
                    ].map((step, idx, arr) => {
                      const loanStatus = detailModal.loanData?.status || '';
                      
                      // Map DB status to stepper keys
                      const statusMap = {
                        'pending': 'submitted',
                        'awaiting_member_approval': 'review',
                        'under_review': 'review',
                        'approved': 'approved',
                        'active': 'disbursed',
                        'processed': 'disbursed',
                        'completed': 'completed'
                      };
                      
                      const mappedStatus = statusMap[loanStatus] || loanStatus;
                      const activeIdx = arr.findIndex(s => s.key === mappedStatus);
                      
                      let isComplete = idx <= activeIdx;
                      
                      // Fallback: If activeIdx is -1, use title heuristics
                      if (activeIdx === -1) {
                        if (detailModal.title.includes('Approved') && idx <= 2) isComplete = true;
                        if (detailModal.title.includes('Submitted') && idx <= 0) isComplete = true;
                        if (detailModal.title.includes('Disbursed') && idx <= 3) isComplete = true;
                        if (detailModal.title.includes('Completed') && idx <= 4) isComplete = true;
                      }

                      return (
                        <div key={step.label} className={`user-notif-step ${isComplete ? 'completed' : ''}`}>
                          <div className="step-circle">{isComplete ? <Check size={10} /> : idx + 1}</div>
                          <span className="step-label">{step.label}</span>
                          {idx < arr.length - 1 && <div className="step-line" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="user-notif-detail-grid">
                    <div><label>Loan ID</label><span>{detailModal.loanData?.loanId || '—'}</span></div>
                    <div><label>Amount</label><span className="text-bold">₱{Number(detailModal.loanData?.amount || 0).toLocaleString()}</span></div>
                    <div><label>Interested</label><span>{fmt(detailModal.loanData?.totalInterest)}</span></div>
                    <div><label>Status</label><span className="text-capitalize">{detailModal.loanData?.status || 'Pending'}</span></div>
                  </div>

                  <p className="user-notif-modal-msg">{detailModal.message}</p>

                  <button
                    className="user-notif-action-btn primary"
                    onClick={() => window.location.href = '/loans'}
                  >
                    View Loan Details
                  </button>
                </div>
              )}

              {/* PAYMENT PENDING SPECIFIC CONTENT */}
              {detailModal.type === 'payment_pending' && detailModal.paymentData && (
                <div className="user-notif-rich-content">
                  <div className="user-notif-detail-grid">
                    <div><label>Loan ID</label><span>{detailModal.paymentData.loanId || '—'}</span></div>
                    <div><label>Month #</label><span>{detailModal.paymentData.monthNumber}</span></div>
                    <div><label>Amount</label><span className="text-bold text-orange">₱{Number(detailModal.paymentData.amount).toLocaleString()}</span></div>
                    <div><label>Method</label><span className="text-capitalize">{detailModal.paymentData.paymentMethod}</span></div>
                    <div style={{ gridColumn: '1 / -1' }}><label>Submitted</label><span>{new Date(detailModal.paymentData.submittedAt).toLocaleString()}</span></div>
                  </div>

                  <div className="user-notif-status-bar">
                    <Circle size={10} fill="#F59E0B" color="#F59E0B" />
                    <span className="text-amber">Pending admin confirmation</span>
                  </div>

                  {detailModal.paymentData.proofData && (
                    <div className="user-notif-proof-section">
                      <label>Proof of Payment</label>
                      <img
                        src={detailModal.paymentData.proofData}
                        alt="Payment proof"
                        onClick={() => window.open(detailModal.paymentData.proofData, '_blank')}
                      />
                    </div>
                  )}

                  <button
                    className="user-notif-action-btn"
                    onClick={() => window.location.href = '/loans'}
                  >
                    View Loan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}