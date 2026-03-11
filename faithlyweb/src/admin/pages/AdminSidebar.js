import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  LayoutGrid,
  Bell,
  UserCheck,
  Users,
  Heart,
  Calendar,
  Building2,
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/AdminSidebar.css';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    toast.success('Signed out successfully');
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-content">
          <div className="admin-sidebar-logo-image">
            <img alt="PUAC Logo" src={puacLogo} />
          </div>
          <div className="admin-sidebar-logo-text">
            <h1>FaithLy</h1>
            <p>Main Admin Portal</p>
          </div>
        </div>
      </div>

      <div className="admin-sidebar-nav">

        <button
          onClick={() => navigate('/admin/dashboard')}
          className={`admin-sidebar-nav-button ${isActive('/admin/dashboard') || location.pathname === '/admin' ? 'active' : ''}`}
        >
          <LayoutGrid size={20} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => navigate('/admin/notification')}
          className={`admin-sidebar-nav-button ${isActive('/admin/notification') ? 'active' : ''}`}
        >
          <Bell size={20} />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => navigate('/admin/officerverification')}
          className={`admin-sidebar-nav-button ${isActive('/admin/officerverification') ? 'active' : ''}`}
        >
          <UserCheck size={20} />
          <span>Officer Verification</span>
        </button>

        <button
          onClick={() => navigate('/admin/members')}
          className={`admin-sidebar-nav-button ${isActive('/admin/members') ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Members</span>
        </button>

        <button
          onClick={() => navigate('/admin/donations')}
          className={`admin-sidebar-nav-button ${isActive('/admin/donations') ? 'active' : ''}`}
        >
          <Heart size={20} />
          <span>Donations</span>
        </button>

        <button
          onClick={() => navigate('/admin/attendance')}
          className={`admin-sidebar-nav-button ${isActive('/admin/attendance') ? 'active' : ''}`}
        >
          <Calendar size={20} />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => navigate('/admin/branches')}
          className={`admin-sidebar-nav-button ${isActive('/admin/branches') ? 'active' : ''}`}
        >
          <Building2 size={20} />
          <span>Branches</span>
        </button>

        <button
          onClick={() => navigate('/admin/reports')}
          className={`admin-sidebar-nav-button ${isActive('/admin/reports') ? 'active' : ''}`}
        >
          <BarChart3 size={20} />
          <span>Reports</span>
        </button>

        <button
          onClick={() => navigate('/admin/settings')}
          className={`admin-sidebar-nav-button ${isActive('/admin/settings') ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>

      </div>

      <div className="admin-sidebar-profile">
        <div className="admin-sidebar-profile-info">
          <div className="admin-sidebar-profile-avatar">
            <p>A</p>
          </div>
          <div className="admin-sidebar-profile-details">
            <p className="admin-sidebar-profile-name">Admin</p>
            <p className="admin-sidebar-profile-email">
              {localStorage.getItem('adminEmail')}
            </p>
          </div>
        </div>

        <button onClick={handleSignOut} className="admin-sidebar-profile-signout">
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
}