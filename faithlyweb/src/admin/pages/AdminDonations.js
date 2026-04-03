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
    percentageChange: '0%',
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // Changed default to 'active'
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Incomplete or unreadable proof of payment');
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [rejectedList, setRejectedList] = useState([]);
  const debouncedSearch = useDebounce(search, 400);
  const ITEMS_PER_PAGE = 5;

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
        rejectedCount:  data.stats?.rejectedCount || 0,
        percentageChange: data.stats?.percentageChange || '0%',
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
        body: JSON.stringify({ reason: rejectReason }), // Uses the drafted reason
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

  /* ── Render ── */
  return (
    <div className="admin-don-new-main">
      {/* Header */}
      <div className="admin-don-new-header">
        <h1 className="admin-don-new-title">Donations</h1>

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
          <p className="admin-don-new-stat-change">{stats.percentageChange} from last month</p>
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

        <div className="admin-don-new-stat-card" style={{ cursor: 'pointer' }} onClick={async () => {
          setShowRejectedModal(true);
          setRejectedLoading(true);
          const res = await fetch(`${API}/api/admin/donations?status=rejected&limit=100`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }});
          const data = await res.json();
          setRejectedList(data.donations || []);
          setRejectedLoading(false);
        }}>
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Total Rejected</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p14d24500} stroke="#EF4444" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value" style={{ color: '#EF4444' }}>{stats.rejectedCount}</p>
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
              <option value="active">All Forms</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
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

        <div className="loan-admin-mgmt-table-container">
          <table className="loan-admin-mgmt-table">
            <thead>
              <tr>
                <th>Donation ID</th>
                <th>Member</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    Loading donations…
                  </td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    No donations found
                  </td>
                </tr>
              ) : (
                donations.map((donation, index) => (
                  <tr key={donation._id || index} className="loan-admin-mgmt-table-row-hover">
                    <td style={{ fontWeight: 600, color: '#111827' }}>
                      {donation.donationId || `D-${String(index + 1).padStart(3, '0')}`}
                    </td>
                    <td>
                      {donation.member || '—'}
                    </td>
                    <td style={{ color: '#00A63E', fontWeight: 600 }}>
                      {fmt(donation.amount)}
                    </td>
                    <td style={{ color: '#374151' }}>
                      {donation.category || donation.purpose || 'General Fund'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#6B7280' }}>
                      {fmtDate(donation.createdAt || donation.date)}
                    </td>
                    <td>
                      <StatusBadge status={donation.status || 'pending'} />
                    </td>
                    <td>
                      <div className="admin-don-action-group">
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
            <div className="admin-don-modal-footer" style={{ flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
              {(!detailModal.status || detailModal.status === 'pending') && (
                <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#991B1B', fontWeight: '500' }}>Rejection Reason</p>
                  <select 
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #FCA5A5', marginBottom: '12px', fontSize: '14px' }}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  >
                    <option value="Incomplete or unreadable proof of payment">Incomplete or unreadable proof of payment</option>
                    <option value="Amount deposited does not match the entered amount">Amount deposited does not match the entered amount</option>
                    <option value="Duplicate payment proof uploaded">Duplicate payment proof uploaded</option>
                    <option value="Invalid transaction reference number">Invalid transaction reference number</option>
                    <option value="Other / Suspected fraudulent submission">Other / Suspected fraudulent submission</option>
                  </select>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="admin-don-action-btn admin-don-action-reject"
                      style={{ padding: '10px 20px', fontSize: '14px', flex: 1 }}
                      onClick={() => handleReject(detailModal._id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <span className="btn-spinner" /> : 'Reject'}
                    </button>
                    <button
                      className="admin-don-action-btn admin-don-action-confirm"
                      style={{ padding: '10px 24px', fontSize: '14px', flex: 2 }}
                      onClick={() => handleConfirm(detailModal._id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <span className="btn-spinner" /> : 'Confirm Donation'}
                    </button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
        </div>
      )}

      {/* ── Rejected List Modal ── */}
      {showRejectedModal && (
        <div className="admin-don-modal-overlay" onClick={() => setShowRejectedModal(false)}>
          <div className="admin-don-modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-don-modal-header">
              <h2 className="admin-don-modal-title">Rejected Donations</h2>
              <button className="admin-don-modal-close" onClick={() => setShowRejectedModal(false)}>×</button>
            </div>
            <div className="admin-don-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
              {rejectedLoading ? (
                <p>Loading...</p>
              ) : rejectedList.length === 0 ? (
                <p>No rejected donations found.</p>
              ) : (
                <div className="loan-admin-mgmt-table-container">
                  <table className="loan-admin-mgmt-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedList.map(r => (
                        <tr key={r._id} className="loan-admin-mgmt-table-row-hover">
                          <td style={{ fontWeight: 600 }}>{r.donationId}</td>
                          <td>{r.member}</td>
                          <td>{fmt(r.amount)}</td>
                          <td style={{ color: '#EF4444' }}>{r.rejectReason || 'Admin review'}</td>
                          <td>{fmtDate(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="admin-don-modal-footer">
               <button className="admin-don-action-btn admin-don-action-view" onClick={() => setShowRejectedModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}