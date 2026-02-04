import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Search, Filter, Edit, Trash2, LayoutGrid, FileText, Users, Heart, Calendar, Building2, BarChart3, Settings } from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../AdminStyles/AdminDashboard.css';

const API = process.env.REACT_APP_API_URL;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    deactivated: 0,
    newThisMonth: 0
  });
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('members');

  useEffect(() => {
    // Check if admin is logged in
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/admin/login');
      return;
    }

    fetchBranches();
    fetchMembers();
  }, [navigate]);

  useEffect(() => {
    fetchMembers();
  }, [searchTerm, statusFilter, branchFilter]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API}/api/admin/branches`);
      const data = await res.json();
      if (data.success) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (branchFilter !== 'all') params.append('branch', branchFilter);

      const res = await fetch(`${API}/api/admin/members?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setMembers(data.members);
        setStats(data.stats);
      }
    } catch (err) {
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermanent = async (email, memberName) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${memberName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/api/admin/delete-member-permanent`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success('Member permanently deleted');
        fetchMembers();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete member');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    toast.success('Signed out successfully');
    navigate('/admin/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <div className="admin-sidebar">
        {/* Logo and Title */}
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-content">
            <div className="admin-sidebar-logo-image">
              <img alt="PUAC Logo" src={puacLogo} />
            </div>
            <div className="admin-sidebar-logo-text">
              <h1>FaithLy</h1>
              <p>Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="admin-sidebar-nav">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`admin-sidebar-nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutGrid size={20} />
            <span>Dashboard</span>
          </button>
          
          <button
            className="admin-sidebar-nav-button"
          >
            <FileText size={20} />
            <span>Loan Management</span>
          </button>
          
          <button
            onClick={() => setCurrentView('members')}
            className={`admin-sidebar-nav-button ${currentView === 'members' ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Members</span>
          </button>

          <button
            className="admin-sidebar-nav-button"
          >
            <Heart size={20} />
            <span>Donations</span>
          </button>

          <button
            className="admin-sidebar-nav-button"
          >
            <Calendar size={20} />
            <span>Attendance</span>
          </button>

          <button
            className="admin-sidebar-nav-button"
          >
            <Building2 size={20} />
            <span>Branches</span>
          </button>

          <button
            className="admin-sidebar-nav-button"
          >
            <BarChart3 size={20} />
            <span>Reports</span>
          </button>

          <button
            className="admin-sidebar-nav-button"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>

        {/* Admin Profile */}
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
            <svg fill="none" viewBox="0 0 20 20">
              <path d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.3333 14.1667L17.5 10L13.3333 5.83334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.5 10H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <div className="admin-content-wrapper">
          
          {/* Header */}
          <div className="admin-header">
            <h1>Member Management</h1>
            <p>View and manage church members</p>
          </div>

          {/* Stats Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-card-label">New this Month</p>
              <p className="admin-stat-card-value new">{stats.newThisMonth}</p>
            </div>
            
            <div className="admin-stat-card">
              <p className="admin-stat-card-label">Active Members</p>
              <p className="admin-stat-card-value active">{stats.active}</p>
            </div>
            
            <div className="admin-stat-card">
              <p className="admin-stat-card-label">Inactive Members</p>
              <p className="admin-stat-card-value inactive">{stats.inactive}</p>
            </div>
            
            <div className="admin-stat-card">
              <p className="admin-stat-card-label">Deactivated Accounts</p>
              <p className="admin-stat-card-value deactivated">{stats.deactivated}</p>
            </div>
            
            <div className="admin-stat-card">
              <p className="admin-stat-card-label">Total Members</p>
              <p className="admin-stat-card-value total">{stats.total}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="admin-search-filters">
            <div className="admin-search-filters-row">
              {/* Search */}
              <div className="admin-search-wrapper">
                <Search className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, email, or member ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              {/* Status Filter */}
              <div className="admin-filter-wrapper">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="deactivated">Deactivated</option>
                </select>
                <Filter className="admin-filter-icon" />
              </div>

              {/* Branch Filter */}
              <div className="admin-filter-wrapper">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="admin-filter-select"
                >
                  <option value="all">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                <Filter className="admin-filter-icon" />
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="admin-table-container">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Branch</th>
                    <th>Member Since</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="admin-table-empty">
                        <p className="admin-table-empty-text">Loading members...</p>
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-table-empty">
                        <p className="admin-table-empty-text">No members found</p>
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <p className="admin-table-text">{member.memberId}</p>
                        </td>
                        <td>
                          <div className="admin-member-cell">
                            <div className="admin-member-avatar">
                              <p className="admin-member-avatar-text">
                                {member.fullName.charAt(0).toUpperCase()}
                              </p>
                            </div>
                            <p className="admin-table-text">{member.fullName}</p>
                          </div>
                        </td>
                        <td>
                          <p className="admin-table-text">{member.email}</p>
                          <p className="admin-table-text-small">{member.phone}</p>
                        </td>
                        <td>
                          <p className="admin-table-text">{member.branch}</p>
                        </td>
                        <td>
                          <p className="admin-table-text">{formatDate(member.createdAt)}</p>
                        </td>
                        <td>
                          <span className={`admin-status-badge ${member.status}`}>
                            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              className="admin-action-button edit"
                              title="Edit member"
                            >
                              <Edit />
                            </button>
                            <button
                              onClick={() => handleDeletePermanent(member.email, member.fullName)}
                              className="admin-action-button delete"
                              title="Delete permanently"
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
