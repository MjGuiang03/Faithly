import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';

import useDebounce from '../../hooks/useDebounce';
import '../styles/loanAdminLoanManagement.css';

import API from '../../utils/api';
import { Banknote, CheckCircle, Circle, Edit, Search, X, XCircle } from 'lucide-react';

/* ── Loan-type config (mirrors user-side) ── */
const LOAN_TYPES = [
    { key: 'personal', name: 'Personal Loan', multiplier: 2, minTerm: 3, maxTerm: 12, rate: 0.02, rateLabel: '2% / mo', color: 'blue' },
    { key: 'emergency', name: 'Emergency Loan', multiplier: 1.5, minTerm: 1, maxTerm: 6, rate: 0.015, rateLabel: '1.5% / mo', color: 'amber' },
    { key: 'short-term', name: 'Short-Term Loan', multiplier: 1, minTerm: 1, maxTerm: 3, rate: 0.01, rateLabel: '1% / mo', color: 'teal' },
];

const fmt = (n) =>
    n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
};

/* ── Resolve status helpers ── */
function resolveStatusClass(status) {
    if (status === 'pending') return 'pending';
    if (status === 'awaiting_member_approval') return 'awaiting';
    if (status === 'active' || status === 'completed') return 'approved';
    if (status === 'rejected') return 'rejected';
    return 'pending';
}

