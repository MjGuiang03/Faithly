import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import LoanApplicationModal from '../components/LoanApplicationModal';
import '../styles/Loans.css';
import '../styles/LoanApplicationModal.css';

import API from '../../utils/api';
import { Banknote, Lock as LockIcon, X, Wallet, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';
import { isOfficerPosition } from '../../utils/officerPositions';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00';

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
  cancelled:  'ul-badge-rejected',
};

const STATUS_TEXT = {
  pending:    'Pending review',
  approved:   'Approved',
  active:     'Active',
  completed:  'Completed',
  rejected:   'Rejected',
  overdue:    'Overdue',
  awaiting_member_approval: 'Review requested',
  cancelled:  'Cancelled',
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
  const [pendingSavings, setPendingSavings] = useState(0);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  const [cancelModalData, setCancelModalData] = useState({ open: false, loanId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonOther, setCancelReasonOther] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [hasClosedInstruction, setHasClosedInstruction] = useState(false);

  /* ── Verification & Active Loan Logic ── */
  const profile = user;
  const isVerified = isOfficerPosition(profile?.position);
  const hasActiveLoan = loans.some(l => ['active', 'pending', 'approved', 'overdue', 'awaiting_member_approval'].includes(l.status));
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
        
        if ((loansData.loans || []).length === 0 && !hasClosedInstruction) {
            setShowInstruction(true);
        }
      } else {
        setError(loansData.message || 'Failed to fetch loans');
      }

      if (statsRes.ok && statsData.success) {
        setTotalSavings(statsData.stats?.totalSavings || 0);
        setPendingSavings(statsData.stats?.pendingSavings || 0);
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

  const handleCancelClick = (loanId) => {
    setCancelModalData({ open: true, loanId });
    setCancelReason('');
    setCancelReasonOther('');
  };

  const closeCancelModal = () => {
    setCancelModalData({ open: false, loanId: null });
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason) {
      toast.error('Please select a reason for cancellation');
      return;
    }
    const finalReason = cancelReason === 'Other' ? cancelReasonOther : cancelReason;
    if (!finalReason.trim()) {
      toast.error('Please specify the reason');
      return;
    }

    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/loans/${cancelModalData.loanId}/cancel`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Loan application cancelled");
        closeCancelModal();
        fetchAll();
      } else {
        toast.error(data.message || "Failed to cancel loan");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };


  const renderLockedNotice = () => (
    <div className="ul-locked-banner user-fade-in">
      <div className="ul-locked-content">
        <div className="ul-locked-icon">
          <LockIcon size={20} />
        </div>
        <div className="ul-locked-text">
          <h3 className="ul-locked-title">Unlock Your Loan Privileges</h3>
          <p className="ul-locked-sub">
            Grow your savings to <strong>₱1,000</strong> to unlock access to our loan programs.
          </p>
          <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', gap: '16px', opacity: 0.9 }}>
            <span><strong>Confirmed:</strong> ₱{Number(totalSavings).toLocaleString()}</span>
            {pendingSavings > 0 && (
              <span style={{ color: '#F59E0B' }}><strong>Pending:</strong> ₱{Number(pendingSavings).toLocaleString()}</span>
            )}
          </div>
          {pendingSavings > 0 && totalSavings < 1000 && (
            <p className="ul-locked-sub" style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '12px' }}>
              Your loan application will be unlocked once your pending deposits are confirmed by an admin.
            </p>
          )}
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
            
            <div className="ul-header-actions" style={{ display: 'flex', gap: '12px' }}>
              {loans.length === 0 && (
                <button className="sv-instruction-header-btn" onClick={() => setShowInstruction(true)}>
                  See Instructions
                </button>
              )}
            </div>
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
                <div className="ul-stat-card ul-stat-card--primary">
                  <label className="ul-stat-label">Total Borrowed</label>
                  <div className="ul-stat-value">{fmt(stats.totalBorrowed)}</div>
                  <div className="ul-stat-sub">
                    {stats.activeCount > 0 
                      ? `${stats.activeCount} active loan(s)` 
                      : (loans.some(l => l.status === 'approved' || l.status === 'pending') 
                          ? 'Awaiting disbursement' 
                          : 'No active items')
                    }
                  </div>
                </div>
                <div className="ul-stat-card ul-stat-card--primary">
                  <label className="ul-stat-label">Remaining Balance</label>
                  <div className="ul-stat-value">
                    {stats.activeCount > 0 ? fmt(stats.remainingBalance) : '₱0.00'}
                  </div>
                  <div className="ul-stat-sub">
                    {stats.activeCount > 0 && stats.totalBorrowed > 0
                      ? `${Math.round((stats.remainingBalance / stats.totalBorrowed) * 100)}% outstanding`
                      : 'No active repayments'}
                  </div>
                </div>
                <div className={`ul-stat-card ${nextDueLoan && nextDueLoan.nextPaymentDate && new Date(nextDueLoan.nextPaymentDate) < new Date() ? 'ul-stat-card--overdue' : 'ul-stat-card--primary'}`}>
                  {nextDueLoan ? (
                    <>
                      <label className="ul-stat-label">Next Payment</label>
                      <div className="ul-stat-value">{fmt(nextDueLoan.upcomingPaymentAmount || nextDueLoan.monthlyPayment)}</div>
                      <div className="ul-stat-sub">Due {fmtDate(nextDueLoan.nextPaymentDate)}</div>
                    </>
                  ) : (
                    <>
                      <label className="ul-stat-label">Next Due</label>
                      <div className="ul-stat-value">₱0.00</div>
                      <div className="ul-stat-sub">{loans.some(l => l.status === 'approved' || l.status === 'pending') ? 'Pending disbursement' : 'No upcoming payments'}</div>
                    </>
                  )}
                </div>
              </div>

              {isVerified && (
                <div className="ul-section">
                  <div className="ul-section-head">
                    <div className="ul-section-title">Active loan</div>
                  </div>

                  {loans.filter(l => ['active', 'pending', 'approved', 'awaiting_member_approval', 'overdue'].includes(l.status)).length === 0 ? (
                    <div className="ul-empty-state">
                      <div className="ul-empty-icon" style={{ background: 'rgba(21, 93, 252, 0.1)' }}>
                        <Banknote size={24} color="#155DFC" />
                      </div>
                      <div className="ul-empty-title">No active loan</div>
                      <p className="ul-empty-sub">You haven't taken out a loan yet. Apply now and get funds disbursed directly to your account.</p>
                      {totalSavings >= 1000 && (
                        <button className="ul-empty-apply-btn user-fade-in" onClick={handleApplyClick}>Apply for a loan</button>
                      )}
                    </div>
                  ) : (
                    <div className="ul-loans-list user-fade-in">
                      {loans.filter(l => ['active', 'pending', 'approved', 'awaiting_member_approval', 'overdue'].includes(l.status)).slice(0, 1).map((loan) => (
                        <div key={loan._id} className="ul-loan-card">
                          <div className="ul-loan-card-top">
                            <div>
                              <div className="ul-loan-title-row">
                                <h3 className="ul-loan-id">{loan.loanId}</h3>
                                <span className={`ul-loan-badge ${STATUS_CLASS[loan.status] || ''}`}>
                                  {STATUS_TEXT[loan.status] || loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                </span>
                              </div>
                              <p className="ul-loan-meta">{fmtDate(loan.appliedDate)} · {loan.purpose}</p>
                            </div>
                            <div className="ul-loan-amount-block">
                              <div className="ul-loan-amount">{fmt(loan.amount)}</div>
                              <div className="ul-loan-amount-label">Original amount</div>
                            </div>
                          </div>

                          {loan.status === 'active' ? (
                            <>
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

                              <div className="ul-loan-meta-grid">
                                <div className="ul-meta-item">
                                  <div className="ul-meta-label">Monthly payment</div>
                                  <div className="ul-meta-value">{loan.monthlyPayment ? fmt(loan.monthlyPayment) : '—'}</div>
                                </div>
                                <div className="ul-meta-item">
                                  <div className="ul-meta-label">Remaining balance</div>
                                  <div className="ul-meta-value">
                                    {loan.remainingBalance != null ? fmt(loan.remainingBalance) : '—'}
                                  </div>
                                </div>
                                <div className={`ul-meta-item ${loan.nextPaymentDate && new Date(loan.nextPaymentDate) < new Date() ? 'ul-meta-item--warn' : ''}`}>
                                  <div className="ul-meta-label">Next due date</div>
                                  <div className={`ul-meta-value ${loan.nextPaymentDate && new Date(loan.nextPaymentDate) < new Date() ? 'ul-meta-value--warn' : ''}`}>
                                    {loan.nextPaymentDate ? fmtDate(loan.nextPaymentDate) : '—'}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : null}

                          <div className="ul-loan-actions" style={{ marginTop: ['pending', 'awaiting_member_approval', 'approved'].includes(loan.status) ? '16px' : '0' }}>
                            {loan.status !== 'pending' && loan.status !== 'awaiting_member_approval' && (
                              <>
                                <button className="ul-action-btn" onClick={() => navigate(`/loans/${loan.loanId}?tab=schedule`)}>
                                  View schedule
                                </button>
                                <button className="ul-action-btn" onClick={() => navigate(`/loans/${loan.loanId}`)}>
                                  Loan details
                                </button>
                              </>
                            )}
                            {loan.status === 'active' && (
                              <button className="ul-action-btn ul-action-btn--primary" style={{ marginLeft: 'auto' }} onClick={() => navigate(`/loans/${loan.loanId}?pay=true`)}>
                                Pay now
                              </button>
                            )}
                            {loan.status === 'approved' && (
                              <button className="ul-action-btn" disabled title="Awaiting secretary disbursement" style={{ marginLeft: 'auto', opacity: 0.6, cursor: 'not-allowed' }}>
                                Awaiting disbursement
                              </button>
                            )}
                            {['pending', 'awaiting_member_approval', 'approved'].includes(loan.status) && (
                              <button 
                                className="ul-action-btn ul-action-btn--cancel" 
                                style={{ marginLeft: loan.status === 'approved' ? '0' : 'auto' }}
                                onClick={() => handleCancelClick(loan._id)}
                              >
                                Cancel application
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
              {loans.filter(l => ['completed', 'rejected', 'cancelled'].includes(l.status)).length > 0 ? (
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
                    {loans.filter(l => ['completed', 'rejected', 'cancelled'].includes(l.status)).map((loan) => {
                      let iconColor = "#0D1F45";
                      let iconBg = "rgba(13, 31, 69, 0.1)";
                      let Icon = CheckCircle2;

                      if (loan.status === 'active') {
                        Icon = Banknote;
                      } else if (loan.status === 'pending' || loan.status === 'approved' || loan.status === 'overdue' || loan.status === 'awaiting_member_approval') {
                        Icon = Clock;
                      } else if (loan.status === 'rejected' || loan.status === 'cancelled') {
                        Icon = X;
                      }

                      return (
                        <div key={loan._id} className="ul-history-row" onClick={() => navigate(`/loans/${loan.loanId}`)}>
                          <div className="ul-hist-icon" style={{ background: iconBg }}>
                            <Icon size={18} color={iconColor} />
                          </div>
                          <div className="ul-hist-info">
                            <div className="ul-hist-id-row">
                              <span className="ul-hist-id">{loan.loanId}</span>
                              <span className={`ul-loan-badge ${STATUS_CLASS[loan.status] || ''}`}>
                                {STATUS_TEXT[loan.status] || loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
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
                      );
                    })}
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
              ) : loans.length === 0 ? (
                renderLoanTypes()
              ) : null}
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

      {cancelModalData.open && (
        <div className="user-loan-application-overlay">
          <div className="user-loan-application-content" style={{ maxWidth: '400px', margin: 'auto' }}>
            <div className="user-loan-application-header">
              <h2 className="user-loan-application-title">Cancel Application</h2>
              <button className="user-loan-application-close-btn" onClick={closeCancelModal}><X size={20} /></button>
            </div>
            <div className="ula-modal-body" style={{ padding: '24px' }}>
              <form onSubmit={handleCancelSubmit}>
                <div className="ula-form-group" style={{ marginBottom: '16px' }}>
                  <label className="user-loan-application-label">Reason for cancellation</label>
                  <select 
                    className="user-loan-application-select"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a reason...</option>
                    <option value="Found a better alternative">Found a better alternative</option>
                    <option value="No longer need the loan">No longer need the loan</option>
                    <option value="Applied by mistake">Applied by mistake</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {cancelReason === 'Other' && (
                  <div className="ula-form-group" style={{ marginBottom: '16px' }}>
                    <label className="user-loan-application-label">Please specify</label>
                    <input 
                      type="text" 
                      className="user-loan-application-input"
                      value={cancelReasonOther}
                      onChange={(e) => setCancelReasonOther(e.target.value)}
                      placeholder="Type your reason here..."
                      required
                    />
                  </div>
                )}
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button type="button" className="ul-action-btn" onClick={closeCancelModal} style={{ flex: 1, justifyContent: 'center' }}>
                    Keep application
                  </button>
                  <button type="submit" className="ul-action-btn" disabled={isCancelling} style={{ flex: 1, justifyContent: 'center', color: '#fff', background: '#dc2626', borderColor: '#dc2626' }}>
                    {isCancelling ? 'Cancelling...' : 'Cancel Loan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <LoanInstructionModal 
        isOpen={showInstruction} 
        onClose={() => {
            setShowInstruction(false);
            setHasClosedInstruction(true);
        }}
        onApply={handleApplyClick}
        isLocked={isVerified && totalSavings < 1000}
      />
    </>
  );
}

function LoanInstructionModal({ isOpen, onClose, onApply, isLocked }) {
    if (!isOpen) return null;

    return (
        <div className="user-savings-modal-overlay">
            <div className="user-savings-modal-content sv-instruction-modal user-fade-in" style={{ maxWidth: '700px', padding: 0, overflow: 'hidden' }}>
                <div className="sv-inst-header">
                    <h2>How to Apply for a Loan</h2>
                    <p>Access fast, secure loans straight from your FaithLy account. Here’s how it works.</p>
                </div>
                
                <div className="sv-inst-body" style={{ padding: '32px 24px' }}>
                    <div className="sv-timeline">
                        <div className="sv-timeline-item sv-timeline-item--left">
                            <div className="sv-timeline-dot"></div>
                            <div className="sv-timeline-content">
                                <h3>Check Your Eligibility</h3>
                                <p>To access loans, you must have at least <strong>₱1,000</strong> in confirmed savings. Your loan limits are based on your total savings balance.</p>
                            </div>
                        </div>
                        
                        <div className="sv-timeline-item sv-timeline-item--right">
                            <div className="sv-timeline-dot"></div>
                            <div className="sv-timeline-content">
                                <h3>Choose Your Loan Type</h3>
                                <p>We offer <strong>Personal (2x)</strong>, <strong>Emergency (1.5x)</strong>, and <strong>Short-Term (1x)</strong> loans. Pick the one that fits your current needs and repayment capacity.</p>
                            </div>
                        </div>
                        
                        <div className="sv-timeline-item sv-timeline-item--left">
                            <div className="sv-timeline-dot"></div>
                            <div className="sv-timeline-content">
                                <h3>Apply and Get Funded</h3>
                                <p>Submit your application in seconds. Once approved by the administration, your funds will be disbursed directly.</p>
                                {!isLocked && (
                                    <button className="sv-inst-action-link" onClick={() => { onClose(); onApply(); }}>Apply for a loan now →</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="sv-inst-footer">
                    <button className="sv-inst-close-btn" onClick={onClose}>Got it, thanks!</button>
                </div>
            </div>
        </div>
    );
}