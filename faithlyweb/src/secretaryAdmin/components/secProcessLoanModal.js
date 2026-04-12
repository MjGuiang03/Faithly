import { useState } from 'react';
import '../styles/secProcessLoanModal.css';
import { Banknote, Check, Smartphone, Building2, Upload, X } from 'lucide-react';


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
                            padding: proofFile ? '6px' : '15px',
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
                                <Upload size={20} color="#99A1AF" />
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
                        <Check size={16} color="white" />
                        {processing ? <span className="btn-spinner" /> : 'Process Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
