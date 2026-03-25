import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import svgPaths from "../../imports/svg-icons";
import useDebounce from '../../hooks/useDebounce';
import '../styles/loanAdminLoanManagement.css';

import API from '../../utils/api';

/* ── Loan-type config (mirrors user-side) ── */
const LOAN_TYPES = [
  { key: 'personal',   name: 'Personal Loan',   multiplier: 2,   minTerm: 3,  maxTerm: 12, rate: 0.02,  rateLabel: '2% / mo',   color: 'blue' },
  { key: 'emergency',  name: 'Emergency Loan',  multiplier: 1.5, minTerm: 1,  maxTerm: 6,  rate: 0.015, rateLabel: '1.5% / mo', color: 'amber' },
  { key: 'short-term', name: 'Short-Term Loan', multiplier: 1,   minTerm: 1,  maxTerm: 3,  rate: 0.01,  rateLabel: '1% / mo',   color: 'teal' },
];

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

export default function LoanAdminLoanManagement() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 400);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [loans, setLoans] = useState([]);
    const [stats, setStats] = useState({ pending: 0, active: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [page, setPage] = useState(1);
    const LIMIT = 10;

    /* ── Details modal extra state ── */
    const [memberSavings, setMemberSavings] = useState(0);
    const [approvedAmount, setApprovedAmount] = useState('');
    const [repaymentTerm, setRepaymentTerm] = useState('');

    /* ── Fetch loans from API ── */
    const fetchLoans = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const params = new URLSearchParams();
            params.set('page', page);
            params.set('limit', LIMIT);
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

            const res = await fetch(`${API}/api/admin/loans?${params}`, {
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
    }, [page, debouncedSearch, navigate]);

    useEffect(() => { fetchLoans(); }, [fetchLoans]);

    /* Reset page on search change */
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    /* ── Approve ── */
    const handleApprove = (loan) => {
        setSelectedLoan(loan);
        setShowApproveModal(true);
    };

    const confirmApprove = async () => {
        if (!selectedLoan) return;
        setActionLoading(selectedLoan._id);

        // Check if admin modified the terms
        const amtDiff = Number(approvedAmount) !== Number(selectedLoan.amount);
        const termDiff = Number(repaymentTerm) !== Number(selectedLoan.termMonths);
        const termsModified = amtDiff || termDiff;

        try {
            const token = localStorage.getItem('adminToken');

            if (termsModified && !selectedLoan.memberApprovedTerms) {
                // Propose modified terms → user must agree first
                const res = await fetch(`${API}/api/admin/loans/${selectedLoan._id}/propose-terms`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        approvedAmount: Number(approvedAmount),
                        repaymentTerm: Number(repaymentTerm),
                        monthlyPayment: calc?.monthly || 0,
                        totalInterest: calc?.totalInterest || 0,
                        totalRepayment: calc?.totalRepayment || 0,
                    }),
                });
                const data = await res.json();
                if (!res.ok) { toast.error(data.message || 'Failed to propose terms'); return; }
                toast.success('Modified terms sent to member for approval');
            } else {
                // Direct approve (terms unchanged or member already agreed)
                const res = await fetch(`${API}/api/admin/loans/${selectedLoan._id}/approve`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) { toast.error(data.message || 'Failed to approve'); return; }
                toast.success(`Loan ${selectedLoan.loanId} approved`);
            }

            setShowApproveModal(false);
            setShowDetailsModal(false);
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
            setShowDetailsModal(false);
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
    const handleViewDetails = async (loan) => {
        setSelectedLoan(loan);
        setApprovedAmount(String(loan.amount || ''));
        setRepaymentTerm(String(loan.termMonths || ''));
        setShowDetailsModal(true);

        // Fetch member savings
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/member-savings?email=${encodeURIComponent(loan.email)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setMemberSavings(data.totalSavings || 0);
        } catch { /* silent */ }
    };

    /* ── Derived loan-type info ── */
    const selectedType = selectedLoan ? LOAN_TYPES.find(t => t.key === selectedLoan.loanType) || LOAN_TYPES[0] : null;

    const maxLoanable = selectedType
        ? Math.max(0, memberSavings * selectedType.multiplier)
        : 0;

    /* ── Live calculation for admin terms ── */
    const calc = useMemo(() => {
        const principal = Number(approvedAmount) || 0;
        const months = Number(repaymentTerm) || 0;
        if (!selectedType || principal <= 0 || months <= 0) return null;
        const totalInterest = principal * selectedType.rate * months;
        const totalRepayment = principal + totalInterest;
        const monthly = totalRepayment / months;
        return { principal, totalInterest, totalRepayment, monthly, months };
    }, [approvedAmount, repaymentTerm, selectedType]);

    /* ── Term options for selected type ── */
    const termOptions = selectedType
        ? Array.from({ length: selectedType.maxTerm - selectedType.minTerm + 1 }, (_, i) => selectedType.minTerm + i)
        : [];

    const filteredLoans = loans;
    const counts = stats;

    return (
        <div className="loan-admin-mgmt-page">
            <LoanAdminSidebar />

            <div className="loan-admin-mgmt-content">
                {/* Header */}
                <div className="loan-admin-mgmt-header">
                    <h1 className="loan-admin-mgmt-title">Loan Management</h1>
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
                                            {loan.status === 'awaiting_member_approval' && (
                                                <span className="loan-admin-mgmt-status-badge pending">Awaiting Member</span>
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

            {/* ══════════ REDESIGNED Details Modal ══════════ */}
            {showDetailsModal && selectedLoan && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="loan-admin-mgmt-modal details-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Close */}
                        <button className="loan-admin-mgmt-modal-close" onClick={() => setShowDetailsModal(false)}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M15 5L5 15" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                <path d="M5 5L15 15" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </button>

                        {/* Header */}
                        <h2 className="ld-title">Loan Details</h2>
                        <p className="ld-request-id">Request ID: {selectedLoan.loanId}</p>

                        {/* Status Row */}
                        <div className="ld-status-row">
                            <div className="ld-status-left">
                                <span className="ld-status-dot" data-status={selectedLoan.status} />
                                <span className={`loan-admin-mgmt-status-badge ${selectedLoan.status === 'awaiting_member_approval' ? 'pending' : selectedLoan.status}`}>
                                    {selectedLoan.status === 'pending' ? 'Pending' :
                                     selectedLoan.status === 'awaiting_member_approval' ? 'Awaiting Member' :
                                     selectedLoan.status === 'active' || selectedLoan.status === 'completed' ? 'Approved' :
                                     selectedLoan.status === 'rejected' ? 'Rejected' :
                                     selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1)}
                                </span>
                            </div>
                            <span className="ld-status-desc">
                                {selectedLoan.status === 'pending' && 'Awaiting admin review'}
                                {selectedLoan.status === 'awaiting_member_approval' && 'Modified terms sent to member — awaiting their response'}
                                {(selectedLoan.status === 'active' || selectedLoan.status === 'completed') && 'Loan has been approved'}
                                {selectedLoan.status === 'rejected' && 'Loan application rejected'}
                            </span>
                        </div>

                        {/* ── Member Information ── */}
                        <div className="ld-section">
                            <h3 className="ld-section-title">MEMBER INFORMATION</h3>
                            <div className="ld-info-grid">
                                <div className="ld-info-item">
                                    <span className="ld-info-label">Member name</span>
                                    <span className="ld-info-value ld-info-value--bold">{selectedLoan.memberName}</span>
                                </div>
                                <div className="ld-info-item">
                                    <span className="ld-info-label">Email address</span>
                                    <span className="ld-info-value ld-info-value--email">{selectedLoan.email}</span>
                                </div>
                                <div className="ld-info-item">
                                    <span className="ld-info-label">Applied date</span>
                                    <span className="ld-info-value ld-info-value--bold">{fmtDate(selectedLoan.appliedDate)}</span>
                                </div>
                                <div className="ld-info-item">
                                    <span className="ld-info-label">Member savings balance</span>
                                    <span className="ld-info-value ld-info-value--bold ld-info-value--green">{fmt(memberSavings)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Requested Loan Type ── */}
                        <div className="ld-section">
                            <h3 className="ld-section-title">REQUESTED LOAN TYPE</h3>
                            <div className="ld-loan-type-card" data-color={selectedType?.color || 'blue'}>
                                <div className="ld-loan-type-left">
                                    <div className="ld-loan-type-icon" data-color={selectedType?.color || 'blue'}>
                                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
                                            <path d="M10 6.5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="ld-loan-type-name">{selectedLoan.purpose || 'Personal Loan'}</div>
                                        <div className="ld-loan-type-tags">
                                            <span className="ld-tag">{selectedType?.multiplier || 2}× savings</span>
                                            <span className="ld-tag">{selectedType?.rateLabel || '2% / mo'}</span>
                                            <span className="ld-tag">{selectedType?.minTerm || 3}–{selectedType?.maxTerm || 12} months</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="ld-loan-type-right">
                                    <span className="ld-loan-type-amount-label">Requested amount</span>
                                    <span className="ld-loan-type-amount">{fmt(selectedLoan.amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Admin — set repayment terms ── */}
                        <div className="ld-section">
                            <h3 className="ld-section-title">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                                    <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L5.333 13.333 2 14l.667-3.333L11.333 2z" stroke="#F59E0B" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Admin — set repayment terms
                            </h3>
                            <div className="ld-admin-terms-row">
                                <div className="ld-admin-terms-group">
                                    <label className="ld-admin-terms-label">Approved amount (₱)</label>
                                    <input
                                        type="number"
                                        className="ld-admin-terms-input"
                                        value={approvedAmount}
                                        onChange={(e) => setApprovedAmount(e.target.value)}
                                        min="500"
                                        max={maxLoanable || undefined}
                                    />
                                    {maxLoanable > 0 && (
                                        <span className="ld-admin-terms-hint">Max loanable: {fmt(maxLoanable)} ({selectedType?.multiplier}× savings)</span>
                                    )}
                                </div>
                                <div className="ld-admin-terms-group">
                                    <label className="ld-admin-terms-label">Repayment term</label>
                                    <select
                                        className="ld-admin-terms-select"
                                        value={repaymentTerm}
                                        onChange={(e) => setRepaymentTerm(e.target.value)}
                                    >
                                        <option value="">Select term</option>
                                        {termOptions.map(m => (
                                            <option key={m} value={m}>{m} months</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Calculation results */}
                            {calc && (
                                <div className="ld-calc-results">
                                    <div className="ld-calc-card">
                                        <span className="ld-calc-card-label">Monthly payment</span>
                                        <span className="ld-calc-card-value ld-calc-card-value--blue">{fmt(calc.monthly)}</span>
                                    </div>
                                    <div className="ld-calc-card">
                                        <span className="ld-calc-card-label">Total interest</span>
                                        <span className="ld-calc-card-value ld-calc-card-value--amber">{fmt(calc.totalInterest)}</span>
                                    </div>
                                    <div className="ld-calc-card">
                                        <span className="ld-calc-card-label">Total repayment</span>
                                        <span className="ld-calc-card-value ld-calc-card-value--green">{fmt(calc.totalRepayment)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Disbursement Method ── */}
                        <div className="ld-section">
                            <h3 className="ld-section-title">DISBURSEMENT METHOD</h3>
                            <div className="ld-disbursement-options">
                                {[
                                    { id: 'cash', label: 'Cash (office)' },
                                    { id: 'gcash', label: 'GCash' },
                                    { id: 'bank', label: 'Bank Transfer' },
                                ].map(opt => (
                                    <div
                                        key={opt.id}
                                        className={`ld-disbursement-btn ${selectedLoan.disbursementMethod === opt.id ? 'ld-disbursement-btn--active' : ''}`}
                                    >
                                        <div className={`ld-disbursement-radio ${selectedLoan.disbursementMethod === opt.id ? 'active' : ''}`} />
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                            {selectedLoan.disbursementAccount && (
                                <p className="ld-disbursement-account">Account: {selectedLoan.disbursementAccount}</p>
                            )}
                        </div>

                        {/* ── Uploaded Documents ── */}
                        <div className="ld-section">
                            <h3 className="ld-section-title">UPLOADED DOCUMENTS</h3>
                            <div className="ld-docs-grid">
                                <div className="ld-doc-card">
                                    <div className="ld-doc-preview">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D1D5DB" strokeWidth="1.5" />
                                            <circle cx="8.5" cy="8.5" r="2" stroke="#D1D5DB" strokeWidth="1.5" />
                                            <path d="M3 16l4-4a2 2 0 012.8 0L15 17" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M14 14l1-1a2 2 0 012.8 0L21 16" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <p className="ld-doc-filename">selfie_with_id.jpg</p>
                                        <p className="ld-doc-hint">Click to view full image</p>
                                    </div>
                                    <div className="ld-doc-info">
                                        <span className="ld-doc-name">Selfie with ID & Date</span>
                                        <div className="ld-doc-actions-row">
                                            <span className="ld-doc-status uploaded">Uploaded</span>
                                            <button type="button" className="ld-doc-view-btn">View</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="ld-doc-card">
                                    <div className="ld-doc-preview">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#D1D5DB" strokeWidth="1.5" />
                                            <circle cx="8.5" cy="8.5" r="2" stroke="#D1D5DB" strokeWidth="1.5" />
                                            <path d="M3 16l4-4a2 2 0 012.8 0L15 17" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M14 14l1-1a2 2 0 012.8 0L21 16" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <p className="ld-doc-filename">government_id.jpg</p>
                                        <p className="ld-doc-hint">Click to view full image</p>
                                    </div>
                                    <div className="ld-doc-info">
                                        <span className="ld-doc-name">Valid Government ID</span>
                                        <div className="ld-doc-actions-row">
                                            <span className="ld-doc-status uploaded">Uploaded</span>
                                            <button type="button" className="ld-doc-view-btn">View</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── System Note ── */}
                        <div className="ld-system-note">
                            <p className="ld-system-note-title">System note</p>
                            <p className="ld-system-note-text">
                                Application will be reviewed within 2–3 business days. A late payment penalty of 3% per month applies after a 3-day grace period.
                            </p>
                        </div>

                        {/* ── Footer ── */}
                        <div className="ld-footer">
                            <span className="ld-footer-meta">
                                Applied {fmtDate(selectedLoan.appliedDate)} · {selectedLoan.status === 'pending' ? 'Pending review' : selectedLoan.status === 'awaiting_member_approval' ? 'Awaiting member response' : selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1)}
                            </span>
                            <div className="ld-footer-actions">
                                <button
                                    className="ld-footer-btn ld-footer-btn--close"
                                    onClick={() => setShowDetailsModal(false)}
                                >
                                    Close
                                </button>
                                {selectedLoan.status === 'awaiting_member_approval' && (
                                    <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 500, alignSelf: 'center' }}>⏳ Waiting for member approval</span>
                                )}
                                {selectedLoan.status === 'pending' && (
                                    <>
                                        <button
                                            className="ld-footer-btn ld-footer-btn--reject"
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                handleReject(selectedLoan);
                                            }}
                                        >
                                            Reject Request
                                        </button>
                                        <button
                                            className="ld-footer-btn ld-footer-btn--approve"
                                            onClick={() => {
                                                setShowDetailsModal(false);
                                                handleApprove(selectedLoan);
                                            }}
                                            disabled={!!actionLoading}
                                        >
                                            Approve Loan
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
