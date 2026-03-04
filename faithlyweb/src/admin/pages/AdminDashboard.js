import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '../styles/AdminDashboard.css';
import svgPaths from "../../imports/svg-icons";

const API = process.env.REACT_APP_API_URL;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 2340,
    activeLoan: 47,
    thisMonthDonations: 45230,
    avgAttendance: 1890
  });
  const [pendingActions, setPendingActions] = useState({
    loanApplications: 12,
    newMembers: 8,
    paymentIssues: 3
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/admin/login');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      setRecentActivities([
        { id: 1, type: 'loan', title: 'New loan application submitted', member: 'Juan Dela Cruz', time: '10 minutes ago' },
        { id: 2, type: 'donation', title: 'Donation received', member: 'Juan Dela Cruz • ₱500', time: '25 minutes ago' },
        { id: 3, type: 'approved', title: 'Loan approved', member: 'Juan Dela Cruz', time: '1 hour ago' },
        { id: 4, type: 'member', title: 'New member registered', member: 'Juan Dela Cruz', time: '2 hours ago' },
        { id: 5, type: 'attendance', title: 'Service attendance recorded', member: 'Sunday Service • 1,234 attendees', time: '3 hours ago' },
      ]);

      setUpcomingPayments([
        { id: 1, member: 'Gabriel Varona', loanId: 'LN-2026-001', dueDate: '2/1/2026', amount: 450, status: 'due' },
        { id: 2, member: 'Gabriel Varona', loanId: 'LN-2026-012', dueDate: '2/3/2026', amount: 325, status: 'upcoming' },
        { id: 3, member: 'Gabriel Varona', loanId: 'LN-2025-089', dueDate: '1/30/2026', amount: 550, status: 'overdue' },
      ]);
    } catch (err) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `₱${Number(n).toLocaleString()}`;

  return (
    <div className="admin-dashboard-main">
      {/* Header */}
      <div className="admin-dashboard-header">
        <h1 className="admin-dashboard-title">Admin Dashboard</h1>
        <p className="admin-dashboard-subtitle">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-dashboard-stats-grid">
        {/* Total Members */}
        <div className="admin-dashboard-stat-card" style={{ background: '#eff6ff' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">+12%</div>
          </div>
          <div className="admin-dashboard-stat-label">Total Members</div>
          <div className="admin-dashboard-stat-value">{stats.totalMembers.toLocaleString()}</div>
        </div>

        {/* Active Loans */}
        <div className="admin-dashboard-stat-card" style={{ background: '#f0fdf4' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">+5%</div>
          </div>
          <div className="admin-dashboard-stat-label">Active Loans</div>
          <div className="admin-dashboard-stat-value">{stats.activeLoan}</div>
        </div>

        {/* This Month Donations */}
        <div className="admin-dashboard-stat-card" style={{ background: '#fdf2f8' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-pink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04096 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7563 5.72718 21.351 5.12075 20.84 4.61V4.61Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">+18%</div>
          </div>
          <div className="admin-dashboard-stat-label">This Month Donations</div>
          <div className="admin-dashboard-stat-value">{fmt(stats.thisMonthDonations)}</div>
        </div>

        {/* Avg. Attendance */}
        <div className="admin-dashboard-stat-card" style={{ background: '#faf5ff' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-darkblue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 10H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">+8%</div>
          </div>
          <div className="admin-dashboard-stat-label">Avg. Attendance</div>
          <div className="admin-dashboard-stat-value">{stats.avgAttendance.toLocaleString()}</div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="admin-dashboard-pending-section">
        <h2 className="admin-dashboard-section-title">Pending Actions</h2>
        <div className="admin-dashboard-pending-grid">
          {/* Loan Applications */}
          <div className="admin-dashboard-pending-card">
            <div className="admin-dashboard-pending-icon admin-bg-orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#F54900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="#F54900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="admin-dashboard-pending-number">{pendingActions.loanApplications}</div>
              <div className="admin-dashboard-pending-label">Loan Applications</div>
            </div>
          </div>

          {/* New Members */}
          <div className="admin-dashboard-pending-card">
            <div className="admin-dashboard-pending-icon admin-bg-lightblue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 8V14" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 11H17" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="admin-dashboard-pending-number">{pendingActions.newMembers}</div>
              <div className="admin-dashboard-pending-label">New Members</div>
            </div>
          </div>

          {/* Payment Issues */}
          <div className="admin-dashboard-pending-card">
            <div className="admin-dashboard-pending-icon admin-bg-lightred">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#E7000B" strokeWidth="2"/>
                <path d="M12 8V12" stroke="#E7000B" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#E7000B"/>
              </svg>
            </div>
            <div>
              <div className="admin-dashboard-pending-number">{pendingActions.paymentIssues}</div>
              <div className="admin-dashboard-pending-label">Payment Issues</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities and Upcoming Payments */}
      <div className="admin-dashboard-activity-section">
        {/* Recent Activities */}
        <div className="admin-dashboard-activity-card">
          <div className="admin-dashboard-activity-header">
            <h2 className="admin-dashboard-section-title" style={{ marginBottom: 0 }}>Recent Activities</h2>
            <button className="admin-dashboard-view-all-btn">View All</button>
          </div>

          <div>
            {recentActivities.map((activity) => (
              <div key={activity.id} className="admin-dashboard-activity-item">
                <div className="admin-dashboard-activity-icon">
                  {activity.type === 'loan' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M12.5 1.66667H5C4.55797 1.66667 4.13405 1.84226 3.82149 2.15482C3.50893 2.46738 3.33333 2.89131 3.33333 3.33333V16.6667C3.33333 17.1087 3.50893 17.5326 3.82149 17.8452C4.13405 18.1577 4.55797 18.3333 5 18.3333H15C15.442 18.3333 15.8659 18.1577 16.1785 17.8452C16.4911 17.5326 16.6667 17.1087 16.6667 16.6667V5.83333L12.5 1.66667Z" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11.6667 1.66667V5C11.6667 5.44203 11.8423 5.86595 12.1548 6.17851C12.4674 6.49107 12.8913 6.66667 13.3333 6.66667H16.6667" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {activity.type === 'donation' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M17.3667 4.68333C17.0584 4.375 16.6917 4.13 16.2879 3.97083C15.8841 3.81166 15.4517 3.72916 15.015 3.72916C14.5783 3.72916 14.1459 3.81166 13.7421 3.97083C13.3383 4.13 12.9716 4.375 12.6633 4.68333L11.875 5.47166L11.0867 4.68333C10.4636 4.06019 9.62353 3.71061 8.74667 3.71061C7.8698 3.71061 7.02973 4.06019 6.40667 4.68333C5.78352 5.30639 5.43395 6.14647 5.43395 7.02333C5.43395 7.9002 5.78352 8.74027 6.40667 9.36333L7.195 10.1517L11.875 14.8317L16.555 10.1517L17.3433 9.36333C17.6517 9.055 17.8967 8.68833 18.0558 8.28458C18.215 7.88083 18.2975 7.44842 18.2975 7.01166C18.2975 6.57491 18.215 6.1425 18.0558 5.73875C17.8967 5.335 17.6517 4.96833 17.3433 4.66V4.68333H17.3667Z" stroke="#E60076" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {activity.type === 'approved' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 9.16667L10 11.6667L18.3333 3.33333" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {activity.type === 'member' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M13.3333 17.5V15.8333C13.3333 14.9493 12.9821 14.1014 12.357 13.4763C11.7319 12.8512 10.8841 12.5 10 12.5H5C4.11595 12.5 3.2681 12.8512 2.64298 13.4763C2.01786 14.1014 1.66667 14.9493 1.66667 15.8333V17.5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7.5 9.16667C9.34095 9.16667 10.8333 7.67428 10.8333 5.83333C10.8333 3.99238 9.34095 2.5 7.5 2.5C5.65905 2.5 4.16667 3.99238 4.16667 5.83333C4.16667 7.67428 5.65905 9.16667 7.5 9.16667Z" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {activity.type === 'attendance' && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="2.5" y="3.33333" width="15" height="13.3333" rx="1.66667" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="admin-dashboard-activity-title">{activity.title}</div>
                  <div className="admin-dashboard-activity-name">{activity.member}</div>
                  <div className="admin-dashboard-activity-time">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="admin-dashboard-activity-card">
          <div className="admin-dashboard-activity-header">
            <h2 className="admin-dashboard-section-title" style={{ marginBottom: 0 }}>Upcoming Payments</h2>
            <button className="admin-dashboard-view-all-btn">View All</button>
          </div>

          <div>
            {upcomingPayments.map((payment) => (
              <div key={payment.id} className="admin-dashboard-payment-item">
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div className="admin-dashboard-payment-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke={payment.status === 'overdue' ? '#E7000B' : '#F54900'} strokeWidth="2"/>
                      <path d="M12 8V12" stroke={payment.status === 'overdue' ? '#E7000B' : '#F54900'} strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="16" r="1" fill={payment.status === 'overdue' ? '#E7000B' : '#F54900'}/>
                    </svg>
                  </div>
                  <div>
                    <div className="admin-dashboard-payment-name">{payment.member}</div>
                    <div className="admin-dashboard-payment-id">{payment.loanId}</div>
                    <div className="admin-dashboard-payment-id">Due: {payment.dueDate}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="admin-dashboard-payment-amount">{fmt(payment.amount)}</div>
                  {payment.status === 'overdue' && <div className="admin-dashboard-payment-overdue">Overdue</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="admin-dashboard-bottom-stats">
        {/* Total Loans Disbursed */}
        <div className="admin-dashboard-bottom-stat-card">
          <div className="admin-dashboard-bottom-stat-label">Total Loans Disbursed</div>
          <div className="admin-dashboard-bottom-stat-value">₱2.5M</div>
          <div className="admin-dashboard-bottom-stat-subtext">+15% from last month</div>
        </div>

        {/* Collection Rate */}
        <div className="admin-dashboard-bottom-stat-card">
          <div className="admin-dashboard-bottom-stat-label">Collection Rate</div>
          <div className="admin-dashboard-bottom-stat-value">94.5%</div>
          <div className="admin-dashboard-bottom-stat-subtext">Excellent performance</div>
        </div>

        {/* Member Growth */}
        <div className="admin-dashboard-bottom-stat-card">
          <div className="admin-dashboard-bottom-stat-label">Member Growth</div>
          <div className="admin-dashboard-bottom-stat-value">+124</div>
          <div className="admin-dashboard-bottom-stat-subtext">New members this month</div>
        </div>
      </div>
    </div>
  );
}