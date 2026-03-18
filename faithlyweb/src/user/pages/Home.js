import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import svgPaths from '../../imports/svg-icons';
import Sidebar from '../components/Sidebar';
import API from '../../utils/api';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loanStats, setLoanStats] = useState({ activeCount: 0, remainingBalance: 0 });
  const [donationStats, setDonationStats] = useState({ totalDonated: 0 });
  const [attendanceStats, setAttendanceStats] = useState({ total: 0 });
  const [activeLoans, setActiveLoans] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();

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
        setActiveLoans(loansData.loans?.filter(l => l.status === 'active') || []);
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

  return (
    <div className="user-home-layout">
      <Sidebar />

      <div className="user-main-content">
        {/* Header — avatar removed */}
        <div className="user-home-header">
          <h1 className="user-home-page-title">Welcome Back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</h1>
          <p className="user-home-page-subtitle">Here's an overview of your church activities</p>
        </div>

        {/* Stats Grid */}
        <div className="user-stats-grid">
          <div className="user-stat-card user-stat-blue">
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

          <div className="user-stat-card user-stat-green">
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

          <div className="user-stat-card user-stat-navy">
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

          <div className="user-stat-card user-stat-orange">
            <div className="user-stat-icon-box">
              <svg className="user-stat-icon" fill="none" viewBox="0 0 24 24">
                <path d="M16 7H22V13" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p13253c0} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Member Since</p>
              <p className="user-stat-value">{memberSince}</p>
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

          {/* Community Section — New */}
          <div className="user-home-card user-home-community-card">
            <div className="user-community-badge">CHURCH HUB</div>
            <h2 className="user-home-card-title">Your Community</h2>
            <div className="user-community-content">
              <div className="user-community-illustration">
                <svg fill="none" viewBox="0 0 24 24" width="40" height="40">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12Z" stroke="#155DFC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="9" r="2.5" stroke="#155DFC" strokeWidth="1.8" />
                </svg>
              </div>
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

          {/* Upcoming Loan Payments — Conditional */}
          {user?.role === 'officer' && (
            <div className="user-home-full-width-section">
              <div className="user-home-card user-home-payments-card">
                <div className="user-home-card-header">
                  <h2 className="user-home-card-title">Upcoming Loan Payment</h2>
                </div>
                {loading ? (
                  <div className="user-payments-list">
                    <div className="user-payment-item">
                      <div className="user-payment-info" style={{ width: '100%' }}>
                        <div className="user-skeleton user-skeleton-circle" style={{ width: '38px', height: '38px', flexShrink: 0 }}></div>
                        <div style={{ flex: 1 }}>
                          <div className="user-skeleton user-skeleton-text" style={{ height: '15px', width: '30%', marginBottom: '6px' }}></div>
                          <div className="user-skeleton user-skeleton-text" style={{ height: '13px', width: '50%' }}></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="user-skeleton user-skeleton-text" style={{ height: '15px', width: '60px', marginBottom: '6px' }}></div>
                          <div className="user-skeleton user-skeleton-text" style={{ height: '18px', width: '40px', borderRadius: '20px' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeLoans.length === 0 ? (
                  <p className="user-home-empty-text">No active loans at the moment.</p>
                ) : (
                  <div className="user-payments-list user-fade-in">
                    {activeLoans.slice(0, 1).map((loan, index) => (
                      <div key={index} className="user-payment-item">
                        <div className="user-payment-info">
                          <div className="user-payment-icon">
                            <svg fill="none" viewBox="0 0 20 20">
                              <path d="M10 5V10L13.3333 11.6667" stroke="#F54900" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                              <path d={svgPaths.p14d24500} stroke="#F54900" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
                          </div>
                          <div className="user-payment-details">
                            <h3 className="user-payment-id">{loan.loanId}</h3>
                            <p className="user-payment-due">Term: {loan.termMonths}mo · {loan.purpose}</p>
                          </div>
                        </div>
                        <div className="user-payment-actions">
                          <p className="user-payment-amount">₱{(loan.remainingBalance || loan.amount).toLocaleString()}</p>
                          <span className="user-payment-status">Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Floating Chat Button */}
      <button className="user-chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
