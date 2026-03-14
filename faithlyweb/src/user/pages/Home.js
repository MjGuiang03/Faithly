import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import svgPaths from '../../imports/svg-icons';
import Sidebar from '../components/Sidebar';
import API from '../../utils/api';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [loanStats,       setLoanStats]       = useState({ activeCount: 0, remainingBalance: 0 });
  const [donationStats,   setDonationStats]   = useState({ totalDonated: 0 });
  const [attendanceStats, setAttendanceStats] = useState({ total: 0 });
  const [activeLoans,     setActiveLoans]     = useState([]);
  const [recentActivity,  setRecentActivity]  = useState([]);
  const [loading,         setLoading]         = useState(true);

  const token = localStorage.getItem('token');
  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token]);

  const fetchAllData = async () => {
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

      if (loansData.success) {
        setLoanStats(loansData.stats);
        setActiveLoans(loansData.loans?.filter(l => l.status === 'active') || []);
      }
      if (donationsData.success)  setDonationStats(donationsData.stats);
      if (attendanceData.success) setAttendanceStats(attendanceData.stats);

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
  };

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
      title:       'Apply for Loan',
      description: 'Quick loan application',
      gradient:    'linear-gradient(137.368deg, rgb(21, 93, 252) 0%, rgb(20, 71, 230) 100%)',
      action:      () => navigate('/loans'),
    },
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
  ];

  return (
    <div className="home-layout">
      <Sidebar />

      <div className="main-content">
        {/* Header */}
        <div className="home-header">
          <h1 className="page-title">Welcome Back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</h1>
          <p className="page-subtitle">Here's an overview of your church activities</p>
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
              <p className="stat-value">{loading ? '—' : loanStats.activeCount}</p>
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
              <p className="stat-value">{loading ? '—' : `₱${(donationStats.totalDonated || 0).toLocaleString()}`}</p>
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
              <p className="stat-value">{loading ? '—' : attendanceStats.total}</p>
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

        {/* Quick Actions & Recent Activity */}
        <div className="content-grid">
          <div className="card quick-actions-card">
            <h2 className="card-title">Quick Actions</h2>
            <div className="quick-actions-grid">
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
                    <svg className="action-arrow" fill="none" viewBox="0 0 20 20">
                      <path d="M4.16667 10H15.8333" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      <path d={svgPaths.p1ae0b780}   stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card recent-activity-card">
            <h2 className="card-title">Recent Activity</h2>
            <div className="activity-list">
              {loading ? (
                <p className="empty-text">Loading...</p>
              ) : recentActivity.length === 0 ? (
                <p className="empty-text">No recent activity yet.</p>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon" style={{ color: activity.iconColor }}>
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div className="activity-content">
                      <div className="activity-top">
                        <h3 className="activity-title">{activity.title}</h3>
                        <span className="activity-time">{formatTimeAgo(activity.date)}</span>
                      </div>
                      <p className="activity-description">{activity.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Upcoming Loan Payments */}
        <div className="card payments-card">
          <div className="card-header">
            <h2 className="card-title">Upcoming Loan Payments</h2>
            <button className="view-all-btn" onClick={() => navigate('/loans')}>View All</button>
          </div>
          {loading ? (
            <p className="empty-text">Loading...</p>
          ) : activeLoans.length === 0 ? (
            <p className="empty-text">No active loans at the moment.</p>
          ) : (
            <div className="payments-list">
              {activeLoans.slice(0, 3).map((loan, index) => (
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
                      <p className="payment-due">Term: {loan.termMonths} months &nbsp;·&nbsp; {loan.purpose}</p>
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

      {/* Floating Chat Button */}
      <button className="chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}