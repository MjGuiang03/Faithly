import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import DSSPanel from '../components/DSSPanel';

import useDebounce from '../../hooks/useDebounce';
import '../styles/loanAdminLoanManagement.css';

import API from '../../utils/api';
import { CheckCircle, Circle, Search, X, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { performOCRScan } from '../../utils/ocrProcessor';


/* ── Loan-type config (mirrors user-side) ── */
const LOAN_TYPES = [
    { key: 'personal', name: 'Personal Loan', multiplier: 2, minTerm: 3, maxTerm: 12, rate: 0.02, rateLabel: '2% / mo', color: 'blue' },
    { key: 'emergency', name: 'Emergency Loan', multiplier: 1.5, minTerm: 1, maxTerm: 6, rate: 0.015, rateLabel: '1.5% / mo', color: 'amber' },
    { key: 'short-term', name: 'Short-Term Loan', multiplier: 1, minTerm: 1, maxTerm: 3, rate: 0.01, rateLabel: '1% / mo', color: 'teal' },
];

const fmt = (n) =>
    n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
};

/* ── Resolve status helpers ── */
function resolveStatusClass(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s === 'pending') return 'pending';
    if (s === 'awaiting_member_approval') return 'awaiting';
    if (s === 'completed') return 'completed';
    if (s === 'active' || s === 'approved') return 'approved';
    if (s === 'rejected') return 'rejected';
    return 'pending';
}

