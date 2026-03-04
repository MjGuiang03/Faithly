import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { LayoutGrid, FileText, Heart, Calendar, Building2, Settings, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success('Signed out successfully');
      navigate('/');
    }
    setShowLogoutModal(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      {/* Logo and Title */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-content">
          <div className="sidebar-logo-image">
            <img alt="PUAC Logo" src={puacLogo} />
          </div>
          <div className="sidebar-logo-text">
            <h1>FaithLy</h1>
            <p>Member Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        <button
          onClick={() => navigate('/home')}
          className={`sidebar-nav-button ${isActive('/home') ? 'active' : ''}`}
        >
          <LayoutGrid size={20} />
          <span>Home</span>
        </button>

        <button
          onClick={() => navigate('/loans')}
          className={`sidebar-nav-button ${isActive('/loans') ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>Loans</span>
        </button>

        <button
          onClick={() => navigate('/donation')}
          className={`sidebar-nav-button ${isActive('/donation') ? 'active' : ''}`}
        >
          <Heart size={20} />
          <span>Donations</span>
        </button>

        <button
          onClick={() => navigate('/attendance')}
          className={`sidebar-nav-button ${isActive('/attendance') ? 'active' : ''}`}
        >
          <Calendar size={20} />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => navigate('/branches')}
          className={`sidebar-nav-button ${isActive('/branches') ? 'active' : ''}`}
        >
          <Building2 size={20} />
          <span>Branches</span>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className={`sidebar-nav-button ${isActive('/settings') ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>

      {/* User Profile — clickable to navigate to /profile */}
      <div className="sidebar-profile">
        <div
          className={`sidebar-profile-info ${isActive('/profile') ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
        >
          <div className="sidebar-profile-avatar">
            <p>{profile?.fullName?.charAt(0)?.toUpperCase() || 'M'}</p>
          </div>
          <div className="sidebar-profile-details">
            <p className="sidebar-profile-name">{profile?.fullName || 'Member'}</p>
            <p className="sidebar-profile-email">
              {user?.email || 'member@puac.org'}
            </p>
          </div>
        </div>
        <button onClick={() => setShowLogoutModal(true)} className="sidebar-profile-signout">
          <LogOut size={20} />
          Sign Out
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal-content">
            <h2 className="logout-modal-title">Confirm Logout</h2>
            <p className="logout-modal-message">Are you sure you want to log out?</p>
            <div className="logout-modal-actions">
              <button
                className="logout-modal-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="logout-modal-confirm"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}