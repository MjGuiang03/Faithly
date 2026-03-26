import { useState } from 'react';
import '../styles/secProcessLoanModal.css';

/* ── File → base64 helper ── */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function SecProcessLoanModal({ loan, onClose, onProcess }) {
    const [paymentMethod, setPaymentMethod] = useState(loan.disbursementMethod || 'gcash');
    const [reason, setReason] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [processing, setProcessing] = useState(false);

    const handleProcess = async () => {
        if (paymentMethod !== (loan.disbursementMethod || 'cash') && !reason.trim()) {
            alert('Please provide a reason for changing the payment method.');
            return;
        }
        if (!proofFile) {
            alert('Please upload proof of disbursement.');
            return;
        }

        setProcessing(true);
        try {
            const proofData = await fileToBase64(proofFile);
            onProcess(paymentMethod, reason, proofData, proofFile.name);
        } catch {
            alert('Failed to process proof file.');
        } finally {
            setProcessing(false);
        }
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
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M5.33334 10.6667H26.6667C28.1394 10.6667 29.3333 11.8606 29.3333 13.3333V24C29.3333 25.4728 28.1394 26.6667 26.6667 26.6667H5.33334C3.86058 26.6667 2.66667 25.4728 2.66667 24V13.3333C2.66667 11.8606 3.86058 10.6667 5.33334 10.6667Z" stroke={paymentMethod === 'cash' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 21.3333C17.4728 21.3333 18.6667 20.1394 18.6667 18.6667C18.6667 17.1939 17.4728 16 16 16C14.5272 16 13.3333 17.1939 13.3333 18.6667C13.3333 20.1394 14.5272 21.3333 16 21.3333Z" stroke={paymentMethod === 'cash' ? '#155DFC' : '#99A1AF'} strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Cash</span>
                        </button>

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

                {/* Proof of Disbursement Upload */}
                <div className="sec-process-modal-payment-section">
                    <label className="sec-process-modal-label">
                        Upload Proof of Disbursement <span style={{ color: 'red' }}>*</span>
                    </label>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 8px 0', fontFamily: 'Inter' }}>
                        Upload a screenshot or photo of the transaction (receipt, GCash confirmation, bank transfer proof)
                    </p>
                    <label
                        htmlFor="proof-upload"
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: proofFile ? '8px' : '20px',
                            border: `1.5px dashed ${proofFile ? '#16A34A' : '#D1D5DB'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            background: proofFile ? '#F0FDF4' : '#F9FAFB',
                            transition: 'all 0.15s',
                            overflow: 'hidden',
                        }}
                    >
                        {proofFile ? (
                            <>
                                {proofFile.type.startsWith('image/') && (
                                    <img
                                        src={URL.createObjectURL(proofFile)}
                                        alt="Proof preview"
                                        style={{
                                            maxWidth: '100%', maxHeight: '120px',
                                            borderRadius: '6px', objectFit: 'contain', marginBottom: '6px',
                                        }}
                                    />
                                )}
                                <p style={{ margin: 0, fontSize: '12px', color: '#16A34A', fontWeight: 600, fontFamily: 'Inter' }}>
                                    ✓ {proofFile.name}
                                </p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#6B7280', fontFamily: 'Inter' }}>
                                    Click to change
                                </p>
                            </>
                        ) : (
                            <>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '6px' }}>
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <polyline points="17 8 12 3 7 8" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <line x1="12" y1="3" x2="12" y2="15" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', fontFamily: 'Inter' }}>
                                    Click to upload proof
                                </p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>
                                    PNG, JPG
                                </p>
                            </>
                        )}
                        <input
                            type="file"
                            id="proof-upload"
                            accept="image/png, image/jpeg"
                            onChange={(e) => setProofFile(e.target.files[0] || null)}
                            hidden
                        />
                    </label>
                </div>

                {/* Action Buttons */}
                <div className="sec-process-modal-actions">
                    <button className="sec-process-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="sec-process-btn-confirm" onClick={handleProcess} disabled={processing}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {processing ? 'Processing…' : 'Process Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
