import { Download, Share2, X, Receipt } from 'lucide-react';
import '../styles/SecLoanReceiptModal.css';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';

export default function SecLoanReceiptModal({ loan, onClose }) {
  if (!loan) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US');
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  // Generate a mock reference number if not provided
  const refNum = loan.referenceNumber || `REF${Math.random().toString(36).toUpperCase().substring(2, 12)}`;

  return (
    <div className="sec-receipt-overlay" onClick={onClose}>
      <div className="sec-receipt-modal" onClick={e => e.stopPropagation()}>
        {/* Header with Gradient */}
        <div className="sec-receipt-header">
          <div className="sec-receipt-header-content">
            <div className="sec-receipt-icon-bg">
              <Receipt size={24} color="white" />
            </div>
            <h2 className="sec-receipt-title">Disbursement Receipt</h2>
            <p className="sec-receipt-subtitle">Faithly Official Transaction</p>
          </div>
          <button className="sec-receipt-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sec-receipt-body">
          {/* Main Amount Section */}
          <div className="sec-receipt-amount-area">
            <p className="sec-receipt-label">Amount Transferred</p>
            <h1 className="sec-receipt-amount">{fmt(loan.amount)}</h1>
            <div className="sec-receipt-status-pill-wrap">
              <div className="sec-receipt-status-pill">
                <span>Completed</span>
              </div>
            </div>
            <div className="sec-receipt-divider"></div>
          </div>

          {/* Transaction Details */}
          <div className="sec-receipt-details">
            <div className="sec-receipt-row">
              <span className="sec-receipt-d-label">Recipient</span>
              <span className="sec-receipt-d-value">{loan.member || loan.memberName}</span>
            </div>
            <div className="sec-receipt-row">
              <span className="sec-receipt-d-label">GCash Number</span>
              <span className="sec-receipt-d-value">{loan.gcashNumber || 'N/A'}</span>
            </div>
            <div className="sec-receipt-row">
              <span className="sec-receipt-d-label">Loan ID</span>
              <span className="sec-receipt-d-value">{loan.id || loan.loanId}</span>
            </div>
            
            <div className="sec-receipt-row">
              <span className="sec-receipt-d-label">Date & Time</span>
              <span className="sec-receipt-d-value">
                {loan.disbursementDate ? new Date(loan.disbursementDate).toLocaleDateString('en-US') : dateStr} • {timeStr}
              </span>
            </div>
            <div className="sec-receipt-row">
              <span className="sec-receipt-d-label">Payment Method</span>
              <span className="sec-receipt-d-value">
                {loan.paymentMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}
              </span>
            </div>
            
            <div className="sec-receipt-details-separator"></div>

            <div className="sec-receipt-row">
              <span className="sec-receipt-d-label">Reference Number</span>
              <span className="sec-receipt-d-value highlight">{refNum}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="sec-receipt-footer-note">
            <p>The loan disbursement has been processed successfully. Funds will be credited to the recipient's account shortly.</p>
          </div>

          {/* Actions */}
          <div className="sec-receipt-actions">
            <button className="sec-receipt-btn secondary">
              <Share2 size={16} />
              <span>Share</span>
            </button>
            <button className="sec-receipt-btn primary">
              <Download size={16} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
