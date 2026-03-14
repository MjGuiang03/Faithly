import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import svgPaths from "../../imports/svg-icons";
import '../styles/loanAdminLoanManagement.css';

import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
};

export default function LoanAdminLoanManagement() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [loans, setLoans] = useState([]);
    const [stats, setStats] = useState({ pending: 0, active: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    /* ── Fetch loans from API ── */
    const fetchLoans = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set('search', searchQuery.trim());

            const res = await fetch(`${API}/api/admin/loans?${params}`, {
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

            setLoans(data.loans || []);
            setStats({
                pending:  data.stats?.pending  || 0,
                active:   (data.stats?.active || 0) + (data.stats?.completed || 0),
                rejected: data.stats?.rejected || 0,
            });
        } catch (err) {
            toast.error('Network error. Could not load loans.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, navigate]);

    useEffect(() => { fetchLoans(); }, [fetchLoans]);

    /* debounce search */
    useEffect(() => {
        const t = setTimeout(() => fetchLoans(), 400);
        return () => clearTimeout(t);
    }, [searchQuery, fetchLoans]);

    /* ── Approve ── */
    const handleApprove = (loan) => {
        setSelectedLoan(loan);
        setShowApproveModal(true);
    };

    const confirmApprove = async () => {
        if (!selectedLoan) return;
        setActionLoading(selectedLoan._id);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/loans/${selectedLoan._id}/approve`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.message || 'Failed to approve'); return; }
            toast.success(`Loan ${selectedLoan.loanId} approved`);
            setShowApproveModal(false);
            setSelectedLoan(null);
            fetchLoans();
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    /* ── Reject ── */
    const handleReject = (loan) => {
        setSelectedLoan(loan);
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!selectedLoan) return;
        setActionLoading(selectedLoan._id);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/loans/${selectedLoan._id}/reject`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rejectionReason: rejectReason }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.message || 'Failed to reject'); return; }
            toast.success(`Loan ${selectedLoan.loanId} rejected`);
            setShowRejectModal(false);
            setSelectedLoan(null);
            setRejectReason('');
            fetchLoans();
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    /* ── View Details ── */
    const handleViewDetails = (loan) => {
        setSelectedLoan(loan);
        setShowDetailsModal(true);
    };

    const filteredLoans = loans;
    const counts = stats;

    return (
        <div className="loan-admin-mgmt-page">
            <LoanAdminSidebar />

            <div className="loan-admin-mgmt-content">
                {/* Header */}
                <div className="loan-admin-mgmt-header">
                    <h1 className="loan-admin-mgmt-title">Loan Management</h1>
                    <p className="loan-admin-mgmt-subtitle">Review and approve loan applications</p>
                </div>

                {/* Status Cards */}
                <div className="loan-admin-mgmt-stats">
                    <div className="loan-admin-mgmt-stat-card">
                        <p className="loan-admin-mgmt-stat-label">Pending Review</p>
                        <p className="loan-admin-mgmt-stat-value pending">{counts.pending}</p>
                    </div>
                    <div className="loan-admin-mgmt-stat-card">
                        <p className="loan-admin-mgmt-stat-label">Approved</p>
                        <p className="loan-admin-mgmt-stat-value approved">{counts.active}</p>
                    </div>
                    <div className="loan-admin-mgmt-stat-card">
                        <p className="loan-admin-mgmt-stat-label">Rejected</p>
                        <p className="loan-admin-mgmt-stat-value rejected">{counts.rejected}</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="loan-admin-mgmt-search">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d={svgPaths.p319f7900} stroke="#9CA3AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p14d6c680} stroke="#9CA3AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by member name or loan ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Loans Table */}
                <div className="loan-admin-mgmt-table-container">
                    <table className="loan-admin-mgmt-table">
                        <thead>
                            <tr>
                                <th>Loan ID</th>
                                <th>Member</th>
                                <th>Amount</th>
                                <th>Purpose</th>
                                <th>Applied Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                        Loading loans…
                                    </td>
                                </tr>
                            ) : filteredLoans.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                        No loans found
                                    </td>
                                </tr>
                            ) : (
                                filteredLoans.map(loan => (
                                    <tr key={loan._id}>
                                        <td className="loan-admin-mgmt-table-id">{loan.loanId}</td>
                                        <td>
                                            <div className="loan-admin-mgmt-table-member">
                                                <p className="loan-admin-mgmt-table-member-name">{loan.memberName}</p>
                                                <p className="loan-admin-mgmt-table-member-email">{loan.email}</p>
                                            </div>
                                        </td>
                                        <td className="loan-admin-mgmt-table-amount">{fmt(loan.amount)}</td>
                                        <td>{loan.purpose}</td>
                                        <td>{fmtDate(loan.appliedDate)}</td>
                                        <td>
                                            {loan.status === 'pending' && (
                                                <span className="loan-admin-mgmt-status-badge pending">Pending</span>
                                            )}
                                            {(loan.status === 'active' || loan.status === 'completed') && (
                                                <span className="loan-admin-mgmt-status-badge approved">Approved</span>
                                            )}
                                            {loan.status === 'rejected' && (
                                                <div className="loan-admin-mgmt-status-rejected">
                                                    <span className="loan-admin-mgmt-status-badge rejected">Rejected</span>
                                                    {loan.rejectionReason && (
                                                        <p className="loan-admin-mgmt-rejection-reason">
                                                            Reason: {loan.rejectionReason}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="loan-admin-mgmt-actions">
                                                <button
                                                    className="loan-admin-mgmt-btn-details"
                                                    onClick={() => handleViewDetails(loan)}
                                                >
                                                    View Details
                                                </button>
                                                {loan.status === 'pending' && (
                                                    <button
                                                        className="loan-admin-mgmt-btn-approve"
                                                        onClick={() => handleApprove(loan)}
                                                        disabled={actionLoading === loan._id}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                            <path d={svgPaths.p2ba21180} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                                            <path d={svgPaths.p12d41400} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                                        </svg>
                                                        {actionLoading === loan._id ? 'Processing…' : 'Approve'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="loan-admin-mgmt-pagination">
                    <p className="loan-admin-mgmt-pagination-info">Showing {filteredLoans.length} results</p>
                </div>
            </div>

            {/* Approve Modal */}
            {showApproveModal && selectedLoan && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowApproveModal(false)}>
                    <div className="loan-admin-mgmt-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="loan-admin-mgmt-modal-icon approve">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d={svgPaths.p3800c80} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                                <path d={svgPaths.p25f54600} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                            </svg>
                        </div>
                        <h2 className="loan-admin-mgmt-modal-title">Approve Loan?</h2>
                        <p className="loan-admin-mgmt-modal-text">
                            Are you sure you want to approve loan <strong>{selectedLoan.loanId}</strong> for {selectedLoan.memberName}?
                        </p>
                        <div className="loan-admin-mgmt-modal-details">
                            <p><strong>Amount:</strong> {fmt(selectedLoan.amount)}</p>
                            <p><strong>Purpose:</strong> {selectedLoan.purpose}</p>
                        </div>
                        <div className="loan-admin-mgmt-modal-actions">
                            <button
                                className="loan-admin-mgmt-modal-btn cancel"
                                onClick={() => setShowApproveModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="loan-admin-mgmt-modal-btn approve"
                                onClick={confirmApprove}
                                disabled={!!actionLoading}
                            >
                                {actionLoading ? 'Approving…' : 'Approve Loan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedLoan && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="loan-admin-mgmt-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="loan-admin-mgmt-modal-icon reject">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M20 12L12 20" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                                <path d="M12 12L20 20" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                            </svg>
                        </div>
                        <h2 className="loan-admin-mgmt-modal-title">Reject Loan?</h2>
                        <p className="loan-admin-mgmt-modal-text">
                            Are you sure you want to reject loan <strong>{selectedLoan.loanId}</strong> for {selectedLoan.memberName}?
                        </p>
                        <div className="loan-admin-mgmt-modal-details">
                            <p><strong>Amount:</strong> {fmt(selectedLoan.amount)}</p>
                            <p><strong>Purpose:</strong> {selectedLoan.purpose}</p>
                        </div>
                        <div className="loan-admin-mgmt-modal-form">
                            <label className="loan-admin-mgmt-modal-label">
                                Rejection Reason <span className="required">*</span>
                            </label>
                            <textarea
                                className="loan-admin-mgmt-modal-textarea"
                                placeholder="e.g., Incomplete requirements, Insufficient documents..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={4}
                            />
                            <p className="loan-admin-mgmt-modal-hint">This reason will be visible to the member and other admins.</p>
                        </div>
                        <div className="loan-admin-mgmt-modal-actions">
                            <button
                                className="loan-admin-mgmt-modal-btn cancel"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="loan-admin-mgmt-modal-btn reject"
                                onClick={confirmReject}
                                disabled={!rejectReason.trim() || !!actionLoading}
                            >
                                {actionLoading ? 'Rejecting…' : 'Reject Loan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedLoan && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="loan-admin-mgmt-modal large" onClick={(e) => e.stopPropagation()}>
                        <button className="loan-admin-mgmt-modal-close" onClick={() => setShowDetailsModal(false)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                <path d="M6 6L18 18" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </button>
                        <h2 className="loan-admin-mgmt-modal-title">Loan Details</h2>
                        <p className="loan-admin-mgmt-modal-subtitle">Request ID: {selectedLoan.loanId}</p>

                        <div className="loan-admin-mgmt-details-content">
                            <div className="loan-admin-mgmt-details-section">
                                <h3 className="loan-admin-mgmt-details-heading">Member Information</h3>
                                <div className="loan-admin-mgmt-details-grid">
                                    <div className="loan-admin-mgmt-details-item">
                                        <p className="loan-admin-mgmt-details-label">Member Name</p>
                                        <p className="loan-admin-mgmt-details-value">{selectedLoan.memberName}</p>
                                    </div>
                                    <div className="loan-admin-mgmt-details-item">
                                        <p className="loan-admin-mgmt-details-label">Email</p>
                                        <p className="loan-admin-mgmt-details-value">{selectedLoan.email}</p>
                                    </div>
                                    <div className="loan-admin-mgmt-details-item">
                                        <p className="loan-admin-mgmt-details-label">Amount</p>
                                        <p className="loan-admin-mgmt-details-value">{fmt(selectedLoan.amount)}</p>
                                    </div>
                                    <div className="loan-admin-mgmt-details-item">
                                        <p className="loan-admin-mgmt-details-label">Purpose</p>
                                        <p className="loan-admin-mgmt-details-value">{selectedLoan.purpose}</p>
                                    </div>
                                    <div className="loan-admin-mgmt-details-item">
                                        <p className="loan-admin-mgmt-details-label">Applied Date</p>
                                        <p className="loan-admin-mgmt-details-value">{fmtDate(selectedLoan.appliedDate)}</p>
                                    </div>
                                    <div className="loan-admin-mgmt-details-item">
                                        <p className="loan-admin-mgmt-details-label">Status</p>
                                        <p className="loan-admin-mgmt-details-value">
                                            <span className={`loan-admin-mgmt-status-badge ${selectedLoan.status}`}>
                                                {selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1)}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedLoan.status === 'pending' && (
                            <div className="loan-admin-mgmt-modal-actions">
                                <button
                                    className="loan-admin-mgmt-modal-btn-full reject"
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        handleReject(selectedLoan);
                                    }}
                                >
                                    Reject Request
                                </button>
                                <button
                                    className="loan-admin-mgmt-modal-btn-full approve"
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        handleApprove(selectedLoan);
                                    }}
                                >
                                    Approve Loan
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
