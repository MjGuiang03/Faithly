import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Heart, 
  Users, 
  MapPin, 
  MessageCircle, 
  LogOut,
  CreditCard,
  Calendar,
  Bell,
  Settings,
  User as UserIcon
} from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Home.css';

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
      icon: TrendingUp,
      title: 'Apply for Loan',
      description: 'Quick loan application',
      color: '#3b82f6',
      action: () => alert('Loan application feature coming soon!')
    },
    {
      icon: Heart,
      title: 'Make Donation',
      description: 'Support the church',
      color: '#ef4444',
      action: () => alert('Donation feature coming soon!')
    },
    {
      icon: Calendar,
      title: 'Check Attendance',
      description: 'View attendance history',
      color: '#8b5cf6',
      action: () => alert('Attendance feature coming soon!')
    },
    {
      icon: MapPin,
      title: 'Find Branches',
      description: 'Locate church branches',
      color: '#10b981',
      action: () => alert('Branch locator coming soon!')
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <img src={puacLogo} alt="PUAC Logo" className="header-logo" />
            <div>
              <h1 className="header-title">FaithLy</h1>
              <p className="header-subtitle">Loan Management Portal</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="icon-button">
              <Bell size={20} />
            </button>
            <button className="icon-button">
              <Settings size={20} />
            </button>
            <button onClick={handleSignOut} className="logout-button">
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Welcome Section */}
          <div className="welcome-section">
            <div>
              <h2 className="welcome-title">
                Welcome back, {profile?.full_name || user?.email}!
              </h2>
              <p className="welcome-subtitle">
                Here's what's happening with your church account today.
              </p>
            </div>
            <div className="user-badge">
              <UserIcon className="user-icon" />
              <div>
                <p className="user-name">{profile?.full_name}</p>
                <p className="user-branch">{profile?.branch}</p>
                <p className="user-position">{profile?.position}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-box" style={{ backgroundColor: '#dbeafe' }}>
                <CreditCard style={{ color: '#3b82f6' }} size={24} />
              </div>
              <div className="stat-info">
                <p className="stat-label">Active Loans</p>
                <p className="stat-value">0</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box" style={{ backgroundColor: '#fce7f3' }}>
                <Heart style={{ color: '#ef4444' }} size={24} />
              </div>
              <div className="stat-info">
                <p className="stat-label">Total Donations</p>
                <p className="stat-value">$0</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box" style={{ backgroundColor: '#e0e7ff' }}>
                <Calendar style={{ color: '#8b5cf6' }} size={24} />
              </div>
              <div className="stat-info">
                <p className="stat-label">Attendance</p>
                <p className="stat-value">0</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box" style={{ backgroundColor: '#d1fae5' }}>
                <Users style={{ color: '#10b981' }} size={24} />
              </div>
              <div className="stat-info">
                <p className="stat-label">Member Since</p>
                <p className="stat-value">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3 className="section-title">Quick Actions</h3>
            <div className="quick-actions-grid">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className="action-card"
                  >
                    <div 
                      className="action-icon-box" 
                      style={{ backgroundColor: `${action.color}20` }}
                    >
                      <Icon style={{ color: action.color }} size={28} />
                    </div>
                    <h4 className="action-title">{action.title}</h4>
                    <p className="action-description">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity-section">
            <h3 className="section-title">Recent Activity</h3>
            <div className="activity-card">
              <div className="empty-state">
                <MessageCircle size={48} className="empty-icon" />
                <p className="empty-title">No Recent Activity</p>
                <p className="empty-description">
                  Your recent transactions and activities will appear here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}