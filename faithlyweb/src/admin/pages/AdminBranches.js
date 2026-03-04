import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminBranches.css';

const API = process.env.REACT_APP_API_URL;

export default function AdminBranches() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [stats, setStats] = useState({
    total: 4,
    active: 4,
    totalMembers: 2340,
    activeLoans: 47
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/admin/login');
      return;
    }
    fetchBranches();
  }, [navigate]);

  const fetchBranches = async () => {
    try {
      setLoading(true);

      setBranches([
        {
          _id: '1',
          name: 'Main Branch',
          branchId: 'BRN-001',
          address: '123 Main Street, Metro Manila',
          pastor: 'Pastor Juan Dela Cruz',
          contact: '+63 912 345 6789',
          members: 856,
          established: '2015',
          status: 'active'
        },
        {
          _id: '2',
          name: 'North Branch',
          branchId: 'BRN-002',
          address: '456 North Avenue, Quezon City',
          pastor: 'Pastor Maria Santos',
          contact: '+63 917 234 5678',
          members: 542,
          established: '2018',
          status: 'active'
        },
        {
          _id: '3',
          name: 'South Branch',
          branchId: 'BRN-003',
          address: '789 South Road, Makati',
          pastor: 'Pastor Pedro Garcia',
          contact: '+63 920 123 4567',
          members: 467,
          established: '2019',
          status: 'active'
        },
        {
          _id: '4',
          name: 'East Branch',
          branchId: 'BRN-004',
          address: '321 East Street, Pasig',
          pastor: 'Pastor Ana Reyes',
          contact: '+63 918 765 4321',
          members: 475,
          established: '2020',
          status: 'active'
        }
      ]);
    } catch (err) {
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-branches-main">
      {/* Header */}
      <div className="admin-branches-header">
        <div className="admin-branches-header-left">
          <h1 className="admin-branches-title">Branch Management</h1>
          <p className="admin-branches-subtitle">Manage church branches and locations</p>
        </div>
        <button className="admin-branches-add-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4.16667 10H15.8333" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 4.16667V15.8333" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Add Branch
        </button>
      </div>

      {/* Stats Grid */}
      <div className="admin-branches-stats-grid">
        <div className="admin-branches-stat-card">
          <p className="admin-branches-stat-label">Total Branches</p>
          <p className="admin-branches-stat-value">{stats.total}</p>
        </div>
        <div className="admin-branches-stat-card">
          <p className="admin-branches-stat-label">Active Branches</p>
          <p className="admin-branches-stat-value admin-branches-stat-value-active">{stats.active}</p>
        </div>
        <div className="admin-branches-stat-card">
          <p className="admin-branches-stat-label">Total Members</p>
          <p className="admin-branches-stat-value">{stats.totalMembers.toLocaleString()}</p>
        </div>
        <div className="admin-branches-stat-card">
          <p className="admin-branches-stat-label">Active Loans</p>
          <p className="admin-branches-stat-value">{stats.activeLoans}</p>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="admin-branches-grid">
        {branches.map((branch) => (
          <div key={branch._id} className="admin-branches-card">
            <div className="admin-branches-card-header">
              <div className="admin-branches-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10C21 17 12 21 12 21C12 21 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="admin-branches-card-title-section">
                <h3 className="admin-branches-card-title">{branch.name}</h3>
                <p className="admin-branches-card-id">{branch.branchId}</p>
                <span className={`admin-branches-status-badge admin-branches-status-${branch.status}`}>
                  {branch.status.charAt(0).toUpperCase() + branch.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="admin-branches-info-section">
              <div className="admin-branches-info-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="admin-branches-info-icon">
                  <path d="M17.5 8.33333C17.5 14.1667 10 18.3333 10 18.3333C10 18.3333 2.5 14.1667 2.5 8.33333C2.5 6.34420 3.29018 4.43655 4.6967 3.03007C6.10322 1.62360 8.01088 0.833328 10 0.833328C11.9891 0.833328 13.8968 1.62360 15.3033 3.03007C16.7098 4.43655 17.5 6.34420 17.5 8.33333Z" stroke="#4A5565" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 10.8333C11.3807 10.8333 12.5 9.714 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.714 8.61929 10.8333 10 10.8333Z" stroke="#4A5565" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="admin-branches-info-label">Address</p>
                  <p className="admin-branches-info-value">{branch.address}</p>
                </div>
              </div>

              <div className="admin-branches-info-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="admin-branches-info-icon">
                  <path d="M16.6667 17.5V15.8333C16.6667 14.9493 16.3155 14.1014 15.6904 13.4763C15.0652 12.8512 14.2174 12.5 13.3333 12.5H6.66667C5.78261 12.5 4.93476 12.8512 4.30964 13.4763C3.68452 14.1014 3.33333 14.9493 3.33333 15.8333V17.5" stroke="#4A5565" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9.16667C11.8409 9.16667 13.3333 7.67428 13.3333 5.83333C13.3333 3.99238 11.8409 2.5 10 2.5C8.15905 2.5 6.66667 3.99238 6.66667 5.83333C6.66667 7.67428 8.15905 9.16667 10 9.16667Z" stroke="#4A5565" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="admin-branches-info-label">Pastor</p>
                  <p className="admin-branches-info-value">{branch.pastor}</p>
                </div>
              </div>

              <div className="admin-branches-info-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="admin-branches-info-icon">
                  <path d="M18.3333 14.1V16.6C18.3343 16.8321 18.2867 17.0618 18.1937 17.2745C18.1008 17.4871 17.9644 17.678 17.7934 17.8349C17.6224 17.9918 17.4205 18.1112 17.2006 18.1856C16.9808 18.26 16.7477 18.2876 16.5167 18.2667C13.9523 17.988 11.489 17.1118 9.32499 15.7084C7.31151 14.4289 5.60443 12.7218 4.32499 10.7084C2.91663 8.53438 2.04019 6.05916 1.76666 3.48337C1.74583 3.25293 1.7733 3.02038 1.84718 2.80093C1.92107 2.58148 2.03963 2.37983 2.19562 2.2088C2.35162 2.03778 2.54149 1.90118 2.75314 1.80774C2.9648 1.7143 3.19348 1.6661 3.42499 1.66671H5.92499C6.32953 1.66282 6.72148 1.80598 7.028 2.06968C7.33452 2.33337 7.53156 2.69959 7.58332 3.10004C7.68011 3.90007 7.86283 4.68563 8.12499 5.44171C8.2402 5.77003 8.26074 6.12314 8.18421 6.46183C8.10768 6.80052 7.93698 7.11062 7.69166 7.35837L6.64999 8.40004C7.8542 10.4818 9.61826 12.2459 11.7 13.45L12.7417 12.4084C12.9894 12.163 13.2995 11.9923 13.6382 11.9158C13.9769 11.8393 14.33 11.8598 14.6583 11.975C15.4144 12.2372 16.2 12.4199 17 12.5167C17.4049 12.5688 17.7746 12.7695 18.0386 13.0813C18.3027 13.3932 18.4433 13.7913 18.3333 14.1Z" stroke="#4A5565" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="admin-branches-info-label">Contact</p>
                  <p className="admin-branches-info-value">{branch.contact}</p>
                </div>
              </div>

              <div className="admin-branches-stats-row">
                <div className="admin-branches-stat-item">
                  <p className="admin-branches-stat-item-label">Members</p>
                  <p className="admin-branches-stat-item-value">{branch.members.toLocaleString()}</p>
                </div>
                <div className="admin-branches-stat-item">
                  <p className="admin-branches-stat-item-label">Established</p>
                  <p className="admin-branches-stat-item-value">{branch.established}</p>
                </div>
              </div>

              <div className="admin-branches-actions">
                <button className="admin-branches-action-btn admin-branches-action-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M0.666667 8C0.666667 8 3.33333 2.66667 8 2.66667C12.6667 2.66667 15.3333 8 15.3333 8C15.3333 8 12.6667 13.3333 8 13.3333C3.33333 13.3333 0.666667 8 0.666667 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  View Details
                </button>
                <button className="admin-branches-action-btn admin-branches-action-secondary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.3333 2C11.5084 1.82489 11.7163 1.68635 11.9451 1.59255C12.1739 1.49875 12.4191 1.45135 12.6667 1.45135C12.9142 1.45135 13.1594 1.49875 13.3882 1.59255C13.617 1.68635 13.8249 1.82489 14 2C14.1751 2.17511 14.3137 2.38297 14.4075 2.61177C14.5012 2.84057 14.5486 3.08577 14.5486 3.33333C14.5486 3.58089 14.5012 3.82609 14.4075 4.05489C14.3137 4.28369 14.1751 4.49156 14 4.66667L5 13.6667L1.33333 14.6667L2.33333 11L11.3333 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
