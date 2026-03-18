import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoanApplicationModal from '../components/LoanApplicationModal';
import VerificationModal from '../components/OfficerVerification';
import '../styles/Loans.css';
import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/* status pill colours */
const STATUS_CLASS = {
  active:    'user-loan-status-active',
  pending:   'user-loan-status-pending',
  completed: 'user-loan-status-completed',
  rejected:  'user-loan-status-rejected',
};

export default function Loans() {
  const navigate = useNavigate();
  useAuth();

  /* ── modal visibility ── */
  const [isLoanModalOpen,    setIsLoanModalOpen]    = useState(false);
  const [isVerifyModalOpen,  setIsVerifyModalOpen]  = useState(false);

  /* ── data ── */
  const [loans,               setLoans]               = useState([]);
  const [stats,               setStats]               = useState({ totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
  const [verificationStatus,  setVerificationStatus]  = useState(null); // null = loading
  const [dataLoading,         setDataLoading]         = useState(true);
  const [error,               setError]               = useState('');
  const [page,                setPage]                = useState(1);
  const [totalCount,          setTotalCount]          = useState(0);
  const LIMIT = 5;

  /* ────────────────────────────────────────────────────────
     Fetch loans + verification status in parallel
  ──────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    setError('');

    const token = localStorage.getItem('token');

    // No token at all — treat as unverified, show empty state
    if (!token) {
      setVerificationStatus('unverified');
      setDataLoading(false);
      return;
    }

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      const [loansRes, verifyRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans?page=${page}&limit=${LIMIT}`, { headers }),
        fetch(`${API}/api/verification/status`,  { headers }),
      ]);

      // ── Handle expired / invalid token ──────────────────────────────
      if (loansRes.status === 401 || verifyRes.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
        return;
      }

      const loansData  = await loansRes.json();
      const verifyData = await verifyRes.json();

      if (loansRes.ok && loansData.success) {
        setLoans(loansData.loans  || []);
        setStats(loansData.stats  || { totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
        setTotalCount(loansData.totalCount || 0);
      } else {
        // 404 means user was deleted from DB — clear loans silently
        setLoans([]);
        setStats({ totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
        if (loansRes.status !== 404) setError(loansData.message || 'Failed to load loans');
      }

      if (verifyRes.ok && verifyData.success) {
        setVerificationStatus(verifyData.verificationStatus || 'unverified');
      } else {
        // 404 = user doc deleted, reset to unverified cleanly
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
  

  /* ────────────────────────────────────────────────────────
     Gate: what happens when "+ Apply for Loan" is clicked
  ──────────────────────────────────────────────────────── */
  const handleApplyClick = () => {
    if (verificationStatus === 'verified') {
      setIsLoanModalOpen(true);
    } else {
      setIsVerifyModalOpen(true);
    }
  };

  /* Re-fetch after verification submission so the badge updates */
  const handleVerificationClose = () => {
    setIsVerifyModalOpen(false);
    fetchAll();
  };

  /* Re-fetch after a loan is successfully submitted */
  const handleLoanClose = () => {
    setIsLoanModalOpen(false);
    fetchAll();
  };

  /* ────────────────────────────────────────────────────────
     Verification status badge
  ──────────────────────────────────────────────────────── */
  /*
  const renderVerificationBadge = () => {
    if (verificationStatus === null) return null;

    const MAP = {
      verified:   { cls: 'verify-badge-verified',  icon: '✓', label: 'Officer Verified' },
      pending:    { cls: 'verify-badge-pending',   icon: '⏳', label: 'Verification Pending' },
      rejected:   { cls: 'verify-badge-rejected',  icon: '✗', label: 'Verification Rejected' },
      unverified: { cls: 'verify-badge-unverified',icon: '!', label: 'Verification Required' },
    };

    const { cls, icon, label } = MAP[verificationStatus] || MAP.unverified;

    return (
      <div className={`verify-badge ${cls}`}>
        <span className="verify-badge-icon">{icon}</span>
        <span>{label}</span>
        {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
          <button
            className="verify-badge-link"
            onClick={() => setIsVerifyModalOpen(true)}
          >
            {verificationStatus === 'rejected' ? 'Resubmit' : 'Get verified'}
          </button>
        )}
      </div>
    );
  };
  */

  /* ────────────────────────────────────────────────────────
     Locked state (shown when not yet verified)
  ──────────────────────────────────────────────────────── */
  const renderLockedBanner = () => (
    <div className="user-loans-locked-banner">
      <div className="user-loans-locked-icon">🔒</div>
      <div className="loans-locked-content">
        <h3 className="user-loans-locked-title">Officer Verification Required</h3>
        <p className="user-loans-locked-text">
          {verificationStatus === 'pending'
            ? 'Your verification is under review. You will be notified once approved — this usually takes 3–5 business days.'
            : verificationStatus === 'rejected'
            ? 'Your verification was not approved. Please resubmit with the correct information.'
            : 'To access the Loan module you must first verify your officer status. This is a one-time process.'}
        </p>
        {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
          <button className="user-loans-locked-cta" onClick={() => setIsVerifyModalOpen(true)}>
            {verificationStatus === 'rejected' ? 'Resubmit Verification' : 'Start Verification'}
          </button>
        )}
      </div>
    </div>
  );

  /* ────────────────────────────────────────────────────────
     Render
  ──────────────────────────────────────────────────────── */
  return (
    <div className="home-layout">
      <Sidebar />

      <div className="user-main-content">
        {/* Header */}
        <div className="user-loans-page-header">
          <div className="user-loans-header-content">
            <div>
              <h1 className="user-loans-page-title">My Loans</h1>
              <p className="user-loans-page-subtitle">Manage your loan applications and payments</p>
            </div>

            <div className="user-loans-header-right">
              <button
                className={`user-apply-loan-btn ${verificationStatus !== 'verified' ? 'user-apply-loan-btn-locked' : ''}`}
                onClick={verificationStatus === 'verified' ? handleApplyClick : undefined}
                disabled={verificationStatus !== 'verified'}
                title={
                  verificationStatus === 'pending'
                    ? 'Your verification is under review — please wait'
                  : verificationStatus === 'rejected'
                    ? 'Verification rejected — please resubmit below'
                  : verificationStatus !== 'verified'
                    ? 'Officer verification required'
                  : ''
                }
              >
                {verificationStatus === 'pending'
                  ? ' Verification Pending'
                  : verificationStatus !== 'verified'
                  ? ' Apply for Loan'
                  : '+ Apply for Loan'}
              </button>
            </div>
          </div>
        </div>


        {/* Error */}
        {!dataLoading && error && (
          <div className="user-loans-error-banner">
            <span>⚠ {error}</span>
            <button onClick={fetchAll} className="user-loans-retry-btn">Retry</button>
          </div>
        )}

        {!dataLoading && !error && (
          <>
            {/* Locked banner for unverified users */}
            {verificationStatus !== 'verified' && renderLockedBanner()}

            {/* Stats — always visible */}
            <div className="user-loans-stats">
              <div className="user-loan-stat-card">
                <p className="user-loan-stat-label">Total Borrowed</p>
                {dataLoading ? <div className="user-skeleton" style={{ height: '24px', width: '100px', margin: '4px 0' }}></div> : <p className="user-loan-stat-value user-fade-in">{fmt(stats.totalBorrowed)}</p>}
              </div>
              <div className="user-loan-stat-card">
                <p className="user-loan-stat-label">Remaining Balance</p>
                {dataLoading ? <div className="user-skeleton" style={{ height: '24px', width: '100px', margin: '4px 0' }}></div> : <p className="user-loan-stat-value user-fade-in">{fmt(stats.remainingBalance)}</p>}
              </div>
              <div className="user-loan-stat-card user-loan-stat-card-active">
                <p className="user-loan-stat-label">Active Loans</p>
                {dataLoading ? <div className="user-skeleton" style={{ height: '24px', width: '40px', margin: '4px 0' }}></div> : <p className="user-loan-stat-value user-fade-in">{stats.activeCount}</p>}
              </div>
            </div>

            {/* Loans list — only shown when verified */}
            {verificationStatus === 'verified' && (
              <div className="user-all-loans-section">
                <div className="user-loans-history-header">
                  <h2 className="user-loans-section-title">All Loans</h2>
                </div>

                {dataLoading ? (
                  <div className="user-loans-list">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="user-loan-item" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                          <div style={{ flex: 1 }}>
                            <div className="user-skeleton" style={{ height: '18px', width: '30%', marginBottom: '8px' }}></div>
                            <div className="user-skeleton" style={{ height: '14px', width: '20%' }}></div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="user-skeleton" style={{ height: '20px', width: '80px', marginBottom: '8px' }}></div>
                            <div className="user-skeleton" style={{ height: '32px', width: '100px', borderRadius: '6px' }}></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '24px' }}>
                          <div className="user-skeleton" style={{ height: '40px', flex: 1, borderRadius: '8px' }}></div>
                          <div className="user-skeleton" style={{ height: '40px', flex: 1, borderRadius: '8px' }}></div>
                          <div className="user-skeleton" style={{ height: '40px', flex: 1, borderRadius: '8px' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loans.length === 0 ? (
                  <div className="user-loans-empty">
                    <p className="user-loans-empty-icon">📋</p>
                    <p className="user-loans-empty-title">No loans yet</p>
                    <p className="user-loans-empty-text">Click "+ Apply for Loan" to get started.</p>
                  </div>
                ) : (
                  <div className="user-loans-list user-fade-in">
                    {loans.map((loan) => (
                        <div key={loan._id} className="user-loan-item">
                        {/* Loan Header */}
                        <div className="user-loan-item-header">
                          <div className="user-loan-item-main">
                            <div className="user-loan-item-info">
                              <div className="user-loan-item-title-row">
                                <h3 className="user-loan-id">{loan.loanId}</h3>
                                <span className={`user-loan-status-badge ${STATUS_CLASS[loan.status] || ''}`}>
                                  {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                </span>
                                <span className="user-loan-purpose-inline">— {loan.purpose}</span>
                              </div>
                              <p className="user-loan-applied">{fmtDate(loan.appliedDate)}</p>
                            </div>
                          </div>

                          <div className="user-loan-item-amount">
                            <p className="user-loan-amount">{fmt(loan.amount)}</p>
                            <button
                              className="user-view-details-btn"
                              onClick={() => navigate(`/loans/${loan.loanId}`)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>

                        {/* Loan Details */}
                        <div className="user-loan-item-details">
                          <div className="user-loan-detail">
                            <p className="user-loan-detail-label">Monthly Payment</p>
                            <p className="user-loan-detail-value">
                              {loan.monthlyPayment ? fmt(loan.monthlyPayment) : '—'}
                            </p>
                          </div>
                          <div className="user-loan-detail">
                            <p className="user-loan-detail-label">Remaining Balance</p>
                            <p className="user-loan-detail-value">
                              {loan.remainingBalance != null ? fmt(loan.remainingBalance) : fmt(loan.amount)}
                            </p>
                          </div>
                          <div className="user-loan-detail">
                            <p className="user-loan-detail-label">Next Payment</p>
                            <p className="user-loan-detail-value">
                              {loan.nextPaymentDate ? fmtDate(loan.nextPaymentDate) : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                      ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalCount > LIMIT && (
                  <div className="user-loans-pagination">
                    <p className="user-loans-pagination-info">
                      Showing {((page - 1) * LIMIT) + 1} to {Math.min(page * LIMIT, totalCount)} of {totalCount} records
                    </p>
                    <div className="user-loans-pagination-controls">
                      <button 
                         className="user-loans-page-btn" 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.ceil(totalCount / LIMIT) }, (_, i) => (
                        <button
                          key={i + 1}
                          className={`user-loans-page-btn ${page === i + 1 ? 'user-loans-page-btn-active' : ''}`}
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button 
                         className="user-loans-page-btn" 
                        onClick={() => setPage(p => Math.min(Math.ceil(totalCount / LIMIT), p + 1))}
                        disabled={page === Math.ceil(totalCount / LIMIT)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Loan Application Modal — only reachable when verified */}
      <LoanApplicationModal
        isOpen={isLoanModalOpen}
        onClose={handleLoanClose}
      />

      {/* Officer Verification Modal */}
      <VerificationModal
        isOpen={isVerifyModalOpen}
        onClose={handleVerificationClose}
      />
    </div>
  );
}