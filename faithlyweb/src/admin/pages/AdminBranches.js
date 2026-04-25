/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { CalendarDays, Circle, MapPin, Search, Users, TrendingUp } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminBranches.css';

import API from '../../utils/api';

export default function AdminBranches() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 68;

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
      navigate('/');
      return;
    }
    fetchBranches();
  }, [navigate, fetchBranches]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Compute stats from fetched branches
  const totalMembers = branches.reduce((s, b) => s + (b.members || 0), 0);


  return (
    <div className="admin-branch-main">
      {/* Header */}
      <div className="admin-branch-header">
        <div>
          <h1 className="admin-branch-title">Branches</h1>
          <p className="admin-branch-subtitle">Manage church branches and their information</p>
        </div>
        <div className="admin-members-search-wrapper admin-branch-search-wrapper">
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
            <div className="adm-stat-icon-wrap"><MapPin size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">{loading ? '—' : totalCount}</p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Members</span>
            <div className="adm-stat-icon-wrap"><Users size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">{loading ? '—' : totalMembers.toLocaleString()}</p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Services</span>
            <div className="adm-stat-icon-wrap"><CalendarDays size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">—</p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Growth Rate</span>
            <div className="adm-stat-icon-wrap"><TrendingUp size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">—</p>
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
                  <MapPin size={24} color="#155DFC" />
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
        <div className="admin-members-pagination-wrapper">
          <div className="admin-members-pagination">
            <button
              className="admin-members-pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <div className="admin-members-pagination-numbers">
              {Array.from({ length: Math.ceil(totalCount / LIMIT) }, (_, i) => (
                <button
                  key={i + 1}
                  className={`admin-members-pagination-number ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
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
