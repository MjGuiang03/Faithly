import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import svgPaths from '../imports/svg-kfi3zq3ims';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
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
        <button
          className={`nav-item ${isActive('/home') ? 'nav-item-active' : ''}`}
          onClick={() => navigate('/home')}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
            <path d={svgPaths.p1fc96a00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p33089d00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p49cfa80} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p1cfbf300} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
          <span>Home</span>
        </button>

        <button
          className={`nav-item ${isActive('/loans') ? 'nav-item-active' : ''}`}
          onClick={() => navigate('/loans')}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
            <path d={svgPaths.pcfbcf00} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.pd2076c0} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d="M8.33333 7.5H6.66667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d="M13.3333 10.8333H6.66667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d="M13.3333 14.1667H6.66667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
          <span>Loans</span>
        </button>

        <button
          className={`nav-item ${isActive('/donation') ? 'nav-item-active' : ''}`}
          onClick={() => navigate('/donation')}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
            <path d={svgPaths.p387b1200} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
          <span>Donations</span>
        </button>

        <button
          className={`nav-item ${isActive('/attendance') ? 'nav-item-active' : ''}`}
          onClick={() => navigate('/attendance')}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
            <path d="M6.66667 1.66667V5" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d="M13.3333 1.66667V5" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p1da67b80} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d="M2.5 8.33333H17.5" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
          <span>Attendance</span>
        </button>

        <button
          className={`nav-item ${isActive('/branches') ? 'nav-item-active' : ''}`}
          onClick={() => navigate('/branches')}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
            <path d="M8.33333 10H11.6667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d="M8.33333 6.66667H11.6667" stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p16bb4600} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p3b103700} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p24196980} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
          <span>Branches</span>
        </button>

        <button
          className={`nav-item ${isActive('/profile') ? 'nav-item-active' : ''}`}
          onClick={() => navigate('/profile')}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
            <path d={svgPaths.p1beb9580} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p32ab0300} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
          <span>Profile</span>
        </button>

        <button
          className={`nav-item ${isActive('/settings') ? 'nav-item-active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 20 20">
            <path d={svgPaths.p2483b8c0} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p3b27f100} stroke="#BEDBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            <svg className="avatar-icon" fill="none" viewBox="0 0 20 20">
              <path d={svgPaths.p1beb9580} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p32ab0300} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
          </div>
          <div className="user-details">
            <p className="user-name">{profile?.fullName || 'Member'}</p>
            <p className="user-email">{user?.email || 'member@puac.org'}</p>
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
  );
}
