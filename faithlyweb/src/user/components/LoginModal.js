import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, X, AlertTriangle } from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/LoginModal.css';

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


export default function LoginModal({ isOpen = true, onClose, onSwitchToSignup, onSwitchToReset, embedded = false }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [emailError, setEmailError]     = useState('');

  // Lock state — driven entirely by server responses
  const [isLocked, setIsLocked]                       = useState(false);
  const [isPermanentlyLocked, setIsPermanentlyLocked] = useState(false);
  const [recommendReset, setRecommendReset]           = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining]     = useState(0);

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
        setIsPermanentlyLocked(true);
        setIsLocked(false);
        setError(
          data.message ||
          'Your account has been permanently locked. Please reset your password to regain access.'
        );
      } else if (data.locked && data.remainingSeconds) {
        setRecommendReset(!!data.recommendReset);
        startCountdown(data.remainingSeconds);
        setError(data.message || 'Account locked. Please wait before trying again.');
      } else {
        setError(result.message || data.message || 'Invalid email or password.');
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = () => {
    if (embedded && onSwitchToReset) {
      onSwitchToReset();
    } else {
      if (onClose) onClose();
      navigate('/reset-password');
    }
  };

  // ── Derive button label ────────────────────────────────────────────────────
  const getButtonLabel = () => {
    if (loading)             return 'Signing in...';
    if (isPermanentlyLocked) return 'Account Locked';
    if (isLocked)            return `Locked (${formatTime(lockTimeRemaining)})`;
    return 'Login';
  };

  const inputDisabled  = loading || isLocked || isPermanentlyLocked;
  const buttonDisabled = inputDisabled || !!emailError;

  // ── Derive alert heading label ─────────────────────────────────────────────
  const getAlertHeading = () => {
    if (isPermanentlyLocked) return 'Account Permanently Locked';
    if (isLocked)            return 'Account Temporarily Locked';
    return 'Sign-in Failed';
  };

  // ── Shared form JSX ────────────────────────────────────────────────────────
  const renderForm = () => (
    <form onSubmit={handleSubmit} className="lm-form">

      {/* EMAIL */}
      <div className="lm-form-group">
        <label className="lm-label">Email Address</label>
        <div className="lm-input-wrapper">
          <Mail className="lm-input-icon" />
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            className={`lm-input ${emailError ? 'lm-input-error' : ''}`}
            placeholder="Enter your email"
            required
            disabled={inputDisabled}
          />
        </div>
        {emailError && <span className="lm-field-error">{emailError}</span>}
      </div>

      {/* PASSWORD */}
      <div className="lm-form-group">
        <label className="lm-label">Password</label>
        <div className="lm-input-wrapper">
          <Lock className="lm-input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="lm-input lm-password-input"
            placeholder="Enter your password"
            required
            disabled={inputDisabled}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="lm-password-toggle"
            disabled={inputDisabled}
          >
            {showPassword
              ? <EyeOff className="lm-toggle-icon" />
              : <Eye className="lm-toggle-icon" />}
          </button>
        </div>
      </div>

      {/* ── REDESIGNED ALERT BANNER ── */}
      {error && (
        <div className="lm-alert-banner">
          <div className="lm-alert-body">
            {/* Icon */}
            <div className="lm-alert-icon">
              <AlertTriangle />
            </div>

            {/* Content */}
            <div className="lm-alert-content">
              <span className="lm-alert-heading">{getAlertHeading()}</span>
              <span className="lm-alert-message">{error}</span>

              {/* Live countdown badge */}
              {isLocked && lockTimeRemaining > 0 && (
                <div className="lm-alert-timer">
                  <span className="lm-alert-timer-dot" />
                  Try again in {formatTime(lockTimeRemaining)}
                </div>
              )}

              {/* Reset CTA */}
              {(isPermanentlyLocked || recommendReset) && (
                <button
                  type="button"
                  className="lm-alert-reset-btn"
                  onClick={handleForgotPassword}
                >
                  Reset your password
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD */}
      <div className="lm-form-options">
        <button
          type="button"
          className="lm-forgot-password"
          onClick={handleForgotPassword}
        >
          Forgot password?
        </button>
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        className="lm-submit-btn"
        disabled={buttonDisabled}
      >
        {getButtonLabel()}
      </button>

      <p className="lm-switch-text">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="lm-switch-btn"
        >
          Sign Up
        </button>
      </p>
    </form>
  );

  // ── Embedded (card) mode ───────────────────────────────────────────────────
  if (embedded) {
    return (
      <div className="lm-card-embedded">
        <div className="lm-header">
          <img src={puacLogo} alt="PUAC Logo" className="lm-logo" />
          <h1 className="lm-title">Welcome Back</h1>
          <p className="lm-subtitle">Sign in to access your account</p>
        </div>
        {renderForm()}
      </div>
    );
  }

  // ── Modal mode ─────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-container" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="lm-close-btn">
          <X className="lm-close-icon" />
        </button>

        <div className="lm-header">
          <img src={puacLogo} alt="PUAC Logo" className="lm-logo" />
          <h1 className="lm-title">Welcome Back</h1>
          <p className="lm-subtitle">Sign in to access your account</p>
        </div>

        {renderForm()}
      </div>
    </div>
  );
}