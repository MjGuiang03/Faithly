import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminDonations.css';
import svgPaths from "../../imports/svg-icons";

import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
};

const StatusBadge = ({ status }) => {
  const map = {
    confirmed: { label: 'Confirmed', cls: 'admin-don-status-confirmed' },
    rejected:  { label: 'Rejected',  cls: 'admin-don-status-rejected'  },
    pending:   { label: 'Pending',   cls: 'admin-don-status-pending'   },
  };
  const s = map[status] || map.pending;
  return <span className={`admin-don-status-badge ${s.cls}`}>{s.label}</span>;
};

export default function AdminDonationsNew() {
  const navigate = useNavigate();

  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    totalThisMonth: 0,
    totalDonors: 0,
    avgDonation: 0,
    thisWeek: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 400);
  const ITEMS_PER_PAGE = 10;

  /* ── Detail modal ── */
  const [detailModal, setDetailModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/');
  }, [navigate]);

  /* ── Fetch ── */
  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      params.set('page', currentPage);
      params.set('limit', ITEMS_PER_PAGE);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${API}/api/admin/donations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { navigate('/'); return; }
        toast.error(data.message || 'Failed to fetch donations');
        return;
      }

      setDonations(data.donations || []);
      setTotalCount(data.totalCount || 0);
      setStats({
        totalThisMonth: data.stats?.thisMonth || 0,
        totalDonors:    data.stats?.totalDonors || 0,
        avgDonation:    data.stats?.avgDonation || 0,
        thisWeek:       data.stats?.thisWeek || 0,
        pendingCount:   data.stats?.pendingCount || 0,
      });
    } catch {
      toast.error('Network error. Could not load donations.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, navigate]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilter]);

  /* ── Pagination math ── */
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const goTo   = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const goPrev = () => goTo(currentPage - 1);
  const goNext = () => goTo(currentPage + 1);

  /* ── Admin actions ── */
  const handleConfirm = async (id) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/donations/${id}/confirm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Donation confirmed!');
      setDetailModal(null);
      fetchDonations();
    } catch (err) {
      toast.error(err.message || 'Failed to confirm donation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/donations/${id}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin review' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Donation rejected.');
      setDetailModal(null);
      fetchDonations();
    } catch (err) {
      toast.error(err.message || 'Failed to reject donation');
    } finally {
      setActionLoading(false);
    }
  };

  const percentageChange = '+8%';

  /* ── Render ── */
  return (
    <div className="admin-don-new-main">
      {/* Header */}
      <div className="admin-don-new-header">
        <h1 className="admin-don-new-title">Donations</h1>
        <p className="admin-don-new-subtitle">Track and manage church donations</p>
      </div>

      {/* Stats Cards */}
      <div className="admin-don-new-stats">
        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Total This Month</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p2f84f400} stroke="#E60076" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{fmt(stats.totalThisMonth)}</p>
          <p className="admin-don-new-stat-change">{percentageChange} from last month</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Total Donors</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p3c797180} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3ac0b600} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{stats.totalDonors}</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Avg. Donation</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 1.66667V18.3333" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3055a600} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{fmt(stats.avgDonation)}</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Pending Approval</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7.5" stroke="#EAB308" strokeWidth="1.66667"/>
              <path d="M10 6.5v4l2.5 1.5" stroke="#EAB308" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{stats.pendingCount}</p>
        </div>
      </div>

      {/* Donations Table */}
      <div className="admin-don-new-section">
        <div className="admin-don-new-table-header">
          <h2 className="admin-don-new-section-title">All Donations</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Status Filter */}
            <select
              className="admin-don-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
            {/* Search */}
            <div className="history-search-box">
              <svg fill="none" viewBox="0 0 16 16" width="14" height="14" className="search-icon-inner">
                <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" />
                <path d="M10.5 10.5L13.5 13.5" stroke="#9ca3af" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
              <input
                type="text"
                className="history-search-input"
                placeholder="Search member, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="admin-don-new-table-container">
          <table className="admin-don-new-table">
            <thead className="admin-don-new-thead">
              <tr>
                <th className="admin-don-new-th">Donation ID</th>
                <th className="admin-don-new-th">Member</th>
                <th className="admin-don-new-th">Amount</th>
                <th className="admin-don-new-th">Purpose</th>
                <th className="admin-don-new-th">Date</th>
                <th className="admin-don-new-th">Status</th>
                <th className="admin-don-new-th">Actions</th>
              </tr>
            </thead>
            <tbody className="admin-don-new-tbody">
              {loading ? (
                <tr>
                  <td colSpan={7} className="admin-don-new-td admin-don-new-empty">
                    <div className="admin-don-new-loading">
                      <div className="admin-don-new-spinner" />
                      Loading donations…
                    </div>
                  </td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-don-new-td admin-don-new-empty">
                    No donations found
                  </td>
                </tr>
              ) : (
                donations.map((donation, index) => (
                  <tr key={donation._id || index} className="admin-don-new-tr">
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-donation-id">
                        {donation.donationId || `D-${String(index + 1).padStart(3, '0')}`}
                      </span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-member-name">{donation.member || '—'}</span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-amount">{fmt(donation.amount)}</span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-purpose">
                        {donation.category || donation.purpose || 'General Fund'}
                      </span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-date">
                        {fmtDate(donation.createdAt || donation.date)}
                      </span>
                    </td>
                    <td className="admin-don-new-td">
                      <StatusBadge status={donation.status || 'pending'} />
                    </td>
                    <td className="admin-don-new-td">
                      <div className="admin-don-action-group">
                        {(!donation.status || donation.status === 'pending') && (
                          <>
                            <button
                              className="admin-don-action-btn admin-don-action-confirm"
                              onClick={() => handleConfirm(donation._id)}
                              disabled={actionLoading}
                              title="Confirm"
                            >
                              Confirm
                            </button>
                            <button
                              className="admin-don-action-btn admin-don-action-reject"
                              onClick={() => handleReject(donation._id)}
                              disabled={actionLoading}
                              title="Reject"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          className="admin-don-action-btn admin-don-action-view"
                          onClick={() => setDetailModal(donation)}
                          title="View Details"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <div className="admin-don-new-pagination">
            <div className="admin-don-new-pagination-info">
              Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong> results
            </div>
            <div className="admin-don-new-pagination-controls">
              <button className="admin-don-new-pagination-btn" onClick={goPrev} disabled={currentPage === 1}>&lt;</button>
              <button className="admin-don-new-pagination-number admin-don-new-pagination-active">{currentPage}</button>
              {currentPage < totalPages && (
                <button className="admin-don-new-pagination-number" onClick={() => goTo(currentPage + 1)}>
                  {currentPage + 1}
                </button>
              )}
              <button className="admin-don-new-pagination-btn" onClick={goNext} disabled={currentPage === totalPages}>&gt;</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div className="admin-don-modal-overlay" onClick={() => !actionLoading && setDetailModal(null)}>
          <div className="admin-don-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="admin-don-modal-header">
              <h2 className="admin-don-modal-title">Donation Details</h2>
              <button className="admin-don-modal-close" onClick={() => setDetailModal(null)}>×</button>
            </div>

            {/* Info Grid */}
            <div className="admin-don-modal-body">
              <div className="admin-don-modal-grid">
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Donation ID</span>
                  <span className="admin-don-modal-value">{detailModal.donationId}</span>
                </div>
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Status</span>
                  <StatusBadge status={detailModal.status || 'pending'} />
                </div>
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Member</span>
                  <span className="admin-don-modal-value">{detailModal.member}</span>
                </div>
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Amount</span>
                  <span className="admin-don-modal-value admin-don-modal-amount">{fmt(detailModal.amount)}</span>
                </div>
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Purpose</span>
                  <span className="admin-don-modal-value">{detailModal.category || 'General Fund'}</span>
                </div>
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Payment Method</span>
                  <span className="admin-don-modal-value">{detailModal.method || '—'}</span>
                </div>
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Date Submitted</span>
                  <span className="admin-don-modal-value">{fmtDate(detailModal.createdAt || detailModal.date)}</span>
                </div>
                <div className="admin-don-modal-field">
                  <span className="admin-don-modal-label">Type</span>
                  <span className="admin-don-modal-value">{detailModal.type || 'One-time'}</span>
                </div>
              </div>

              {/* Proof of Payment */}
              <div className="admin-don-modal-proof-section">
                <p className="admin-don-modal-proof-label">Proof of Payment</p>
                {detailModal.proofImage ? (
                  <img
                    src={detailModal.proofImage}
                    alt="Proof of payment"
                    className="admin-don-modal-proof-img"
                    onClick={() => window.open(detailModal.proofImage, '_blank')}
                  />
                ) : (
                  <div className="admin-don-modal-no-proof">No proof of payment uploaded</div>
                )}
              </div>

              {detailModal.rejectReason && (
                <div className="admin-don-modal-reject-reason">
                  <span className="admin-don-modal-label">Reject Reason</span>
                  <p>{detailModal.rejectReason}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="admin-don-modal-footer">
              {(!detailModal.status || detailModal.status === 'pending') && (
                <>
                  <button
                    className="admin-don-action-btn admin-don-action-reject"
                    style={{ padding: '10px 20px', fontSize: '14px' }}
                    onClick={() => handleReject(detailModal._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing…' : 'Reject'}
                  </button>
                  <button
                    className="admin-don-action-btn admin-don-action-confirm"
                    style={{ padding: '10px 24px', fontSize: '14px' }}
                    onClick={() => handleConfirm(detailModal._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing…' : 'Confirm Donation'}
                  </button>
                </>
              )}
              <button
                className="admin-don-action-btn admin-don-action-view"
                style={{ padding: '10px 20px', fontSize: '14px' }}
                onClick={() => setDetailModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}