import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminLoanManagement.css';

import API from '../../utils/api';
import { Banknote, Search } from 'lucide-react';


const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
};

const STATUSES = ['all', 'pending', 'active', 'completed', 'rejected'];

export default function AdminLoanManagement() {
  const navigate = useNavigate();

  const [loans,        setLoans]        = useState([]);
  const [stats,        setStats]        = useState({ pending: 0, active: 0, completed: 0, totalDisbursed: 0 });
  const [searchTerm,   setSearchTerm]   = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores _id of loan being acted on
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  /* ── Auth guard ── */
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/');
  }, [navigate]);

  /* ── Fetch from real API ── */
  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const token  = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', LIMIT);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const res  = await fetch(`${API}/api/admin/loans?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          navigate('/');
          return;
        }
        toast.error(data.message || 'Failed to fetch loans');
        return;
      }

      setLoans(data.loans  || []);
      setStats(data.stats  || { pending: 0, active: 0, completed: 0, totalDisbursed: 0 });
    } catch (err) {
      toast.error('Network error. Could not load loans.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page, navigate]);

  /* initial load */
  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  /* Reset page on search change */
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  /* ── Approve ── */
  const handleApprove = async (loan) => {
    if (!window.confirm(`Approve loan ${loan.loanId} for ${loan.memberName}?`)) return;

    setActionLoading(loan._id);
    try {
      const token = localStorage.getItem('adminToken');
      const res   = await fetch(`${API}/api/admin/loans/${loan._id}/approve`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();

      if (!res.ok) { toast.error(data.message || 'Failed to approve loan'); return; }

      toast.success(`Loan ${loan.loanId} approved`);
      fetchLoans();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Reject ── */
  const handleReject = async (loan) => {
    if (!window.confirm(`Reject loan ${loan.loanId} for ${loan.memberName}?`)) return;

    setActionLoading(loan._id);
    try {
      const token = localStorage.getItem('adminToken');
      const res   = await fetch(`${API}/api/admin/loans/${loan._id}/reject`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();

      if (!res.ok) { toast.error(data.message || 'Failed to reject loan'); return; }

      toast.success(`Loan ${loan.loanId} rejected`);
      fetchLoans();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Render ── */
  return (
    <div className="admin-loan-main">
      {/* Header */}
      <div className="admin-loan-header">
        <h1 className="admin-loan-title">Loan Management</h1>
      </div>

      {/* Stats */}
      <div className="admin-loan-stats-grid">
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Pending Review</p>
          <p className="admin-loan-stat-value">{stats.pending}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Active Loans</p>
          <p className="admin-loan-stat-value">{stats.active}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Completed</p>
          <p className="admin-loan-stat-value">{stats.completed}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Total Disbursed</p>
          <p className="admin-loan-stat-value">{fmt(stats.totalDisbursed)}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="admin-loan-search-section">
        <div className="admin-loan-search-container">
          <div className="admin-loan-search-wrapper">
            <div className="admin-loan-search-icon">
              <Search size={20} color="#99A1AF" />
            </div>
            <input
              type="text"
              placeholder="Search by member name or loan ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-loan-search-input"
            />
          </div>

          <div className="admin-loan-filter">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); }}
              className="admin-loan-filter-button"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-loan-table-section">
        <table className="admin-loan-table">
          <thead>
            <tr className="admin-loan-table-header">
              <th className="admin-loan-table-header-cell">Loan ID</th>
              <th className="admin-loan-table-header-cell">Member</th>
              <th className="admin-loan-table-header-cell">Amount</th>
              <th className="admin-loan-table-header-cell">Purpose</th>
              <th className="admin-loan-table-header-cell">Status</th>
              <th className="admin-loan-table-header-cell">Applied Date</th>
              <th className="admin-loan-table-header-cell">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-loan-table-cell admin-loan-table-empty">
                  <div className="admin-loan-loading-row">
                    <div className="admin-loan-spinner" />
                    Loading loans…
                  </div>
                </td>
              </tr>
            ) : loans.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-loan-table-cell admin-loan-table-empty">
                  No loans found
                </td>
              </tr>
            ) : (
              loans.map((loan) => {
                const isBusy = actionLoading === loan._id;
                return (
                  <tr key={loan._id} className="admin-loan-table-row">
                    <td className="admin-loan-table-cell">{loan.loanId}</td>

                    <td className="admin-loan-table-cell">
                      <div className="admin-loan-member-info">
                        <span className="admin-loan-member-name">{loan.memberName}</span>
                        <span className="admin-loan-member-email">{loan.email}</span>
                      </div>
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className="admin-loan-amount">{fmt(loan.amount)}</span>
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className="admin-loan-purpose">{loan.purpose}</span>
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className={`admin-loan-status-badge admin-loan-status-${loan.status}`}>
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </span>
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className="admin-loan-date">{fmtDate(loan.appliedDate)}</span>
                    </td>

                    <td className="admin-loan-table-cell">
                      <div className="admin-loan-actions">
                        {/* View */}
                        <button
                          className="admin-loan-action-btn"
                          title="View details"
                          onClick={() => navigate(`/admin/loans/${loan._id}`)}
                        >
                          <div className="admin-loan-action-icon">
                            <Banknote size={16} color="#4A5565" />
                          </div>
                        </button>

                        {/* Approve / Reject — only for pending loans */}
                        {loan.status === 'pending' && (
                          <>
                            <button
                              className="admin-loan-action-btn"
                              title="Approve"
                              disabled={isBusy}
                              onClick={() => handleApprove(loan)}
                            >
                              <div className="admin-loan-action-icon">
                                {isBusy ? (
                                  <div className="admin-loan-spinner admin-loan-spinner-sm" />
                                ) : (
                                  <Banknote size={16} color="#00A63E" />
                                )}
                              </div>
                            </button>

                            <button
                              className="admin-loan-action-btn"
                              title="Reject"
                              disabled={isBusy}
                              onClick={() => handleReject(loan)}
                            >
                              <div className="admin-loan-action-icon">
                                {isBusy ? (
                                  <div className="admin-loan-spinner admin-loan-spinner-sm" />
                                ) : (
                                  <Banknote size={16} color="#E7000B" />
                                )}
                              </div>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}