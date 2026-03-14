import { useState } from 'react';
import '../styles/secProcessLoanModal.css';

export default function SecProcessLoanModal({ loan, onClose, onProcess }) {
    const [paymentMethod, setPaymentMethod] = useState('gcash');

    const handleProcess = () => {
        onProcess(paymentMethod);
    };

    return (
        <div className="sec-process-modal-overlay" onClick={onClose}>
            <div className="sec-process-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Icon */}
                <div className="sec-process-modal-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path d="M16 2.66667V29.3333" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22.6667 6.66667H13.3333C11.4924 6.66667 9.72774 7.39881 8.41417 8.71239C7.10059 10.026 6.36845 11.7906 6.36845 13.6316C6.36845 15.4725 7.10059 17.2372 8.41417 18.5507C9.72774 19.8643 11.4924 20.5965 13.3333 20.5965H18.6667C20.5076 20.5965 22.2723 21.3286 23.5858 22.6422C24.8994 23.9558 25.6316 25.7204 25.6316 27.5614C25.6316 29.4023 24.8994 31.167 23.5858 32.4805C22.2723 33.7941 20.5076 34.5263 18.6667 34.5263H16" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="sec-process-modal-title">Process Loan Disbursement</h2>

                {/* Subtitle */}
                <p className="sec-process-modal-subtitle">
                    Process payment for loan <strong>{loan.id}</strong>
                </p>

                {/* Info Box */}
                <div className="sec-process-modal-info">
                    <p className="sec-process-modal-info-text">
                        <span className="label">Member:</span> <strong>{loan.member}</strong>
                    </p>
                    <p className="sec-process-modal-info-text">
                        <span className="label">Amount:</span> <strong>₱{loan.amount.toLocaleString()}</strong>
                    </p>
                    <p className="sec-process-modal-info-text">
                        <span className="label">Purpose:</span> <strong>{loan.purpose}</strong>
                    </p>
                </div>

                {/* Payment Method Selection */}
                <div className="sec-process-modal-payment-section">
                    <label className="sec-process-modal-label">Select Payment Method</label>

                    <div className="sec-process-modal-payment-options">
                        <button
                            className={`sec-process-payment-option ${paymentMethod === 'gcash' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('gcash')}
                        >
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M5.33334 9.33333H26.6667C28.1394 9.33333 29.3333 10.5272 29.3333 12V25.3333C29.3333 26.8061 28.1394 28 26.6667 28H5.33334C3.86058 28 2.66667 26.8061 2.66667 25.3333V12C2.66667 10.5272 3.86058 9.33333 5.33334 9.33333Z" stroke={paymentMethod === 'gcash' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 24H16.0133" stroke={paymentMethod === 'gcash' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>GCash</span>
                        </button>

                        <button
                            className={`sec-process-payment-option ${paymentMethod === 'bank' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('bank')}
                        >
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M4 13.3333H28" stroke={paymentMethod === 'bank' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M6.66667 22.6667V26.6667" stroke={paymentMethod === 'bank' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 22.6667V26.6667" stroke={paymentMethod === 'bank' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M17.3333 22.6667V26.6667" stroke={paymentMethod === 'bank' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M22.6667 22.6667V26.6667" stroke={paymentMethod === 'bank' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M28 26.6667H4C3.26362 26.6667 2.66667 27.2636 2.66667 28V29.3333C2.66667 30.0697 3.26362 30.6667 4 30.6667H28C28.7364 30.6667 29.3333 30.0697 29.3333 29.3333V28C29.3333 27.2636 28.7364 26.6667 28 26.6667Z" stroke={paymentMethod === 'bank' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 5.33333L2.66667 13.3333H29.3333L16 5.33333Z" stroke={paymentMethod === 'bank' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Bank Transfer</span>
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="sec-process-modal-actions">
                    <button className="sec-process-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="sec-process-btn-confirm" onClick={handleProcess}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Process via {paymentMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}
                    </button>
                </div>
            </div>
        </div>
    );
}
