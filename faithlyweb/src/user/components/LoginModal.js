import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/Modal.css';

// Valid email domains list
const validDomains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'zoho.com',
  'mail.com', 'yandex.com'
];

// Enhanced Email Validation
const validateEmailAdvanced = (email) => {
  if (!email) return '';
  if (/\s/.test(email)) return 'Email cannot contain spaces';
  if (!email.includes('@')) return 'Email must contain @';

  const parts = email.split('@');
  if (parts.length !== 2) return 'Email must have exactly one @';

  const [localPart, domain] = parts;

  if (!localPart || localPart.length === 0) return 'Email must have a local part before @';
  if (!/^[a-zA-Z0-9._-]+$/.test(localPart)) return 'Local part contains invalid characters';
  if (localPart.startsWith('.') || localPart.endsWith('.')) return 'Local part cannot start or end with a dot';
  if (/\.\./.test(localPart)) return 'Local part cannot have consecutive dots';

  if (!domain || domain.length === 0) return 'Email must have a domain after @';
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Domain cannot start or end with a dot';
  if (!domain.includes('.')) return 'Domain must contain at least one dot';

  const domainParts = domain.split('.');
  if (domainParts.some(part => part.length === 0)) return 'Invalid domain format';

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return 'Invalid domain extension';
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return 'Domain contains invalid characters';
  if (domainParts.length < 2) return 'Please use a complete domain (e.g., example.com)';

  const isKnownDomain = validDomains.includes(domain.toLowerCase());
  const hasValidFormat = domainParts.length >= 2 && tld.length >= 2 && !/^\d+$/.test(tld);

  if (!isKnownDomain && !hasValidFormat) return 'Please use a valid email domain';

  return '';
};

/*
  ─────────────────────────────────────────────────────────────
  Lock tier summary (mirrors server.js exactly):
    Attempts 1–2  → show remaining attempts warning
    Attempt  3    → 5-minute lock
    Attempt  6    → 30-minute lock + recommend password reset
    Attempt  7+   → permanent lock (must reset password)

  All lock state lives in MongoDB. The frontend just reads the
  server response and starts a local countdown timer for UX.
  ─────────────────────────────────────────────────────────────
*/

