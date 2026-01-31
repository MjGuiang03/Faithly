import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import svgPaths from '../imports/svg-kfi3zq3ims';
import '../styles/Home.css';
import puacLogo from '../assets/puaclogo.png';


export default function Home() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  const quickActions = [
    {
      title: 'Apply for Loan',
      description: 'Quick loan application',
      gradient: 'linear-gradient(137.368deg, rgb(21, 93, 252) 0%, rgb(20, 71, 230) 100%)',
      action: () => alert('Loan application feature coming soon!')
    },
    {
      title: 'Make Donation',
      description: 'Support the church',
      gradient: 'linear-gradient(137.368deg, rgb(0, 166, 62) 0%, rgb(0, 130, 54) 100%)',
      action: () => alert('Donation feature coming soon!')
    },
    {
      title: 'Check Attendance',
      description: 'View your attendance',
      bg: '#0f2854',
      action: () => alert('Attendance feature coming soon!')
    }
  ];

  const recentActivities = [
    {
      title: 'Loan Payment Processed',
      description: 'Monthly payment of $450 received',
      time: '2 days ago',
      iconColor: '#00A63E'
    },
    {
      title: 'Donation Received',
      description: 'Thank you for your $100 donation',
      time: '1 week ago',
      iconColor: '#E60076'
    },
    {
      title: 'Service Attendance',
      description: 'Checked in to Sunday Service',
      time: '1 week ago',
      iconColor: '#155DFC'
    }
  ];

  const upcomingPayments = [
    {
      id: 'LN-2026-001',
      dueDate: '2/1/2026',
      amount: '₱450'
    },
    {
      id: 'LN-2025-089',
      dueDate: '2/15/2026',
      amount: '₱325'
    }
  ];

  return (
    <div className="home-layout">
      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo-container">
                <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <div className="logo-text">
              <h1 className="logo-title">FaithLy</h1>
              <p className="logo-subtitle">Member Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <button className="nav-item nav-item-active">
            <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
              <path d={svgPaths.p1fc96a00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p33089d00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p49cfa80} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p1cfbf300} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            <span>Home</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
              <path d={svgPaths.pcfbcf00} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.pd2076c0} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M8.33333 7.5H6.66667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M13.3333 10.8333H6.66667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M13.3333 14.1667H6.66667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            <span>Loans</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
              <path d={svgPaths.p387b1200} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            <span>Donations</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
              <path d="M6.66667 1.66667V5" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M13.3333 1.66667V5" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p1da67b80} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M2.5 8.33333H17.5" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            <span>Attendance</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
              <path d="M8.33333 10H11.6667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M8.33333 6.66667H11.6667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p16bb4600} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p3b103700} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p24196980} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            <span>Branches</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
              <path d={svgPaths.p1beb9580} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p32ab0300} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            <span>Profile</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
              <path d={svgPaths.p2483b8c0} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p3b27f100} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            <span>Settings</span>
          </button>
        </nav>

        {/* User Info */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <svg className="avatar-icon" fill="none" viewBox="0 0 20 20">
                <path d={svgPaths.p1beb9580} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p32ab0300} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <div className="user-details">
              <p className="user-name">Member</p>
              <p className="user-email">{user?.email || 'gabrielvarona06@gmail.com'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="signout-btn">
            <svg className="signout-icon" fill="none" viewBox="0 0 16 16">
              <path d={svgPaths.p2c1f680} stroke="#FFA2A2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
              <path d="M14 8H6" stroke="#FFA2A2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
              <path d={svgPaths.p12257fa0} stroke="#FFA2A2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Welcome Header */}
        <div className="home-header">
          <h1 className="page-title">Welcome Back!</h1>
          <p className="page-subtitle">Here's an overview of your church activities</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card stat-blue">
            <div className="stat-icon-box">
              <svg className="stat-icon" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.pb47f400} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p17a13100} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M10 9H8" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 13H8" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 17H8" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Active Loans</p>
              <p className="stat-value">2</p>
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
              <p className="stat-value">₱1,250</p>
            </div>
          </div>

          <div className="stat-card stat-navy">
            <div className="stat-icon-box">
              <svg className="stat-icon" fill="none" viewBox="0 0 24 24">
                <path d="M8 2V6" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M16 2V6" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p32f12c00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M3 10H21" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Attendance Rate</p>
              <p className="stat-value">87%</p>
            </div>
          </div>

          <div className="stat-card stat-orange">
            <div className="stat-icon-box">
              <svg className="stat-icon" fill="none" viewBox="0 0 24 24">
                <path d="M16 7H22V13" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p13253c0} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div className="stat-content">
              <p className="stat-label">Member Since</p>
              <p className="stat-value">2020</p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="content-grid">
          {/* Quick Actions */}
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
                      <path d={svgPaths.p1ae0b780} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
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
              {recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon" style={{ color: activity.iconColor }}>
                    {index === 0 && (
                      <svg fill="none" viewBox="0 0 20 20">
                        <path d={svgPaths.pd03f500} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.pafc1d00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </svg>
                    )}
                    {index === 1 && (
                      <svg fill="none" viewBox="0 0 20 20">
                        <path d={svgPaths.p12f1f900} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </svg>
                    )}
                    {index === 2 && (
                      <svg fill="none" viewBox="0 0 20 20">
                        <path d="M0.833333 0.833333V4.16667" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.pf3beb80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d="M0.833333 0.833333H15.8333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </svg>
                    )}
                  </div>
                  <div className="activity-content">
                    <h3 className="activity-title">{activity.title}</h3>
                    <p className="activity-description">{activity.description}</p>
                    <p className="activity-time">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Loan Payments */}
        <div className="card payments-card">
          <div className="card-header">
            <h2 className="card-title">Upcoming Loan Payments</h2>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="payments-list">
            {upcomingPayments.map((payment, index) => (
              <div key={index} className="payment-item">
                <div className="payment-info">
                  <div className="payment-icon">
                    <svg fill="none" viewBox="0 0 20 20">
                      <path d="M10 5V10L13.3333 11.6667" stroke="#F54900" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      <path d={svgPaths.p14d24500} stroke="#F54900" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    </svg>
                  </div>
                  <div className="payment-details">
                    <h3 className="payment-id">{payment.id}</h3>
                    <p className="payment-due">Due: {payment.dueDate}</p>
                  </div>
                </div>
                <div className="payment-actions">
                  <p className="payment-amount">{payment.amount}</p>
                  <button className="pay-now-btn">Pay Now</button>
                </div>
              </div>
            ))}
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
