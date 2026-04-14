import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminNotification.css';
import svgPaths from "../../imports/svg-icons";

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'donation',
      title: 'Donation received',
      message: 'Juan Dela Cruz donated ₱500 to the General Fund.',
      timestamp: '2026-03-07 09:15 AM',
      isRead: false
    },
    {
      id: 2,
      type: 'member',
      title: 'New member registered',
      message: 'Maria Santos has been successfully registered as a new member.',
      timestamp: '2026-03-06 04:30 PM',
      isRead: true
    },
    {
      id: 3,
      type: 'attendance',
      title: 'Service attendance recorded',
      message: 'Sunday Service attendance has been recorded with 1,234 attendees at Main Branch.',
      timestamp: '2026-03-06 02:00 PM',
      isRead: true
    },
    {
      id: 4,
      type: 'donation',
      title: 'Monthly donation report',
      message: 'Total donations for February 2026: ₱45,230. An 18% increase from last month.',
      timestamp: '2026-03-05 09:00 AM',
      isRead: true
    },
    {
      id: 5,
      type: 'member',
      title: 'New officer appointed',
      message: 'Pedro Garcia has been appointed as a church officer.',
      timestamp: '2026-03-04 11:00 AM',
      isRead: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const getIconBackground = (type) => {
    switch (type) {
      case 'donation':
        return 'admin-notification-icon-donation';
      case 'member':
        return 'admin-notification-icon-member';
      case 'attendance':
        return 'admin-notification-icon-attendance';
      default:
        return '';
    }
  };

  return (
    <div className="admin-notification-main">
      {/* Header */}
      <div className="admin-notification-header">
        <div className="admin-notification-title-row">
          <div className="admin-notification-title-group">
            <h1 className="admin-notification-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="admin-notification-badge">{unreadCount} New</span>
            )}
          </div>
          <button className="admin-notification-mark-all-btn" onClick={markAllAsRead}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p32ddfd00} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mark all as read
          </button>
        </div>
        <p className="admin-notification-subtitle">
          Member, donation, and attendance notifications (No loan notifications)
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="admin-notification-tabs">
        <button
          className={`admin-notification-tab ${filter === 'all' ? 'admin-notification-tab-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`admin-notification-tab ${filter === 'unread' ? 'admin-notification-tab-active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
          {unreadCount > 0 && (
            <span className="admin-notification-tab-badge">{unreadCount}</span>
          )}
        </button>
        <button
          className={`admin-notification-tab ${filter === 'read' ? 'admin-notification-tab-active' : ''}`}
          onClick={() => setFilter('read')}
        >
          Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="admin-notification-list">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`admin-notification-item ${!notification.isRead ? 'admin-notification-item-unread' : ''}`}
          >
            <div className={`admin-notification-icon ${getIconBackground(notification.type)}`}>
              {notification.type === 'donation' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d={svgPaths.p28b04880} stroke="#E60076" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {notification.type === 'member' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d={svgPaths.p6877e0} stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={svgPaths.p3ffa2780} stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={svgPaths.p39df7200} stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={svgPaths.p159fd500} stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {notification.type === 'attendance' && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d={svgPaths.p39dc7e80} stroke="#15803D" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div className="admin-notification-content">
              <div className="admin-notification-content-header">
                <h3 className={`admin-notification-content-title ${notification.isRead ? 'admin-notification-content-title-read' : ''}`}>
                  {notification.title}
                </h3>
                {!notification.isRead && (
                  <div className="admin-notification-unread-indicator">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d={svgPaths.p3e7757b0} fill="#155DFC" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>

              <p className={`admin-notification-content-message ${notification.isRead ? 'admin-notification-content-message-read' : ''}`}>
                {notification.message}
              </p>

              <div className="admin-notification-content-footer">
                <span className="admin-notification-timestamp">{notification.timestamp}</span>
                <div className="admin-notification-actions">
                  {!notification.isRead ? (
                    <>
                      <span className="admin-notification-unread-badge">Unread</span>
                      <button
                        className="admin-notification-mark-read-btn"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark as read
                      </button>
                    </>
                  ) : (
                    <span className="admin-notification-read-badge">Read</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