function resolveStatusLabel(status) {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (s === 'pending') return 'Pending';
    if (s === 'awaiting_member_approval') return 'Awaiting Member';
    if (s === 'completed') return 'Completed';
    if (s === 'active' || s === 'approved') return 'Approved';
    if (s === 'rejected') return 'Rejected';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function resolveStatusDesc(status) {
    if (!status) return 'Awaiting admin review';
    const s = status.toLowerCase();
    if (s === 'pending') return 'Awaiting admin review';
    if (s === 'awaiting_member_approval') return 'Modified terms sent to member';
    if (s === 'completed') return 'Loan has been fully repaid';
    if (s === 'active' || s === 'approved') return 'Loan has been approved';
    if (s === 'rejected') return 'Loan application rejected';
    return '';
}

const handleDocClick = (dataUrl, setViewingImage) => {
    if (!dataUrl) return;
    if (dataUrl.startsWith('data:application/pdf')) {
        const win = window.open();
        win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
        setViewingImage(dataUrl);
    }
};

const renderDocPreview = (dataUrl) => {
    if (!dataUrl) return <span style={{ fontSize: '10px' }}>No document</span>;
    if (dataUrl.startsWith('data:application/pdf')) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#1E3A8A' }}>
                <span style={{ fontSize: '24px' }}>📄</span>
                <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: 'bold' }}>PDF Document</span>
            </div>
        );
    }
    return <img src={dataUrl} alt="Document preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />;
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
    const [allLoansStats, setAllLoansStats] = useState([]);
    const [interestFilter, setInterestFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [page, setPage] = useState(1);
    const LIMIT = 10;

    /* ── Details modal extra state ── */
    const [memberSavings, setMemberSavings] = useState(0);
    const [approvedAmount, setApprovedAmount] = useState('');
    const [repaymentTerm, setRepaymentTerm] = useState('');
    const [viewingImage, setViewingImage] = useState(null);

    /* ── DSS Analysis state ── */
    const [dssAnalysis, setDssAnalysis] = useState(null);
    const [dssLoading, setDssLoading] = useState(false);

    /* ── OCR State ── */
    const [ocrResults, setOcrResults] = useState(null);
    const [isOcrLoading, setIsOcrLoading] = useState(false);

    /* ── Fetch loans from API ── */
    const fetchLoans = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const params = new URLSearchParams();
            params.set('page', page);
            params.set('limit', LIMIT);
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
            if (statusFilter !== 'all') params.set('status', statusFilter);

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
                active: data.stats?.active || 0,
                completed: data.stats?.completed || 0,
                rejected: data.stats?.rejected || 0,
            });
        } catch (err) {
            toast.error('Network error. Could not load loans.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, statusFilter, navigate]);

    useEffect(() => { fetchLoans(); }, [fetchLoans]);
    useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

    const fetchAllLoansStats = useCallback(async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/loans?limit=10000`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setAllLoansStats(data.loans || []);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchAllLoansStats(); }, [fetchAllLoansStats]);

    const totalInterestFiltered = allLoansStats.filter(l => {
        if (l.status === 'rejected' || l.status === 'pending') return false;
        const lType = (l.loanType || '').toLowerCase();
        
        let mult = '2x';
        if (lType.includes('emergency')) mult = '1.5x';
        if (lType.includes('short')) mult = '1x';
        if (l.multiplier) mult = `${l.multiplier}x`;

        if (interestFilter === '2x' && mult !== '2x') return false;
        if (interestFilter === '1.5x' && mult !== '1.5x') return false;
        if (interestFilter === '1x' && mult !== '1x') return false;
        return true;
    }).reduce((sum, l) => {
        const totalRepay = Number(l.totalRepayment || (l.monthlyPayment * l.term)) || 0;
        const principal = Number(l.amount) || 0;
        const interest = totalRepay - principal;
        return sum + (interest > 0 ? interest : 0);
    }, 0);

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

    const fetchDSSAnalysis = async (loanArg, forceRefresh = false) => {
        setDssLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/loans/${loanArg._id}/dss-analysis${forceRefresh ? '?refresh=true' : ''}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setDssAnalysis(data.analysis);
        } catch (err) {
            console.error('DSS Analysis Error:', err);
        } finally {
            setDssLoading(false);
            if (!forceRefresh) {
                setOcrResults(null); // Reset OCR for new loan
                
                // Automatically trigger OCR scan for pending loans
                if (loanArg.status === 'pending') {
                    handleVerifyDocuments(loanArg);
                }
            }
        }
    };

    /* ── View Details ── */
    const handleViewDetails = async (loan) => {
        // Optimistically open modal with basic data
        setSelectedLoan(loan);
        setApprovedAmount(String(loan.amount || ''));
        setRepaymentTerm(String(loan.termMonths || ''));
        setShowDetailsModal(true);

        let fullLoan = loan;
        try {
            const token = localStorage.getItem('adminToken');
            
            // 1. Fetch full loan details (includes base64 images omitted in list view)
            const detailRes = await fetch(`${API}/api/admin/loans/${loan.loanId || loan._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const detailData = await detailRes.json();
            if (detailData.success && detailData.loan) {
                fullLoan = detailData.loan;
                setSelectedLoan(fullLoan);
            }

            // 2. Fetch member savings
            const res = await fetch(`${API}/api/admin/member-savings?email=${encodeURIComponent(loan.email)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setMemberSavings(data.totalSavings || 0);
        } catch { /* silent */ }

        /* ── Fetch DSS Analysis ── */
        fetchDSSAnalysis(fullLoan);
    };

    /* ── Document Verification (OCR) ── */
    const handleVerifyDocuments = async (loanArg) => {
        const loan = loanArg || selectedLoan;
        if (!loan) return;
        if (!loan.idData && !loan.selfieData) return;

        setIsOcrLoading(true);
        const messages = [];
        let matchFound = false;

        try {
            // Process Government ID primarily for name
            if (loan.idData) {
                const result = await performOCRScan(loan.idData, loan.memberName);
                if (result.isMatch) {
                    matchFound = true;
                    messages.push(`Valid ID: Name match confirmed (${loan.memberName})`);
                } else {
                    messages.push(`Valid ID: Mismatch or low confidence scan. Manual check required.`);
                }
            }

            // Optional: Process Selfie if ID Scan failed to find name
            if (!matchFound && loan.selfieData) {
                const result = await performOCRScan(loan.selfieData, loan.memberName);
                if (result.isMatch) {
                    matchFound = true;
                    messages.push(`Selfie w/ ID: Name match confirmed (${loan.memberName})`);
                }
            }

            setOcrResults({ matchFound, messages });
            if (matchFound) {
                toast.success('Documents verified successfully');
            } else {
                toast.error('Potential document mismatch detected');
            }
        } catch (err) {
            toast.error('Failed to process documents');
        } finally {
            setIsOcrLoading(false);
        }
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
                <div className="loan-admin-mgmt-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    <div className="loan-admin-mgmt-stat-card" onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} style={{ cursor: 'pointer', border: statusFilter === 'pending' ? '2px solid #3B82F6' : '1px solid #E5E7EB', transform: statusFilter === 'pending' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0', minHeight: '24px' }}>
                            <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Pending Review</p>
                        </div>
                        <p className="loan-admin-mgmt-stat-value pending">{counts.pending}</p>
                    </div>
                    <div className="loan-admin-mgmt-stat-card" onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')} style={{ cursor: 'pointer', border: statusFilter === 'approved' ? '2px solid #10B981' : '1px solid #E5E7EB', transform: statusFilter === 'approved' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0', minHeight: '24px' }}>
                            <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Approved</p>
                        </div>
                        <p className="loan-admin-mgmt-stat-value approved">{counts.active}</p>
                    </div>
                    <div className="loan-admin-mgmt-stat-card" onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')} style={{ cursor: 'pointer', border: statusFilter === 'completed' ? '2px solid #8B5CF6' : '1px solid #E5E7EB', transform: statusFilter === 'completed' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0', minHeight: '24px' }}>
                            <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Completed</p>
                        </div>
                        <p className="loan-admin-mgmt-stat-value completed">{counts.completed}</p>
                    </div>
                    <div className="loan-admin-mgmt-stat-card" onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')} style={{ cursor: 'pointer', border: statusFilter === 'rejected' ? '2px solid #EF4444' : '1px solid #E5E7EB', transform: statusFilter === 'rejected' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0', minHeight: '24px' }}>
                            <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Rejected</p>
                        </div>
                        <p className="loan-admin-mgmt-stat-value rejected">{counts.rejected}</p>
                    </div>
                    <div className="loan-admin-mgmt-stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0', minHeight: '24px' }}>
                            <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Total Income from Interest</p>
                            <select value={interestFilter} onChange={e => setInterestFilter(e.target.value)} style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '6px', border: '1px solid #D1D5DB', marginLeft: '8px' }}>
                                <option value="all">All</option>
                                <option value="2x">2x Savings</option>
                                <option value="1.5x">1.5x Savings</option>
                                <option value="1x">1x Savings</option>
                            </select>
                        </div>
                        <p className="loan-admin-mgmt-stat-value total-interest" style={{ color: '#ffffff' }} title={fmt(totalInterestFiltered)}>{fmt(totalInterestFiltered)}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="loan-admin-mgmt-search">
                    <Search size={20} color="#9CA3AF" />
                    <input
                        type="text"
                        placeholder="Search by member name or loan ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="loan-admin-mgmt-table-container">
                    {statusFilter === 'completed' && (
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#F9FAFB' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', color: '#111827', fontWeight: '600' }}>Completed Loans History</h3>
                        </div>
                    )}
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
                                            <span className={`loan-admin-mgmt-status-badge ${resolveStatusClass(loan.status)}`}>
                                                {resolveStatusLabel(loan.status)}
                                            </span>
                                            {loan.status && loan.status.toLowerCase() === 'rejected' && loan.rejectionReason && (
                                                <div className="loan-admin-mgmt-status-rejected">
                                                    <p className="loan-admin-mgmt-rejection-reason">
                                                        Reason: {loan.rejectionReason}
                                                    </p>
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
                            <CheckCircle size={32} color="#00A63E" />
                        </div>
                        <h2 className="loan-admin-mgmt-modal-title">Approve Loan?</h2>
                        <p className="loan-admin-mgmt-modal-text">
                            Are you sure you want to approve loan <strong>{selectedLoan.loanId}</strong> for {selectedLoan.memberName}?
                        </p>
                        <div className="loan-admin-mgmt-modal-details-enhanced">
                            <div className="la-modal-detail-row">
                                <span className="la-modal-detail-label">Amount</span>
                                <span className="la-modal-detail-value amount">{fmt(selectedLoan.amount)}</span>
                            </div>
                            <div className="la-modal-detail-row">
                                <span className="la-modal-detail-label">Purpose</span>
                                <span className="la-modal-detail-value">{selectedLoan.purpose}</span>
                            </div>
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
                            <XCircle size={32} color="#FF6467" />
                        </div>
                        <h2 className="loan-admin-mgmt-modal-title">Reject Loan?</h2>
                        <p className="loan-admin-mgmt-modal-text">
                            Are you sure you want to reject loan <strong>{selectedLoan.loanId}</strong> for {selectedLoan.memberName}?
                        </p>
                        <div className="loan-admin-mgmt-modal-details-enhanced">
                            <div className="la-modal-detail-row">
                                <span className="la-modal-detail-label">Amount</span>
                                <span className="la-modal-detail-value amount">{fmt(selectedLoan.amount)}</span>
                            </div>
                            <div className="la-modal-detail-row">
                                <span className="la-modal-detail-label">Purpose</span>
                                <span className="la-modal-detail-value">{selectedLoan.purpose}</span>
                            </div>
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

                            <div className="dm-layout-grid">
                                {/* ── LEFT COLUMN ── */}
                                <div className="dm-column-left">
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
                                                <div className="dm-ik">Member savings</div>
                                                <div className="dm-iv green">{fmt(memberSavings)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Requested Loan Type */}
                                    <div>
                                        <div className="dm-sec-label">Requested loan type</div>
                                        <div className={`dm-loan-pill ${pillClass}`}>
                                            <div style={{ flex: 1 }}>
                                                <div className={`dm-lt-name ${pillClass}`}>
                                                    {selectedType?.name || 'Personal Loan'}
                                                </div>
                                                <div className="dm-lt-tags">
                                                    <span className={`dm-lt-tag ${pillClass}`}>{selectedType?.multiplier || 2}×</span>
                                                    <span className={`dm-lt-tag ${pillClass}`}>{selectedType?.rateLabel || '2% / mo'}</span>
                                                    <span className={`dm-lt-tag ${pillClass}`}>{selectedType?.minTerm || 3}–{selectedType?.maxTerm || 12}m</span>
                                                </div>
                                            </div>
                                            <div className="dm-lt-amt">
                                                <div className="dm-lt-amt-label">Requested</div>
                                                <div className={`dm-lt-amt-val ${pillClass}`}>{fmt(selectedLoan.amount)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin — set repayment terms (MOVED HERE) */}
                                    <div className="dm-edit-box">
                                        <div className="dm-edit-box-title">
                                            Admin — Set Repayment Terms
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
                                        {maxLoanable > 0 && (
                                            <div className="dm-edit-hint">
                                                Max loanable: {fmt(maxLoanable)} ({selectedType?.multiplier}× savings)
                                            </div>
                                        )}
                                        {calc && (
                                            <div className="dm-computed">
                                                <div className="dm-computed-pill">
                                                    <div className="dm-cp-label">Monthly</div>
                                                    <div className="dm-cp-val">{fmt(calc.monthly)}</div>
                                                </div>
                                                <div className="dm-computed-pill">
                                                    <div className="dm-cp-label">Interest</div>
                                                    <div className="dm-cp-val amber">{fmt(calc.totalInterest)}</div>
                                                </div>
                                                <div className="dm-computed-pill">
                                                    <div className="dm-cp-label">Total</div>
                                                    <div className="dm-cp-val green">{fmt(calc.totalRepayment)}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Disbursement Method (MOVED HERE) */}
                                    <div>
                                        <div className="dm-sec-label">Disbursement method</div>
                                        <div className="dm-disbursement-row">
                                            {[
                                                { id: 'cash', label: 'Cash' },
                                                { id: 'e-wallet', label: 'E-Wallet' },
                                                { id: 'bank', label: 'Bank' },
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
                                            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                                                Account: {selectedLoan.disbursementAccount}
                                            </p>
                                        )}
                                    </div>

                                    {/* Uploaded Documents (MOVED HERE) */}
                                    <div>
                                        <div className="dm-sec-label">Uploaded documents</div>
                                        <div className="dm-docs-grid">
                                            {/* Selfie with ID */}
                                            <div className="dm-doc-card" onClick={() => handleDocClick(selectedLoan.selfieData, setViewingImage)}>
                                                <div className="dm-doc-placeholder">
                                                    {renderDocPreview(selectedLoan.selfieData)}
                                                </div>
                                                <div className="dm-doc-footer">
                                                    <span className="dm-doc-name">Selfie w/ ID</span>
                                                    <span className={`dm-doc-badge ${selectedLoan.selfieData ? 'ok' : 'missing'}`}>
                                                        {selectedLoan.selfieData ? 'OK' : 'X'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Government ID */}
                                            <div className="dm-doc-card" onClick={() => handleDocClick(selectedLoan.idData, setViewingImage)}>
                                                <div className="dm-doc-placeholder">
                                                    {renderDocPreview(selectedLoan.idData)}
                                                </div>
                                                <div className="dm-doc-footer">
                                                    <span className="dm-doc-name">Valid ID</span>
                                                    <span className={`dm-doc-badge ${selectedLoan.idData ? 'ok' : 'missing'}`}>
                                                        {selectedLoan.idData ? 'OK' : 'X'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* COE */}
                                            <div className="dm-doc-card" onClick={() => handleDocClick(selectedLoan.coeData, setViewingImage)}>
                                                <div className="dm-doc-placeholder">
                                                    {renderDocPreview(selectedLoan.coeData)}
                                                </div>
                                                <div className="dm-doc-footer">
                                                    <span className="dm-doc-name">COE</span>
                                                    <span className={`dm-doc-badge ${selectedLoan.coeData ? 'ok' : 'missing'}`}>
                                                        {selectedLoan.coeData ? 'OK' : 'X'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ITR */}
                                            <div className="dm-doc-card" onClick={() => handleDocClick(selectedLoan.itrData, setViewingImage)}>
                                                <div className="dm-doc-placeholder">
                                                    {renderDocPreview(selectedLoan.itrData)}
                                                </div>
                                                <div className="dm-doc-footer">
                                                    <span className="dm-doc-name">ITR</span>
                                                    <span className={`dm-doc-badge ${selectedLoan.itrData ? 'ok' : 'missing'}`}>
                                                        {selectedLoan.itrData ? 'OK' : 'X'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Payslip */}
                                            <div className="dm-doc-card" onClick={() => handleDocClick(selectedLoan.payslipData, setViewingImage)}>
                                                <div className="dm-doc-placeholder">
                                                    {renderDocPreview(selectedLoan.payslipData)}
                                                </div>
                                                <div className="dm-doc-footer">
                                                    <span className="dm-doc-name">Payslip</span>
                                                    <span className={`dm-doc-badge ${selectedLoan.payslipData ? 'ok' : 'missing'}`}>
                                                        {selectedLoan.payslipData ? 'OK' : 'X'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Active Loan Screenshot */}
                                            {selectedLoan.hasActiveLoan && (
                                                <div className="dm-doc-card" onClick={() => handleDocClick(selectedLoan.activeLoanScreenshotData, setViewingImage)}>
                                                    <div className="dm-doc-placeholder">
                                                        {renderDocPreview(selectedLoan.activeLoanScreenshotData)}
                                                    </div>
                                                    <div className="dm-doc-footer">
                                                        <span className="dm-doc-name">Active Loan</span>
                                                        <span className={`dm-doc-badge ${selectedLoan.activeLoanScreenshotData ? 'ok' : 'missing'}`}>
                                                            {selectedLoan.activeLoanScreenshotData ? 'OK' : 'X'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── RIGHT COLUMN ── */}
                                <div className="dm-column-right">
                                    {/* ── DSS Panel (MOVED HERE) ── */}
                                    <DSSPanel 
                                        analysis={dssAnalysis} 
                                        loading={dssLoading} 
                                        onRefresh={() => fetchDSSAnalysis(selectedLoan, true)} 
                                        memberName={selectedLoan.memberName}
                                    />

                                    {/* OCR Results Analysis */}
                                    {ocrResults && (
                                        <div className={`dm-ocr-result-box ${ocrResults.matchFound ? 'pass' : 'fail'}`}>
                                            <div className="dm-ocr-header">
                                                {ocrResults.matchFound ? (
                                                    <ShieldCheck size={18} className="dm-ocr-icon pass" />
                                                ) : (
                                                    <AlertTriangle size={18} className="dm-ocr-icon fail" />
                                                )}
                                                <span className={`dm-ocr-title ${ocrResults.matchFound ? 'pass' : 'fail'}`}>
                                                    {ocrResults.matchFound ? 'OCR Identity Match' : 'OCR Verification Alert'}
                                                </span>
                                            </div>
                                            <ul className="dm-ocr-list">
                                                {ocrResults.messages.map((m, idx) => (
                                                    <li key={idx}>{m}</li>
                                                ))}
                                            </ul>
                                            {!ocrResults.matchFound && (
                                                <div className="dm-ocr-warning">
                                                    <strong>Important:</strong> The system could not confirm the member's name from the document scan. Please examine the images closely before approval.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* System Note */}
                                    <div className="dm-note-box">
                                        <div className="dm-note-title">System Note</div>
                                        <div className="dm-note-text">
                                            Review within 2–3 days. Late penalty 3%/mo applies.
                                        </div>
                                    </div>
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

                                {selectedLoan.status === 'pending' && isOcrLoading && (
                                    <div className="dm-scan-status">
                                        <div className="btn-spinner" />
                                        <span>Scanning Documents...</span>
                                    </div>
                                )}

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
                            <Circle size={14} color="#374151" />
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