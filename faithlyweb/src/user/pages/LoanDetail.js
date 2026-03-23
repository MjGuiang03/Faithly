import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import '../styles/Loandetail.css';
import API from '../../utils/api';

const fmt = (n) =>
    n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_CLASS = {
    active: 'ld-badge--active',
    pending: 'ld-badge--pending',
    completed: 'ld-badge--completed',
    rejected: 'ld-badge--rejected',
};

/* ── Back arrow ── */
const BackIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/* ── Close icon ── */
const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
);

/* ════════════════════════════════════════════════════════════
   PAY NOW MODAL
   ════════════════════════════════════════════════════════════ */
function PayNowModal({ loan, onClose, onSuccess }) {
    const [method, setMethod] = useState('cash');
    const [uploading, setUploading] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const METHODS = [
        {
            id: 'cash',
            name: 'Cash',
            desc: 'Pay in person at the office or cashier',
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="5" width="16" height="10" rx="2" stroke="#3b6d11" strokeWidth="1.3" />
                    <circle cx="10" cy="10" r="2.5" stroke="#3b6d11" strokeWidth="1.3" />
                    <path d="M5 10h.01M15 10h.01" stroke="#3b6d11" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            ),
            iconBg: 'ld-method-icon--cash',
            instructions: [
                `Visit the office or authorized cashier during business hours.`,
                `Present your Loan ID: ${loan?.loanId} to the cashier.`,
                `Pay the exact amount of ${fmt(loan?.monthlyPayment)} and keep your receipt.`,
            ],
        },
        {
            id: 'bank',
            name: 'Bank transfer',
            desc: 'Transfer via online banking or over-the-counter',
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 8h14M3 8V7l7-4 7 4v1M3 8v8h14V8" stroke="#185fa5" strokeWidth="1.3" strokeLinejoin="round" />
                    <rect x="8" y="12" width="4" height="4" rx="0.5" stroke="#185fa5" strokeWidth="1.3" />
                </svg>
            ),
            iconBg: 'ld-method-icon--bank',
            instructions: [
                `Transfer to Account No. 1234-5678-90 · BDO · Faithly Inc.`,
                `Use reference: ${loan?.loanId} in the remarks field.`,
                `Upload your proof of transfer after confirming below.`,
            ],
            needsReceipt: true,
        },
        {
            id: 'gcash',
            name: 'GCash',
            desc: 'Send via GCash wallet instantly',
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke="#6d28d9" strokeWidth="1.3" />
                    <path d="M10 7v3l2 2" stroke="#6d28d9" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            iconBg: 'ld-method-icon--gcash',
            instructions: [
                `Send to GCash number 0917-XXX-XXXX · Faithly Inc.`,
                `Use reference: ${loan?.loanId} in the message field.`,
                `Upload your GCash screenshot after confirming below.`,
            ],
            needsReceipt: true,
        },
    ];

    const selected = METHODS.find(m => m.id === method);

    const handleConfirm = async () => {
        if (selected?.needsReceipt && !receipt) {
            setError('Please upload your proof of payment before confirming.');
            return;
        }
        setError('');
        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('loanId', loan.loanId);
            formData.append('paymentMethod', method);
            if (receipt) formData.append('receipt', receipt);

            const res = await fetch(`${API}/api/loans/${loan.loanId}/pay`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSubmitted(true);
                setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
            } else {
                setError(data.message || 'Payment submission failed. Please try again.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="ld-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ld-modal ld-modal--pay">
                {/* Header */}
                <div className="ld-modal-header">
                    <div>
                        <div className="ld-modal-title">Pay now</div>
                        <div className="ld-modal-sub">{loan?.loanId} · Payment due {fmtDate(loan?.nextPaymentDate)}</div>
                    </div>
                    <button className="ld-modal-close" onClick={onClose}><CloseIcon /></button>
                </div>

                {submitted ? (
                    <div className="ld-pay-success">
                        <div className="ld-pay-success-icon">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                <circle cx="14" cy="14" r="13" stroke="#22c55e" strokeWidth="1.5" />
                                <path d="M8 14l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="ld-pay-success-title">Payment submitted!</div>
                        <div className="ld-pay-success-sub">Your payment is being processed. You'll be notified once confirmed.</div>
                    </div>
                ) : (
                    <div className="ld-modal-body">
                        {/* Amount */}
                        <div className="ld-pay-amount-box">
                            <div>
                                <div className="ld-pay-amount-label">Amount due</div>
                                <div className="ld-pay-amount-value">{fmt(loan?.monthlyPayment)}</div>
                                <div className="ld-pay-amount-sub">Due {fmtDate(loan?.nextPaymentDate)}</div>
                            </div>
                            {loan?.nextPaymentDate && (
                                <div className="ld-badge ld-badge--pending" style={{ alignSelf: 'flex-start' }}>Due soon</div>
                            )}
                        </div>

                        {/* Method label */}
                        <div className="ld-pay-section-label">Select payment method</div>

                        {/* Methods */}
                        <div className="ld-method-list">
                            {METHODS.map((m) => (
                                <div
                                    key={m.id}
                                    className={`ld-method-card ${method === m.id ? 'ld-method-card--selected' : ''}`}
                                    onClick={() => { setMethod(m.id); setError(''); }}
                                >
                                    <div className={`ld-method-icon ${m.iconBg}`}>{m.icon}</div>
                                    <div className="ld-method-info">
                                        <div className="ld-method-name">{m.name}</div>
                                        <div className="ld-method-desc">{m.desc}</div>
                                    </div>
                                    <div className={`ld-radio ${method === m.id ? 'ld-radio--selected' : ''}`} />
                                </div>
                            ))}
                        </div>

                        {/* Instructions */}
                        <div className="ld-pay-instructions">
                            <div className="ld-pay-instructions-title">How to pay via {selected?.name}</div>
                            {selected?.instructions.map((step, i) => (
                                <div key={i} className="ld-pay-step">
                                    <div className="ld-pay-step-num">{i + 1}</div>
                                    <div className="ld-pay-step-text">{step}</div>
                                </div>
                            ))}
                        </div>

                        {/* Receipt upload (bank / gcash) */}
                        {selected?.needsReceipt && (
                            <div className="ld-pay-upload">
                                <div className="ld-pay-section-label" style={{ marginBottom: '8px' }}>Upload proof of payment</div>
                                <label className={`ld-upload-box ${receipt ? 'ld-upload-box--done' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        style={{ display: 'none' }}
                                        onChange={(e) => { setReceipt(e.target.files[0]); setError(''); }}
                                    />
                                    {receipt ? (
                                        <span className="ld-upload-done-text">✓ {receipt.name}</span>
                                    ) : (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginBottom: '4px' }}>
                                                <path d="M10 13V7M7 10l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M3 17a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 15.5 7H16a3 3 0 0 1 0 6H3z" stroke="currentColor" strokeWidth="1.3" />
                                            </svg>
                                            <span>Click to upload screenshot or PDF</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        )}

                        {/* Error */}
                        {error && <div className="ld-pay-error">{error}</div>}
                    </div>
                )}

                {/* Footer */}
                {!submitted && (
                    <div className="ld-modal-footer">
                        <button className="ld-footer-btn-cancel" onClick={onClose}>Cancel</button>
                        <button className="ld-footer-btn-confirm" onClick={handleConfirm} disabled={uploading}>
                            {uploading ? 'Submitting…' : 'Confirm payment'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   SCHEDULE MODAL
   ════════════════════════════════════════════════════════════ */
function ScheduleModal({ loan, schedule, onClose, onPayNow }) {
    const totalInterest = schedule.reduce((s, r) => s + (r.interest || 0), 0);
    const totalRepayment = schedule.reduce((s, r) => s + (r.payment || 0), 0);

    return (
        <div className="ld-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ld-modal ld-modal--schedule">
                {/* Header */}
                <div className="ld-modal-header">
                    <div>
                        <div className="ld-modal-title">Payment schedule — {loan?.loanId}</div>
                        <div className="ld-modal-sub">{loan?.termMonths} monthly payments · {loan?.purpose} · {loan?.interestRate}% per month</div>
                    </div>
                    <button className="ld-modal-close" onClick={onClose}><CloseIcon /></button>
                </div>

                {/* Summary strip */}
                <div className="ld-sched-summary">
                    <div className="ld-sched-summary-cell">
                        <label>Total principal</label>
                        <div className="ld-sched-summary-val">{fmt(loan?.amount)}</div>
                    </div>
                    <div className="ld-sched-summary-cell">
                        <label>Total interest</label>
                        <div className="ld-sched-summary-val">{fmt(totalInterest)}</div>
                    </div>
                    <div className="ld-sched-summary-cell">
                        <label>Total repayment</label>
                        <div className="ld-sched-summary-val">{fmt(totalRepayment)}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="ld-sched-table-wrap">
                    <div className="ld-sched-table-head">
                        <span>#</span>
                        <span style={{ textAlign: 'left' }}>Due date</span>
                        <span>Principal</span>
                        <span>Interest</span>
                        <span>Payment</span>
                        <span>Status</span>
                    </div>

                    {schedule.map((row, i) => {
                        const isPaid = row.status === 'paid';
                        const isDue = !isPaid && row.isNext;
                        const isMissed = row.status === 'missed';
                        return (
                            <div key={i} className={`ld-sched-row ${isDue ? 'ld-sched-row--due' : ''} ${isPaid ? 'ld-sched-row--paid' : ''}`}>
                                <div className={`ld-sched-num ${isDue ? 'ld-sched-num--due' : ''} ${isPaid ? 'ld-sched-num--paid' : ''}`}>
                                    {isPaid ? '✓' : i + 1}
                                </div>
                                <span style={{ textAlign: 'left', fontSize: '12px' }}>{fmtDate(row.dueDate)}</span>
                                <span className="ld-sched-cell">{fmt(row.principal)}</span>
                                <span className="ld-sched-cell">{fmt(row.interest)}</span>
                                <span className={`ld-sched-cell ld-sched-cell--bold ${isDue ? 'ld-sched-cell--warn' : ''} ${isPaid ? 'ld-sched-cell--paid' : ''}`}>
                                    {fmt(row.payment)}
                                </span>
                                <span style={{ textAlign: 'right' }}>
                                    {isPaid && <span className="ld-sched-badge ld-sched-badge--paid">Paid</span>}
                                    {isDue && <span className="ld-sched-badge ld-sched-badge--due">Due soon</span>}
                                    {isMissed && <span className="ld-sched-badge ld-sched-badge--missed">Missed</span>}
                                    {!isPaid && !isDue && !isMissed && <span className="ld-sched-badge ld-sched-badge--upcoming">Upcoming</span>}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="ld-modal-footer">
                    <button className="ld-footer-btn-cancel" onClick={onClose}>Close</button>
                    {loan?.status === 'active' && (
                        <button className="ld-footer-btn-confirm" onClick={() => { onClose(); onPayNow(); }}>
                            Pay now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   LOAN DETAIL PAGE
   ════════════════════════════════════════════════════════════ */
export default function LoanDetail() {
    const { loanId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    useAuth();

    const [loan, setLoan] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showSchedule, setShowSchedule] = useState(false);
    const [showPayNow, setShowPayNow] = useState(false);

    /* Auto-open modals via query param */
    useEffect(() => {
        if (searchParams.get('tab') === 'schedule') setShowSchedule(true);
        if (searchParams.get('pay') === 'true') setShowPayNow(true);
    }, [searchParams]);

    const fetchLoan = useCallback(async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) { navigate('/'); return; }
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        try {
            const [loanRes, schedRes] = await Promise.all([
                fetch(`${API}/api/loans/${loanId}`, { headers }),
                fetch(`${API}/api/loans/${loanId}/schedule`, { headers }),
            ]);
            if (loanRes.status === 401) { localStorage.removeItem('token'); navigate('/'); return; }
            const loanData = await loanRes.json();
            const schedData = schedRes.ok ? await schedRes.json() : { schedule: [] };
            if (loanRes.ok && loanData.success) {
                setLoan(loanData.loan);
                setSchedule(schedData.schedule || []);
            } else {
                setError(loanData.message || 'Failed to load loan details.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [loanId, navigate]);

    useEffect(() => { fetchLoan(); }, [fetchLoan]);

    /* Derived */
    const paidCount = schedule.filter(r => r.status === 'paid').length;
    const totalMonths = loan?.termMonths || 0;
    const progressPct = totalMonths > 0 ? Math.max(2, Math.round((paidCount / totalMonths) * 100)) : 2;
    const paidAmount = schedule.filter(r => r.status === 'paid').reduce((s, r) => s + (r.payment || 0), 0);

    /* ── Skeleton ── */
    if (loading) return (
        <div className="home-layout">
            <Sidebar />
            <div className="user-main-content">
                <div className="ld-back-btn" style={{ marginBottom: '20px', opacity: 0.4 }}>
                    <BackIcon /> Back to My Loans
                </div>
                <div className="ld-skeleton" style={{ height: '32px', width: '240px', marginBottom: '20px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="ld-skeleton" style={{ height: '72px', borderRadius: '12px' }} />)}
                </div>
                <div className="ld-skeleton" style={{ height: '120px', borderRadius: '14px', marginBottom: '16px' }} />
                <div className="ld-skeleton" style={{ height: '200px', borderRadius: '14px' }} />
            </div>
        </div>
    );

    return (
        <div className="home-layout">
            <Sidebar />
            <div className="user-main-content">

                {/* ── Back ── */}
                <button className="ld-back-btn" onClick={() => navigate('/loans')}>
                    <BackIcon /> Back to My Loans
                </button>

                {/* ── Error ── */}
                {error && (
                    <div className="user-loans-error-banner">
                        <span>⚠ {error}</span>
                        <button onClick={fetchLoan} className="user-loans-retry-btn">Retry</button>
                    </div>
                )}

                {loan && (
                    <>
                        {/* ── Header ── */}
                        <div className="ld-page-header">
                            <div>
                                <div className="ld-page-title-row">
                                    <h1 className="ld-page-title">{loan.loanId}</h1>
                                    <span className={`ld-badge ${STATUS_CLASS[loan.status] || ''}`}>
                                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                    </span>
                                </div>
                                <p className="ld-page-subtitle">{loan.purpose} loan · Applied {fmtDate(loan.appliedDate)}</p>
                            </div>
                            {loan.status === 'active' && (
                                <button className="ld-pay-btn" onClick={() => setShowPayNow(true)}>Pay now</button>
                            )}
                        </div>

                        {/* ── Stats ── */}
                        <div className="ld-stats">
                            <div className="ld-stat-card">
                                <label className="ld-stat-label">Original amount</label>
                                <div className="ld-stat-value">{fmt(loan.amount)}</div>
                                <div className="ld-stat-sub">Disbursed in full</div>
                            </div>
                            <div className="ld-stat-card">
                                <label className="ld-stat-label">Remaining balance</label>
                                <div className="ld-stat-value">{fmt(loan.remainingBalance)}</div>
                                <div className="ld-stat-sub">
                                    {loan.remainingBalance > 0
                                        ? `${Math.round((loan.remainingBalance / loan.amount) * 100)}% outstanding`
                                        : 'Fully paid'}
                                </div>
                            </div>
                            <div className="ld-stat-card">
                                <label className="ld-stat-label">Monthly payment</label>
                                <div className="ld-stat-value">{fmt(loan.monthlyPayment)}</div>
                                <div className="ld-stat-sub">Over {loan.termMonths} months</div>
                            </div>
                            <div className={`ld-stat-card ${loan.nextPaymentDate ? 'ld-stat-card--warn' : ''}`}>
                                <label className="ld-stat-label">Next due date</label>
                                <div className="ld-stat-value">
                                    {loan.nextPaymentDate
                                        ? new Date(loan.nextPaymentDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                                        : '—'}
                                </div>
                                <div className="ld-stat-sub">
                                    {loan.nextPaymentDate ? `${fmt(loan.monthlyPayment)} due` : 'No upcoming payment'}
                                </div>
                            </div>
                        </div>

                        {/* ── Progress ── */}
                        <div className="ld-section">
                            <div className="ld-section-head">
                                <div className="ld-section-title">Repayment progress</div>
                            </div>
                            <div className="ld-progress-body">
                                <div className="ld-progress-label">
                                    <span>{paidCount} of {totalMonths} payments made</span>
                                    <span>{fmt(paidAmount)} paid · {fmt(loan.remainingBalance)} remaining</span>
                                </div>
                                <div className="ld-progress-bar">
                                    <div className="ld-progress-fill" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="ld-progress-sub">Loan matures {fmtDate(loan.maturityDate)}</div>
                            </div>
                        </div>

                        {/* ── Loan details ── */}
                        <div className="ld-section">
                            <div className="ld-section-head">
                                <div className="ld-section-title">Loan details</div>
                            </div>
                            <div className="ld-details-grid">
                                <div className="ld-detail-col">
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Loan ID</span>
                                        <span className="ld-detail-val">{loan.loanId}</span>
                                    </div>
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Loan type</span>
                                        <span className="ld-detail-val">{loan.purpose}</span>
                                    </div>
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Loan term</span>
                                        <span className="ld-detail-val">{loan.termMonths} months</span>
                                    </div>
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Interest rate</span>
                                        <span className="ld-detail-val">{loan.interestRate}% per month</span>
                                    </div>
                                </div>
                                <div className="ld-detail-col ld-detail-col--right">
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Applied date</span>
                                        <span className="ld-detail-val">{fmtDate(loan.appliedDate)}</span>
                                    </div>
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Disbursement date</span>
                                        <span className="ld-detail-val">{fmtDate(loan.disbursedDate || loan.appliedDate)}</span>
                                    </div>
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Maturity date</span>
                                        <span className="ld-detail-val">{fmtDate(loan.maturityDate)}</span>
                                    </div>
                                    <div className="ld-detail-row">
                                        <span className="ld-detail-label">Payment frequency</span>
                                        <span className="ld-detail-val">Monthly</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Upcoming payments preview ── */}
                        {schedule.length > 0 && (
                            <div className="ld-section">
                                <div className="ld-section-head">
                                    <div className="ld-section-title">Upcoming payments</div>
                                    <button className="ld-view-link" onClick={() => setShowSchedule(true)}>
                                        View full schedule
                                    </button>
                                </div>
                                <div className="ld-preview-list">
                                    {schedule.filter(r => r.status !== 'paid').slice(0, 3).map((row, i) => {
                                        const isNext = row.isNext;
                                        const absIdx = schedule.indexOf(row);
                                        return (
                                            <div key={i} className="ld-preview-row">
                                                <div className={`ld-sched-num ${isNext ? 'ld-sched-num--due' : ''}`}>
                                                    {absIdx + 1}
                                                </div>
                                                <div className="ld-preview-info">
                                                    <div className="ld-preview-date">{fmtDate(row.dueDate)}</div>
                                                    <div className="ld-preview-breakdown">
                                                        Principal {fmt(row.principal)} · Interest {fmt(row.interest)}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div className={`ld-preview-amount ${isNext ? 'ld-preview-amount--warn' : ''}`}>
                                                        {fmt(row.payment)}
                                                    </div>
                                                    <div className={`ld-preview-status ${isNext ? 'ld-preview-status--due' : 'ld-preview-status--upcoming'}`}>
                                                        {isNext ? 'Due soon' : 'Upcoming'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Actions ── */}
                        <div className="ld-actions-row">
                            <button className="ld-outline-btn" onClick={() => setShowSchedule(true)}>
                                View full schedule
                            </button>
                            {loan.status === 'active' && (
                                <button className="ld-pay-btn" onClick={() => setShowPayNow(true)}>
                                    Pay now
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            {showSchedule && (
                <ScheduleModal
                    loan={loan}
                    schedule={schedule}
                    onClose={() => setShowSchedule(false)}
                    onPayNow={() => setShowPayNow(true)}
                />
            )}

            {showPayNow && (
                <PayNowModal
                    loan={loan}
                    onClose={() => setShowPayNow(false)}
                    onSuccess={fetchLoan}
                />
            )}
        </div>
    );
}
