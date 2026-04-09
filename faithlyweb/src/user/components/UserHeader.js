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


  /* Notifications state */
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
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch feed');

      const { readIds: readIdsFromData, payments, loans: loansDataFeed, donations: donationsDataFeed, attendance: attendanceDataFeed } = data;

      const currentReadIds = new Set(readIdsFromData || []);
      setReadIds(currentReadIds);

      const items = [];
      if (loansDataFeed) {
        loansDataFeed.forEach(l => {
          if (l.status === 'awaiting_member_approval') {
            items.push({ id: `loan-terms-${l._id}`, type: 'loan', title: 'Terms Modified', message: `Review proposed terms for loan ${l.loanId}.`, timestamp: l.updatedAt });
          }
          if (l.status === 'approved') items.push({ id: `loan-app-${l._id}`, type: 'loan', title: 'Loan Approved', message: `Your loan ${l.loanId} has been approved.`, timestamp: l.updatedAt });
        });
      }
      if (payments) {
        payments.forEach(p => {
          items.push({ id: `payment-pending-${p._id}`, type: 'payment_pending', title: 'Payment Submitted', message: `Month #${p.monthNumber} payment for ${p.loanId} is pending.`, timestamp: p.submittedAt });
        });
      }
      if (donationsDataFeed) {
        donationsDataFeed.filter(d => d.status === 'confirmed').forEach(d => {
          items.push({ id: `don-${d._id}`, type: 'donation', title: 'Donation Received', message: `₱${d.amount.toLocaleString()} donation confirmed.`, timestamp: d.updatedAt });
        });
      }
      if (attendanceDataFeed) {
        attendanceDataFeed.slice(0, 5).forEach(a => {
          items.push({ id: `att-${a._id}`, type: 'attendance', title: 'Attendance Recorded', message: `Attended ${a.service || 'Sunday Service'}.`, timestamp: a.createdAt });
        });
      }

      items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifItems(items.slice(0, 10));
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
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
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
            <Bell size={20} color="#1e3a8a" />
            {unreadNotifCount > 0 && (
              <span className="user-header-badge">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
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
                        {item.type === 'loan' ? <Banknote size={18} color="#155DFC" /> : 
                         item.type === 'donation' ? <Heart size={18} color="#155DFC" /> :
                         item.type === 'attendance' ? <CalendarDays size={18} color="#155DFC" /> :
                         <Circle size={10} color="#155DFC" />}
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
