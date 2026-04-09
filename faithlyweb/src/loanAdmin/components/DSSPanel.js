import React from 'react';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';
import '../styles/DSSPanel.css';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const DSSPanel = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="dss-panel loading">
        <div className="dss-spinner"></div>
        <p>Analyzing loan application...</p>
      </div>
    );
  }

  if (!analysis) return null;

  const { eligibility, capacity, risk, recommendation, isEligible } = analysis;

  return (
    <div className="dss-panel">
      <div className="dss-header">
        <h3 className="dss-title">Decision Support Analysis</h3>
        <div className={`dss-risk-badge ${risk.color}`}>
          {risk.tier}
        </div>
      </div>

      {/* Eligibility Checklist */}
      <div className="dss-section">
        <h4 className="dss-section-title">Eligibility Verification</h4>
        <div className="dss-checklist">
          <div className="dss-check-item">
            {eligibility.isOfficer ? <CheckCircle className="icon pass" size={18} /> : <XCircle className="icon fail" size={18} />}
            <span>Is a Verified Officer</span>
          </div>
          <div className="dss-check-item">
            {eligibility.savingsOk ? <CheckCircle className="icon pass" size={18} /> : <XCircle className="icon fail" size={18} />}
            <span>Savings ≥ ₱2,500 ({fmt(capacity.totalSavings)})</span>
          </div>
          <div className="dss-check-item">
            {eligibility.noOverdue ? <CheckCircle className="icon pass" size={18} /> : <XCircle className="icon fail" size={18} />}
            <span>No Overdue/Unpaid Loans</span>
          </div>
          <div className="dss-check-item">
            {eligibility.infoValid ? <CheckCircle className="icon pass" size={18} /> : <XCircle className="icon fail" size={18} />}
            <span>Valid Identity Documents</span>
          </div>
        </div>
      </div>

      {/* Loan Capacity */}
      <div className="dss-section">
        <div className="dss-capacity-header">
          <h4 className="dss-section-title">Loan Capacity</h4>
          <span className={`dss-capacity-status ${capacity.requestedOk ? 'pass' : 'fail'}`}>
            {capacity.requestedOk ? 'Within Limit' : 'Over Limit'}
          </span>
        </div>
        <div className="dss-capacity-bar-container">
          <div className="dss-capacity-labels">
            <span>Requested: {fmt(capacity.requestedAmount)}</span>
            <span>Max: {fmt(capacity.maxLoanable)}</span>
          </div>
          <div className="dss-progress-bg">
            <div 
              className={`dss-progress-fill ${capacity.requestedOk ? 'pass' : 'fail'}`} 
              style={{ width: `${Math.min(100, (capacity.requestedAmount / Math.max(1, capacity.maxLoanable)) * 100)}%` }}
            ></div>
          </div>
          <p className="dss-capacity-hint">
            Limit: {capacity.multiplier}x Savings - Existing Balance ({fmt(capacity.currentBalance)})
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`dss-recommendation-box ${isEligible ? 'pass' : 'warn'}`}>
        <div className="dss-rec-header">
          {isEligible ? <Info size={18} className="icon pass" /> : <AlertCircle size={18} className="icon warn" />}
          <span>System Recommendation</span>
        </div>
        <p className="dss-rec-text">{recommendation}</p>
      </div>

      <p className="dss-disclaimer">
        * This analysis is advisory only based on system policy. Final decision remains with the Loan Admin.
      </p>
    </div>
  );
};

export default DSSPanel;
