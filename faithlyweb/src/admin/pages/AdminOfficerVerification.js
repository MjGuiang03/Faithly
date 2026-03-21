import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminOfficerVerification.css';
import svgPaths from "../../imports/svg-icons";

import API from '../../utils/api';
const PER_PAGE = 5;

const fmtDate = (d) => {
  if (!d) return 'â€”';
  return new Date(d).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   VERIFICATION DETAILS MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function VerificationDetailsModal({ request, onClose, onApprove, onReject }) {
  const [showRejectModal,  setShowRejectModal]  = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  return (
    <>
      <div className="admin-offver-modal-overlay" onClick={onClose}>
        <div className="admin-offver-modal-details" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="admin-offver-modal-header">
            <div>
              <h2 className="admin-offver-modal-title">Verification Details</h2>
              <p className="admin-offver-modal-request-id">Request ID: VR-{String(request._id).slice(-3).toUpperCase()}</p>
            </div>
            <button className="admin-offver-modal-close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15" stroke="#6a7282" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M5 5L15 15" stroke="#6a7282" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Member Information */}
          <div className="admin-offver-modal-body">
            <h3 className="admin-offver-section-heading">Member Information</h3>
            <div className="admin-offver-info-grid">
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Church ID Number</span>
                <span className="admin-offver-info-value">{request.churchId || 'â€”'}</span>
              </div>
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Church Position</span>
                <span className="admin-offver-info-value">{request.position || 'â€”'}</span>
              </div>

              {request.status === 'rejected' && request.rejectionReason && (
                <div className="admin-offver-info-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="admin-offver-info-label">Rejection Reason</span>
                  <span className="admin-offver-info-value" style={{ color: '#DC2626' }}>{request.rejectionReason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="admin-offver-modal-actions">
            {request.status === 'pending' ? (
              <>
                <button
                  className="admin-offver-btn admin-offver-btn-cancel"
                  onClick={() => setShowRejectModal(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Cancel
                </button>
                <button
                  className="admin-offver-btn admin-offver-btn-approve"
                  onClick={() => setShowApproveModal(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6.5 10L9 12.5L13.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Approve for Level 2
                </button>
              </>
            ) : (
              <button className="admin-offver-btn admin-offver-btn-cancel" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <RejectModal
          request={request}
          onClose={() => setShowRejectModal(false)}
          onConfirm={(reason) => {
            onReject(reason);
            setShowRejectModal(false);
            onClose();
          }}
        />
      )}

      {showApproveModal && (
        <ApproveModal
          request={request}
          onClose={() => setShowApproveModal(false)}
          onConfirm={() => {
            onApprove();
            setShowApproveModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REJECT MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REJECT MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function RejectModal({ request, onClose, onConfirm }) {
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('adminToken');

  const handleReject = async () => {
    if (!reason.trim()) { toast.error('Please enter a reason for rejection'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/verifications/${request._id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Request rejected successfully');
      onConfirm(reason);
    } catch (err) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-offver-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="admin-offver-modal-confirm admin-offver-modal-reject" onClick={e => e.stopPropagation()}>
        <div className="admin-offver-confirm-icon admin-offver-confirm-icon-reject">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="admin-offver-confirm-title">Reject Verification?</h3>
        <p className="admin-offver-confirm-text">
          Are you sure you want to reject <strong>{request.memberName}</strong>'s verification request?
        </p>
        <p className="admin-offver-confirm-subtext">
          The member will remain at Level 1 and will not have access to loans.
        </p>
        <div className="admin-offver-form-group">
          <label className="admin-offver-form-label">Reason for Rejection:</label>
          <textarea
            className="admin-offver-form-textarea"
            placeholder="Enter rejection reason..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <div className="admin-offver-confirm-actions">
          <button className="admin-offver-btn admin-offver-btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="admin-offver-btn admin-offver-btn-danger" onClick={handleReject} disabled={loading}>
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   APPROVE MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function ApproveModal({ request, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('adminToken');

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/verifications/${request._id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Request approved â€” member promoted to Level 2');
      onConfirm();
    } catch (err) {
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-offver-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="admin-offver-modal-confirm" onClick={e => e.stopPropagation()}>

        {/* Green checkmark icon */}
        <div className="admin-offver-confirm-icon admin-offver-confirm-icon-approve">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#dcfce7"/>
            <path d="M8 14.5L12 18.5L20 10" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h3 className="admin-offver-confirm-title">Approve Verification?</h3>
        <p className="admin-offver-confirm-text">
          Are you sure you want to approve <strong>{request.memberName}</strong> for Level 2 access?
        </p>

        <div className="admin-offver-benefits">
          <p className="admin-offver-benefits-title">This will grant the member:</p>
          <ul className="admin-offver-benefits-list">
            <li>Access to the Loan module</li>
            <li>Ability to apply for loans</li>
            <li>Level 2 status badge</li>
          </ul>
        </div>

        <div className="admin-offver-confirm-actions">
          <button
            className="admin-offver-btn admin-offver-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="admin-offver-btn admin-offver-btn-success"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? 'Approvingâ€¦' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN COMPONENT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function AdminOfficerVerification() {
  const navigate = useNavigate();
  const [requests,          setRequests]         = useState([]);
  const [stats,             setStats]            = useState({ pending: 0, approved: 0, rejected: 0 });
  const [searchQuery,       setSearchQuery]      = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [currentPage,       setCurrentPage]      = useState(1);
  const [totalCount,        setTotalCount]      = useState(0);
  const [selectedRequest,  setSelectedRequest]  = useState(null);
  const [loading,          setLoading]          = useState(true);

  const token = localStorage.getItem('adminToken');

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('page', currentPage);
      p.set('limit', PER_PAGE);
      if (debouncedSearch.trim()) p.set('search', debouncedSearch.trim());

      const res  = await fetch(`${API}/api/admin/verifications?${p}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.verifications || []);
        setStats(data.stats || { pending: 0, approved: 0, rejected: 0 });
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, debouncedSearch]);

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) { navigate('/'); return; }
    fetchVerifications();
  }, [navigate, fetchVerifications]);

  const handleApprove = async () => {
    await fetchVerifications();
    setSelectedRequest(null);
  };

  const handleReject = async () => {
    await fetchVerifications();
    setSelectedRequest(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const totalPages      = Math.ceil(totalCount / PER_PAGE);
  const paginated       = requests;

  const getStatusBadgeClass = (s) => `admin-offver-status-${s}`;

  return (
    <div className="admin-offver-main">
      {selectedRequest && (
        <VerificationDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Header */}
      <div className="admin-offver-header">
        <h1 className="admin-offver-title">Officer Verification</h1>
        <p className="admin-offver-subtitle">Review and approve Level 2 upgrade requests from members</p>
      </div>

      {/* Stats Cards */}
      <div className="admin-offver-stats">
        <div className="admin-offver-stat-card">
          <div className="admin-offver-stat-header">
            <span className="admin-offver-stat-label">Pending Review</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p25397b80} stroke="#F59E0B" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2c4f400}  stroke="#F59E0B" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2f5eb900} stroke="#F59E0B" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-offver-stat-value admin-offver-stat-value-pending">{loading ? 'â€”' : stats.pending}</p>
        </div>

        <div className="admin-offver-stat-card">
          <div className="admin-offver-stat-header">
            <span className="admin-offver-stat-label">Approved</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p17cc7980} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3fe63d80} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-offver-stat-value admin-offver-stat-value-approved">{loading ? 'â€”' : stats.approved}</p>
        </div>

        <div className="admin-offver-stat-card">
          <div className="admin-offver-stat-header">
            <span className="admin-offver-stat-label">Rejected</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p14d24500} stroke="#EF4444" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.5 7.5L7.5 12.5" stroke="#EF4444" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7.5 7.5L12.5 12.5" stroke="#EF4444" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-offver-stat-value admin-offver-stat-value-rejected">{loading ? 'â€”' : stats.rejected}</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="admin-offver-info">
        <div className="admin-offver-info-icon"><p>i</p></div>
        <div className="admin-offver-info-content">
          <p className="admin-offver-info-text">
            <strong>About Verification Levels:</strong> Members start at Level 1 (Unverified). After members submit
            verification documents, they appear in the pending list below. Once approved, members are promoted to
            Level 2 (Verified). After verification approval, members gain access to the Loan module.
          </p>
        </div>
      </div>

      <div className="admin-offver-toolbar">
        <div className="admin-offver-search-wrapper">
          <Search size={18} className="admin-offver-search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or position..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="admin-offver-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="admin-offver-table-section">
        {loading ? (
          <div className="admin-offver-loading-spinner">
            <p>Loading verificationsâ€¦</p>
          </div>
        ) : (
          <>
            <table className="admin-offver-table">
              <thead>
                <tr className="admin-offver-table-header">
                  <th className="admin-offver-table-header-cell">Name</th>
                  <th className="admin-offver-table-header-cell">Email</th>
                  <th className="admin-offver-table-header-cell">Church Position</th>
                  <th className="admin-offver-table-header-cell">Submitted</th>
                  <th className="admin-offver-table-header-cell">Status</th>
                  <th className="admin-offver-table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-offver-table-cell admin-offver-empty">
                      {searchQuery ? 'No results found.' : 'No verification requests yet.'}
                    </td>
                  </tr>
                ) : (
                  paginated.map(r => (
                    <tr key={r._id} className="admin-offver-table-row">
                      <td className="admin-offver-table-cell" style={{ fontWeight: 500 }}>{r.memberName}</td>
                      <td className="admin-offver-table-cell">{r.email}</td>
                       <td className="admin-offver-table-cell">{r.position}</td>
                      <td className="admin-offver-table-cell" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.submittedAt)}</td>
                      <td className="admin-offver-table-cell">
                        <span className={`admin-offver-status-badge ${getStatusBadgeClass(r.status)}`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td className="admin-offver-table-cell">
                        <button className="admin-offver-view-btn" onClick={() => setSelectedRequest(r)}>
                          <Eye size={16} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="admin-offver-pagination">
                <button
                  className="admin-offver-pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <div className="admin-offver-pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`admin-offver-pagination-number${currentPage === p ? ' active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >{p}</button>
                  ))}
                </div>
                <button
                  className="admin-offver-pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
