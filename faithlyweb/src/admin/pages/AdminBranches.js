import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminBranches.css';
import svgPaths from "../../imports/svg-icons";

import API from '../../utils/api';

export default function AdminBranches() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalBranches: 4,
    totalMembers: 4347,
    totalServices: 164,
    growthRate: '+12%'
  });

  const [branches, setBranches] = useState([
    {
      id: 1,
      name: 'Bulacan Main Branch',
      address: '123 Main St, Bulacan',
      status: 'Active',
      pastor: 'Rev. Juan Santos',
      members: 1234,
      services: 45
    },
    {
      id: 2,
      name: 'Valenzuela Branch',
      address: '456 Church Ave, Valenzuela',
      status: 'Active',
      pastor: 'Rev. Maria Garcia',
      members: 892,
      services: 38
    },
    {
      id: 3,
      name: 'Pangasinan Branch',
      address: '789 Faith Road, Pangasinan',
      status: 'Active',
      pastor: 'Rev. Pedro Reyes',
      members: 1567,
      services: 52
    },
    {
      id: 4,
      name: 'Rizal Branch',
      address: '321 Grace St, Rizal',
      status: 'Active',
      pastor: 'Rev. Ana Cruz',
      members: 654,
      services: 29
    }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchBranches();
  }, [navigate]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // In production, fetch from API:
      // const res = await fetch(`${API}/api/admin/branches`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const data = await res.json();
      // setBranches(data.branches);
      // setStats(data.stats);
      
    } catch (err) {
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-branch-main">
      {/* Header */}
      <div className="admin-branch-header">
        <h1 className="admin-branch-title">Branches</h1>
        <p className="admin-branch-subtitle">Manage church branches and their information</p>
      </div>

      {/* Stats Cards */}
      <div className="admin-branch-stats">
        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Branches</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p26ddc800} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p35ba4680} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-branch-stat-value">{stats.totalBranches}</p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Members</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p25397b80} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2c4f400} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2241fff0} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.pae3c380} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-branch-stat-value">{stats.totalMembers}</p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Services</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6.66667 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.3333 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="2.5" y="3.33333" width="15" height="13.3333" rx="1.66667" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 8.33333H17.5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-branch-stat-value">{stats.totalServices}</p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Growth Rate</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p3c797180} stroke="#E60076" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3ac0b600} stroke="#E60076" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-branch-stat-value">{stats.growthRate}</p>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="admin-branch-grid">
        {branches.map((branch) => (
          <div key={branch.id} className="admin-branch-card">
            <div className="admin-branch-card-header">
              <div className="admin-branch-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d={svgPaths.p27c543b0} stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={svgPaths.p2d59bff0} stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="admin-branch-card-info">
                <h3 className="admin-branch-card-name">{branch.name}</h3>
                <p className="admin-branch-card-address">{branch.address}</p>
                <span className="admin-branch-status-badge">{branch.status}</span>
              </div>
            </div>

            <div className="admin-branch-card-details">
              <div className="admin-branch-detail-item">
                <p className="admin-branch-detail-label">Pastor</p>
                <p className="admin-branch-detail-value">{branch.pastor}</p>
              </div>
              <div className="admin-branch-detail-item">
                <p className="admin-branch-detail-label">Members</p>
                <p className="admin-branch-detail-value admin-branch-detail-members">{branch.members}</p>
              </div>
              <div className="admin-branch-detail-item">
                <p className="admin-branch-detail-label">Services</p>
                <p className="admin-branch-detail-value admin-branch-detail-services">{branch.services}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
