import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '../styles/AdminOfficerVerification.css';
import svgPaths from "../../imports/svg-icons";


/* ═══════════════════════════════════════════════════════════════════════════
   VERIFICATION DETAILS MODAL
═══════════════════════════════════════════════════════════════════════════ */
function VerificationDetailsModal({ request, onClose, onApprove, onReject }) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  return (
    <>
      <div className="admin-offver-modal-overlay" onClick={onClose}>
        <div className="admin-offver-modal-details" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="admin-offver-modal-header">
            <div>
              <h2 className="admin-offver-modal-title">Verification Details</h2>
              <p className="admin-offver-modal-request-id">Request ID: {request.id}</p>
            </div>
            <button className="admin-offver-modal-close" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15" stroke="#6a7282" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M5 5L15 15" stroke="#6a7282" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Member Information */}
          <div className="admin-offver-modal-section">
            <h3 className="admin-offver-section-heading">Member Information</h3>
            <div className="admin-offver-info-grid">
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Full Name</span>
                <span className="admin-offver-info-value">{request.name}</span>
              </div>
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Email</span>
                <span className="admin-offver-info-value">{request.email}</span>
              </div>
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Church ID Number</span>
                <span className="admin-offver-info-value">{request.churchId || 'CH-2024-001'}</span>
              </div>
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Church Position</span>
                <span className="admin-offver-info-value">{request.churchPosition}</span>
              </div>
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Occupation</span>
                <span className="admin-offver-info-value">{request.occupation}</span>
              </div>
              <div className="admin-offver-info-item">
                <span className="admin-offver-info-label">Monthly Income</span>
                <span className="admin-offver-info-value">₱{request.income || '25,000'}</span>
              </div>
            </div>
          </div>

          {/* Submitted Documents */}
          <div className="admin-offver-modal-section">
            <h3 className="admin-offver-section-heading">Submitted Documents</h3>
            <div className="admin-offver-documents-grid">
              <div className="admin-offver-document-item">
                <span className="admin-offver-document-label">Selfie with ID & Date</span>
                <div className="admin-offver-document-preview">
                  <img alt="Selfie with ID" className="admin-offver-document-image" />
                </div>
              </div>
              <div className="admin-offver-document-item">
                <span className="admin-offver-document-label">Valid Government ID</span>
                <div className="admin-offver-document-preview admin-offver-document-placeholder">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <rect width="80" height="80" rx="8" fill="#f3f4f6"/>
                    <path d="M30 50L40 40L50 50M40 40L50 30" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="32" cy="32" r="3" fill="#9ca3af"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="admin-offver-modal-actions">
            <button 
              className="admin-offver-btn admin-offver-btn-reject"
              onClick={() => setShowRejectModal(true)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Reject Request
            </button>
            <button 
              className="admin-offver-btn admin-offver-btn-approve"
              onClick={() => setShowApproveModal(true)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6.5 10L9 12.5L13.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Approve for Level 2
            </button>
          </div>
        </div>
      </div>

      {/* Nested Modals */}
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

/* ═══════════════════════════════════════════════════════════════════════════
   REJECT MODAL
═══════════════════════════════════════════════════════════════════════════ */
function RejectModal({ request, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Please enter a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      // API call here
      // await fetch(`${API}/api/admin/verification/reject`, { ... });
      
      toast.success('Request rejected successfully');
      onConfirm(reason);
    } catch (err) {
      toast.error('Failed to reject request');
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
          Are you sure you want to reject <strong>{request.name}</strong>'s verification request?
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
          <button 
            className="admin-offver-btn admin-offver-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="admin-offver-btn admin-offver-btn-danger"
            onClick={handleReject}
            disabled={loading}
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   APPROVE MODAL
═══════════════════════════════════════════════════════════════════════════ */
function ApproveModal({ request, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // API call here
      // await fetch(`${API}/api/admin/verification/approve`, { ... });
      
      toast.success('Request approved successfully');
      onConfirm();
    } catch (err) {
      toast.error('Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-offver-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="admin-offver-modal-confirm admin-offver-modal-approve" onClick={e => e.stopPropagation()}>
        <div className="admin-offver-confirm-icon admin-offver-confirm-icon-approve">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#00A63E" strokeWidth="2"/>
            <path d="M8 12L11 15L16 9" stroke="#00A63E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h3 className="admin-offver-confirm-title">Approve Verification?</h3>
        <p className="admin-offver-confirm-text">
          Are you sure you want to approve <strong>{request.name}</strong> for Level 2 access?
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
            {loading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminOfficerVerification() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requests, setRequests] = useState([
    {
      id: 'VR-001',
      name: 'Juan Dela Cruz',
      email: 'juandelacruz@gmail.com',
      churchId: 'CH-2024-001',
      churchPosition: 'Deacon',
      occupation: 'Teacher',
      income: '25,000',
      submitted: '2026-03-06 10:30 AM',
      status: 'pending'
    },
    {
      id: 'VR-002',
      name: 'Maria Santos',
      email: 'maria@email.com',
      churchId: 'CH-2024-002',
      churchPosition: 'Elder',
      occupation: 'Nurse',
      income: '35,000',
      submitted: '2026-03-06 02:15 PM',
      status: 'pending'
    },
    {
      id: 'VR-003',
      name: 'Pedro Garcia',
      email: 'pedro@email.com',
      churchId: 'CH-2024-003',
      churchPosition: 'Trustee',
      occupation: 'Engineer',
      income: '45,000',
      submitted: '2026-03-05 09:00 AM',
      status: 'approved'
    },
    {
      id: 'VR-004',
      name: 'Ana Reyes',
      email: 'ana@email.com',
      churchId: 'CH-2024-004',
      churchPosition: 'Deacon',
      occupation: 'Accountant',
      income: '40,000',
      submitted: '2026-03-04 03:45 PM',
      status: 'approved'
    },
    {
      id: 'VR-005',
      name: 'Carlos Mendoza',
      email: 'carlos@email.com',
      churchId: 'CH-2024-005',
      churchPosition: 'Elder',
      occupation: 'Business Owner',
      income: '50,000',
      submitted: '2026-03-03 11:20 AM',
      status: 'rejected'
    }
  ]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const filteredRequests = requests.filter(request => {
    const query = searchQuery.toLowerCase();
    return (
      request.id.toLowerCase().includes(query) ||
      request.name.toLowerCase().includes(query) ||
      request.email.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredRequests.length / 5);
  const startIndex = (currentPage - 1) * 5;
  const endIndex = startIndex + 5;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
  };

  const handleApprove = () => {
    setRequests(prev => prev.map(r => 
      r.id === selectedRequest.id ? { ...r, status: 'approved' } : r
    ));
  };

  const handleReject = (reason) => {
    setRequests(prev => prev.map(r => 
      r.id === selectedRequest.id ? { ...r, status: 'rejected', rejectionReason: reason } : r
    ));
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'admin-offver-status-pending';
      case 'approved':
        return 'admin-offver-status-approved';
      case 'rejected':
        return 'admin-offver-status-rejected';
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="admin-offver-main">
      {/* Verification Details Modal */}
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
        <p className="admin-offver-subtitle">
          Review and approve Level 2 upgrade requests from members
        </p>
      </div>

      {/* Stats Cards */}
      <div className="admin-offver-stats">
        <div className="admin-offver-stat-card">
          <div className="admin-offver-stat-header">
            <span className="admin-offver-stat-label">Pending Review</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p25397b80} stroke="#F59E0B" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2c4f400} stroke="#F59E0B" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2f5eb900} stroke="#F59E0B" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-offver-stat-value admin-offver-stat-value-pending">{pendingCount}</p>
        </div>

        <div className="admin-offver-stat-card">
          <div className="admin-offver-stat-header">
            <span className="admin-offver-stat-label">Approved</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p17cc7980} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3fe63d80} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-offver-stat-value admin-offver-stat-value-approved">{approvedCount}</p>
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
          <p className="admin-offver-stat-value admin-offver-stat-value-rejected">{rejectedCount}</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="admin-offver-info">
        <div className="admin-offver-info-icon">
          <p>i</p>
        </div>
        <div className="admin-offver-info-content">
          <p className="admin-offver-info-text">
            <strong>About Verification Levels:</strong> Members start at Level 1 (Unverified). After members submit 
            verification documents, they appear in the pending list below. Once approved, members are promoted to 
            Level 2 (Verified). After verification approval, members gain access to the Loan module.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-offver-search-section">
        <div className="admin-offver-search-wrapper">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="admin-offver-search-icon">
            <circle cx="9" cy="9" r="6" stroke="#99A1AF" strokeWidth="1.5"/>
            <path d="M17 17L13.5 13.5" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by request ID, name, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="admin-offver-search-input"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="admin-offver-table-section">
        <table className="admin-offver-table">
          <thead>
            <tr className="admin-offver-table-header">
              <th className="admin-offver-table-header-cell">Request ID</th>
              <th className="admin-offver-table-header-cell">Name</th>
              <th className="admin-offver-table-header-cell">Email</th>
              <th className="admin-offver-table-header-cell">Church Position</th>
              <th className="admin-offver-table-header-cell">Occupation</th>
              <th className="admin-offver-table-header-cell">Submitted</th>
              <th className="admin-offver-table-header-cell">Status</th>
              <th className="admin-offver-table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-offver-table-cell admin-offver-empty">
                  No verification requests found
                </td>
              </tr>
            ) : (
              paginatedRequests.map(request => (
                <tr key={request.id} className="admin-offver-table-row">
                  <td className="admin-offver-table-cell">
                    <span className="admin-offver-request-id">{request.id}</span>
                  </td>
                  <td className="admin-offver-table-cell">{request.name}</td>
                  <td className="admin-offver-table-cell">{request.email}</td>
                  <td className="admin-offver-table-cell">{request.churchPosition}</td>
                  <td className="admin-offver-table-cell">{request.occupation}</td>
                  <td className="admin-offver-table-cell">{request.submitted}</td>
                  <td className="admin-offver-table-cell">
                    <span className={`admin-offver-status-badge ${getStatusBadgeClass(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </td>
                  <td className="admin-offver-table-cell">
                    <button
                      className="admin-offver-view-btn"
                      onClick={() => handleViewDetails(request)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-offver-pagination">
            <button
              className="admin-offver-pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`admin-offver-pagination-number ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="admin-offver-pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
