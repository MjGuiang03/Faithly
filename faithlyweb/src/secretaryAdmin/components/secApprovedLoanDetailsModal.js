import '../styles/secApprovedLoanDetailsModal.css';
import { Banknote, CheckCircle, X } from 'lucide-react';


export default function SecApprovedLoanDetailsModal({ loan, onClose, onProcess }) {
    return (
        <div className="sec-modal-overlay" onClick={onClose}>
            <div className="sec-modal-container sec-approved-loan-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sec-modal-header">
                    <div className="sec-modal-header-text">
                        <h2 className="sec-modal-title">Approved Loan Details</h2>
                        <p className="sec-modal-subtitle">Loan ID: {loan.id}</p>
                    </div>
                    <button className="sec-modal-close-btn" onClick={onClose}>
                        <X size={20} color="#0A0A0A" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="sec-modal-body">
                    {/* Officer Information Section */}
                    <div className="sec-loan-details-section officer-info">
                        <h3 className="sec-loan-details-section-title">Officer Information</h3>
                        <div className="sec-loan-details-grid">
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Full Name</p>
                                <p className="sec-loan-details-value">{loan.member}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Email</p>
                                <p className="sec-loan-details-value">{loan.email}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Church ID Number</p>
                                <p className="sec-loan-details-value">{loan.churchId}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Church Position</p>
                                <p className="sec-loan-details-value">{loan.position}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Disbursement Method</p>
                                <p className="sec-loan-details-value" style={{ textTransform: 'capitalize' }}>{loan.disbursementMethod || 'N/A'}</p>
                            </div>
                            {loan.disbursementAccount && (
                                <div className="sec-loan-details-field">
                                    <p className="sec-loan-details-label">Account Details</p>
                                    <p className="sec-loan-details-value">{loan.disbursementAccount}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loan Request Details Section */}
                    <div className="sec-loan-details-section loan-request">
                        <h3 className="sec-loan-details-section-title">Loan Request Details</h3>
                        <div className="sec-loan-details-grid">
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Loan Amount</p>
                                <p className="sec-loan-details-value amount">₱{(loan.amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Loan Type</p>
                                <p className="sec-loan-details-value">{loan.purpose}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Approved Date</p>
                                <p className="sec-loan-details-value">{loan.approvedDate}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Status</p>
                                <span className="sec-loan-details-status-badge awaiting">Awaiting Processing</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="sec-loan-details-stats">
                        <div className="sec-loan-details-stat-card active">
                            <div className="sec-loan-details-stat-icon green">
                                <Banknote size={20} color="#00A63E" />
                            </div>
                            <p className="sec-loan-details-stat-label">Church Active</p>
                            <p className="sec-loan-details-stat-value green">Active</p>
                        </div>

                        <div className="sec-loan-details-stat-card">
                            <div className="sec-loan-details-stat-icon yellow">
                                <Banknote size={20} color="#A65F00" />
                            </div>
                            <p className="sec-loan-details-stat-label">Loan History</p>
                            <p className="sec-loan-details-stat-value">{loan.loanHistory}</p>
                        </div>

                        <div className="sec-loan-details-stat-card">
                            <div className="sec-loan-details-stat-icon pink">
                                <Banknote size={20} color="#DB2777" />
                            </div>
                            <p className="sec-loan-details-stat-label">Total Donations</p>
                            <p className="sec-loan-details-stat-value">₱{(loan.totalDonations || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sec-modal-footer">
                    <button className="sec-modal-btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button className="sec-modal-btn-primary" onClick={onProcess}>
                        <Banknote size={16} color="white" />
                        Process Payment
                    </button>
                </div>
            </div>
        </div>
    );
}
