import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Mail, ArrowLeft, Lock } from 'lucide-react';
import '../styles/ResetPassword.css';
import puacLogo from '../../assets/puaclogo.png';

const API = process.env.REACT_APP_API_URL;

/* ─── Password rule checker ─────────────────────────────────── */
const RULES = [
  { key: 'lower',  label: 'At least one lowercase letter', test: v => /[a-z]/.test(v) },
  { key: 'min8',   label: 'Minimum 8 characters',          test: v => v.length >= 8    },
  { key: 'upper',  label: 'At least one uppercase letter', test: v => /[A-Z]/.test(v) },
  { key: 'number', label: 'At least one number',           test: v => /[0-9]/.test(v) },
  { key: 'symbol', label: 'At least one symbol',           test: v => /[^A-Za-z0-9]/.test(v) },
];

function PasswordRules({ password, show }) {
  if (!show) return null;
  return (
    <ul className="rp-rules-list">
      {RULES.map(r => {
        const pass = r.test(password);
        return (
          <li key={r.key} className={`rp-rule ${pass ? 'rp-rule-pass' : 'rp-rule-fail'}`}>
            <span className="rp-rule-icon">{pass ? '✓' : '✗'}</span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

function allRulesPass(password) {
  return RULES.every(r => r.test(password));
}

/* ─── Rate-limit countdown banner ───────────────────────────── */
function RateLimitBanner({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const t = setInterval(() => setRemaining(r => {
      if (r <= 1) { clearInterval(t); onExpire(); return 0; }
      return r - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);  // eslint-disable-line

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0
    ? `${mins}m ${String(secs).padStart(2, '0')}s`
    : `${secs}s`;

  return (
    <div className="rp-rate-limit-banner">
      <span className="rp-rate-limit-icon">⏳</span>
      <div>
        <p className="rp-rate-limit-title">Too many attempts</p>
        <p className="rp-rate-limit-msg">Please wait <strong>{label}</strong> before trying again.</p>
      </div>
    </div>
  );
}

export default function ResetPassword({ embedded = false, onBackToLogin }) {
  const navigate = useNavigate();
  const { resetPassword, verifyResetOTP, updatePasswordWithOTP } = useAuth();

  const [step,            setStep]            = useState(1);
  const [email,           setEmail]           = useState('');
  const [otp,             setOtp]             = useState(['', '', '', '', '', '']);
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rateLimitSecs,   setRateLimitSecs]   = useState(0); // >0 = rate-limited

  const otpRefs = useRef([]);

  /* ── Rate-limit helper: wraps any auth call ── */
  const withRateLimit = async (fn) => {
    setRateLimitSecs(0);
    try {
      const result = await fn();
      // If the auth context surfaced a 429 via result.retryAfter
      if (result?.retryAfter) {
        setRateLimitSecs(result.retryAfter);
        return { success: false };
      }
      return result;
    } catch (err) {
      if (err?.retryAfter) setRateLimitSecs(err.retryAfter);
      return { success: false };
    }
  };

  /* ── Step 1 ── */
  const handleEmailSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (rateLimitSecs > 0) return;
    setLoading(true);
    const result = await withRateLimit(() => resetPassword(email));
    if (result.success) setStep(2);
    setLoading(false);
  };

  /* ── OTP helpers ── */
  const handleOTPChange = (index, value) => {
    if (isNaN(value)) return;
    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };
  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOTP = pastedData.split('');
    while (newOTP.length < 6) newOTP.push('');
    setOtp(newOTP);
    otpRefs.current[5]?.focus();
  };

  /* ── Step 2 ── */
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (rateLimitSecs > 0) return;
    setLoading(true);
    const result = await withRateLimit(() => verifyResetOTP(email, otp.join('')));
    if (result.success) setStep(3);
    setLoading(false);
  };

  /* ── Step 3 ── */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!allRulesPass(newPassword)) return;
    if (newPassword !== confirmPassword) return;
    if (rateLimitSecs > 0) return;
    setLoading(true);
    const result = await withRateLimit(() => updatePasswordWithOTP(email, otp.join(''), newPassword));
    if (result.success) {
      if (embedded && onBackToLogin) onBackToLogin();
      else navigate('/login');
    }
    setLoading(false);
  };

  const handleBackButton = () => {
    setRateLimitSecs(0);
    if (step === 1) { if (embedded && onBackToLogin) onBackToLogin(); else navigate('/login'); }
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const isBlocked = rateLimitSecs > 0;

  /* ════════════════════════════════════════════
     EMBEDDED MODE
  ════════════════════════════════════════════ */
  if (embedded) {
    if (step === 1) return (
      <div className="login-card-embedded">
        <button onClick={handleBackButton} className="reset-back-button-embedded">
          <ArrowLeft className="reset-back-icon" />
        </button>
        <div className="modal-header-custom">
          <img src={puacLogo} alt="PUAC Logo" className="modal-logo" />
          <h1 className="modal-title-custom">Reset Your Password</h1>
          <p className="modal-subtitle-custom">Enter your email address and we'll send you a verification code</p>
        </div>
        {isBlocked && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}
        <form onSubmit={handleEmailSubmit} className="modal-form">
          <div className="modal-form-group">
            <label className="modal-form-label">Email Address</label>
            <div className="modal-input-wrapper">
              <Mail className="modal-input-icon" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required className="modal-form-input" disabled={loading || isBlocked} />
            </div>
          </div>
          <button type="submit" className="modal-submit-button" disabled={loading || isBlocked}>
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      </div>
    );

    if (step === 2) return (
      <div className="login-card-embedded">
        <button onClick={handleBackButton} className="reset-back-button-embedded">
          <ArrowLeft className="reset-back-icon" />
        </button>
        <div className="modal-header-custom">
          <img src={puacLogo} alt="PUAC Logo" className="modal-logo" />
          <h1 className="modal-title-custom">Enter Verification Code</h1>
          <p className="modal-subtitle-custom">We sent a 6-digit code to</p>
          <p className="modal-subtitle-custom" style={{ fontWeight: '600', color: '#155DFC', marginTop: '0.25rem' }}>{email}</p>
        </div>
        {isBlocked && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}
        <form onSubmit={handleOTPSubmit} className="modal-form">
          <div className="reset-otp-container">
            {otp.map((digit, index) => (
              <input key={index} ref={el => (otpRefs.current[index] = el)} type="text" maxLength="1" value={digit}
                onChange={e => handleOTPChange(index, e.target.value)} onKeyDown={e => handleOTPKeyDown(index, e)}
                onPaste={handleOTPPaste} className="reset-otp-input-embedded" disabled={loading || isBlocked} />
            ))}
          </div>
          <button type="button" onClick={handleEmailSubmit} className="modal-forgot-password" disabled={loading || isBlocked}>Resend Code</button>
          <button type="submit" className="modal-submit-button" disabled={loading || isBlocked}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      </div>
    );

    return (
      <div className="login-card-embedded">
        <button onClick={handleBackButton} className="reset-back-button-embedded">
          <ArrowLeft className="reset-back-icon" />
        </button>
        <div className="modal-header-custom">
          <img src={puacLogo} alt="PUAC Logo" className="modal-logo" />
          <h1 className="modal-title-custom">Create New Password</h1>
          <p className="modal-subtitle-custom">Enter your new password below</p>
        </div>
        {isBlocked && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}
        <form onSubmit={handlePasswordSubmit} className="modal-form">
          <div className="modal-form-group">
            <label className="modal-form-label">New Password</label>
            <div className="modal-input-wrapper">
              <Lock className="modal-input-icon" />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)} placeholder="Enter new password" required
                className="modal-form-input" disabled={loading || isBlocked} />
            </div>
            <PasswordRules password={newPassword} show={passwordFocused || newPassword.length > 0} />
          </div>
          <div className="modal-form-group">
            <label className="modal-form-label">Confirm Password</label>
            <div className="modal-input-wrapper">
              <Lock className="modal-input-icon" />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password" required
                className={`modal-form-input ${confirmPassword && confirmPassword !== newPassword ? 'rp-input-mismatch' : ''}`}
                disabled={loading || isBlocked} />
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="rp-mismatch-msg">Passwords do not match</p>
            )}
          </div>
          <button type="submit" className="modal-submit-button"
            disabled={loading || isBlocked || !allRulesPass(newPassword) || newPassword !== confirmPassword}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     FULL-PAGE MODE
  ════════════════════════════════════════════ */
  if (step === 1) return (
    <div className="reset-password-container">
      <div className="reset-password-wrapper">
        <button onClick={handleBackButton} className="back-button"><ArrowLeft className="back-icon" /></button>
        <div className="reset-password-card">
          <div className="reset-password-header">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <h1 className="reset-password-title">Reset Your Password</h1>
            <p className="reset-password-subtitle">Enter your email address and we'll send you a verification code</p>
          </div>
          {isBlocked && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}
          <form onSubmit={handleEmailSubmit} className="reset-password-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required className="form-input" disabled={loading || isBlocked} />
              </div>
            </div>
            <button type="submit" className="submit-button" disabled={loading || isBlocked}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="reset-password-container">
      <div className="reset-password-wrapper">
        <button onClick={handleBackButton} className="back-button"><ArrowLeft className="back-icon" /></button>
        <div className="reset-password-card">
          <div className="reset-password-header">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <h1 className="reset-password-title">Enter Verification Code</h1>
            <p className="reset-password-subtitle">We sent a 6-digit code to</p>
            <p className="reset-password-subtitle" style={{ fontWeight: '600', color: '#155DFC', marginTop: '0.25rem' }}>{email}</p>
          </div>
          {isBlocked && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}
          <form onSubmit={handleOTPSubmit} className="reset-password-form">
            <div className="otp-container">
              {otp.map((digit, index) => (
                <input key={index} ref={el => (otpRefs.current[index] = el)} type="text" maxLength="1" value={digit}
                  onChange={e => handleOTPChange(index, e.target.value)} onKeyDown={e => handleOTPKeyDown(index, e)}
                  onPaste={handleOTPPaste} className="respass-otp-input" disabled={loading || isBlocked} />
              ))}
            </div>
            <button type="button" onClick={handleEmailSubmit} className="resend-button" disabled={loading || isBlocked}>Resend Code</button>
            <button type="submit" className="submit-button" disabled={loading || isBlocked}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="reset-password-container">
      <div className="reset-password-wrapper">
        <button onClick={handleBackButton} className="back-button"><ArrowLeft className="back-icon" /></button>
        <div className="reset-password-card">
          <div className="reset-password-header">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <h1 className="reset-password-title">Create New Password</h1>
            <p className="reset-password-subtitle">Enter your new password below</p>
          </div>
          {isBlocked && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}
          <form onSubmit={handlePasswordSubmit} className="reset-password-form">
            <div className="form-group">
              <label className="respass-info">New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)} placeholder="Enter new password" required
                  className="form-input" disabled={loading || isBlocked} />
              </div>
              <PasswordRules password={newPassword} show={passwordFocused || newPassword.length > 0} />
            </div>
            <div className="form-group">
              <label className="respass-info">Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password" required
                  className={`form-input ${confirmPassword && confirmPassword !== newPassword ? 'rp-input-mismatch' : ''}`}
                  disabled={loading || isBlocked} />
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="rp-mismatch-msg rp-mismatch-dark">Passwords do not match</p>
              )}
            </div>
            <button type="submit" className="submit-button"
              disabled={loading || isBlocked || !allRulesPass(newPassword) || newPassword !== confirmPassword}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}