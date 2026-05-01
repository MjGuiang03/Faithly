import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminDonations.css';

import API from '../../utils/api';
import { Banknote, Users, Calculator, Search, XCircle, ChevronLeft, ChevronRight, Heart } from 'lucide-react';


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
    confirmed: { label: 'Successful', cls: 'admin-don-status-confirmed' },
    rejected:  { label: 'Failed',  cls: 'admin-don-status-rejected'  },
    pending:   { label: 'Pending Review',   cls: 'admin-don-status-pending'   },
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
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [rejectedList, setRejectedList] = useState([]);
  const debouncedSearch = useDebounce(search, 400);
  const ITEMS_PER_PAGE = 5;

  /* ── Detail modal ── */
  const [detailModal, setDetailModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/donations/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Donation approved successfully');
        setDetailModal(null);
        fetchDonations();
      } else {
        toast.error(data.message || 'Failed to approve donation');
      }
    } catch {
      toast.error('Network error. Could not approve.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/donations/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rejectReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Donation rejected successfully');
        setDetailModal(null);
        setRejectReason('');
        setShowRejectInput(false);
        fetchDonations();
      } else {
        toast.error(data.message || 'Failed to reject donation');
      }
    } catch {
      toast.error('Network error. Could not reject.');
    } finally {
      setActionLoading(false);
    }
  };

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
            <div className="adm-stat-icon-wrap"><Banknote size={20} color="white" /></div>
          </div>
          <p className="admin-don-new-stat-value">{fmt(stats.totalThisMonth)}</p>
          <p className="admin-don-new-stat-change">{stats.percentageChange} from last month</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Total Donors</span>
            <div className="adm-stat-icon-wrap"><Users size={20} color="white" /></div>
          </div>
          <p className="admin-don-new-stat-value">{stats.totalDonors}</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Avg. Donation</span>
            <div className="adm-stat-icon-wrap"><Calculator size={20} color="white" /></div>
          </div>
          <p className="admin-don-new-stat-value">{fmt(stats.avgDonation)}</p>
        </div>

        <div className="admin-don-new-stat-card admin-don-clickable-card" onClick={async () => {
          setShowRejectedModal(true);
          setRejectedLoading(true);
          const res = await fetch(`${API}/api/admin/donations?status=rejected&limit=100`, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }});
          const data = await res.json();
          setRejectedList(data.donations || []);
          setRejectedLoading(false);
        }}>
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Total Rejected</span>
            <div className="adm-stat-icon-wrap"><XCircle size={20} color="white" /></div>
          </div>
          <p className="admin-don-new-stat-value admin-don-text-red">{stats.rejectedCount}</p>
        </div>
      </div>

      {/* Donations Table */}
      <div className="admin-don-new-section">
        <div className="admin-don-search-toolbar">
          <div className="admin-don-search-wrapper">
            <Search className="admin-don-search-icon" size={18} />
            <input
              type="text"
              className="admin-don-search-input"
              placeholder="Search member, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="admin-don-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">All Forms</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Failed</option>
          </select>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
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
                  <td colSpan={7} className="admin-don-empty-cell">
                    Loading donations…
                  </td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-don-empty-cell">
                    No donations found
                  </td>
                </tr>
              ) : (
                donations.map((donation, index) => (
                  <tr key={donation._id || index} className="admin-table-row-hover">
                    <td className="admin-don-cell-bold-dark">
                      {donation.donationId || `D-${String(index + 1).padStart(3, '0')}`}
                    </td>
                    <td>
                      {donation.member || '—'}
                    </td>
                    <td className="admin-don-cell-green-bold">
                      {fmt(donation.amount)}
                    </td>
                    <td className="admin-don-cell-muted">
                      {donation.category || donation.purpose || 'General Fund'}
                    </td>
                    <td className="admin-don-cell-date">
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
        {!loading && totalPages > 1 && (
          <div className="admin-don-pagination-wrapper">
            <div className="admin-don-pagination">
              <button 
                className="admin-don-pagination-btn" 
                onClick={goPrev} 
                disabled={currentPage === 1}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="admin-don-pagination-numbers">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button 
                    key={i}
                    className={`admin-don-pagination-number ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => goTo(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                className="admin-don-pagination-btn" 
                onClick={goNext} 
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="admin-don-pagination-info">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} results
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div className="admin-don-modal-overlay" onClick={() => !actionLoading && setDetailModal(null)}>
          <div className="admin-don-modal-content admin-don-modal-enhanced" onClick={(e) => e.stopPropagation()}>
            <div className="admin-don-modal-header-enhanced">
              <div className="admin-don-modal-icon-wrapper">
                  <Heart size={24} />
              </div>
              <div className="admin-don-modal-header-info">
                  <div className="admin-don-modal-header-top">
                      <div>
                          <h2 className="admin-don-modal-title">Donation Details</h2>
                          <span className="admin-don-modal-ref">Reference: {detailModal.donationId}</span>
                      </div>
                      <button className="admin-don-modal-close-btn" onClick={() => setDetailModal(null)}>×</button>
                  </div>
              </div>
            </div>

            <div className="admin-don-modal-body-enhanced">
              <div className="admin-don-modal-details-container">
                <div className="admin-don-modal-detail-row">
                  <span className="admin-don-modal-detail-label">Status</span>
                  <div className="admin-don-modal-detail-value-container">
                    <StatusBadge status={detailModal.status || 'pending'} />
                  </div>
                </div>
                <div className="admin-don-modal-detail-row">
                  <span className="admin-don-modal-detail-label">Member</span>
                  <span className="admin-don-modal-detail-value">{detailModal.member}</span>
                </div>
                <div className="admin-don-modal-detail-row">
                  <span className="admin-don-modal-detail-label">Amount</span>
                  <span className="admin-don-modal-detail-value admin-don-modal-amount">{fmt(detailModal.amount)}</span>
                </div>
                <div className="admin-don-modal-detail-row">
                  <span className="admin-don-modal-detail-label">Purpose</span>
                  <span className="admin-don-modal-detail-value">{detailModal.category || 'General Fund'}</span>
                </div>
                <div className="admin-don-modal-detail-row">
                  <span className="admin-don-modal-detail-label">Payment Method</span>
                  <span className="admin-don-modal-detail-value">{detailModal.method || '—'}</span>
                </div>
                <div className="admin-don-modal-detail-row">
                  <span className="admin-don-modal-detail-label">Date Submitted</span>
                  <span className="admin-don-modal-detail-value">{fmtDate(detailModal.createdAt || detailModal.date)}</span>
                </div>
                <div className="admin-don-modal-detail-row">
                  <span className="admin-don-modal-detail-label">Type</span>
                  <span className="admin-don-modal-detail-value">{detailModal.type || 'One-time'}</span>
                </div>
              </div>

              {detailModal.rejectReason && (
                <div className="admin-don-modal-reject-reason-enhanced">
                  <span className="admin-don-modal-reject-label">Reject Reason</span>
                  <p>{detailModal.rejectReason}</p>
                </div>
              )}

              {detailModal.proofData && (
                <div style={{ marginTop: '16px' }}>
                  <span className="admin-don-modal-detail-label">Proof of Payment</span>
                  <img src={detailModal.proofData} alt="Proof" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginTop: '8px', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                </div>
              )}

              {detailModal.status === 'pending' && (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {!showRejectInput ? (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => setShowRejectInput(true)} 
                        disabled={actionLoading}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}>
                        Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(detailModal._id)} 
                        disabled={actionLoading}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        {actionLoading ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', width: '100%', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                          style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleReject(detailModal._id)} 
                          disabled={actionLoading || !rejectReason.trim()}
                          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                          {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Rejected List Modal ── */}
      {showRejectedModal && (
        <div className="admin-don-modal-overlay" onClick={() => setShowRejectedModal(false)}>
          <div className="admin-don-modal-content admin-don-modal-content-wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-don-modal-header">
              <h2 className="admin-don-modal-title">Rejected Donations</h2>
              <button className="admin-don-modal-close" onClick={() => setShowRejectedModal(false)}>×</button>
            </div>
            <div className="admin-don-modal-body admin-don-modal-scrollable-body">
              {rejectedLoading ? (
                <p>Loading...</p>
              ) : rejectedList.length === 0 ? (
                <p>No rejected donations found.</p>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
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
                        <tr key={r._id} className="admin-table-row-hover">
                          <td className="admin-don-fw-600">{r.donationId}</td>
                          <td>{r.member}</td>
                          <td>{fmt(r.amount)}</td>
                          <td className="admin-don-text-red">{r.rejectReason || 'Admin review'}</td>
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