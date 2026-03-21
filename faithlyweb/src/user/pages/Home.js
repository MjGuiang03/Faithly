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
  const [activeLoans, setActiveLoans] = useState([]);
  const [donationStats, setDonationStats] = useState({ totalDonated: 0 });
  const [attendanceStats, setAttendanceStats] = useState({ total: 0 });
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [loansRes, donationsRes, attendanceRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans`, { headers }),
        fetch(`${API}/api/donations/my-donations`, { headers }),
        fetch(`${API}/api/attendance/my-attendance`, { headers }),
      ]);

      const [loansData, donationsData, attendanceData] = await Promise.all([
        loansRes.json(),
        donationsRes.json(),
        attendanceRes.json(),
      ]);

      if (loansRes.ok && loansData.success) {
        setLoanStats(loansData.stats || { activeCount: 0, remainingBalance: 0 });
        const active = (loansData.loans || []).filter(l => l.status === 'active' || l.status === 'approved' || l.status === 'disbursed');
        setActiveLoans(active);
      }
      if (donationsRes.ok && donationsData.success) {
        setDonationStats(donationsData.stats || { totalDonated: 0 });
      }
      if (attendanceRes.ok && attendanceData.success) {
        setAttendanceStats(attendanceData.stats || { total: 0 });
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
  }, [token]);

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

  const ActivityIcon = ({ type }) => {
    if (type === 'loan') return (
      <svg fill="none" viewBox="0 0 20 20" width="18" height="18">
        <path d={svgPaths.pd03f500} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d={svgPaths.pafc1d00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      </svg>
    );
    if (type === 'donation') return (
      <svg fill="none" viewBox="0 0 20 20" width="18" height="18">
        <path d={svgPaths.p12f1f900} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      </svg>
    );
    return (
      <svg fill="none" viewBox="0 0 20 20" width="18" height="18">
        <path d="M0.833333 0.833333V4.16667" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d={svgPaths.pf3beb80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d="M0.833333 0.833333H15.8333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      </svg>
    );
  };

  const quickActions = [
    {
      title: 'Make Donation',
      description: 'Support the church',
      gradient: 'linear-gradient(137.368deg, rgb(0, 166, 62) 0%, rgb(0, 130, 54) 100%)',
      action: () => navigate('/donation'),
    },
    {
      title: 'Check Attendance',
      description: 'View your attendance',
      bg: '#0f2854',
      action: () => navigate('/attendance'),
    },
    {
      title: 'View Nearby Community',
      description: 'Find local branches',
      gradient: 'linear-gradient(137.368deg, rgb(21, 93, 252) 0%, rgb(20, 71, 230) 100%)',
      action: () => navigate('/branches'),
    },
  ];

  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = date.toLocaleDateString('en-US', options);
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const branchStr = profile?.branch ? ` | ${profile.branch} Branch` : '';
    return `${dateStr} | ${timeStr}${branchStr}`;
  };

  return (
    <div className="user-home-layout">
      <Sidebar />

      <div className="user-main-content">
        {/* Header — avatar removed */}
        <div className="user-home-header">
          <p className="user-home-date-time">{formatDate(currentTime)}</p>
          <h1 className="user-home-page-title">Welcome Back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</h1>
          <p className="user-home-page-subtitle">Here's an overview of your church activities</p>
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

            {/* Hover Tooltip showing active loan details */}
            {!loading && activeLoans.length > 0 && (
              <div className="user-loan-hover-tooltip">
                <p className="user-loan-hover-title">Your Active Loans</p>
                {activeLoans.slice(0, 3).map((loan, idx) => (
                  <div key={idx} className="user-loan-hover-item">
                    <span className="user-loan-hover-id">{loan.loanId}</span>
                    <span className="user-loan-hover-amount">₱{(loan.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
                {activeLoans.length > 3 && (
                  <p className="user-loan-hover-more">+{activeLoans.length - 3} more loan(s)</p>
                )}
                <p className="user-loan-hover-cta">Click to view details →</p>
              </div>
            )}
            {!loading && activeLoans.length === 0 && (
              <div className="user-loan-hover-tooltip">
                <p className="user-loan-hover-title">No Active Loans</p>
                {profile?.verificationStatus !== 'verified' && (
                  <div className="user-loan-verify-suggestion">
                    <p className="user-verify-text">You are not yet a verified officer. Get verified to unlock more loan features!</p>
                  </div>
                )}
                <p className="user-loan-hover-cta">Click to apply for a loan →</p>
              </div>
            )}
            {!loading && activeLoans.length > 0 && profile?.verificationStatus !== 'verified' && (
               <div className="user-loan-hover-verify-mini">
                  <p>Get verified for more loan options! →</p>
               </div>
            )}
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
              <p className="user-stat-value user-fade-in" style={{ fontSize: '0.85rem', fontWeight: '500' }}>Church Updates</p>
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
                  className="user-action-button"
                  style={{ background: action.gradient || action.bg }}
                >
                  <div className="user-action-content">
                    <h3 className="user-action-title">{action.title}</h3>
                    <p className="user-action-description">{action.description}</p>
                  </div>
                  <svg className="user-action-arrow" fill="none" viewBox="0 0 20 20">
                    <path d="M4.16667 10H15.8333" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p1ae0b780} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
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
                height="150"
                style={{ border: 0, borderRadius: '12px' }}
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
            <h2 className="user-home-card-title">Recent Activities</h2>
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
                <div className="user-fade-in">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="user-activity-item-horizontal">
                      <div className="user-activity-icon-compact" style={{ color: activity.iconColor }}>
                        <ActivityIcon type={activity.type} />
                      </div>
                      <div className="user-activity-details-horizontal">
                        <span className="user-activity-title-compact">{activity.title}</span>
                        <span className="user-activity-separator">–</span>
                        <span className="user-activity-desc-compact">{activity.description}</span>
                        <span className="user-activity-separator">–</span>
                        <span className="user-activity-time-compact">{formatTimeAgo(activity.date)}</span>
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
