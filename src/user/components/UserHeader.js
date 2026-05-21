import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Bell, Banknote, Heart, CalendarDays, Circle, X, Menu } from 'lucide-react';
import API from '../../utils/api';
import '../styles/UserHeader.css';

export default function UserHeader({ toggleSidebar, collapsed }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const token = localStorage.getItem('token');
  const [notifItems, setNotifItems] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const dropdownRef = useRef(null);


  /* --- Notification Fetching --- */
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const res = await fetch(`${API}/api/notifications/feed`, { headers });
      
      // Safety guard for non-JSON responses (like 404 pages)
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        return;
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch feed');

      const { readIds: readIdsFromData, payments, loans: loansDataFeed, donations: donationsDataFeed, attendance: attendanceDataFeed, savings: savingsDataFeed } = data;

      const currentReadIds = new Set(readIdsFromData || []);
      setReadIds(currentReadIds);

      const items = [];
      if (loansDataFeed) {
        loansDataFeed.forEach(l => {
          if (l.status === 'awaiting_member_approval') {
            items.push({ id: `loan-terms-${l._id}`, type: 'loan', title: 'Terms Modified', message: `Review proposed terms for loan ${l.loanId}.`, timestamp: l.updatedAt || l.createdAt });
          }
          if (l.status === 'approved') {
            items.push({ id: `loan-app-${l._id}`, type: 'loan', title: 'Loan Approved', message: `Your loan ${l.loanId} has been approved.`, timestamp: l.updatedAt || l.createdAt });
          }
          if (l.status === 'active' && l.disbursed) {
            const term = l.termMonths || 12;
            const paidMonths = l.paidMonths || 0;
            if (paidMonths < term && l.disbursementDate) {
              const startDate = new Date(l.disbursementDate);
              const nextDue = new Date(startDate);
              nextDue.setMonth(startDate.getMonth() + paidMonths + 1);
              const cutoffDate = new Date(nextDue);
              cutoffDate.setDate(nextDue.getDate() + 3);
              cutoffDate.setHours(23, 59, 59, 999);
              
              if (Date.now() > cutoffDate.getTime()) {
                items.push({ 
                  id: `loan-late-${l._id}-${paidMonths}`, 
                  type: 'loan', 
                  title: 'Payment Overdue', 
                  message: `Your payment for loan ${l.loanId} is late. Please settle to avoid further penalties.`, 
                  timestamp: cutoffDate.toISOString() 
                });
              }
            }
            items.push({ id: `loan-disbursed-${l._id}`, type: 'loan', title: 'Loan Disbursed', message: `Your loan ${l.loanId} has been successfully disbursed.`, timestamp: l.disbursementDate || l.updatedAt });
          }
          if (l.status === 'rejected') {
            items.push({ id: `loan-rejected-${l._id}`, type: 'loan', title: 'Loan Rejected', message: `Your loan application ${l.loanId} was rejected.`, timestamp: l.rejectedDate || l.updatedAt });
          }
        });
      }
      if (payments) {
        payments.forEach(p => {
          if (p.status === 'pending') {
            items.push({ id: `payment-pending-${p._id}`, type: 'payment_pending', title: 'Payment Submitted', message: `Month #${p.monthNumber} payment for ${p.loanId} is pending.`, timestamp: p.submittedAt || p.createdAt });
          }
          if (p.status === 'confirmed') {
            items.push({ id: `payment-confirmed-${p._id}`, type: 'payment_confirmed', title: 'Payment Confirmed', message: `Payment of ₱${p.amount.toLocaleString()} for ${p.loanId} confirmed.`, timestamp: p.confirmedAt || p.updatedAt });
          }
          if (p.status === 'rejected') {
            items.push({ id: `payment-rejected-${p._id}`, type: 'payment_rejected', title: 'Payment Rejected', message: `Your payment for ${p.loanId} was rejected.`, timestamp: p.rejectedAt || p.updatedAt });
          }
        });
      }
      if (donationsDataFeed) {
        donationsDataFeed.filter(d => d.status === 'confirmed').forEach(d => {
          items.push({ id: `don-${d._id}`, type: 'donation', title: 'Donation Received', message: `₱${d.amount.toLocaleString()} donation confirmed.`, timestamp: d.updatedAt || d.date || d.createdAt });
        });
      }
      if (attendanceDataFeed) {
        attendanceDataFeed.slice(0, 5).forEach(a => {
          items.push({ id: `att-${a._id}`, type: 'attendance', title: 'Attendance Recorded', message: `Attended ${a.service || 'Sunday Service'}.`, timestamp: a.createdAt || a.date });
        });
      }
      if (savingsDataFeed) {
        savingsDataFeed.filter(s => s.type === 'deposit' && s.status === 'confirmed').forEach(s => {
          items.push({ 
            id: `sav-${s._id}`, 
            type: 'savings', 
            title: 'Savings Validated', 
            message: `Your deposit of ₱${s.amount.toLocaleString()} is now confirmed.`, 
            timestamp: s.date || s.createdAt 
          });
        });
        savingsDataFeed.filter(s => s.type === 'withdrawal' && s.status === 'confirmed').forEach(s => {
          items.push({ 
            id: `sav-wd-${s._id}`, 
            type: 'savings_withdrawal', 
            title: 'Withdrawal Successful', 
            message: `Your withdrawal of ₱${s.amount.toLocaleString()} from ${s.goalName || 'your savings'} has been approved.`, 
            timestamp: s.confirmedAt || s.date || s.createdAt 
          });
        });
      }

      items.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      setNotifItems(items.slice(0, 5)); // Show exactly 5 items as requested
      setUnreadNotifCount(items.filter(it => !currentReadIds.has(it.id)).length);
    } catch (err) {
      console.error('Failed to fetch header notifications:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000); // Poll every 2 minutes
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  /* --- Notification Helpers --- */
  const markAsRead = async (id) => {
    if (readIds.has(id)) return;
    try {
      await fetch(`${API}/api/read-notifications`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });
      setReadIds(prev => new Set([...prev, id]));
      setUnreadNotifCount(c => Math.max(0, c - 1));
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    const unread = notifItems.filter(it => !readIds.has(it.id)).map(it => it.id);
    if (unread.length === 0) return;
    try {
      await fetch(`${API}/api/read-notifications`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unread })
      });
      setReadIds(prev => new Set([...prev, ...unread]));
      setUnreadNotifCount(0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (showNotifDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest('.user-header-notify-btn')) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showNotifDropdown]);

  const formatTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 0) {
      if (diff > -60000) return 'Just now';
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <header className="user-header-container">
      <div className="user-header-left-group">
        <button className="user-header-menu-btn" onClick={toggleSidebar}>
          {collapsed ? <Menu size={24} color="#1e3a8a" /> : <X size={24} color="#1e3a8a" />}
        </button>

        <div className="user-header-left">
          <h1 className="user-header-title">
            Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}!
          </h1>
        </div>
      </div>

        <div className="user-header-right">
          <button 
            className="user-header-notify-btn" 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            aria-label="Toggle notifications"
          >
            <Bell size={20} color="#ffffff" />
            {unreadNotifCount > 0 && (
              <span className="user-header-badge">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            // ... (rest of notif dropdown)
            <div className="user-header-dropdown" ref={dropdownRef}>
              <div className="user-header-dropdown-header">
                <h3 className="user-header-dropdown-title">Notifications</h3>
                <button 
                  className="user-header-dropdown-mark-read" 
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </button>
              </div>
              
              <div className="user-header-dropdown-list">
                {notifItems.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <Bell size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No notifications yet</p>
                  </div>
                ) : (
                  notifItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => { markAsRead(item.id); navigate('/notifications'); setShowNotifDropdown(false); }}
                      className={`user-header-notif-item ${readIds.has(item.id) ? '' : 'unread'}`}
                    >
                      <div className="user-header-notif-icon-box">
                        {item.type === 'loan' ? <Banknote size={14} color="#155DFC" /> : 
                         item.type === 'donation' ? <Heart size={14} color="#155DFC" /> :
                         item.type === 'attendance' ? <CalendarDays size={14} color="#155DFC" /> :
                         item.type === 'savings' ? <Banknote size={14} color="#155DFC" /> :
                         item.type === 'savings_withdrawal' ? <Banknote size={14} color="#16A34A" /> :
                         <Circle size={8} color="#155DFC" />}
                      </div>
                      <div className="user-header-notif-content">
                        <div className="user-header-notif-title-row">
                           <p className="user-header-notif-title">{item.title}</p>
                           {!readIds.has(item.id) && <span className="user-header-notif-dot" />}
                        </div>
                        <p className="user-header-notif-msg">{item.message}</p>
                        <span className="user-header-notif-time">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="user-header-dropdown-footer">
                <button 
                  className="user-header-see-all-btn" 
                  onClick={() => { navigate('/notifications'); setShowNotifDropdown(false); }}
                >
                  See all notifications
                </button>
              </div>
            </div>
          )}



        </div>
    </header>
  );
}
