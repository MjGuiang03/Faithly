import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminBranches.css';
import svgPaths from "../../imports/svg-icons";
import API from '../../utils/api';

export default function AdminBranches() {
  const navigate = useNavigate();

  const [stats] = useState({
    totalBranches: 4,
    totalMembers: 4347,
    totalServices: 164,
    growthRate: '+12%'
  });

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 6;

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', LIMIT);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res = await fetch(`${API}/api/admin/branches?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBranches(data.branches || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchBranches();
  }, [navigate, fetchBranches]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="admin-branch-main">
      {/* Header */}
      <div className="admin-branch-header">
        <div>
          <h1 className="admin-branch-title">Branches</h1>
          <p className="admin-branch-subtitle">Manage church branches and their information</p>
        </div>
        <div className="admin-members-search-wrapper" style={{ width: '300px' }}>
          <Search size={18} className="admin-members-search-icon" />
          <input
            type="text"
            placeholder="Search branches..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="admin-members-search-input"
          />
        </div>
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
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-branch-card skeleton-card">
              <div className="admin-branch-skeleton-header" />
              <div className="admin-branch-skeleton-body" />
            </div>
          ))
        ) : branches.length === 0 ? (
          <div className="admin-branch-empty">No branches found.</div>
        ) : (
          branches.map((branch) => (
            <div key={branch._id || branch.id} className="admin-branch-card">
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
          ))
        )}
      </div>

      {totalCount > LIMIT && (
        <div className="admin-members-pagination" style={{ marginTop: '24px' }}>
          <p className="admin-members-pagination-info">
            Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, totalCount)} of {totalCount} branches
          </p>
          <div className="admin-members-pagination-controls">
            <button
              className="admin-members-pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            {Array.from({ length: Math.ceil(totalCount / LIMIT) }, (_, i) => (
              <button
                key={i + 1}
                className={`admin-members-pagination-btn ${page === i + 1 ? 'active' : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="admin-members-pagination-btn"
              onClick={() => setPage(p => Math.min(Math.ceil(totalCount / LIMIT), p + 1))}
              disabled={page === Math.ceil(totalCount / LIMIT)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
