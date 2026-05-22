import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import '../styles/LoanApplicationModal.css';
import API from '../../utils/api';
import { Banknote, CheckCircle, X, Pencil, ChevronDown, ChevronUp, Camera, RotateCcw, AlertTriangle, Upload } from 'lucide-react';

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
      <Banknote size={20} />
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
      <Banknote size={20} />
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
      <Banknote size={20} />
    ),
  },
];

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const CheckIcon = () => (
  <CheckCircle size={15} color="#16a34a" />
);

const XIcon = () => (
  <X size={15} color="#dc2626" />
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
  const [selfieImage, setSelfieImage] = useState(null);   // base64 data URL
  const [idImage, setIdImage] = useState(null);             // base64 data URL
  const [disbursementMethod, setDisbursementMethod] = useState('');
  const [disbursementAccount, setDisbursementAccount] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccountIdx, setSelectedAccountIdx] = useState(-1);
  const [editingAccountIdx, setEditingAccountIdx] = useState(null);
  const [expandedInfoId, setExpandedInfoId] = useState(null);

  const [coeData, setCoeData] = useState(null);
  const [coeFileName, setCoeFileName] = useState('');
  const [itrData, setItrData] = useState(null);
  const [itrFileName, setItrFileName] = useState('');
  const [payslipData, setPayslipData] = useState(null);
  const [payslipFileName, setPayslipFileName] = useState('');
  const [hasActiveLoan, setHasActiveLoan] = useState(null);
  const [activeLoanScreenshotData, setActiveLoanScreenshotData] = useState(null);
  const [activeLoanScreenshotFileName, setActiveLoanScreenshotFileName] = useState('');

  const handleFileUpload = (e, setFileData, setFileName) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileData(ev.target.result);
    reader.readAsDataURL(file);
  };

  const [newEwalletProvider, setNewEwalletProvider] = useState('');
  const [newEwalletAccountName, setNewEwalletAccountName] = useState('');
  const [newEwalletNumber, setNewEwalletNumber] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccountName, setNewBankAccountName] = useState('');
  const [newBankAccountNumber, setNewBankAccountNumber] = useState('');

  /* ── Camera state ── */
  const [cameraOpen, setCameraOpen] = useState(false);       // is camera modal visible
  const [cameraTarget, setCameraTarget] = useState(null);    // 'selfie' | 'id'
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraHint, setCameraHint] = useState('');
  const [idDetected, setIdDetected] = useState(false);       // Gemini detected ID
  const [idChecking, setIdChecking] = useState(false);       // currently verifying frame
  const [idDetectionMsg, setIdDetectionMsg] = useState('');  // detection message
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const hintTimerRef = useRef(null);
  const idCheckCanvasRef = useRef(null);                      // canvas for low-res frame capture

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
    const principal = Number(amount.replace(/,/g, '')) || 0;
    const months = Number(termMonths) || 0;
    if (!selectedType || principal <= 0 || months <= 0) return null;
    const totalInterest = principal * selectedType.rate * months;
    const totalRepayment = principal + totalInterest;
    const monthly = totalRepayment / months;
    return { principal, totalInterest, totalRepayment, monthly, rate: selectedType.rate, months };
  }, [amount, termMonths, selectedType]);

  /* ── fetch saved accounts ── */
  useEffect(() => {
    if (!isOpen) return;
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/api/saved-accounts`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setSavedAccounts(data.accounts || []);
      } catch { /* silent */ }
    };
    fetchAccounts();
  }, [isOpen]);

  const filteredAccounts = savedAccounts.filter(a => a.method === disbursementMethod);

  /* ── Camera helpers ── */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraHint('');
    setIdDetected(false);
    setIdChecking(false);
    setIdDetectionMsg('');
    if (hintTimerRef.current) clearInterval(hintTimerRef.current);
  }, []);

  const checkIdFrame = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    // Create a low-res canvas for the check (320px wide to keep payload small)
    if (!idCheckCanvasRef.current) {
      idCheckCanvasRef.current = document.createElement('canvas');
    }
    const checkCanvas = idCheckCanvasRef.current;
    const scale = 320 / video.videoWidth;
    checkCanvas.width = 320;
    checkCanvas.height = Math.round(video.videoHeight * scale);
    const ctx = checkCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, checkCanvas.width, checkCanvas.height);
    const frameData = checkCanvas.toDataURL('image/jpeg', 0.5);

    setIdChecking(true);
    setIdDetectionMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/loans/verify-id-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageData: frameData }),
      });
      const data = await res.json();

      if (data.rateLimited) {
        setIdDetectionMsg('API busy — please try again in a moment');
        return;
      }

      if (data.detected && (data.confidence === 'high' || data.confidence === 'medium')) {
        setIdDetected(true);
        setIdDetectionMsg('✓ Government ID detected — you can now capture');
      } else {
        setIdDetected(false);
        setIdDetectionMsg(data.reason || 'No ID detected — position your ID and try again');
      }
    } catch {
      setIdDetectionMsg('Verification failed — please try again');
    } finally {
      setIdChecking(false);
    }
  }, []);

  const openCamera = useCallback(async (target) => {
    setCameraTarget(target);
    setCameraOpen(true);
    setCameraError(null);
    setCameraReady(false);
    setCameraHint('');
    setIdDetected(false);
    setIdChecking(false);
    setIdDetectionMsg('');

    try {
      const facingMode = target === 'selfie' ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      // Wait for DOM to mount the video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            setCameraReady(true);
          });
        }
      }, 100);

      // Rotate validation hints
      const hints = target === 'selfie'
        ? [
            'Hold your ID beside your face',
            'Make sure your face is fully visible',
            'Include today\'s date (handwritten on paper)',
            'Move closer to the camera',
            'Ensure good lighting on your face',
          ]
        : [
            'Place your ID flat on a surface',
            'Make sure all text is readable',
            'Avoid glare and shadows',
            'Move closer if text is too small',
            'Ensure good lighting',
          ];
      let hintIdx = 0;
      setCameraHint(hints[0]);
      hintTimerRef.current = setInterval(() => {
        hintIdx = (hintIdx + 1) % hints.length;
        setCameraHint(hints[hintIdx]);
      }, 4000);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions and try again.');
    }
  }, [checkIdFrame]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Mirror for selfie (front camera)
    if (cameraTarget === 'selfie') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    if (cameraTarget === 'selfie') {
      setSelfieImage(dataUrl);
    } else {
      setIdImage(dataUrl);
    }

    stopCamera();
    setCameraOpen(false);
    toast.success(cameraTarget === 'selfie' ? 'Selfie captured!' : 'ID photo captured!');
  }, [cameraTarget, stopCamera]);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

  // Cleanup camera on modal close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraOpen(false);
    }
  }, [isOpen, stopCamera]);

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
    if (!amount || Number(amount.replace(/,/g, '')) <= 0) { toast.error('Please enter a loan amount.'); return; }
    if (!termMonths) { toast.error('Please select a repayment term.'); return; }
    if (!calc) { toast.error('Please fill in amount and term.'); return; }
    if (calc.principal < 500) { toast.error('Minimum loan amount is ₱500.'); return; }
    if (calc.principal > maxLoanable) { toast.error(`Amount exceeds your max loanable of ${fmt(maxLoanable)}.`); return; }
    if (!savingsOk) { toast.error('You need at least ₱1,000 in savings.'); return; }
    if (hasOverdueLoans) { toast.error('You have overdue loans. Please settle them first.'); return; }
    if (!selfieImage) { toast.error('Please capture a selfie with ID & date.'); return; }
    if (!idImage) { toast.error('Please capture a photo of your government ID.'); return; }
    if (!coeData) { toast.error('Please upload your Certificate of Employment (COE).'); return; }
    if (!itrData) { toast.error('Please upload your Income Tax Return (ITR).'); return; }
    if (!payslipData) { toast.error('Please upload your Payslip.'); return; }
    if (hasActiveLoan === null) { toast.error('Please specify if you have an active loan with another entity.'); return; }
    if (hasActiveLoan === true && !activeLoanScreenshotData) { toast.error('Please upload a screenshot of your active loan.'); return; }
    if (!disbursementMethod) { toast.error('Please select a disbursement method.'); return; }

    let finalDisbursementAccount = disbursementAccount;
    if (selectedAccountIdx === -1 && (disbursementMethod === 'e-wallet' || disbursementMethod === 'bank')) {
      if (disbursementMethod === 'e-wallet') {
        if (!newEwalletProvider || !newEwalletAccountName || !newEwalletNumber) { toast.error('Please fill in all E-Wallet details.'); return; }
        if (newEwalletNumber.length !== 11) { toast.error('E-Wallet account number must be exactly 11 digits.'); return; }
        finalDisbursementAccount = `${newEwalletProvider} - ${newEwalletAccountName} - ${newEwalletNumber}`;
      } else if (disbursementMethod === 'bank') {
        if (!newBankName || !newBankAccountName || !newBankAccountNumber) { toast.error('Please fill in all Bank details.'); return; }
        finalDisbursementAccount = `${newBankName} - ${newBankAccountName} - ${newBankAccountNumber}`;
      }
    } else {
      if ((disbursementMethod === 'e-wallet' || disbursementMethod === 'bank') && !finalDisbursementAccount) {
        toast.error(`Please select or provide your ${disbursementMethod === 'e-wallet' ? 'E-Wallet details' : 'bank account details'}.`);
        return;
      }
    }
    if (!agreedToTerms) { toast.error('You must accept the Loan Terms and Conditions to continue.'); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

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
          disbursementAccount: finalDisbursementAccount,
          selfieFileName: 'camera-selfie.jpg',
          idFileName: 'camera-id.jpg',
          selfieData: selfieImage,
          idData: idImage,
          coeData,
          coeFileName,
          itrData,
          itrFileName,
          payslipData,
          payslipFileName,
          hasActiveLoan,
          activeLoanScreenshotData: hasActiveLoan ? activeLoanScreenshotData : null,
          activeLoanScreenshotFileName: hasActiveLoan ? activeLoanScreenshotFileName : null
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit application');

      toast.success('Loan application submitted successfully!');

      // Save or update account for future use
      if ((disbursementMethod === 'e-wallet' || disbursementMethod === 'bank') && finalDisbursementAccount) {
        try {
          await fetch(`${API}/api/saved-accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              method: disbursementMethod,
              accountNumber: finalDisbursementAccount,
              accountName: '',
              label: finalDisbursementAccount,
            }),
          });
        } catch { /* silent — don't block the success flow */ }
      }

      setLoanType('');
      setAmount('');
      setTermMonths('');
      setSelfieImage(null);
      setIdImage(null);
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
            <X size={20} />
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
                  <div 
                    key={lt.key} 
                    className={`ula-type-card-wrapper ${expandedInfoId === lt.key ? 'expanded' : ''}`}
                  >
                    <div
                      className={`ula-type-card ula-type-card--${lt.color} ${isSelected ? 'ula-type-card--active' : ''}`}
                      onClick={() => { 
                        setLoanType(lt.key); 
                        setTermMonths(''); 
                        setAmount(ltMax > 0 ? Number(ltMax).toLocaleString('en-US') : ''); 
                      }}
                    >
                      <div className="ula-type-header">
                        <div className={`ula-type-icon ula-type-icon--${lt.color}`}>{lt.icon}</div>
                        <div className="ula-type-header-text">
                          <div className="ula-type-name">{lt.name}</div>
                          <div className="ula-type-mult">{lt.multiplier}× savings</div>
                        </div>
                      </div>
                      
                      <button 
                        type="button" 
                        className="ula-type-expand-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedInfoId(expandedInfoId === lt.key ? null : lt.key);
                        }}
                      >
                        {expandedInfoId === lt.key ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expandedInfoId === lt.key ? 'Less Info' : 'More Info'}
                      </button>

                      <div className={`ula-type-expanded-info-wrapper ${expandedInfoId === lt.key ? 'expanded' : ''}`}>
                        <div className="ula-type-expanded-info">
                          <div className="ula-type-desc">{lt.desc}</div>
                          <div className="ula-type-meta">
                            <span>{lt.rateLabel}</span>
                            <span>{lt.minTerm}–{lt.maxTerm} mo</span>
                          </div>
                          <div className="ula-type-max">Max: {fmt(ltMax)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    type="text"
                    className="user-loan-application-input"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => {
                      let raw = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = raw.split('.');
                      if (parts[0]) {
                          parts[0] = parseInt(parts[0], 10).toLocaleString('en-US');
                      }
                      setAmount(parts.join('.'));
                    }}
                    required
                  />
                </div>
                {amount && Number(amount.replace(/,/g, '')) > maxLoanable && (
                  <span className="ula-field-error">Exceeds your max loanable amount</span>
                )}
                {amount && Number(amount.replace(/,/g, '')) > 0 && Number(amount.replace(/,/g, '')) < 500 && (
                  <span className="ula-field-error">Minimum loan is ₱500</span>
                )}
              </div>

              <div className="user-loan-application-group-half">
                <div className="ula-label-row">
                  <label className="user-loan-application-label">Repayment Term</label>
                </div>
                <div className="user-loan-application-input-wrapper ula-filled-input">
                  <Banknote className="user-loan-application-input-icon-svg" size={20} color="#99A1AF" />
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
                <Banknote size={16} />
                Loan Calculation Breakdown
              </div>
              <div className="ula-calc-rows">
                <div className="ula-calc-row">
                  <span>Principal amount</span>
                  <span>{fmt(calc.principal)}</span>
                </div>
                <div className="ula-calc-row">
                  <span>Interest rate</span>
                  <span>{calc.rate * 100}% per month</span>
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

          {/* ── Capture Documents ── */}
          <div className="user-loan-application-upload-section">
            <h3 className="user-loan-application-guarantor-title">Capture Documents</h3>
            <p className="ula-capture-desc">Use your device camera to capture live photos for identity verification. Gallery uploads are not allowed.</p>
            <div className="user-loan-application-row">

              {/* Selfie with ID & Date */}
              <div className="user-loan-application-group-half">
                <label className="user-loan-application-label">Selfie with ID &amp; Current Date <span style={{ color: '#dc2626' }}>*</span></label>
                <div
                  className={`user-loan-upload-box ${selfieImage ? 'user-loan-upload-box-done' : ''}`}
                  onClick={() => !selfieImage && openCamera('selfie')}
                >
                  {selfieImage ? (
                    <>
                      <img src={selfieImage} alt="Selfie preview" className="ula-capture-preview" />
                      <div className="ula-capture-done-row">
                        <CheckCircle size={16} color="#16a34a" />
                        <span className="user-loan-upload-text user-loan-upload-text-done">Photo captured</span>
                      </div>
                      <button type="button" className="ula-retake-btn" onClick={(e) => { e.stopPropagation(); setSelfieImage(null); openCamera('selfie'); }}>
                        <RotateCcw size={14} /> Retake
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera className="user-loan-upload-icon" size={28} color="#1E3A8A" />
                      <p className="user-loan-upload-text">Click to capture</p>
                      <p className="user-loan-upload-subtext">Live camera only</p>
                    </>
                  )}
                </div>
              </div>

              {/* Valid Government ID */}
              <div className="user-loan-application-group-half">
                <label className="user-loan-application-label">Valid Government ID <span style={{ color: '#dc2626' }}>*</span></label>
                <div
                  className={`user-loan-upload-box ${idImage ? 'user-loan-upload-box-done' : ''}`}
                  onClick={() => !idImage && openCamera('id')}
                >
                  {idImage ? (
                    <>
                      <img src={idImage} alt="ID preview" className="ula-capture-preview" />
                      <div className="ula-capture-done-row">
                        <CheckCircle size={16} color="#16a34a" />
                        <span className="user-loan-upload-text user-loan-upload-text-done">Photo captured</span>
                      </div>
                      <button type="button" className="ula-retake-btn" onClick={(e) => { e.stopPropagation(); setIdImage(null); openCamera('id'); }}>
                        <RotateCcw size={14} /> Retake
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera className="user-loan-upload-icon" size={28} color="#1E3A8A" />
                      <p className="user-loan-upload-text">Click to capture</p>
                      <p className="user-loan-upload-subtext">Live camera only</p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ── Document Uploads ── */}
          <div className="user-loan-application-upload-section" style={{ marginTop: '24px' }}>
            <h3 className="user-loan-application-guarantor-title">Upload Additional Documents</h3>
            <p className="ula-capture-desc">Please upload your COE and ITR in image or PDF format.</p>
            <div className="user-loan-application-row">
              <div className="user-loan-application-group-half">
                <label className="user-loan-application-label">Certificate of Employment (COE) <span style={{ color: '#dc2626' }}>*</span></label>
                <label className={`user-loan-upload-box ${coeFileName ? 'user-loan-upload-box-done' : ''}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, setCoeData, setCoeFileName)} style={{ display: 'none' }} />
                  {coeFileName ? (
                    <>
                      <div className="ula-capture-done-row" style={{ marginTop: 0 }}>
                        <CheckCircle size={20} color="#16a34a" />
                        <span className="user-loan-upload-text user-loan-upload-text-done" style={{ fontSize: '14px' }}>File selected</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{coeFileName}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="user-loan-upload-icon" size={28} color="#1E3A8A" />
                      <p className="user-loan-upload-text">Click to upload</p>
                      <p className="user-loan-upload-subtext">Image or PDF</p>
                    </>
                  )}
                </label>
              </div>
              <div className="user-loan-application-group-half">
                <label className="user-loan-application-label">Income Tax Return (ITR) <span style={{ color: '#dc2626' }}>*</span></label>
                <label className={`user-loan-upload-box ${itrFileName ? 'user-loan-upload-box-done' : ''}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, setItrData, setItrFileName)} style={{ display: 'none' }} />
                  {itrFileName ? (
                    <>
                      <div className="ula-capture-done-row" style={{ marginTop: 0 }}>
                        <CheckCircle size={20} color="#16a34a" />
                        <span className="user-loan-upload-text user-loan-upload-text-done" style={{ fontSize: '14px' }}>File selected</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itrFileName}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="user-loan-upload-icon" size={28} color="#1E3A8A" />
                      <p className="user-loan-upload-text">Click to upload</p>
                      <p className="user-loan-upload-subtext">Image or PDF</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="user-loan-application-row" style={{ marginTop: '16px' }}>
              <div className="user-loan-application-group-half">
                <label className="user-loan-application-label">Payslip <span style={{ color: '#dc2626' }}>*</span></label>
                <label className={`user-loan-upload-box ${payslipFileName ? 'user-loan-upload-box-done' : ''}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, setPayslipData, setPayslipFileName)} style={{ display: 'none' }} />
                  {payslipFileName ? (
                    <>
                      <div className="ula-capture-done-row" style={{ marginTop: 0 }}>
                        <CheckCircle size={20} color="#16a34a" />
                        <span className="user-loan-upload-text user-loan-upload-text-done" style={{ fontSize: '14px' }}>File selected</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payslipFileName}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="user-loan-upload-icon" size={28} color="#1E3A8A" />
                      <p className="user-loan-upload-text">Click to upload</p>
                      <p className="user-loan-upload-subtext">Image or PDF</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label className="user-loan-application-label">Do you have an existing/active loan with another entity? <span style={{ color: '#dc2626' }}>*</span></label>
              <div className="ula-disbursement-options" style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className={`ula-disbursement-btn ${hasActiveLoan === true ? 'ula-disbursement-btn--active' : ''}`}
                  onClick={() => setHasActiveLoan(true)}
                  style={{ minWidth: '100px', padding: '10px 16px', flex: 'none' }}
                >
                  <div className={`ula-disbursement-radio ${hasActiveLoan === true ? 'active' : ''}`} />
                  Yes
                </button>
                <button
                  type="button"
                  className={`ula-disbursement-btn ${hasActiveLoan === false ? 'ula-disbursement-btn--active' : ''}`}
                  onClick={() => { setHasActiveLoan(false); setActiveLoanScreenshotData(null); setActiveLoanScreenshotFileName(''); }}
                  style={{ minWidth: '100px', padding: '10px 16px', flex: 'none' }}
                >
                  <div className={`ula-disbursement-radio ${hasActiveLoan === false ? 'active' : ''}`} />
                  No
                </button>
              </div>
            </div>

            {hasActiveLoan && (
              <div style={{ marginTop: '20px' }}>
                <label className="user-loan-application-label">Upload Active Loan Screenshot <span style={{ color: '#dc2626' }}>*</span></label>
                <label className={`user-loan-upload-box ${activeLoanScreenshotFileName ? 'user-loan-upload-box-done' : ''}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, setActiveLoanScreenshotData, setActiveLoanScreenshotFileName)} style={{ display: 'none' }} />
                  {activeLoanScreenshotFileName ? (
                    <>
                      <div className="ula-capture-done-row" style={{ marginTop: 0 }}>
                        <CheckCircle size={20} color="#16a34a" />
                        <span className="user-loan-upload-text user-loan-upload-text-done" style={{ fontSize: '14px' }}>File selected</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeLoanScreenshotFileName}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="user-loan-upload-icon" size={28} color="#1E3A8A" />
                      <p className="user-loan-upload-text">Click to upload screenshot</p>
                      <p className="user-loan-upload-subtext">Image or PDF</p>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* ── Disbursement Method ── */}
          <div className="ula-disbursement-section">
            <h3 className="user-loan-application-guarantor-title">Disbursement Method</h3>
            <p className="ula-disbursement-desc">How would you like to receive your loan once approved?</p>
            <div className="ula-disbursement-options">
              {[
                { id: 'cash', label: 'Cash (Pick up at office)' },
                { id: 'e-wallet', label: 'E-Wallet' },
                { id: 'bank', label: 'Bank Transfer' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`ula-disbursement-btn ${disbursementMethod === opt.id ? 'ula-disbursement-btn--active' : ''}`}
                  onClick={() => { setDisbursementMethod(opt.id); setSelectedAccountIdx(-1); setDisbursementAccount(''); }}
                >
                  <div className={`ula-disbursement-radio ${disbursementMethod === opt.id ? 'active' : ''}`} />
                  {opt.label}
                </button>
              ))}
            </div>
            
            {(disbursementMethod === 'e-wallet' || disbursementMethod === 'bank') && (
              <div className="ula-disbursement-account">
                {filteredAccounts.length > 0 && (
                  <>
                    <label className="user-loan-application-label">Select a saved account</label>
                    <div className="ula-saved-accounts">
                      {filteredAccounts.map((acc, idx) => (
                        <div key={idx} className={`ula-saved-account-btn ${selectedAccountIdx === idx ? 'ula-saved-account-btn--active' : ''}`}>
                          {editingAccountIdx === idx ? (
                            <>
                              <div className={`ula-disbursement-radio ${selectedAccountIdx === idx ? 'active' : ''}`} />
                              <input
                                type="text"
                                className="ula-saved-account-edit-input"
                                value={disbursementAccount}
                                onChange={(e) => setDisbursementAccount(e.target.value)}
                                onBlur={() => setEditingAccountIdx(null)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingAccountIdx(null); }}
                                autoFocus
                              />
                            </>
                          ) : (
                            <>
                              <div
                                className="ula-saved-account-select-area"
                                onClick={() => {
                                  setSelectedAccountIdx(idx);
                                  setDisbursementAccount(acc.label);
                                  setEditingAccountIdx(null);
                                }}
                              >
                                <div className={`ula-disbursement-radio ${selectedAccountIdx === idx ? 'active' : ''}`} />
                                <div className="ula-saved-account-info">
                                  <span className="ula-saved-account-label">{acc.label}</span>
                                  <span className="ula-saved-account-source">{acc.source}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="ula-saved-account-edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAccountIdx(idx);
                                  setDisbursementAccount(acc.label);
                                  setEditingAccountIdx(idx);
                                }}
                                title="Edit account info"
                              >
                                <Pencil size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className={`ula-saved-account-btn ${selectedAccountIdx === -1 ? 'ula-saved-account-btn--active' : ''}`}
                        onClick={() => { setSelectedAccountIdx(-1); setDisbursementAccount(''); setEditingAccountIdx(null); }}
                      >
                        <div className={`ula-disbursement-radio ${selectedAccountIdx === -1 ? 'active' : ''}`} />
                        <span className="ula-saved-account-label">Enter new account</span>
                      </button>
                    </div>
                  </>
                )}
                {(filteredAccounts.length === 0 || selectedAccountIdx === -1) && (
                  <div style={{ marginTop: filteredAccounts.length > 0 ? '12px' : 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {disbursementMethod === 'e-wallet' ? (
                      <>
                        <div>
                          <label className="user-loan-application-label">E-Wallet Provider</label>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', marginBottom: '8px' }}>
                            <label style={{ 
                              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--foreground)', cursor: 'pointer',
                              padding: '12px 16px', borderRadius: '10px', flex: 1,
                              border: newEwalletProvider === 'GCash' ? '1px solid #1E3A8A' : '1px solid var(--border)',
                              background: newEwalletProvider === 'GCash' ? 'rgba(30, 58, 138, 0.03)' : 'var(--card)',
                              transition: 'all 0.2s'
                            }}>
                              <input type="radio" name="ewalletProvider" value="GCash" checked={newEwalletProvider === 'GCash'} onChange={(e) => setNewEwalletProvider(e.target.value)} style={{ display: 'none' }} />
                              <div className={`ula-disbursement-radio ${newEwalletProvider === 'GCash' ? 'active' : ''}`} />
                              GCash
                            </label>
                            <label style={{ 
                              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--foreground)', cursor: 'pointer',
                              padding: '12px 16px', borderRadius: '10px', flex: 1,
                              border: newEwalletProvider === 'Maya' ? '1px solid #1E3A8A' : '1px solid var(--border)',
                              background: newEwalletProvider === 'Maya' ? 'rgba(30, 58, 138, 0.03)' : 'var(--card)',
                              transition: 'all 0.2s'
                            }}>
                              <input type="radio" name="ewalletProvider" value="Maya" checked={newEwalletProvider === 'Maya'} onChange={(e) => setNewEwalletProvider(e.target.value)} style={{ display: 'none' }} />
                              <div className={`ula-disbursement-radio ${newEwalletProvider === 'Maya' ? 'active' : ''}`} />
                              Maya
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="user-loan-application-label">Account Name</label>
                          <input type="text" className="user-loan-application-input" style={{ paddingLeft: '16px' }} placeholder="e.g. Juan Dela Cruz" value={newEwalletAccountName} onChange={(e) => setNewEwalletAccountName(e.target.value)} maxLength={50} required />
                        </div>
                        <div>
                          <label className="user-loan-application-label">Account Number</label>
                          <input 
                            type="text" 
                            className="user-loan-application-input" 
                            style={{ paddingLeft: '16px' }} 
                            placeholder="e.g. 09123456789" 
                            value={newEwalletNumber} 
                            onChange={(e) => setNewEwalletNumber(e.target.value.replace(/[^0-9]/g, ''))} 
                            maxLength={11}
                            required 
                          />
                        </div>
                      </>
                    ) : disbursementMethod === 'bank' ? (
                      <>
                        <div>
                          <label className="user-loan-application-label">Bank Name</label>
                          <input type="text" className="user-loan-application-input" style={{ paddingLeft: '16px' }} placeholder="e.g. BDO, BPI" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} maxLength={50} required />
                        </div>
                        <div>
                          <label className="user-loan-application-label">Account Name</label>
                          <input type="text" className="user-loan-application-input" style={{ paddingLeft: '16px' }} placeholder="e.g. Juan Dela Cruz" value={newBankAccountName} onChange={(e) => setNewBankAccountName(e.target.value)} maxLength={50} required />
                        </div>
                        <div>
                          <label className="user-loan-application-label">Account Number</label>
                          <input 
                            type="text" 
                            className="user-loan-application-input" 
                            style={{ paddingLeft: '16px' }} 
                            placeholder="e.g. 1234 5678 90" 
                            value={newBankAccountNumber} 
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setNewBankAccountNumber(raw.replace(/(.{4})/g, '$1 ').trim());
                            }} 
                            maxLength={20} 
                            required 
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
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
                  <li>Accepted payment methods: Cash, Bank transfer, E-Wallet.</li>
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
              disabled={loading || !allEligible || !calc || !selfieImage || !idImage || !disbursementMethod || !agreedToTerms}
            >
              {loading ? <span className="btn-spinner" /> : 'Submit Application'}
            </button>
            <button type="button" className="user-loan-application-cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>

        </form>

      </div>

      {/* ── Camera Capture Modal ── */}
      {cameraOpen && (
        <div className="ula-camera-overlay" onClick={closeCamera}>
          <div className="ula-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ula-camera-header">
              <h3 className="ula-camera-title">
                <Camera size={20} />
                {cameraTarget === 'selfie' ? 'Capture Selfie with ID & Date' : 'Capture Government ID'}
              </h3>
              <button type="button" className="ula-camera-close" onClick={closeCamera}>
                <X size={20} />
              </button>
            </div>

            <div className="ula-camera-body">
              {cameraError ? (
                <div className="ula-camera-error">
                  <AlertTriangle size={32} color="#dc2626" />
                  <p>{cameraError}</p>
                  <button type="button" className="ula-retake-btn" onClick={() => openCamera(cameraTarget)}>
                    <RotateCcw size={14} /> Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div className={`ula-camera-video-container ${cameraTarget === 'selfie' ? 'ula-camera-mirror' : ''} ${cameraTarget === 'id' && idDetected ? 'ula-id-detected' : ''}`}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="ula-camera-video"
                    />
                    {!cameraReady && (
                      <div className="ula-camera-loading">
                        <span className="btn-spinner" />
                        <p>Starting camera...</p>
                      </div>
                    )}
                    {/* Guide overlay */}
                    {cameraReady && cameraTarget === 'selfie' && (
                      <div className="ula-camera-guide-selfie">
                        <div className="ula-camera-face-outline" />
                      </div>
                    )}
                    {cameraReady && cameraTarget === 'id' && (
                      <div className="ula-camera-guide-id">
                        <div className="ula-camera-id-outline" />
                      </div>
                    )}
                  </div>

                  {/* Hint bar */}
                  {cameraReady && cameraHint && (
                    <div className="ula-camera-hint">
                      <AlertTriangle size={14} />
                      <span>{cameraHint}</span>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="ula-camera-instructions">
                    {cameraTarget === 'selfie' ? (
                      <ul>
                        <li>Hold your government ID beside your face</li>
                        <li>Your face must be clearly visible and close to the camera</li>
                        <li>Include today's date (handwritten on paper)</li>
                      </ul>
                    ) : (
                      <ul>
                        <li>Capture a clear photo of the front of your valid government ID</li>
                        <li>All text and photo on the ID must be readable</li>
                        <li>Avoid glare, shadows, and blurriness</li>
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Capture button */}
            {!cameraError && (
              <div className="ula-camera-actions">
                {/* ID verification section */}
                {cameraTarget === 'id' && cameraReady && (
                  <>
                    {/* Status message */}
                    {idDetectionMsg && (
                      <div className={`ula-id-detection-status ${idDetected ? 'detected' : 'scanning'}`}>
                        {idDetected ? (
                          <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ ID Detected</span> — Ready to capture</>
                        ) : (
                          <><span style={{ color: '#dc2626' }}>⚠</span> {idDetectionMsg}</>
                        )}
                      </div>
                    )}
                    {/* Manual verify button */}
                    {!idDetected && (
                      <button
                        type="button"
                        className="ula-verify-id-btn"
                        onClick={checkIdFrame}
                        disabled={idChecking}
                      >
                        {idChecking ? (
                          <><span className="btn-spinner" style={{ width: 14, height: 14 }} /> Verifying...</>
                        ) : (
                          '🔍 Verify ID'
                        )}
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  className={`ula-camera-capture-btn ${cameraTarget === 'id' && idDetected ? 'ula-capture-ready' : ''}`}
                  onClick={capturePhoto}
                  disabled={!cameraReady || (cameraTarget === 'id' && !idDetected)}
                >
                  <div className="ula-camera-capture-ring">
                    <div className="ula-camera-capture-dot" />
                  </div>
                </button>
                <span className="ula-camera-capture-label">
                  {cameraTarget === 'id' && !idDetected ? 'Verify your ID first, then capture' : 'Tap to capture'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

    </div>
  );
}