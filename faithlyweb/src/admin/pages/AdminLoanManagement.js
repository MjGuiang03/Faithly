import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminLoanManagement.css';

import API from '../../utils/api';

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores _id of loan being acted on

  /* ── Auth guard ── */
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin/login');
  }, [navigate]);

  /* ── Fetch from real API ── */
  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const token  = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm.trim())      params.set('search', searchTerm.trim());

      const res  = await fetch(`${API}/api/admin/loans?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          navigate('/admin/login');
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
  }, [statusFilter, searchTerm, navigate]);

  /* initial load */
  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => fetchLoans(), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

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
        <p className="admin-loan-subtitle">Review and manage loan applications</p>
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.5 17.5L13.875 13.875" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M0.666667 8C0.666667 8 3.33333 2.66667 8 2.66667C12.6667 2.66667 15.3333 8 15.3333 8C15.3333 8 12.6667 13.3333 8 13.3333C3.33333 13.3333 0.666667 8 0.666667 8Z" stroke="#4A5565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="#4A5565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
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
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#00A63E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
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
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M12 4L4 12" stroke="#E7000B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M4 4L12 12" stroke="#E7000B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
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