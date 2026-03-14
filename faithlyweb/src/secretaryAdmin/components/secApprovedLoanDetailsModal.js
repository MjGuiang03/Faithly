import '../styles/secApprovedLoanDetailsModal.css';

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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6 6L18 18" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                                <p className="sec-loan-details-label">Occupation</p>
                                <p className="sec-loan-details-value">{loan.occupation}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Monthly Income</p>
                                <p className="sec-loan-details-value">₱{loan.monthlyIncome.toLocaleString()}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">GCash Number</p>
                                <p className="sec-loan-details-value gcash">{loan.gcashNumber}</p>
                            </div>
                        </div>
                    </div>

                    {/* Loan Request Details Section */}
                    <div className="sec-loan-details-section loan-request">
                        <h3 className="sec-loan-details-section-title">Loan Request Details</h3>
                        <div className="sec-loan-details-grid">
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Loan Amount</p>
                                <p className="sec-loan-details-value amount">₱{loan.amount.toLocaleString()}</p>
                            </div>
                            <div className="sec-loan-details-field">
                                <p className="sec-loan-details-label">Loan Purpose</p>
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
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M6.66667 1.66667V5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M13.3333 1.66667V5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2.91667 8.33333H17.0833" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16.25 5H3.75C3.28587 5 2.91667 5.3692 2.91667 5.83333V16.6667C2.91667 17.1308 3.28587 17.5 3.75 17.5H16.25C16.7141 17.5 17.0833 17.1308 17.0833 16.6667V5.83333C17.0833 5.3692 16.7141 5 16.25 5Z" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="sec-loan-details-stat-label">Church Active</p>
                            <p className="sec-loan-details-stat-value green">Active</p>
                        </div>

                        <div className="sec-loan-details-stat-card">
                            <div className="sec-loan-details-stat-icon yellow">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#A65F00" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M1.66667 10H18.3333" stroke="#A65F00" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="sec-loan-details-stat-label">Loan History</p>
                            <p className="sec-loan-details-stat-value">{loan.loanHistory}</p>
                        </div>

                        <div className="sec-loan-details-stat-card">
                            <div className="sec-loan-details-stat-icon pink">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M17.3667 9.84167C17.3083 9.43333 17.1917 9.04167 17.0417 8.675C16.6083 7.64167 15.8083 6.83333 14.7833 6.39167C14.65 6.33333 14.5167 6.28333 14.3833 6.24167C13.1333 5.89167 11.8333 6.16667 10.8333 6.89167C10.45 7.16667 10.1083 7.5 9.81667 7.875C9.54167 7.51667 9.21667 7.19167 8.84167 6.90833C7.85 6.19167 6.56667 5.91667 5.325 6.25C5.19167 6.28333 5.05833 6.33333 4.92501 6.39167C3.90001 6.83333 3.10001 7.64167 2.66667 8.675C2.51667 9.04167 2.4 9.43333 2.34167 9.84167C2.15 11.1417 2.54167 12.4167 3.425 13.4C4.00833 14.05 4.65833 14.6667 5.34167 15.2333C6.35833 16.0667 7.42501 16.8417 8.55001 17.5417C8.94167 17.7667 9.36667 17.9917 9.80834 18.15C9.875 18.175 9.93333 18.1917 10 18.1917C10.0667 18.1917 10.125 18.175 10.1917 18.15C10.6333 17.9917 11.0583 17.7667 11.4583 17.5417C12.5833 16.8333 13.65 16.0583 14.6667 15.2333C15.35 14.6667 15.9917 14.05 16.5833 13.4C17.4667 12.4167 17.8583 11.1417 17.3667 9.84167Z" stroke="#DB2777" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="sec-loan-details-stat-label">Total Donations</p>
                            <p className="sec-loan-details-stat-value">₱{loan.totalDonations.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sec-modal-footer">
                    <button className="sec-modal-btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button className="sec-modal-btn-primary" onClick={onProcess}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 1.66667V18.3333" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14.1667 4.16667H7.91667C6.75564 4.16667 5.64223 4.62768 4.82989 5.44002C4.01756 6.25236 3.55656 7.36577 3.55656 8.5268C3.55656 9.68783 4.01756 10.8012 4.82989 11.6136C5.64223 12.4259 6.75564 12.8869 7.91667 12.8869H12.0833C13.2443 12.8869 14.3577 13.3479 15.1701 14.1603C15.9824 14.9726 16.4434 16.086 16.4434 17.247C16.4434 18.4081 15.9824 19.5215 15.1701 20.3338C14.3577 21.1462 13.2443 21.6072 12.0833 21.6072H10" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Process Payment
                    </button>
                </div>
            </div>
        </div>
    );
}
