import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoanApplicationModal from '../components/LoanApplicationModal';
import '../styles/Loans.css';

import API from '../../utils/api';
import { Banknote, Circle, Lock as LockIcon, X, Wallet, ShieldAlert, Clock } from 'lucide-react';
import { isOfficerPosition } from '../../utils/officerPositions';

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

  const [totalSavings, setTotalSavings] = useState(0);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  /* ── Verification & Active Loan Logic ── */
  const profile = user;
  const isVerified = isOfficerPosition(profile?.position);
  const hasActiveLoan = loans.some(l => l.status === 'active' || l.status === 'pending' || l.status === 'overdue');
  const nextDueLoan = loans.find(l => l.status === 'active' && l.nextPaymentDate);

  // Redirect non-officers away from this page
  useEffect(() => {
    if (profile && !isVerified) {
      navigate('/home', { replace: true });
    }
  }, [profile, isVerified, navigate]);

  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [loansRes, statsRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans?page=${page}&limit=${LIMIT}`, { headers }),
        fetch(`${API}/api/savings/stats`, { headers }),
      ]);
      
      const loansData = await loansRes.json();
      const statsData = await statsRes.json();

      if (loansRes.ok && loansData.success) {
        setLoans(loansData.loans || []);
        setStats(loansData.stats || { totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
        setTotalCount(loansData.pagination?.totalItems || 0);
        setError(null);
      } else {
        setError(loansData.message || 'Failed to fetch loans');
      }

      if (statsRes.ok && statsData.success) {
        setTotalSavings(statsData.totalSavings || 0);
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
      navigate('/settings');
    } else if (totalSavings < 1000) {
      // Should already be handled by UI disabling, but adding as fallback
      setError('Insufficient savings to apply for a loan.');
    } else {
      setIsLoanModalOpen(true);
    }
  };

  const handleLoanClose = () => { setIsLoanModalOpen(false); fetchAll(); };


  const renderLockedNotice = () => (
    <div className="ul-locked-banner user-fade-in">
      <div className="ul-locked-content">
        <div className="ul-locked-icon">
          <LockIcon size={20} />
        </div>
        <div className="ul-locked-text">
          <h3 className="ul-locked-title">Loan Application Locked</h3>
          <p className="ul-locked-sub">
            To apply for a loan, you must have a minimum savings balance of <strong>₱1,000</strong>.
            Please fund your savings account first.
          </p>
        </div>
      </div>
      <button className="ul-locked-action-btn" onClick={() => navigate('/savings')}>
        Open / Fund Savings
      </button>
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
      <div className="ul-loan-types">
        {[
          {
            type: 'Personal Loan',
            description: 'For any personal need such as education, home improvement, or family expenses.',
            term: '3 - 12 months',
            rate: '2% / month',
            maxAmount: 'Up to 2× savings',
            icon: <Wallet size={20} color="#1E3A8A" />,
            variant: 'blue'
          },
          {
            type: 'Emergency Loan',
            description: 'For urgent and unforeseen situations such as medical emergencies or calamities.',
            term: '1 - 6 months',
            rate: '1.5% / month',
            maxAmount: 'Up to 1.5× savings',
            icon: <ShieldAlert size={20} color="#B45309" />,
            variant: 'amber'
          },
          {
            type: 'Short-term Loan',
            description: 'Quick cash for immediate needs with faster processing and shorter repayment.',
            term: '1 - 3 months',
            rate: '1% / month',
            maxAmount: 'Up to 1× savings',
            icon: <Clock size={20} color="#0D7E6A" />,
            variant: 'teal'
          }
        ].map(lt => (
          <div key={lt.type} className="ul-lt-card">
            <div className={`ul-lt-icon ul-lt-icon--${lt.variant}`}>{lt.icon}</div>
            <div>
              <p className="ul-lt-name">{lt.type}</p>
              <p className="ul-lt-desc">{lt.description}</p>
            </div>
            <hr className="ul-lt-divider" />
            <div className="ul-lt-row"><span className="ul-lt-key">Term</span><span className="ul-lt-val">{lt.term}</span></div>
            <div className="ul-lt-row"><span className="ul-lt-key">Interest rate</span><span className="ul-lt-val">{lt.rate}</span></div>
            <div className="ul-lt-row"><span className="ul-lt-key">Max loanable</span><span className="ul-lt-val">{lt.maxAmount}</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPageSkeleton = () => (
    <div className="ul-page-container">
      <div className="ul-page-header">
        <div>
          <div className="ul-skeleton" style={{ height: '26px', width: '120px', marginBottom: '8px' }} />
          <div className="ul-skeleton" style={{ height: '14px', width: '240px' }} />
        </div>
        <div className="ul-skeleton" style={{ height: '38px', width: '140px', borderRadius: '10px' }} />
      </div>
      <div className="ul-skeleton" style={{ height: '42px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }} />
      <div className="ul-stats-grid" style={{ marginBottom: '20px' }}>
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
        <div className="ul-page-container">
          {/* Header */}
          <div className="ul-page-header">
            <div>
              <h1 className="ul-page-title">My Loans</h1>
              <p className="ul-page-subtitle">Manage your loan applications and payments</p>
            </div>

            {isVerified && !hasActiveLoan && totalSavings >= 1000 ? (
              <button className="ul-apply-btn user-fade-in" onClick={handleApplyClick}>
                + Apply for Loan
              </button>
            ) : isVerified && !hasActiveLoan && totalSavings < 1000 ? (
              <div className="ul-apply-btn-disabled" title="You need at least ₱1,000 in savings to apply for a loan">
                <LockIcon size={16} /> Apply for Loan
              </div>
            ) : isVerified && hasActiveLoan ? (
              <div className="ul-apply-btn-disabled" title="You already have an active or pending loan">
                <LockIcon size={16} /> Apply for Loan
              </div>
            ) : null}
          </div>

          {/* Error */}
          {error && (
            <div className="ul-error-banner">
              <span>Error {error}</span>
              <button onClick={fetchAll} className="ul-retry-btn">Retry</button>
            </div>
          )}

          {!error && (
            <>
              {isVerified && totalSavings < 1000 && renderLockedNotice()}
              {isVerified && hasActiveLoan && renderPolicyBar()}

              {/* Stats */}
              <div className="ul-stats-grid">
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
                <div className={`ul-stat-card ${nextDueLoan && nextDueLoan.nextPaymentDate && new Date(nextDueLoan.nextPaymentDate) < new Date() ? 'ul-stat-card--overdue' : ''}`}>
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
                      {totalSavings >= 1000 ? (
                        <button className="ul-empty-apply-btn user-fade-in" onClick={handleApplyClick}>Apply for a loan</button>
                      ) : (
                        <div className="ul-empty-apply-btn-disabled" title="You need at least ₱1,000 in savings to apply for a loan">
                          <LockIcon size={14} /> Apply for a loan
                        </div>
                      )}
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

    </>
  );
}