export default function LoginModal({ isOpen = true, onClose, onSwitchToSignup, embedded = false }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [emailError, setEmailError]     = useState('');

  // Lock state — driven entirely by server responses
  const [isLocked, setIsLocked]                   = useState(false);
  const [isPermanentlyLocked, setIsPermanentlyLocked] = useState(false);
  const [recommendReset, setRecommendReset]       = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);

  const timerRef = useRef(null);

  // ── Start or refresh the countdown when a timed lock is received ──────────
  const startCountdown = (seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setLockTimeRemaining(seconds);
    setIsLocked(true);

    timerRef.current = setInterval(() => {
      setLockTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setIsLocked(false);
          setRecommendReset(false);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Format seconds as mm:ss for display
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmailAdvanced(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Prevent submission while locked
    if (isLocked || isPermanentlyLocked) return;

    // Client-side email validation
    const emailValidationError = validateEmailAdvanced(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    setLoading(true);

    const result = await signIn(email, password);

    if (result.success) {
      // Successful login — clear everything
      setIsLocked(false);
      setIsPermanentlyLocked(false);
      setRecommendReset(false);
      setLockTimeRemaining(0);
      if (timerRef.current) clearInterval(timerRef.current);

      if (onClose) onClose();
      navigate('/home');
    } else {
      // ── Parse server response ────────────────────────────────────────────
      const data = result.data || {};

      if (data.permanent) {
        // Permanently locked — no countdown
        setIsPermanentlyLocked(true);
        setIsLocked(false);
        setError(
          data.message ||
          'Your account has been permanently locked. Please reset your password to regain access.'
        );
      } else if (data.locked && data.remainingSeconds) {
        // Timed lock (5 min or 30 min)
        setRecommendReset(!!data.recommendReset);
        startCountdown(data.remainingSeconds);
        setError(data.message || 'Account locked. Please wait before trying again.');
      } else {
        // Regular invalid credentials warning
        setError(result.message || data.message || 'Invalid email or password.');
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = () => {
    if (onClose) onClose();
    navigate('/reset-password');
  };

  // ── Derive button label ────────────────────────────────────────────────────
  const getButtonLabel = () => {
    if (loading)             return 'Signing in...';
    if (isPermanentlyLocked) return 'Account Locked';
    if (isLocked)            return `Locked (${formatTime(lockTimeRemaining)})`;
    return 'Login';
  };

  // Inputs are only blocked during loading or an active lock — NOT during email validation
  const inputDisabled  = loading || isLocked || isPermanentlyLocked;
  // Submit button is also blocked while there's a validation error
  const buttonDisabled = inputDisabled || !!emailError;

  // ── Shared form JSX ────────────────────────────────────────────────────────
  const renderForm = () => (
    <form onSubmit={handleSubmit} className="modal-form">
      {/* EMAIL */}
      <div className="modal-form-group">
        <label className="modal-form-label">Email Address</label>
        <div className="modal-input-wrapper">
          <Mail className="modal-input-icon" />
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            className={`modal-form-input ${emailError ? 'modal-input-error' : ''}`}
            placeholder="Enter your email"
            required
            disabled={inputDisabled}
          />
        </div>
        {emailError && <span className="modal-error-text">{emailError}</span>}
      </div>

      {/* PASSWORD */}
      <div className="modal-form-group">
        <label className="modal-form-label">Password</label>
        <div className="modal-input-wrapper">
          <Lock className="modal-input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="modal-form-input modal-password-input"
            placeholder="Enter your password"
            required
            disabled={inputDisabled}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="modal-password-toggle"
            disabled={inputDisabled}
          >
            {showPassword
              ? <EyeOff className="modal-toggle-icon" />
              : <Eye className="modal-toggle-icon" />}
          </button>
        </div>
      </div>

      {/* ── ALERT BANNER — shown for all error states ── */}
      {error && (
        <div className="login-alert-banner">
          <span className="login-alert-message">{error}</span>

          {/* Reset password CTA for tier 2 and permanent */}
          {(isPermanentlyLocked || recommendReset) && (
            <button
              type="button"
              className="login-alert-reset-btn"
              onClick={handleForgotPassword}
            >
              → Reset your password now
            </button>
          )}
        </div>
      )}

      {/* FORGOT PASSWORD */}
      <div className="modal-form-options">
        <button
          type="button"
          className="modal-forgot-password"
          onClick={handleForgotPassword}
        >
          Forgot password?
        </button>
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        className="modal-submit-button"
        disabled={buttonDisabled}
      >
        {getButtonLabel()}
      </button>

      <p className="modal-switch-text">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="modal-switch-button"
        >
          Sign Up
        </button>
      </p>
    </form>
  );

  // ── Embedded (card) mode ───────────────────────────────────────────────────
  if (embedded) {
    return (
      <div className="login-card-embedded">
        <div className="modal-header-custom">
          <img src={puacLogo} alt="PUAC Logo" className="modal-logo" />
          <h1 className="modal-title-custom">Welcome Back</h1>
          <p className="modal-subtitle-custom">Sign in to access your account</p>
        </div>
        {renderForm()}
      </div>
    );
  }

  // ── Modal mode ─────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="modal-container-custom" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">
          <X className="close-icon" />
        </button>

        <div className="modal-header-custom">
          <img src={puacLogo} alt="PUAC Logo" className="modal-logo" />
          <h1 className="modal-title-custom">Welcome Back</h1>
          <p className="modal-subtitle-custom">Sign in to access your account</p>
        </div>

        {renderForm()}
      </div>
    </div>
  );
}