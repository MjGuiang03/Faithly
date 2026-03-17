import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import svgPaths from '../../imports/svg-icons';
import Sidebar from '../components/Sidebar';
import API from '../../utils/api';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loanStats,       setLoanStats]       = useState({ activeCount: 0, remainingBalance: 0 });
  const [donationStats,   setDonationStats]   = useState({ totalDonated: 0 });
  const [attendanceStats, setAttendanceStats] = useState({ total: 0 });
  const [activeLoans,     setActiveLoans]     = useState([]);
  const [recentActivity,  setRecentActivity]  = useState([]);
  const [loading,         setLoading]         = useState(true);

  const token = localStorage.getItem('token');
  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [loansRes, donationsRes, attendanceRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans`,             { headers }),
        fetch(`${API}/api/donations/my-donations`,     { headers }),
        fetch(`${API}/api/attendance/my-attendance`,   { headers }),
      ]);

      const [loansData, donationsData, attendanceData] = await Promise.all([
        loansRes.json(),
        donationsRes.json(),
        attendanceRes.json(),
      ]);

      if (loansRes.ok && loansData.success) {
        setLoanStats(loansData.stats || { activeCount: 0, remainingBalance: 0 });
        setActiveLoans(loansData.loans?.filter(l => l.status === 'active') || []);
      }
      if (donationsRes.ok && donationsData.success) {
        setDonationStats(donationsData.stats || { totalDonated: 0 });
      }
      if (attendanceRes.ok && attendanceData.success) {
        setAttendanceStats(attendanceData.stats || { total: 0 });
      }

      // Build recent activity from all three sources
      const activities = [];

      if (loansData.success && loansData.loans?.length) {
        loansData.loans.slice(0, 3).forEach(loan => {
          activities.push({
            type:        'loan',
            title:       `Loan ${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}`,
            description: `${loan.loanId} — ₱${loan.amount.toLocaleString()}`,
            date:        new Date(loan.appliedDate),
            iconColor:   '#155DFC',
          });
        });
      }

      if (donationsData.success && donationsData.donations?.length) {
        donationsData.donations.slice(0, 3).forEach(donation => {
          activities.push({
            type:        'donation',
            title:       'Donation Made',
            description: `${donation.category} — ₱${donation.amount.toLocaleString()}`,
            date:        new Date(donation.createdAt),
            iconColor:   '#00A63E',
          });
        });
      }

      if (attendanceData.success && attendanceData.attendance?.length) {
        attendanceData.attendance.slice(0, 3).forEach(record => {
          activities.push({
            type:        'attendance',
            title:       'Service Attended',
            description: `${record.service} — ${record.branch}`,
            date:        new Date(record.createdAt),
            iconColor:   '#0F2854',
          });
        });
      }

      // Sort by most recent first, take top 5
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
    const diff  = Date.now() - date.getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
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
      title:       'Make Donation',
      description: 'Support the church',
      gradient:    'linear-gradient(137.368deg, rgb(0, 166, 62) 0%, rgb(0, 130, 54) 100%)',
      action:      () => navigate('/donation'),
    },
    {
      title:       'Check Attendance',
      description: 'View your attendance',
      bg:          '#0f2854',
      action:      () => navigate('/attendance'),
    },
    {
      title:       'View Nearby Community',
      description: 'Find local branches',
      gradient:    'linear-gradient(137.368deg, rgb(21, 93, 252) 0%, rgb(20, 71, 230) 100%)',
      action:      () => navigate('/branches'),
    },
  ];

  return (
    <div className="home-layout">
      <Sidebar />

      <div className="main-content">
        {/* Header */}
        <div className="home-header">
          <div className="header-greeting">
            <div className="header-text">
              <h1 className="page-title">Welcome Back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</h1>
              <p className="page-subtitle">Here's an overview of your church activities</p>
            </div>
            <div className="header-avatar-container" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" className="header-avatar" />
              ) : (
                <div className="header-avatar-placeholder">
                  {profile?.fullName?.charAt(0)?.toUpperCase() || 'M'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card stat-blue">
            <div className="stat-icon-box">
              <svg className="stat-icon" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.pb47f400}   stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p17a13100}  stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M10 9H8"             stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 13H8"            stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 17H8"            stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Active Loans</p>
              {loading ? <div className="skeleton" style={{ height: '24px', width: '40px', marginTop: '4px' }}></div> : <p className="stat-value fade-in">{loanStats.activeCount}</p>}
            </div>
          </div>

          <div className="stat-card stat-green">
            <div className="stat-icon-box">
              <svg className="stat-icon" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.p3f86cd40} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Donated</p>
              {loading ? <div className="skeleton" style={{ height: '24px', width: '80px', marginTop: '4px' }}></div> : <p className="stat-value fade-in">{`₱${(donationStats.totalDonated || 0).toLocaleString()}`}</p>}
            </div>
          </div>

          <div className="stat-card stat-navy">
            <div className="stat-icon-box">
              <svg className="stat-icon" fill="none" viewBox="0 0 24 24">
                <path d="M8 2V6"              stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 2V6"             stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p32f12c00}  stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M3 10H21"            stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Services Attended</p>
              {loading ? <div className="skeleton" style={{ height: '24px', width: '40px', marginTop: '4px' }}></div> : <p className="stat-value fade-in">{attendanceStats.total}</p>}
            </div>
          </div>

          <div className="stat-card stat-orange">
            <div className="stat-icon-box">
              <svg className="stat-icon" fill="none" viewBox="0 0 24 24">
                <path d="M16 7H22V13"        stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p13253c0}  stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Member Since</p>
              <p className="stat-value">{memberSince}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Quick Actions (30%) */}
          <div className="card quick-actions-card">
            <h2 className="card-title">Quick Actions</h2>
            <div className="quick-actions-list">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="action-button"
                  style={{ background: action.gradient || action.bg }}
                >
                  <div className="action-content">
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                  <svg className="action-arrow" fill="none" viewBox="0 0 20 20">
                    <path d="M4.16667 10H15.8333" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p1ae0b780} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity (70%) */}
          <div className="card recent-activity-card">
            <h2 className="card-title">Recent Activity</h2>
            <div className="activity-list">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="activity-item" style={{ marginBottom: '12px' }}>
                    <div className="skeleton skeleton-circle" style={{ width: '32px', height: '32px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '6px' }}></div>
                      <div className="skeleton" style={{ height: '12px', width: '70%' }}></div>
                    </div>
                  </div>
                ))
              ) : recentActivity.length === 0 ? (
                <p className="empty-text">No recent activity yet.</p>
              ) : (
                <div className="fade-in">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="activity-item-horizontal">
                      <div className="activity-icon-compact" style={{ color: activity.iconColor }}>
                        <ActivityIcon type={activity.type} />
                      </div>
                      <div className="activity-details-horizontal">
                        <span className="activity-title-compact">{activity.title}</span>
                        <span className="activity-separator">–</span>
                        <span className="activity-desc-compact">{activity.description}</span>
                        <span className="activity-separator">–</span>
                        <span className="activity-time-compact">{formatTimeAgo(activity.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Loan Payments (100%) */}
        <div className="full-width-section">
          <div className="card payments-card">
            <div className="card-header">
              <h2 className="card-title">Upcoming Loan Payment</h2>
            </div>
            {loading ? (
              <div className="payments-list">
                <div className="payment-item">
                  <div className="payment-info" style={{ width: '100%' }}>
                    <div className="skeleton skeleton-circle" style={{ width: '38px', height: '38px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '15px', width: '30%', marginBottom: '6px' }}></div>
                      <div className="skeleton" style={{ height: '13px', width: '50%' }}></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="skeleton" style={{ height: '15px', width: '60px', marginBottom: '6px' }}></div>
                      <div className="skeleton" style={{ height: '18px', width: '40px', borderRadius: '20px' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeLoans.length === 0 ? (
              <p className="empty-text">No active loans at the moment.</p>
            ) : (
              <div className="payments-list fade-in">
                {activeLoans.slice(0, 1).map((loan, index) => (
                  <div key={index} className="payment-item">
                    <div className="payment-info">
                      <div className="payment-icon">
                        <svg fill="none" viewBox="0 0 20 20">
                          <path d="M10 5V10L13.3333 11.6667" stroke="#F54900" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                          <path d={svgPaths.p14d24500} stroke="#F54900" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        </svg>
                      </div>
                      <div className="payment-details">
                        <h3 className="payment-id">{loan.loanId}</h3>
                        <p className="payment-due">Term: {loan.termMonths}mo · {loan.purpose}</p>
                      </div>
                    </div>
                    <div className="payment-actions">
                      <p className="payment-amount">₱{(loan.remainingBalance || loan.amount).toLocaleString()}</p>
                      <span className="payment-status">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Chat Button */}
      <button className="chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}