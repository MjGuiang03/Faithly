import { useState } from 'react';
import '../styles/secProcessLoanModal.css';
import { Banknote, Check, Smartphone, Building2, X, AlertTriangle } from 'lucide-react';


export default function SecProcessLoanModal({ loan, onClose, onProcess }) {
    const [paymentMethod, setPaymentMethod] = useState(loan.disbursementMethod || 'gcash');
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleProcess = async () => {
        if (paymentMethod !== (loan.disbursementMethod || 'cash') && !reason.trim()) {
            alert('Please provide a reason for changing the payment method.');
            return;
        }

        setProcessing(true);
        try {
            await onProcess(paymentMethod, reason);
        } catch {
            alert('Failed to process disbursement.');
        } finally {
            setProcessing(false);
        }
    };

    const isDigital = paymentMethod === 'gcash' || paymentMethod === 'bank';

    return (
        <div className="sec-process-modal-overlay" onClick={onClose}>
            <div className="sec-process-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Icon */}
                <div className="sec-process-modal-icon">
                    <Banknote size={24} color="#155DFC" />
                    <button className="sec-process-modal-close-top" onClick={onClose}>
                        <X size={18} />
                    </button>
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
                    <p className="sec-process-modal-info-text" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                        <span className="label">User Preference:</span> <strong style={{ textTransform: 'capitalize', color: '#155DFC' }}>{loan.disbursementMethod || 'N/A'}</strong>
                    </p>
                    {loan.disbursementAccount && (
                        <p className="sec-process-modal-info-text">
                            <span className="label">Account Info:</span> <strong style={{ color: '#111827' }}>{loan.disbursementAccount}</strong>
                        </p>
                    )}
                </div>

                {/* Payment Method Selection */}
                <div className="sec-process-modal-payment-section">
                    <label className="sec-process-modal-label">Select Payment Method</label>

                    <div className="sec-process-modal-payment-options">
                        <button
                            className={`sec-process-payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('cash')}
                        >
                            <Banknote size={22} />
                            <span>Cash</span>
                        </button>

                        <button
                            className={`sec-process-payment-option ${paymentMethod === 'gcash' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('gcash')}
                        >
                            <Smartphone size={22} />
                            <span>GCash</span>
                        </button>

                        <button
                            className={`sec-process-payment-option ${paymentMethod === 'bank' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('bank')}
                        >
                            <Building2 size={22} />
                            <span>Bank Transfer</span>
                        </button>
                    </div>

                    {paymentMethod !== (loan.disbursementMethod || 'cash') && (
                        <div style={{ marginTop: '16px' }}>
                            <label className="sec-process-modal-label" style={{ color: '#E7000B' }}>
                                Reason for overriding user preference <span style={{ color: 'red' }}>*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="State why the preferred method cannot be used"
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    padding: '12px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'Inter',
                                    minHeight: '80px',
                                    boxSizing: 'border-box',
                                    resize: 'none',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Disbursement info notice */}
                <div className="sec-process-modal-notice">
                    {isDigital ? (
                        <>
                            <Smartphone size={16} color="#155DFC" />
                            <p>
                                The amount of <strong>₱{loan.amount.toLocaleString()}</strong> will be sent via <strong>PayMongo</strong> to{' '}
                                <strong>{loan.disbursementAccount || 'the member\'s account'}</strong>.
                            </p>
                        </>
                    ) : (
                        <>
                            <AlertTriangle size={16} color="#D97706" />
                            <p>
                                Cash disbursement of <strong>₱{loan.amount.toLocaleString()}</strong> — the member must pick up at the office.
                            </p>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="sec-process-modal-actions">
                    <button className="sec-process-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="sec-process-btn-confirm" onClick={handleProcess} disabled={processing}>
                        <Check size={16} color="white" />
                        {processing ? <span className="btn-spinner" /> : isDigital ? 'Send via PayMongo' : 'Confirm Cash Disbursement'}
                    </button>
                </div>
            </div>
        </div>
    );
}
