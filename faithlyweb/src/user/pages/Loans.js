import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoanApplicationModal from '../components/LoanApplicationModal';
import VerificationModal from '../components/OfficerVerification';
import '../styles/Loans.css';

const API = process.env.REACT_APP_API_URL;

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/* status pill colours */
const STATUS_CLASS = {
  active:    'loan-status-active',
  pending:   'loan-status-pending',
  completed: 'loan-status-completed',
  rejected:  'loan-status-rejected',
};

export default function Loans() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── modal visibility ── */
  const [isLoanModalOpen,    setIsLoanModalOpen]    = useState(false);
  const [isVerifyModalOpen,  setIsVerifyModalOpen]  = useState(false);

  /* ── data ── */
  const [loans,               setLoans]               = useState([]);
  const [stats,               setStats]               = useState({ totalBorrowed: 0, remainingBalance: 0, activeCount: 0 });
  const [verificationStatus,  setVerificationStatus]  = useState(null); // null = loading
  const [dataLoading,         setDataLoading]         = useState(true);
  const [error,               setError]               = useState('');

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
        fetch(`${API}/api/loans/my-loans`,       { headers }),
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
  }, [navigate]);

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

  /* ────────────────────────────────────────────────────────
     Locked state (shown when not yet verified)
  ──────────────────────────────────────────────────────── */
  const renderLockedBanner = () => (
    <div className="loans-locked-banner">
      <div className="loans-locked-icon">🔒</div>
      <div className="loans-locked-content">
        <h3 className="loans-locked-title">Officer Verification Required</h3>
        <p className="loans-locked-text">
          {verificationStatus === 'pending'
            ? 'Your verification is under review. You will be notified once approved — this usually takes 3–5 business days.'
            : verificationStatus === 'rejected'
            ? 'Your verification was not approved. Please resubmit with the correct information.'
            : 'To access the Loan module you must first verify your officer status. This is a one-time process.'}
        </p>
        {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
          <button className="loans-locked-cta" onClick={() => setIsVerifyModalOpen(true)}>
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

      <div className="main-content">
        {/* Header */}
        <div className="loans-header">
          <div className="loans-header-content">
            <div>
              <h1 className="page-title">My Loans</h1>
              <p className="page-subtitle">Manage your loan applications and payments</p>
            </div>

            <div className="loans-header-right">
              <button
                className={`apply-loan-btn ${verificationStatus !== 'verified' ? 'apply-loan-btn-locked' : ''}`}
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

        {/* Loading */}
        {dataLoading && (
          <div className="loans-loading">
            <div className="loans-spinner" />
            <p>Loading your loans…</p>
          </div>
        )}

        {/* Error */}
        {!dataLoading && error && (
          <div className="loans-error-banner">
            <span>⚠ {error}</span>
            <button onClick={fetchAll} className="loans-retry-btn">Retry</button>
          </div>
        )}

        {!dataLoading && !error && (
          <>
            {/* Locked banner for unverified users */}
            {verificationStatus !== 'verified' && renderLockedBanner()}

            {/* Stats — always visible */}
            <div className="loans-stats">
              <div className="loan-stat-card">
                <p className="loan-stat-label">Total Borrowed</p>
                <p className="loan-stat-value">{fmt(stats.totalBorrowed)}</p>
              </div>
              <div className="loan-stat-card">
                <p className="loan-stat-label">Remaining Balance</p>
                <p className="loan-stat-value">{fmt(stats.remainingBalance)}</p>
              </div>
              <div className="loan-stat-card loan-stat-card-active">
                <p className="loan-stat-label">Active Loans</p>
                <p className="loan-stat-value">{stats.activeCount}</p>
              </div>
            </div>

            {/* Loans list — only shown when verified */}
            {verificationStatus === 'verified' && (
              <div className="all-loans-section">
                <div className="all-loans-header">
                  <h2 className="section-title">All Loans</h2>
                </div>

                {loans.length === 0 ? (
                  <div className="loans-empty">
                    <p className="loans-empty-icon">📋</p>
                    <p className="loans-empty-title">No loans yet</p>
                    <p className="loans-empty-text">Click "+ Apply for Loan" to get started.</p>
                  </div>
                ) : (
                  <div className="loans-list">
                    {loans.map((loan) => (
                      <div key={loan._id} className="loan-item">
                        {/* Loan Header */}
                        <div className="loan-item-header">
                          <div className="loan-item-main">
                            <div className="loan-item-info">
                              <div className="loan-item-title-row">
                                <h3 className="loan-id">{loan.loanId}</h3>
                                <span className={`loan-status-badge ${STATUS_CLASS[loan.status] || ''}`}>
                                  {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                </span>
                              </div>
                              <p className="loan-purpose">{loan.purpose}</p>
                              <p className="loan-applied">Applied: {fmtDate(loan.appliedDate)}</p>
                            </div>
                          </div>

                          <div className="loan-item-amount">
                            <p className="loan-amount">{fmt(loan.amount)}</p>
                            <button
                              className="view-details-btn"
                              onClick={() => navigate(`/loans/${loan.loanId}`)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>

                        {/* Loan Details */}
                        <div className="loan-item-details">
                          <div className="loan-detail">
                            <p className="loan-detail-label">Monthly Payment</p>
                            <p className="loan-detail-value">
                              {loan.monthlyPayment ? fmt(loan.monthlyPayment) : '—'}
                            </p>
                          </div>
                          <div className="loan-detail">
                            <p className="loan-detail-label">Remaining Balance</p>
                            <p className="loan-detail-value">
                              {loan.remainingBalance != null ? fmt(loan.remainingBalance) : fmt(loan.amount)}
                            </p>
                          </div>
                          <div className="loan-detail">
                            <p className="loan-detail-label">Next Payment</p>
                            <p className="loan-detail-value">
                              {loan.nextPaymentDate ? fmtDate(loan.nextPaymentDate) : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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