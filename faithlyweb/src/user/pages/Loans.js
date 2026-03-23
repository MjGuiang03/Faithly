import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoanApplicationModal from '../components/LoanApplicationModal';
import VerificationModal from '../components/OfficerVerification';
import '../styles/Loans.css';
import API from '../../utils/api';
import svgPaths from '../../imports/svg-icons';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_CLASS = {
  active: 'user-loan-status-active',
  pending: 'user-loan-status-pending',
  completed: 'user-loan-status-completed',
  rejected: 'user-loan-status-rejected',
};

/* Lock icon SVG */
const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export default function Loans() {
  const navigate = useNavigate();
  useAuth();

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({ totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
  const [activeLoans, setActiveLoans] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 5;

  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setVerificationStatus('unverified');
      setDataLoading(false);
      return;
    }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    try {
      const [loansRes, verifyRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans?page=${page}&limit=${LIMIT}`, { headers }),
        fetch(`${API}/api/verification/status`, { headers }),
      ]);
      if (loansRes.status === 401 || verifyRes.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
        return;
      }
      const loansData = await loansRes.json();
      const verifyData = await verifyRes.json();
      if (loansRes.ok && loansData.success) {
        setLoans(loansData.loans || []);
        setStats(loansData.stats || { totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
        setTotalCount(loansData.totalCount || 0);
        const allLoansRes = await fetch(`${API}/api/loans/my-loans`, { headers });
        const allLoansData = await allLoansRes.json();
        if (allLoansData.success) {
          setActiveLoans(allLoansData.loans?.filter(l => l.status === 'active') || []);
        }
      } else {
        setLoans([]);
        setStats({ totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
        setActiveLoans([]);
        if (loansRes.status !== 404) setError(loansData.message || 'Failed to load loans');
      }
      if (verifyRes.ok && verifyData.success) {
        setVerificationStatus(verifyData.verificationStatus || 'unverified');
      } else {
        setVerificationStatus('unverified');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setVerificationStatus('unverified');
    } finally {
      setDataLoading(false);
    }
  }, [navigate, page]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApplyClick = () => {
    if (verificationStatus === 'verified') setIsLoanModalOpen(true);
    else setIsVerifyModalOpen(true);
  };

  const handleVerificationClose = () => {
    setIsVerifyModalOpen(false);
    fetchAll();
  };

  const handleLoanClose = () => {
    setIsLoanModalOpen(false);
    fetchAll();
  };

  /* ── Derived state ── */
  const hasActiveLoan = loans.some(l => l.status === 'active' || l.status === 'pending');
  const isVerified = verificationStatus === 'verified';
  const nextDueLoan = activeLoans[0] || null;

  /* ── Verification locked banner ── */
  const renderLockedBanner = () => (
    <div className="ul-policy-bar">
      <div className="ul-policy-text">
        <strong>
          {verificationStatus === 'pending'
            ? 'Verification under review.'
            : verificationStatus === 'rejected'
              ? 'Verification rejected.'
              : 'Officer verification required.'}
        </strong>{' '}
        {verificationStatus === 'pending'
          ? 'You will be notified once approved — this usually takes 3–5 business days.'
          : verificationStatus === 'rejected'
            ? 'Please resubmit with the correct information.'
            : 'To access the Loan module you must first verify your officer status. This is a one-time process.'}
        {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
          <button className="ul-policy-link" onClick={() => setIsVerifyModalOpen(true)}>
            {verificationStatus === 'rejected' ? ' Resubmit verification →' : ' Start verification →'}
          </button>
        )}
      </div>
    </div>
  );

  /* ── One-loan policy bar ── */
  const renderPolicyBar = () => {
    const pending = loans.find(l => l.status === 'active' || l.status === 'pending');
    if (!pending) return null;
    return (
      <div className="ul-policy-bar">
        <div className="ul-policy-text">
          <strong>One active loan at a time.</strong> You cannot apply for a new loan while{' '}
          <strong>{pending.loanId}</strong> is still outstanding. Complete or fully pay off your
          current loan to become eligible again.
        </div>
      </div>
    );
  };

  /* ── Loan type cards (empty state) ── */
  const renderLoanTypes = () => (
    <div className="ul-section">
      <div className="ul-section-head">
        <div className="ul-section-title">Available loan types</div>
        <div className="ul-section-sub">Your loanable amount is based on your savings balance × the loan multiplier.</div>
      </div>
      <div className="ul-loan-types">
        {[
          {
            color: 'blue',
            name: 'Personal Loan',
            multiplier: '2× your savings',
            desc: 'For everyday needs, big purchases, or personal goals.',
            term: '3 – 12 months',
            rate: '2% per month',
          },
          {
            color: 'amber',
            name: 'Emergency Loan',
            multiplier: '1.5× your savings',
            desc: 'Fast-tracked for urgent and unexpected situations.',
            term: '1 – 6 months',
            rate: '1.5% per month',
          },
          {
            color: 'teal',
            name: 'Short-Term Loan',
            multiplier: '1× your savings',
            desc: 'Quick, low-interest loan for short bridge financing.',
            term: '1 – 3 months',
            rate: '1% per month',
          },
        ].map((lt) => (
          <div key={lt.name} className="ul-lt-card">
            <div className={`ul-lt-icon ul-lt-icon--${lt.color}`}>
              {lt.color === 'blue' && (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="#185fa5" strokeWidth="1.3" /><path d="M9 6v3l2 2" stroke="#185fa5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {lt.color === 'amber' && (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.5 4.5H15l-3.75 2.75L12.75 14 9 11.25 5.25 14l1.5-4.75L3 6.5h4.5L9 2z" stroke="#854f0b" strokeWidth="1.3" strokeLinejoin="round" /></svg>
              )}
              {lt.color === 'teal' && (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="9" rx="2" stroke="#0f6e56" strokeWidth="1.3" /><path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="#0f6e56" strokeWidth="1.3" strokeLinecap="round" /><path d="M6 10h6" stroke="#0f6e56" strokeWidth="1.3" strokeLinecap="round" /></svg>
              )}
            </div>
            <div className="ul-lt-name">{lt.name}</div>
            <div className={`ul-lt-multiplier ul-lt-multiplier--${lt.color}`}>{lt.multiplier}</div>
            <div className="ul-lt-desc">{lt.desc}</div>
            <hr className="ul-lt-divider" />
            <div className="ul-lt-row"><span className="ul-lt-key">Term</span><span className="ul-lt-val">{lt.term}</span></div>
            <div className="ul-lt-row"><span className="ul-lt-key">Interest rate</span><span className="ul-lt-val">{lt.rate}</span></div>
            <div className="ul-lt-row"><span className="ul-lt-key">Amount basis</span><span className="ul-lt-val">Savings balance</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Skeleton loader rows ── */
  const renderSkeletons = () => (
    <div className="ul-loans-list">
      {[1, 2].map(i => (
        <div key={i} className="ul-loan-card">
          <div className="ul-skeleton" style={{ height: '18px', width: '30%', marginBottom: '8px' }} />
          <div className="ul-skeleton" style={{ height: '14px', width: '20%', marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="ul-skeleton" style={{ height: '48px', flex: 1, borderRadius: '8px' }} />
            <div className="ul-skeleton" style={{ height: '48px', flex: 1, borderRadius: '8px' }} />
            <div className="ul-skeleton" style={{ height: '48px', flex: 1, borderRadius: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="home-layout">
      <Sidebar />

      <div className="user-main-content">

        {/* ── Header ── */}
        <div className="ul-page-header">
          <div>
            <h1 className="ul-page-title">My Loans</h1>
            <p className="ul-page-subtitle">Manage your loan applications and payments</p>
          </div>

          {isVerified && !hasActiveLoan ? (
            <button className="ul-apply-btn" onClick={handleApplyClick}>
              + Apply for Loan
            </button>
          ) : isVerified && hasActiveLoan ? (
            <div className="ul-apply-btn-disabled" title="You already have an active or pending loan">
              <LockIcon /> Apply for Loan
            </div>
          ) : (
            <button
              className="ul-apply-btn ul-apply-btn--locked"
              onClick={handleApplyClick}
              title={
                verificationStatus === 'pending' ? 'Your verification is under review'
                  : verificationStatus === 'rejected' ? 'Verification rejected — resubmit below'
                    : 'Officer verification required'
              }
            >
              <LockIcon />
              {verificationStatus === 'pending' ? 'Verification Pending' : 'Apply for Loan'}
            </button>
          )}
        </div>

        {/* ── Error ── */}
        {!dataLoading && error && (
          <div className="user-loans-error-banner">
            <span>⚠ {error}</span>
            <button onClick={fetchAll} className="user-loans-retry-btn">Retry</button>
          </div>
        )}

        {!dataLoading && !error && (
          <>
            {/* ── Verification locked banner ── */}
            {!isVerified && renderLockedBanner()}

            {/* ── One-loan policy bar ── */}
            {isVerified && hasActiveLoan && renderPolicyBar()}

            {/* ── Stats ── */}
            <div className="ul-stats">
              <div className="ul-stat-card">
                <label className="ul-stat-label">Total Borrowed</label>
                <div className="ul-stat-value">{fmt(stats.totalBorrowed)}</div>
                <div className="ul-stat-sub">{stats.activeCount > 0 ? `${stats.activeCount} active loan` : 'No loans yet'}</div>
              </div>
              <div className="ul-stat-card">
                <label className="ul-stat-label">Remaining Balance</label>
                <div className="ul-stat-value">{fmt(stats.remainingBalance)}</div>
                <div className="ul-stat-sub">
                  {stats.remainingBalance > 0
                    ? `${Math.round((stats.remainingBalance / stats.totalBorrowed) * 100)}% outstanding`
                    : '—'}
                </div>
              </div>
              <div className={`ul-stat-card ${nextDueLoan ? 'ul-stat-card--warn' : ''}`}>
                {nextDueLoan ? (
                  <>
                    <label className="ul-stat-label">Next Payment</label>
                    <div className="ul-stat-value">{fmt(nextDueLoan.monthlyPayment)}</div>
                    <div className="ul-stat-sub">Due {fmtDate(nextDueLoan.nextPaymentDate)}</div>
                  </>
                ) : (
                  <>
                    <label className="ul-stat-label">Active Loans</label>
                    <div className="ul-stat-value">{stats.activeCount}</div>
                    <div className="ul-stat-sub">{isVerified ? 'Eligible to apply' : '—'}</div>
                  </>
                )}
              </div>
            </div>

            {/* ── Verified content ── */}
            {isVerified && (
              <>
                {/* ── Active loan section ── */}
                <div className="ul-section">
                  <div className="ul-section-head">
                    <div className="ul-section-title">
                      {hasActiveLoan ? 'Active loan' : 'Active loan'}
                    </div>
                  </div>

                  {dataLoading ? renderSkeletons() : loans.filter(l => l.status === 'active' || l.status === 'pending').length === 0 ? (
                    /* ── Empty state ── */
                    <div className="ul-empty-state">
                      <div className="ul-empty-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="5" width="18" height="14" rx="3" />
                          <path d="M3 9h18M8 13h2M14 13h2" />
                        </svg>
                      </div>
                      <div className="ul-empty-title">No active loan</div>
                      <p className="ul-empty-sub">You haven't taken out a loan yet. Apply now and get funds disbursed directly to your account.</p>
                      <button className="ul-empty-apply-btn" onClick={handleApplyClick}>Apply for a loan</button>
                    </div>
                  ) : (
                    /* ── Active/pending loan card ── */
                    <div className="ul-loans-list user-fade-in">
                      {loans.filter(l => l.status === 'active' || l.status === 'pending').slice(0, 1).map((loan) => (
                        <div key={loan._id} className="ul-loan-card">
                          {/* Card top */}
                          <div className="ul-loan-card-top">
                            <div>
                              <div className="ul-loan-title-row">
                                <h3 className="ul-loan-id">{loan.loanId}</h3>
                                <span className={`ul-loan-badge ${STATUS_CLASS[loan.status] || ''}`}>
                                  {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                </span>
                              </div>
                              <p className="ul-loan-meta">{fmtDate(loan.appliedDate)} · {loan.purpose}</p>
                            </div>
                            <div className="ul-loan-amount-block">
                              <div className="ul-loan-amount">{fmt(loan.amount)}</div>
                              <div className="ul-loan-amount-label">Original amount</div>
                            </div>
                          </div>

                          {/* Progress bar — only for active loans */}
                          {loan.status === 'active' && loan.termMonths && (
                            <div className="ul-progress-wrap">
                              <div className="ul-progress-label">
                                <span>Repayment progress</span>
                                <span>
                                  {loan.paidMonths || 0} of {loan.termMonths} payments made
                                </span>
                              </div>
                              <div className="ul-progress-bar">
                                <div
                                  className="ul-progress-fill"
                                  style={{ width: `${Math.max(2, Math.round(((loan.paidMonths || 0) / loan.termMonths) * 100))}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Meta grid */}
                          <div className="ul-loan-meta-grid">
                            <div className="ul-meta-item">
                              <div className="ul-meta-label">Monthly payment</div>
                              <div className="ul-meta-value">{loan.monthlyPayment ? fmt(loan.monthlyPayment) : '—'}</div>
                            </div>
                            <div className="ul-meta-item">
                              <div className="ul-meta-label">Remaining balance</div>
                              <div className="ul-meta-value">
                                {loan.status === 'active' && loan.remainingBalance != null ? fmt(loan.remainingBalance) : '—'}
                              </div>
                            </div>
                            <div className={`ul-meta-item ${loan.nextPaymentDate ? 'ul-meta-item--warn' : ''}`}>
                              <div className="ul-meta-label">Next due date</div>
                              <div className={`ul-meta-value ${loan.nextPaymentDate ? 'ul-meta-value--warn' : ''}`}>
                                {loan.nextPaymentDate ? fmtDate(loan.nextPaymentDate) : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="ul-loan-actions">
                            <button className="ul-action-btn" onClick={() => navigate(`/loans/${loan.loanId}?tab=schedule`)}>
                              View schedule
                            </button>
                            <button className="ul-action-btn" onClick={() => navigate(`/loans/${loan.loanId}`)}>
                              Loan details
                            </button>
                            {loan.status === 'active' && (
                              <button className="ul-action-btn ul-action-btn--primary" onClick={() => navigate(`/loans/${loan.loanId}?pay=true`)}>
                                Pay now
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Eligibility nudge */}
                  {hasActiveLoan && (
                    <div className="ul-eligible-banner">
                      <div>
                        <div className="ul-eligible-title">Eligible to re-apply after full repayment</div>
                        <div className="ul-eligible-sub">
                          Pay off {loans.find(l => l.status === 'active' || l.status === 'pending')?.loanId} to unlock your next loan application.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Loan history / loan types ── */}
                {loans.length > 0 ? (
                  <div className="ul-section">
                    <div className="ul-section-head">
                      <div className="ul-section-title">Loan history</div>
                      {totalCount > LIMIT && (
                        <div className="ul-pagination-info">
                          Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, totalCount)} of {totalCount}
                        </div>
                      )}
                    </div>

                    <div className="ul-history-list user-fade-in">
                      {loans.map((loan) => (
                        <div key={loan._id} className="ul-history-row" onClick={() => navigate(`/loans/${loan.loanId}`)}>
                          <div className={`ul-hist-icon ul-hist-icon--${loan.status === 'active' || loan.status === 'pending' ? 'active' : 'closed'}`}>
                            {loan.status === 'active' || loan.status === 'pending' ? (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="3" stroke="#185fa5" strokeWidth="1.2" /><path d="M5 8h6M5 5.5h4M5 10.5h3" stroke="#185fa5" strokeWidth="1.2" strokeLinecap="round" /></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.2" /><path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                          </div>
                          <div className="ul-hist-info">
                            <div className="ul-hist-id-row">
                              <span className="ul-hist-id">{loan.loanId}</span>
                              <span className={`ul-loan-badge ${STATUS_CLASS[loan.status] || ''}`}>
                                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                              </span>
                            </div>
                            <div className="ul-hist-sub">
                              {loan.purpose} · {loan.termMonths} months
                              {loan.status === 'active' && loan.paidMonths != null
                                ? ` · ${loan.paidMonths} of ${loan.termMonths} paid`
                                : loan.status === 'completed' ? ' · Fully paid' : ''}
                            </div>
                          </div>
                          <div className="ul-hist-right">
                            <div className="ul-hist-amount">{fmt(loan.amount)}</div>
                            <div className="ul-hist-date">{fmtDate(loan.appliedDate)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalCount > LIMIT && (
                      <div className="ul-pagination">
                        <button
                          className="ul-page-btn"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.ceil(totalCount / LIMIT) }, (_, i) => (
                          <button
                            key={i + 1}
                            className={`ul-page-btn ${page === i + 1 ? 'ul-page-btn--active' : ''}`}
                            onClick={() => setPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          className="ul-page-btn"
                          onClick={() => setPage(p => Math.min(Math.ceil(totalCount / LIMIT), p + 1))}
                          disabled={page === Math.ceil(totalCount / LIMIT)}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  renderLoanTypes()
                )}
              </>
            )}
          </>
        )}
      </div>

      <LoanApplicationModal isOpen={isLoanModalOpen} onClose={handleLoanClose} />
      <VerificationModal isOpen={isVerifyModalOpen} onClose={handleVerificationClose} />
    </div>
  );
}