function resolveStatusLabel(status) {
    if (status === 'pending') return 'Pending';
    if (status === 'awaiting_member_approval') return 'Awaiting Member';
    if (status === 'active' || status === 'completed') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function resolveStatusDesc(status) {
    if (status === 'pending') return 'Awaiting admin review';
    if (status === 'awaiting_member_approval') return 'Modified terms sent to member';
    if (status === 'active' || status === 'completed') return 'Loan has been approved';
    if (status === 'rejected') return 'Loan application rejected';
    return '';
}

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
    const [viewingImage, setViewingImage] = useState(null);

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
                if (res.status === 401 || res.status === 403) { navigate('/'); return; }
                toast.error(data.message || 'Failed to fetch loans');
                return;
            }

            setLoans(data.loans || []);
            setStats({
                pending: data.stats?.pending || 0,
                active: (data.stats?.active || 0) + (data.stats?.completed || 0),
                rejected: data.stats?.rejected || 0,
            });
        } catch (err) {
            toast.error('Network error. Could not load loans.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, navigate]);

    useEffect(() => { fetchLoans(); }, [fetchLoans]);
    useEffect(() => { setPage(1); }, [debouncedSearch]);

    /* ── Approve ── */
    const handleApprove = (loan) => {
        setSelectedLoan(loan);
        setShowApproveModal(true);
    };

    const confirmApprove = async () => {
        if (!selectedLoan) return;
        setActionLoading(selectedLoan._id);

        const amtDiff = Number(approvedAmount) !== Number(selectedLoan.amount);
        const termDiff = Number(repaymentTerm) !== Number(selectedLoan.termMonths);
        const termsModified = amtDiff || termDiff;

        try {
            const token = localStorage.getItem('adminToken');

            if (termsModified && !selectedLoan.memberApprovedTerms) {
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
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    const selectedType = selectedLoan
        ? LOAN_TYPES.find(t => t.key === selectedLoan.loanType) || LOAN_TYPES[0]
        : null;

    const maxLoanable = selectedType ? Math.max(0, memberSavings * selectedType.multiplier) : 0;

    /* ── Live calculation ── */
    const calc = useMemo(() => {
        const principal = Number(approvedAmount) || 0;
        const months = Number(repaymentTerm) || 0;
        if (!selectedType || principal <= 0 || months <= 0) return null;
        const totalInterest = principal * selectedType.rate * months;
        const totalRepayment = principal + totalInterest;
        const monthly = totalRepayment / months;
        return { principal, totalInterest, totalRepayment, monthly, months };
    }, [approvedAmount, repaymentTerm, selectedType]);

    /* ── Term options ── */
    const termOptions = selectedType
        ? Array.from({ length: selectedType.maxTerm - selectedType.minTerm + 1 }, (_, i) => selectedType.minTerm + i)
        : [];

    const filteredLoans = loans;
    const counts = stats;

    /* ── Status class helpers for the details modal ── */
    const detailStatusClass = selectedLoan ? resolveStatusClass(selectedLoan.status) : 'pending';
    const detailStatusLabel = selectedLoan ? resolveStatusLabel(selectedLoan.status) : '';
    const detailStatusDesc = selectedLoan ? resolveStatusDesc(selectedLoan.status) : '';

    /* ── Loan pill color helpers ── */
    const pillColorKey = selectedType?.color || 'blue';
    const pillColorMap = { blue: '', emergency: 'emergency', teal: 'short-term' };
    const pillClass = pillColorMap[pillColorKey] || '';

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

                {/* Search */}
                <div className="loan-admin-mgmt-search">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by member name or loan ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Table */}
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
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                        Loading loans…
                                    </td>
                                </tr>
                            ) : filteredLoans.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                        No loans found
                                    </td>
                                </tr>
                            ) : (
                                filteredLoans.map(loan => (
                                    <tr key={loan._id} onClick={() => handleViewDetails(loan)} style={{ cursor: 'pointer' }} className="loan-admin-mgmt-table-row-hover">
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

            {/* ══ Approve Confirm Modal ══ */}
            {showApproveModal && selectedLoan && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowApproveModal(false)}>
                    <div className="loan-admin-mgmt-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="loan-admin-mgmt-modal-icon approve">
                            <CheckCircle size={20} />
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
                            <button className="loan-admin-mgmt-modal-btn cancel" onClick={() => setShowApproveModal(false)}>Cancel</button>
                            <button className="loan-admin-mgmt-modal-btn approve" onClick={confirmApprove} disabled={!!actionLoading}>
                                {actionLoading ? <span className="btn-spinner" /> : 'Approve Loan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Reject Confirm Modal ══ */}
            {showRejectModal && selectedLoan && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="loan-admin-mgmt-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="loan-admin-mgmt-modal-icon reject">
                            <XCircle size={20} />
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
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="loan-admin-mgmt-modal-btn reject"
                                onClick={confirmReject}
                                disabled={!rejectReason.trim() || !!actionLoading}
                            >
                                {actionLoading ? <span className="btn-spinner" /> : 'Reject Loan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ DETAILS MODAL — HTML reference layout ══════════ */}
            {showDetailsModal && selectedLoan && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowDetailsModal(false)}>
                    <div className="loan-admin-mgmt-modal details-modal" onClick={(e) => e.stopPropagation()}>

                        {/* ── Header ── */}
                        <div className="dm-header">
                            <div className="dm-header-left">
                                <p className="dm-title">Loan Details</p>
                                <p className="dm-req-id">Request ID: {selectedLoan.loanId}</p>
                            </div>
                            <button className="dm-x-btn" onClick={() => setShowDetailsModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="dm-body">

                            {/* Status Row */}
                            <div className={`dm-status-row ${detailStatusClass}`}>
                                <div className="dm-status-left">
                                    <div className={`dm-sdot ${detailStatusClass}`} />
                                    <span className={`dm-slabel ${detailStatusClass}`}>Status</span>
                                    <span className={`loan-admin-mgmt-status-badge ${detailStatusClass === 'awaiting' ? 'pending' : detailStatusClass
                                        }`}>
                                        {detailStatusLabel}
                                    </span>
                                </div>
                                <span className={`dm-status-right ${detailStatusClass}`}>
                                    {detailStatusDesc}
                                </span>
                            </div>

                            {/* Member Information */}
                            <div>
                                <div className="dm-sec-label">Member information</div>
                                <div className="dm-info-grid">
                                    <div className="dm-ic">
                                        <div className="dm-ik">Member name</div>
                                        <div className="dm-iv">{selectedLoan.memberName}</div>
                                    </div>
                                    <div className="dm-ic">
                                        <div className="dm-ik">Email address</div>
                                        <div className="dm-iv email">{selectedLoan.email}</div>
                                    </div>
                                    <div className="dm-ic">
                                        <div className="dm-ik">Applied date</div>
                                        <div className="dm-iv">{fmtDate(selectedLoan.appliedDate)}</div>
                                    </div>
                                    <div className="dm-ic">
                                        <div className="dm-ik">Member savings balance</div>
                                        <div className="dm-iv green">{fmt(memberSavings)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Requested Loan Type */}
                            <div>
                                <div className="dm-sec-label">Requested loan type</div>
                                <div className={`dm-loan-pill ${pillClass}`}>
                                    <div className="dm-lt-icon">
                                        <Banknote size={20} />
                                    </div>
                                    <div>
                                        <div className={`dm-lt-name ${pillClass}`}>
                                            {selectedType?.name || 'Personal Loan'}
                                        </div>
                                        <div className="dm-lt-tags">
                                            <span className={`dm-lt-tag ${pillClass}`}>{selectedType?.multiplier || 2}× savings</span>
                                            <span className={`dm-lt-tag ${pillClass}`}>{selectedType?.rateLabel || '2% / mo'}</span>
                                            <span className={`dm-lt-tag ${pillClass}`}>{selectedType?.minTerm || 3}–{selectedType?.maxTerm || 12} months</span>
                                        </div>
                                    </div>
                                    <div className="dm-lt-amt">
                                        <div className="dm-lt-amt-label">Requested amount</div>
                                        <div className={`dm-lt-amt-val ${pillClass}`}>{fmt(selectedLoan.amount)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Admin — set repayment terms */}
                            <div className="dm-edit-box">
                                <div className="dm-edit-box-title">
                                    <Edit size={20} />
                                    Admin — set repayment terms
                                </div>
                                <div className="dm-edit-row">
                                    <div className="dm-edit-field">
                                        <label className="dm-edit-label">Approved amount (₱)</label>
                                        <input
                                            className="dm-edit-input"
                                            type="number"
                                            value={approvedAmount}
                                            onChange={(e) => setApprovedAmount(e.target.value)}
                                            min="500"
                                            max={maxLoanable || undefined}
                                        />
                                        {maxLoanable > 0 && (
                                            <div className="dm-edit-hint">
                                                Max loanable: {fmt(maxLoanable)} ({selectedType?.multiplier}× savings)
                                            </div>
                                        )}
                                    </div>
                                    <div className="dm-edit-field">
                                        <label className="dm-edit-label">Repayment term</label>
                                        <select
                                            className="dm-edit-select"
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
                                {calc && (
                                    <div className="dm-computed">
                                        <div className="dm-computed-pill">
                                            <div className="dm-cp-label">Monthly payment</div>
                                            <div className="dm-cp-val">{fmt(calc.monthly)}</div>
                                        </div>
                                        <div className="dm-computed-pill">
                                            <div className="dm-cp-label">Total interest</div>
                                            <div className="dm-cp-val amber">{fmt(calc.totalInterest)}</div>
                                        </div>
                                        <div className="dm-computed-pill">
                                            <div className="dm-cp-label">Total repayment</div>
                                            <div className="dm-cp-val green">{fmt(calc.totalRepayment)}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Disbursement Method */}
                            <div>
                                <div className="dm-sec-label">Disbursement method</div>
                                <div className="dm-disbursement-row">
                                    {[
                                        { id: 'cash', label: 'Cash (office)' },
                                        { id: 'gcash', label: 'GCash' },
                                        { id: 'bank', label: 'Bank Transfer' },
                                    ].map(opt => {
                                        const active = selectedLoan.disbursementMethod === opt.id;
                                        return (
                                            <div key={opt.id} className={`dm-dopt ${active ? 'sel' : ''}`}>
                                                <div className={`dm-rdot ${active ? 'on' : ''}`} />
                                                <span className="dm-dlabel">{opt.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {selectedLoan.disbursementAccount && (
                                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                                        Account: {selectedLoan.disbursementAccount}
                                    </p>
                                )}
                            </div>

                            {/* Uploaded Documents */}
                            <div>
                                <div className="dm-sec-label">Uploaded documents</div>
                                <div className="dm-docs-grid">
                                    {/* Selfie with ID */}
                                    <div className="dm-doc-card">
                                        <div className="dm-doc-placeholder" onClick={() => selectedLoan.selfieData && setViewingImage(selectedLoan.selfieData)} style={selectedLoan.selfieData ? { cursor: 'pointer' } : {}}>
                                            {selectedLoan.selfieData ? (
                                                <img src={selectedLoan.selfieData} alt="Selfie with ID" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                            ) : (
                                                <>
                                                    <Banknote size={20} />
                                                    <span>{selectedLoan.selfieFileName || 'No file uploaded'}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="dm-doc-footer">
                                            <span className="dm-doc-name">Selfie with ID & Date</span>
                                            <div className="dm-doc-actions">
                                                <span className={`dm-doc-badge ${selectedLoan.selfieData ? 'ok' : 'missing'}`}>
                                                    {selectedLoan.selfieData ? 'Uploaded' : 'Not uploaded'}
                                                </span>
                                                {selectedLoan.selfieData && (
                                                    <button type="button" className="dm-doc-view" onClick={() => setViewingImage(selectedLoan.selfieData)}>View</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Government ID */}
                                    <div className="dm-doc-card">
                                        <div className="dm-doc-placeholder" onClick={() => selectedLoan.idData && setViewingImage(selectedLoan.idData)} style={selectedLoan.idData ? { cursor: 'pointer' } : {}}>
                                            {selectedLoan.idData ? (
                                                <img src={selectedLoan.idData} alt="Government ID" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                            ) : (
                                                <>
                                                    <Banknote size={20} />
                                                    <span>{selectedLoan.idFileName || 'No file uploaded'}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="dm-doc-footer">
                                            <span className="dm-doc-name">Valid Government ID</span>
                                            <div className="dm-doc-actions">
                                                <span className={`dm-doc-badge ${selectedLoan.idData ? 'ok' : 'missing'}`}>
                                                    {selectedLoan.idData ? 'Uploaded' : 'Not uploaded'}
                                                </span>
                                                {selectedLoan.idData && (
                                                    <button type="button" className="dm-doc-view" onClick={() => setViewingImage(selectedLoan.idData)}>View</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* System Note */}
                            <div className="dm-note-box">
                                <div className="dm-note-title">System note</div>
                                <div className="dm-note-text">
                                    Application will be reviewed within 2–3 business days. A late payment penalty of 3% per month applies after a 3-day grace period.
                                </div>
                            </div>

                        </div>{/* end dm-body */}

                        {/* ── Footer ── */}
                        <div className="dm-footer">
                            <span className="dm-footer-meta">
                                Applied {fmtDate(selectedLoan.appliedDate)} ·{' '}
                                {selectedLoan.status === 'pending'
                                    ? 'Pending review'
                                    : selectedLoan.status === 'awaiting_member_approval'
                                        ? 'Awaiting member response'
                                        : detailStatusLabel}
                            </span>
                            <div className="dm-footer-actions">
                                <button className="dm-btn-close" onClick={() => setShowDetailsModal(false)}>
                                    Close
                                </button>

                                {selectedLoan.status === 'awaiting_member_approval' && (
                                    <span className="dm-awaiting-tag">⏳ Waiting for member approval</span>
                                )}

                                {selectedLoan.status === 'pending' && (
                                    <>
                                        <button
                                            className="dm-btn-reject"
                                            onClick={() => { setShowDetailsModal(false); handleReject(selectedLoan); }}
                                        >
                                            Reject Request
                                        </button>
                                        <button
                                            className="dm-btn-approve"
                                            onClick={() => { setShowDetailsModal(false); handleApprove(selectedLoan); }}
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

            {/* ══ Image Lightbox ══ */}
            {viewingImage && (
                <div className="loan-admin-mgmt-modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 1100 }}>
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingImage(null)}
                            style={{
                                position: 'absolute', top: -12, right: -12, width: 32, height: 32,
                                borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 1101, boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                        >
                            <Circle size={20} />
                        </button>
                        <img
                            src={viewingImage}
                            alt="Document"
                            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}