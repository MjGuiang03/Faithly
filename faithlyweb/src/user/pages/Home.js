import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import svgPaths from '../../imports/svg-icons';
import Sidebar from '../components/Sidebar';
import AnnouncementModal from '../components/AnnouncementModal';
import API from '../../utils/api';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loanStats, setLoanStats] = useState({ activeCount: 0, remainingBalance: 0 });
  const [donationStats, setDonationStats] = useState({ totalDonated: 0 });
  const [attendanceStats, setAttendanceStats] = useState({ total: 0 });
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const branch = profile?.branch || '';
      const [loansRes, donationsRes, attendanceRes, annRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans`, { headers }),
        fetch(`${API}/api/donations/my-donations`, { headers }),
        fetch(`${API}/api/attendance/my-attendance`, { headers }),
        fetch(`${API}/api/admin/announcements${branch ? `?branch=${encodeURIComponent(branch)}` : ''}`, { headers }),
      ]);

      const [loansData, donationsData, attendanceData, annData] = await Promise.all([
        loansRes.ok ? loansRes.json() : { success: false },
        donationsRes.ok ? donationsRes.json() : { success: false },
        attendanceRes.ok ? attendanceRes.json() : { success: false },
        annRes.ok ? annRes.json() : { success: false },
      ]);

      if (loansRes.ok && loansData.success) {
        setLoanStats(loansData.stats || { activeCount: 0, remainingBalance: 0 });
      }
      if (donationsRes.ok && donationsData.success) {
        setDonationStats(donationsData.stats || { totalDonated: 0 });
      }
      if (attendanceRes.ok && attendanceData.success) {
        setAttendanceStats(attendanceData.stats || { total: 0 });
      }

      if (annRes.ok && annData.success) {
        const readIds = JSON.parse(localStorage.getItem('faithly_ann_read') || '[]');
        const unread = (annData.announcements || []).filter(a => !readIds.includes(a._id)).length;
        setAnnouncementsCount(unread);
      }

      const activities = [];

      if (loansData.success && loansData.loans?.length) {
        loansData.loans.slice(0, 5).forEach(loan => {
          activities.push({
            type: 'loan',
            title: `Loan ${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}`,
            description: `${loan.loanId} — ₱${loan.amount.toLocaleString()}`,
            date: new Date(loan.appliedDate),
            iconColor: '#155DFC',
          });
        });
      }

      if (donationsData.success && donationsData.donations?.length) {
        donationsData.donations.slice(0, 5).forEach(donation => {
          activities.push({
            type: 'donation',
            title: 'Donation Made',
            description: `${donation.category} — ₱${donation.amount.toLocaleString()}`,
            date: new Date(donation.createdAt),
            iconColor: '#00A63E',
          });
        });
      }

      if (attendanceData.success && attendanceData.attendance?.length) {
        attendanceData.attendance.slice(0, 5).forEach(record => {
          activities.push({
            type: 'attendance',
            title: 'Service Attended',
            description: `${record.service} — ${record.branch}`,
            date: new Date(record.createdAt),
            iconColor: '#0F2854',
          });
        });
      }

      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, profile?.branch]);

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token, fetchAllData]);

  const formatTimeAgo = (date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };



  const quickActions = [
    {
      title: 'Make a Donation',
      description: 'Support the church today',
      className: 'user-action-btn-donate',
      action: () => navigate('/donation'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    {
      title: 'Check Attendance',
      description: 'View your attendance record',
      className: 'user-action-btn-attendance',
      action: () => navigate('/attendance'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    },
    {
      title: 'View Nearby Community',
      description: 'Find local branches',
      className: 'user-action-btn-community',
      action: () => navigate('/branches'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      )
    },
  ];

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimePill = (date) => {
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const branchPrefix = profile?.branch ? ` · ${profile.branch}` : '';
    return `${dateStr} · ${timeStr}${branchPrefix}`;
  };

  return (
    <div className="user-home-layout">
      <Sidebar />

      <div className="user-main-content">
        <div className="user-home-header-container">
          <div className="user-home-header-left">
            <h1 className="user-home-page-title">Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</h1>
            <p className="user-home-page-subtitle">Here's an overview of your church activities</p>
          </div>

          <div className="user-home-header-right">
            <div className="user-home-info-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatTimePill(currentTime)}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="user-stats-grid">
          <div className="user-stat-card user-stat-blue user-stat-card-clickable" onClick={() => navigate('/loans')} style={{ cursor: 'pointer', position: 'relative' }}>
            <div className="user-stat-icon-box">
              <svg className="user-stat-icon" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.pb47f400} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p17a13100} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M10 9H8" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 13H8" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 17H8" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Active Loans</p>
              {loading ? <div className="user-skeleton" style={{ height: '24px', width: '40px', marginTop: '4px' }}></div> : <p className="user-stat-value user-fade-in">{loanStats.activeCount}</p>}
            </div>
          </div>

          <div className="user-stat-card user-stat-green user-stat-card-clickable" onClick={() => navigate('/donation')} style={{ cursor: 'pointer' }}>
            <div className="user-stat-icon-box">
              <svg className="user-stat-icon" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.p3f86cd40} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Total Donated</p>
              {loading ? <div className="user-skeleton" style={{ height: '24px', width: '80px', marginTop: '4px' }}></div> : <p className="user-stat-value user-fade-in">{`₱${(donationStats.totalDonated || 0).toLocaleString()}`}</p>}
            </div>
          </div>

          <div className="user-stat-card user-stat-navy user-stat-card-clickable" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
            <div className="user-stat-icon-box">
              <svg className="user-stat-icon" fill="none" viewBox="0 0 24 24">
                <path d="M8 2V6" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 2V6" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p32f12c00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M3 10H21" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Services Attended</p>
              {loading ? <div className="user-skeleton" style={{ height: '24px', width: '40px', marginTop: '4px' }}></div> : <p className="user-stat-value user-fade-in">{attendanceStats.total}</p>}
            </div>
          </div>

          <div className="user-stat-card user-stat-orange" style={{ cursor: 'pointer' }} onClick={() => setShowAnnouncements(true)}>
            <div className="user-stat-icon-box">
              <svg className="user-stat-icon" fill="none" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Announcements</p>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                <p className="user-stat-value user-fade-in" style={{ whiteSpace: 'nowrap' }}>Church Updates</p>
                {!loading && announcementsCount > 0 && <span className="user-stat-badge">{announcementsCount} unread</span>}
              </div>
            </div>
          </div>

        </div>

        {/* Dashboard Grid */}
        <div className="user-dashboard-grid">
          {/* Quick Actions */}
          <div className="user-home-card user-home-quick-actions-card">
            <h2 className="user-home-card-title">Quick Actions</h2>
            <div className="user-quick-actions-list">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`user-action-button ${action.className}`}
                >
                  <div className="user-action-icon-wrapper">
                    {action.icon}
                  </div>
                  <div className="user-action-content">
                    <h3 className="user-action-title">{action.title}</h3>
                    <p className="user-action-description">{action.description}</p>
                  </div>
                  <svg className="user-action-arrow" fill="none" viewBox="0 0 20 20">
                    <path d="M4.16667 10H15.8333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <path d={svgPaths.p1ae0b780} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Community Section — Real Map */}
          <div className="user-home-card user-home-community-card">
            <h2 className="user-home-card-title">Your Community</h2>
            <div className="user-community-info-wrap">
              <p className="user-community-branch-name">{profile?.branch || 'PUAC Main'}</p>
            </div>

            <div className="user-community-map-container">
              <iframe
                title="Community Map"
                width="100%"
                style={{ border: 0, flex: 1 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(profile?.branch || 'Meycauayan City, Bulacan')},Philippines&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              ></iframe>
            </div>

            <div className="user-community-content">
              <p className="user-community-text">Stay updated with your local branch and upcoming events in your area.</p>
              <button className="user-community-action-btn" onClick={() => navigate('/branches')}>
                Explore Branches
              </button>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="user-home-card user-home-recent-activity-card">
            <div className="user-home-card-header-with-icon" style={{ justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="user-home-card-title">Recent Activity</h2>
              </div>
            </div>
            <div className="user-activity-list">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="user-activity-item" style={{ marginBottom: '12px' }}>
                    <div className="user-skeleton user-skeleton-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="user-skeleton user-skeleton-text" style={{ height: '14px', width: '40%', marginBottom: '6px' }}></div>
                      <div className="user-skeleton user-skeleton-text" style={{ height: '12px', width: '70%' }}></div>
                    </div>
                  </div>
                ))
              ) : recentActivity.length === 0 ? (
                <p className="user-home-empty-text">No recent activity yet.</p>
              ) : (
                <div className="user-fade-in user-activity-flex-col">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className={`user-activity-item-horizontal user-activity-item-${activity.type}`}>
                      <div className="user-activity-icon-compact" style={{ color: activity.iconColor }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                          {activity.type === 'loan' ? (
                            <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                          ) : activity.type === 'donation' ? (
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          ) : (
                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          )}
                        </svg>
                      </div>
                      <div className="user-activity-details-horizontal">
                        <div className="user-activity-left-col">
                          <span className="user-activity-title-compact">{activity.title}</span>
                          <span className="user-activity-desc-compact">{activity.description.split(' — ')[0]}</span>
                        </div>
                        <div className="user-activity-right-col">
                          <span className={`user-activity-amount-compact user-activity-amount-${activity.type}`}>
                            {activity.description.split(' — ')[1] || ''}
                          </span>
                          <span className="user-activity-time-compact">{formatTimeAgo(activity.date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Chat Button */}
      <button className="user-chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      {/* Announcements Modal */}
      <AnnouncementModal
        isOpen={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
      />
    </div>
  );
}