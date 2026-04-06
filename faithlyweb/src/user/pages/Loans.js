import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
// import Sidebar from '../components/Sidebar'; // Moved to UserLayout
import LoanApplicationModal from '../components/LoanApplicationModal';
import VerificationModal from '../components/OfficerVerification';
import '../styles/Loans.css';

import API from '../../utils/api';
import { Banknote, Circle, Lock as LockIcon, X, Wallet, ShieldAlert, Clock } from 'lucide-react';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const LIMIT = 5;

const STATUS_CLASS = {
  pending:    'ul-badge-pending',
  approved:   'ul-badge-approved',
  active:     'ul-badge-active',
  completed:  'ul-badge-completed',
  rejected:   'ul-badge-rejected',
  overdue:    'ul-badge-overdue',
};

export default function Loans() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loans,        setLoans]        = useState([]);
  const [stats,        setStats]        = useState({ totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
  const [dataLoading,  setDataLoading]  = useState(true);
  const [error,        setError]        = useState(null);
  const [page,         setPage]         = useState(1);
  const [totalCount,   setTotalCount]   = useState(0);

  const [isLoanModalOpen,   setIsLoanModalOpen]   = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  /* ── Verification & Active Loan Logic ── */
  const profile = user;
  const verificationStatus = profile?.verificationStatus || 'unverified';
  const isVerified = verificationStatus === 'verified';
  const hasActiveLoan = loans.some(l => l.status === 'active' || l.status === 'pending' || l.status === 'overdue');
  const nextDueLoan = loans.find(l => l.status === 'active' && l.nextPaymentDate);
  const totalSavings = profile?.totalSavings || 0;

  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/loans/my-loans?page=${page}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoans(data.loans || []);
        setStats(data.stats || { totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
        setTotalCount(data.pagination?.totalItems || 0);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch loans');
      }
    } catch {
      setError('Connection failure');
    } finally {
      setDataLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApplyClick = () => {
    if (!isVerified) {
      setIsVerifyModalOpen(true);
    } else {
      setIsLoanModalOpen(true);
    }
  };

  const handleLoanClose = () => { setIsLoanModalOpen(false); fetchAll(); };
  const handleVerificationClose = () => setIsVerifyModalOpen(false);

  const renderLockedBanner = () => (
    <div className="ul-locked-banner">
      <div className="ul-locked-content">
        <div className="ul-locked-icon"><LockIcon size={20} /></div>
        <div className="ul-locked-text">
          <p className="ul-locked-title">Officer Verification Required</p>
          <p className="ul-locked-sub">Only verified church officers can apply for loans. Please complete your verification in Settings.</p>
        </div>
      </div>
      <button className="ul-locked-action-btn" onClick={() => navigate('/settings')}>Get Verified</button>
    </div>
  );

  const renderPolicyBar = () => (
    <div className="ul-policy-bar">
      <div className="ul-policy-text">
        <strong>Loan Policy:</strong> Repayments are automatically tracked. Ensure your savings balance remains sufficient for your loan bracket.
      </div>
    </div>
  );

  const renderLoanTypes = () => (
    <div className="ul-section">
      <div className="ul-section-head">
        <div className="ul-section-title">Available loan types</div>
      </div>
      <div className="ul-loan-types-grid">
        {[
          { type: 'Personal Loan', term: 'Up to 24 months', rate: '5% p.a.', icon: <Wallet size={20} color="#155DFC" /> },
          { type: 'Emergency Loan', term: 'Up to 12 months', rate: '3% p.a.', icon: <ShieldAlert size={20} color="#155DFC" /> },
          { type: 'Short-term Loan', term: 'Up to 6 months', rate: '2% p.a.', icon: <Clock size={20} color="#155DFC" /> }
        ].map(lt => (
          <div key={lt.type} className="ul-loan-type-card">
            <div className="ul-lt-header">
              <div className="ul-lt-icon" style={{ background: 'rgba(21, 93, 252, 0.1)' }}>{lt.icon}</div>
              <p className="ul-lt-title">{lt.type}</p>
            </div>
            <hr className="ul-lt-divider" />
            <div className="ul-lt-row"><span className="ul-lt-key">Term</span><span className="ul-lt-val">{lt.term}</span></div>
            <div className="ul-lt-row"><span className="ul-lt-key">Interest rate</span><span className="ul-lt-val">{lt.rate}</span></div>
            <div className="ul-lt-row"><span className="ul-lt-key">Amount basis</span><span className="ul-lt-val">Savings balance</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPageSkeleton = () => (
    <div className="ul-main-content">
      <div className="ul-page-header">
        <div>
          <div className="ul-skeleton" style={{ height: '26px', width: '120px', marginBottom: '8px' }} />
          <div className="ul-skeleton" style={{ height: '14px', width: '240px' }} />
        </div>
        <div className="ul-skeleton" style={{ height: '38px', width: '140px', borderRadius: '10px' }} />
      </div>
      <div className="ul-skeleton" style={{ height: '42px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }} />
      <div className="ul-stats" style={{ marginBottom: '20px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="ul-stat-card" style={{ gap: '8px' }}>
            <div className="ul-skeleton" style={{ height: '11px', width: '60%' }} />
            <div className="ul-skeleton" style={{ height: '28px', width: '80%' }} />
            <div className="ul-skeleton" style={{ height: '11px', width: '50%' }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {dataLoading ? renderPageSkeleton() : (
        <div className="ul-main-content">
          {/* Header */}
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

          {/* Error */}
          {error && (
            <div className="user-loans-error-banner">
              <span>Error {error}</span>
              <button onClick={fetchAll} className="user-loans-retry-btn">Retry</button>
            </div>
          )}

          {!error && (
            <>
              {!isVerified && renderLockedBanner()}
              {isVerified && hasActiveLoan && renderPolicyBar()}

              {/* Stats */}
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
                <div className={`ul-stat-card ${nextDueLoan && nextDueLoan.nextPaymentDate && new Date(nextDueLoan.nextPaymentDate) < new Date() ? 'ul-stat-card--warn' : ''}`}>
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

              {isVerified && (
                <div className="ul-section">
                  <div className="ul-section-head">
                    <div className="ul-section-title">Active loan</div>
                  </div>

                  {loans.filter(l => l.status === 'active' || l.status === 'pending').length === 0 ? (
                    <div className="ul-empty-state">
                      <div className="ul-empty-icon" style={{ background: 'rgba(21, 93, 252, 0.1)' }}>
                        <Banknote size={24} color="#155DFC" />
                      </div>
                      <div className="ul-empty-title">No active loan</div>
                      <p className="ul-empty-sub">You haven't taken out a loan yet. Apply now and get funds disbursed directly to your account.</p>
                      <button className="ul-empty-apply-btn" onClick={handleApplyClick}>Apply for a loan</button>
                    </div>
                  ) : (
                    <div className="ul-loans-list user-fade-in">
                      {loans.filter(l => l.status === 'active' || l.status === 'pending').slice(0, 1).map((loan) => (
                        <div key={loan._id} className="ul-loan-card">
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

                          {loan.status === 'active' && loan.termMonths && (
                            <div className="ul-progress-wrap">
                              <div className="ul-progress-label">
                                <span>Repayment progress</span>
                                <span>{loan.paidMonths || 0} of {loan.termMonths} payments made</span>
                              </div>
                              <div className="ul-progress-bar">
                                <div
                                  className="ul-progress-fill"
                                  style={{ width: `${Math.max(2, Math.round(((loan.paidMonths || 0) / loan.termMonths) * 100))}%` }}
                                />
                              </div>
                            </div>
                          )}

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
                            <div className={`ul-meta-item ${loan.nextPaymentDate && new Date(loan.nextPaymentDate) < new Date() ? 'ul-meta-item--warn' : ''}`}>
                              <div className="ul-meta-label">Next due date</div>
                              <div className={`ul-meta-value ${loan.nextPaymentDate && new Date(loan.nextPaymentDate) < new Date() ? 'ul-meta-value--warn' : ''}`}>
                                {loan.nextPaymentDate ? fmtDate(loan.nextPaymentDate) : '—'}
                              </div>
                            </div>
                          </div>

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
                </div>
              )}

              {/* Loan history / loan types */}
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
                        <div className={`ul-hist-icon ul-hist-icon--${loan.status === 'active' || loan.status === 'pending' ? 'active' : 'closed'}`} style={{ background: 'rgba(21, 93, 252, 0.1)' }}>
                          {loan.status === 'active' || loan.status === 'pending' ? (
                            <X size={16} color="#155DFC" />
                          ) : (
                            <Circle size={16} color="#155DFC" />
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
        </div>
      )}

      <LoanApplicationModal
        isOpen={isLoanModalOpen}
        onClose={handleLoanClose}
        totalSavings={totalSavings}
        existingLoanBalance={stats.remainingBalance || 0}
        hasOverdueLoans={loans.some(l => l.status === 'overdue')}
      />
      <VerificationModal isOpen={isVerifyModalOpen} onClose={handleVerificationClose} />
    </>
  );
}