import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import '../styles/LoanApplicationModal.css';
import API from '../../utils/api';

/* ── File → base64 helper ── */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ── Loan-type config ── */
const LOAN_TYPES = [
  {
    key: 'personal',
    name: 'Personal Loan',
    multiplier: 2,
    minTerm: 3,
    maxTerm: 12,
    rate: 0.02,
    rateLabel: '2% / mo',
    color: 'blue',
    desc: 'For everyday needs, big purchases, or personal goals.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
        <path d="M10 6.5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'emergency',
    name: 'Emergency Loan',
    multiplier: 1.5,
    minTerm: 1,
    maxTerm: 6,
    rate: 0.015,
    rateLabel: '1.5% / mo',
    color: 'amber',
    desc: 'Fast-tracked for urgent and unexpected situations.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l1.7 5.2H17l-4.3 3.1 1.6 5.2L10 12.5l-4.3 3 1.6-5.2L3 7.2h5.3L10 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'short-term',
    name: 'Short-Term Loan',
    multiplier: 1,
    minTerm: 1,
    maxTerm: 3,
    rate: 0.01,
    rateLabel: '1% / mo',
    color: 'teal',
    desc: 'Quick, low-interest loan for short bridge financing.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="6" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6.5 6V4.5a3.5 3.5 0 0 1 7 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7 11.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
    <path d="M5 8.2l2 2 4-4" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.2" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default function LoanApplicationModal({
  isOpen,
  onClose,
  totalSavings = 0,
  existingLoanBalance = 0,
  hasOverdueLoans = false,
}) {
  const [loanType, setLoanType] = useState('');
  const [amount, setAmount] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [selfieFile, setSelfieFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [disbursementMethod, setDisbursementMethod] = useState('');
  const [disbursementAccount, setDisbursementAccount] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── derived ── */
  const selectedType = LOAN_TYPES.find((t) => t.key === loanType) || null;

  const maxLoanable = selectedType
    ? Math.max(0, totalSavings * selectedType.multiplier - existingLoanBalance)
    : 0;

  const termOptions = selectedType
    ? Array.from(
      { length: selectedType.maxTerm - selectedType.minTerm + 1 },
      (_, i) => selectedType.minTerm + i,
    )
    : [];

  /* ── calculation breakdown ── */
  const calc = useMemo(() => {
    const principal = Number(amount) || 0;
    const months = Number(termMonths) || 0;
    if (!selectedType || principal <= 0 || months <= 0) return null;
    const totalInterest = principal * selectedType.rate * months;
    const totalRepayment = principal + totalInterest;
    const monthly = totalRepayment / months;
    return { principal, totalInterest, totalRepayment, monthly, rate: selectedType.rate, months };
  }, [amount, termMonths, selectedType]);

  if (!isOpen) return null;


  /* ── eligibility ── */
  const savingsOk = totalSavings >= 1000;
  const noOverdue = !hasOverdueLoans;
  const amountOk = calc ? calc.principal >= 500 && calc.principal <= maxLoanable : true;
  const allEligible = savingsOk && noOverdue && (calc ? amountOk : true);

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) { toast.error('Please select a loan type.'); return; }
    if (!calc) { toast.error('Please fill in amount and term.'); return; }
    if (calc.principal < 500) { toast.error('Minimum loan amount is ₱500.'); return; }
    if (calc.principal > maxLoanable) { toast.error(`Amount exceeds your max loanable of ${fmt(maxLoanable)}.`); return; }
    if (!savingsOk) { toast.error('You need at least ₱1,000 in savings.'); return; }
    if (hasOverdueLoans) { toast.error('You have overdue loans. Please settle them first.'); return; }
    if (!disbursementMethod) { toast.error('Please select a disbursement method.'); return; }
    if ((disbursementMethod === 'gcash' || disbursementMethod === 'bank') && !disbursementAccount) {
      toast.error(`Please provide your ${disbursementMethod === 'gcash' ? 'GCash number' : 'bank account details'}.`);
      return;
    }
    if (!agreedToTerms) { toast.error('You must accept the Loan Terms and Conditions to continue'); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const selfieData = selfieFile ? await fileToBase64(selfieFile) : null;
      const idData = idFile ? await fileToBase64(idFile) : null;

      const res = await fetch(`${API}/api/loans/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: calc.principal,
          loanType: selectedType.key,
          purpose: selectedType.name,
          termMonths: calc.months,
          interestRate: selectedType.rate,
          totalInterest: calc.totalInterest,
          totalRepayment: calc.totalRepayment,
          monthlyPayment: calc.monthly,
          disbursementMethod,
          disbursementAccount,
          selfieFileName: selfieFile?.name || null,
          idFileName: idFile?.name || null,
          selfieData,
          idData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit application');

      toast.success('Loan application submitted successfully!');
      setLoanType('');
      setAmount('');
      setTermMonths('');
      setSelfieFile(null);
      setIdFile(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-loan-application-overlay" onClick={onClose}>
      <div className="user-loan-application-content" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="user-loan-application-header">
          <h2 className="user-loan-application-title">Apply for Loan</h2>
          <button className="user-loan-application-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} type="button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form className="user-loan-application-form" onSubmit={handleSubmit}>
          {/* Focus trap */}
          <input type="text" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} aria-hidden="true" readOnly />

          {/* ── Savings context ── */}
          <div className="ula-savings-ctx">
            <div className="ula-savings-ctx-row">
              <span className="ula-savings-ctx-label">Your total savings</span>
              <span className={`ula-savings-ctx-value ${totalSavings < 1000 ? 'ula-savings-ctx-value--low' : ''}`}>{fmt(totalSavings)}</span>
            </div>
            {existingLoanBalance > 0 && (
              <div className="ula-savings-ctx-row">
                <span className="ula-savings-ctx-label">Existing loan balance</span>
                <span className="ula-savings-ctx-value ula-savings-ctx-value--low">−{fmt(existingLoanBalance)}</span>
              </div>
            )}
          </div>

          {/* ── Loan Type selector ── */}
          <div className="user-loan-application-form-group">
            <label className="user-loan-application-label">Select Loan Type</label>
            <div className="ula-type-cards">
              {LOAN_TYPES.map((lt) => {
                const isSelected = loanType === lt.key;
                const ltMax = Math.max(0, totalSavings * lt.multiplier - existingLoanBalance);
                return (
                  <button
                    key={lt.key}
                    type="button"
                    className={`ula-type-card ula-type-card--${lt.color} ${isSelected ? 'ula-type-card--active' : ''}`}
                    onClick={() => { setLoanType(lt.key); setTermMonths(''); setAmount(ltMax > 0 ? String(ltMax) : ''); }}
                  >
                    <div className={`ula-type-icon ula-type-icon--${lt.color}`}>{lt.icon}</div>
                    <div className="ula-type-name">{lt.name}</div>
                    <div className="ula-type-mult">{lt.multiplier}× savings</div>
                    <div className="ula-type-desc">{lt.desc}</div>
                    <div className="ula-type-meta">
                      <span>{lt.rateLabel}</span>
                      <span>{lt.minTerm}–{lt.maxTerm} mo</span>
                    </div>
                    <div className="ula-type-max">Max: {fmt(ltMax)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Amount + Term row ── */}
          {selectedType && (
            <div className="user-loan-application-row">
              <div className="user-loan-application-group-half">
                <div className="ula-label-row">
                  <label className="user-loan-application-label">Loan Amount (₱)</label>
                  <span className="ula-max-pill">Max: {fmt(maxLoanable)}</span>
                </div>
                <div className="user-loan-application-input-wrapper ula-filled-input">
                  <span className="user-loan-application-input-icon">₱</span>
                  <input
                    type="number"
                    className="user-loan-application-input"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="500"
                    max={maxLoanable}
                    required
                  />
                </div>
                {amount && Number(amount) > maxLoanable && (
                  <span className="ula-field-error">Exceeds your max loanable amount</span>
                )}
                {amount && Number(amount) > 0 && Number(amount) < 500 && (
                  <span className="ula-field-error">Minimum loan is ₱500</span>
                )}
              </div>

              <div className="user-loan-application-group-half">
                <div className="ula-label-row">
                  <label className="user-loan-application-label">Repayment Term</label>
                </div>
                <div className="user-loan-application-input-wrapper ula-filled-input">
                  <svg className="user-loan-application-input-icon-svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6.66667 1.66667V5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.3333 1.66667V5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="2.5" y="3.33333" width="15" height="14.1667" rx="2" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.5 8.33333H17.5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <select
                    className="user-loan-application-select"
                    style={{ paddingLeft: '40px' }}
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    required
                  >
                    <option value="">Select term</option>
                    {termOptions.map((m) => (
                      <option key={m} value={m}>
                        {m} month{m > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Live calculation breakdown ── */}
          {calc && (
            <div className="ula-calc-card">
              <div className="ula-calc-header">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
                </svg>
                Loan Calculation Breakdown
              </div>
              <div className="ula-calc-rows">
                <div className="ula-calc-row">
                  <span>Principal amount</span>
                  <span>{fmt(calc.principal)}</span>
                </div>
                <div className="ula-calc-row">
                  <span>Interest rate</span>
                  <span>{(calc.rate * 100).toFixed(1)}% per month</span>
                </div>
                <div className="ula-calc-row">
                  <span>Term</span>
                  <span>{calc.months} month{calc.months > 1 ? 's' : ''}</span>
                </div>
                <div className="ula-calc-row">
                  <span>Total interest <span className="ula-calc-formula"></span></span>
                  <span>{fmt(calc.totalInterest)}</span>
                </div>
                <div className="ula-calc-divider" />
                <div className="ula-calc-row ula-calc-row--bold">
                  <span>Total repayment</span>
                  <span>{fmt(calc.totalRepayment)}</span>
                </div>
                <div className="ula-calc-row ula-calc-row--bold ula-calc-row--primary">
                  <span>Monthly payment</span>
                  <span>{fmt(calc.monthly)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Eligibility checklist ── */}
          {selectedType && (
            <div className="ula-eligibility">
              <div className="ula-eligibility-title">Eligibility Check</div>
              <div className="ula-eligibility-list">
                <div className="ula-eligibility-item">
                  {savingsOk ? <CheckIcon /> : <XIcon />}
                  <span>Minimum savings of ₱1,000</span>
                </div>
                <div className="ula-eligibility-item">
                  {noOverdue ? <CheckIcon /> : <XIcon />}
                  <span>No overdue or unpaid loans</span>
                </div>
                {calc && (
                  <div className="ula-eligibility-item">
                    {amountOk ? <CheckIcon /> : <XIcon />}
                    <span>Amount within computed limit ({fmt(maxLoanable)})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Upload Documents ── */}
          <div className="user-loan-application-upload-section">
            <h3 className="user-loan-application-guarantor-title">Upload Documents</h3>
            <div className="user-loan-application-row">

              {/* Selfie with ID & Date */}
              <div className="user-loan-application-group-half">
                <label className="user-loan-application-label">Selfie with ID &amp; Date</label>
                <label
                  htmlFor="loan-selfie-upload"
                  className={`user-loan-upload-box ${selfieFile ? 'user-loan-upload-box-done' : ''}`}
                >
                  {selfieFile ? (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="user-loan-upload-icon">
                        <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="user-loan-upload-text user-loan-upload-text-done">File selected</p>
                      <p className="user-loan-upload-subtext">{selfieFile.name}</p>
                    </>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="user-loan-upload-icon">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="17 8 12 3 7 8" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="12" y1="3" x2="12" y2="15" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="user-loan-upload-text">Click to upload or drag and drop</p>
                      <p className="user-loan-upload-subtext">PNG, JPG</p>
                    </>
                  )}
                  <input
                    type="file"
                    id="loan-selfie-upload"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setSelfieFile(e.target.files[0] || null)}
                    hidden
                  />
                </label>
              </div>

              {/* Valid Government ID */}
              <div className="user-loan-application-group-half">
                <label className="user-loan-application-label">Valid Government ID</label>
                <label
                  htmlFor="loan-id-upload"
                  className={`user-loan-upload-box ${idFile ? 'user-loan-upload-box-done' : ''}`}
                >
                  {idFile ? (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="user-loan-upload-icon">
                        <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="user-loan-upload-text user-loan-upload-text-done">File selected</p>
                      <p className="user-loan-upload-subtext">{idFile.name}</p>
                    </>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="user-loan-upload-icon">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="17 8 12 3 7 8" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="12" y1="3" x2="12" y2="15" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="user-loan-upload-text">Click to upload or drag and drop</p>
                      <p className="user-loan-upload-subtext">PNG, JPG</p>
                    </>
                  )}
                  <input
                    type="file"
                    id="loan-id-upload"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setIdFile(e.target.files[0] || null)}
                    hidden
                  />
                </label>
              </div>

            </div>
          </div>

          {/* ── Disbursement Method ── */}
          <div className="ula-disbursement-section">
            <h3 className="user-loan-application-guarantor-title">Disbursement Method</h3>
            <p className="ula-disbursement-desc">How would you like to receive your loan once approved?</p>
            <div className="ula-disbursement-options">
              {[
                { id: 'cash', label: 'Cash (Pick up at office)' },
                { id: 'gcash', label: 'GCash' },
                { id: 'bank', label: 'Bank Transfer' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`ula-disbursement-btn ${disbursementMethod === opt.id ? 'ula-disbursement-btn--active' : ''}`}
                  onClick={() => setDisbursementMethod(opt.id)}
                >
                  <div className={`ula-disbursement-radio ${disbursementMethod === opt.id ? 'active' : ''}`} />
                  {opt.label}
                </button>
              ))}
            </div>
            
            {(disbursementMethod === 'gcash' || disbursementMethod === 'bank') && (
              <div className="ula-disbursement-account">
                <label className="user-loan-application-label">
                  {disbursementMethod === 'gcash' ? 'GCash Name & Number' : 'Bank Name, Account Name & Number'}
                </label>
                <input
                  type="text"
                  className="user-loan-application-input"
                  placeholder={disbursementMethod === 'gcash' ? 'e.g. Juan Dela Cruz - 09123456789' : 'e.g. BDO - Juan Dela Cruz - 1234567890'}
                  value={disbursementAccount}
                  onChange={(e) => setDisbursementAccount(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* ── Terms & Conditions ── */}
          <div className="ula-terms-section">
            <h3 className="user-loan-application-guarantor-title">Loan Terms &amp; Conditions</h3>
            <div className="ula-terms-box">
              <div className="ula-terms-group">
                <strong>10. Repayment Terms</strong>
                <ul>
                  <li>Payments are monthly based on the selected term.</li>
                  <li>Due dates are fixed upon approval.</li>
                  <li>Accepted payment methods: Cash, Bank transfer, GCash.</li>
                </ul>
              </div>

              <div className="ula-terms-group">
                <strong>11. Early Payment Policy</strong>
                <ul>
                  <li>Members may repay early at any time.</li>
                  <li>Interest is charged only up to the payment date.</li>
                  <li>No penalties for early settlement.</li>
                </ul>
              </div>

              <div className="ula-terms-group">
                 <strong>12. Late Payment and Penalties</strong>
                <ul>
                  <li>Grace period: 3 days.</li>
                  <li>Penalty: 3% per month on overdue amount.</li>
                </ul>
              </div>

              <div className="ula-terms-group">
                <strong>20. Policy Violations</strong>
                <ul>
                   <li>Violations include: Providing false information, Non-payment, System abuse.</li>
                   <li>Sanctions: Loan denial, Suspension, Account termination.</li>
                </ul>
              </div>
            </div>
            
            <label className="ula-terms-checkbox">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>I have read and agree to the Loan Terms &amp; Conditions and policies above.</span>
            </label>
          </div>

          {/* Note */}
          <div className="user-loan-application-note-box">
            <p className="user-loan-application-note-text">
              <strong>Note:</strong> Your application will be reviewed within 2–3 business days. A late payment penalty of 3% per month applies after a 3-day grace period.
            </p>
          </div>

          {/* Actions */}
          <div className="user-loan-application-actions">
            <button
              type="submit"
              className="user-loan-application-submit-btn"
              disabled={loading || !allEligible || !calc}
            >
              {loading ? <span className="btn-spinner" /> : 'Submit Application'}
            </button>
            <button type="button" className="user-loan-application-cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}