import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, ArrowLeft, Eye, EyeOff, X, AlertTriangle, CheckCircle } from "lucide-react";
import puacLogo from "../../assets/puaclogo.png";
import "../styles/ResetPassword.css";

const RULES = [
  { key: "lower", label: "At least one lowercase letter", test: v => /[a-z]/.test(v) },
  { key: "upper", label: "At least one uppercase letter", test: v => /[A-Z]/.test(v) },
  { key: "number", label: "At least one number",          test: v => /[0-9]/.test(v) },
  { key: "symbol", label: "At least one symbol",          test: v => /[^A-Za-z0-9]/.test(v) },
  { key: "min8",   label: "Minimum 8 characters",         test: v => v.length >= 8 },
];

function allRulesPass(p) { return RULES.every(r => r.test(p)); }

/* ── Password rules checklist ── */
function PasswordRules({ password }) {
  return (
    <ul className="rp-rules-list">
      {RULES.map(rule => {
        const ok = rule.test(password);
        return (
          <li key={rule.key} className={`rp-rule ${ok ? "rp-rule-pass" : "rp-rule-fail"}`}>
            <span className="rp-rule-icon">{ok ? "✓" : "✗"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Rate-limit countdown banner ── */
function RateLimitBanner({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const t = setInterval(() => {
      setRemaining(prev => { if (prev <= 1) { clearInterval(t); onExpire(); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const m = Math.floor(remaining / 60), s = remaining % 60;

  return (
    <div className="rp-alert-banner rp-alert-warning">
      <div className="rp-alert-banner::before" />
      <div className="rp-alert-body">
        <div className="rp-alert-icon rp-alert-icon-warning">
          <AlertTriangle size={16} />
        </div>
        <div className="rp-alert-content">
          <span className="rp-alert-heading rp-alert-heading-warning">Too many attempts</span>
          <span className="rp-alert-message rp-alert-message-warning">
            Please wait <strong>{m > 0 ? `${m}m ${s}s` : `${s}s`}</strong> before trying again.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main component
   Props (modal mode):   isOpen, onClose
   Props (page mode):    neither — standalone
═══════════════════════════════════════════ */
export default function ResetPassword({ isOpen, onClose }) {
  const navigate  = useNavigate();
  const { resetPassword, verifyResetOTP, updatePasswordWithOTP } = useAuth();

  const [step,            setStep]            = useState(1);
  const [email,           setEmail]           = useState("");
  const [otp,             setOtp]             = useState(["","","","","",""]);
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [rateLimitSecs,   setRateLimitSecs]   = useState(0);
  const [successMsg,      setSuccessMsg]      = useState("");

  const otpRefs = useRef([]);

  /* detect modal vs page mode */
  const isModal = typeof isOpen !== "undefined";

  const handleClose = () => {
    if (isModal && onClose) onClose();
    else navigate("/login");
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else handleClose();
  };

  const withRateLimit = async fn => {
    setRateLimitSecs(0);
    try {
      const result = await fn();
      if (result?.retryAfter) { setRateLimitSecs(result.retryAfter); return { success: false }; }
      return result;
    } catch (err) {
      if (err?.retryAfter) setRateLimitSecs(err.retryAfter);
      return { success: false };
    }
  };

  /* Step 1 — send email */
  const handleEmailSubmit = async e => {
    e?.preventDefault();
    if (rateLimitSecs > 0) return;
    setLoading(true);
    const result = await withRateLimit(() => resetPassword(email));
    if (result.success) setStep(2);
    setLoading(false);
  };

  /* OTP helpers */
  const handleOTPChange = (i, val) => {
    if (isNaN(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOTPKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOTPPaste = e => {
    e.preventDefault();
    const chars = e.clipboardData.getData("text").slice(0, 6).split("");
    while (chars.length < 6) chars.push("");
    setOtp(chars);
    otpRefs.current[5]?.focus();
  };

  /* Step 2 — verify OTP */
  const handleOTPSubmit = async e => {
    e.preventDefault();
    if (rateLimitSecs > 0) return;
    setLoading(true);
    const result = await withRateLimit(() => verifyResetOTP(email, otp.join("")));
    if (result.success) setStep(3);
    setLoading(false);
  };

  /* Step 3 — new password */
  const handlePasswordSubmit = async e => {
    e.preventDefault();
    if (!allRulesPass(newPassword) || newPassword !== confirmPassword) return;
    setLoading(true);
    const result = await withRateLimit(() => updatePasswordWithOTP(email, otp.join(""), newPassword));
    if (result.success) {
      setSuccessMsg("Password updated successfully!");
      setTimeout(() => { handleClose(); }, 1800);
    }
    setLoading(false);
  };

  /* ── shared step labels ── */
  const steps = ["Email", "Verify", "Password"];

  /* ── inner content per step ── */
  const renderContent = () => {
    /* ─ Step 1 ─ */
    if (step === 1) return (
      <>
        <div className="rp-header">
          <img src={puacLogo} alt="PUAC Logo" className="rp-logo" />
          <h1 className="rp-title">Reset Password</h1>
          <p className="rp-subtitle">Enter your email and we'll send you a verification code</p>
        </div>

        {rateLimitSecs > 0 && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}

        <form onSubmit={handleEmailSubmit} className="rp-form">
          <div className="rp-form-group">
            <label className="rp-label">Email Address</label>
            <div className="rp-input-wrapper">
              <Mail className="rp-input-icon" />
              <input
                type="email"
                className="rp-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading || rateLimitSecs > 0}
              />
            </div>
          </div>

          <button type="submit" className="rp-submit-btn" disabled={loading || rateLimitSecs > 0}>
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      </>
    );

    /* ─ Step 2 ─ */
    if (step === 2) return (
      <>
        <div className="rp-header">
          <img src={puacLogo} alt="PUAC Logo" className="rp-logo" />
          <h1 className="rp-title">Enter Verification Code</h1>
          <p className="rp-subtitle">We sent a 6-digit code to <strong>{email}</strong></p>
        </div>

        {rateLimitSecs > 0 && <RateLimitBanner seconds={rateLimitSecs} onExpire={() => setRateLimitSecs(0)} />}

        <form onSubmit={handleOTPSubmit} className="rp-form">
          <div className="rp-otp-container">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => (otpRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={e => handleOTPChange(i, e.target.value)}
                onKeyDown={e => handleOTPKeyDown(i, e)}
                onPaste={handleOTPPaste}
                className="rp-otp-input"
                disabled={loading || rateLimitSecs > 0}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleEmailSubmit}
            className="rp-resend-btn"
            disabled={loading || rateLimitSecs > 0}
          >
            Didn't receive a code? <span>Resend</span>
          </button>

          <button
            type="submit"
            className="rp-submit-btn"
            disabled={loading || rateLimitSecs > 0 || otp.join("").length < 6}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      </>
    );

    /* ─ Step 3 ─ */
    return (
      <>
        <div className="rp-header">
          <img src={puacLogo} alt="PUAC Logo" className="rp-logo" />
          <h1 className="rp-title">Create New Password</h1>
          <p className="rp-subtitle">Make it strong and memorable</p>
        </div>

        {successMsg && (
          <div className="rp-success-banner">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="rp-form">
          <div className="rp-form-group">
            <label className="rp-label">New Password</label>
            <div className="rp-input-wrapper">
              <Lock className="rp-input-icon" />
              <input
                type={showNew ? "text" : "password"}
                className="rp-input rp-password-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
              />
              <button type="button" className="rp-password-toggle" onClick={() => setShowNew(v => !v)} disabled={loading}>
                {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {newPassword && <PasswordRules password={newPassword} />}
          </div>

          <div className="rp-form-group">
            <label className="rp-label">Confirm Password</label>
            <div className="rp-input-wrapper">
              <Lock className="rp-input-icon" />
              <input
                type={showConfirm ? "text" : "password"}
                className={`rp-input rp-password-input ${confirmPassword && confirmPassword !== newPassword ? "rp-input-mismatch" : ""}`}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
              />
              <button type="button" className="rp-password-toggle" onClick={() => setShowConfirm(v => !v)} disabled={loading}>
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="rp-mismatch-msg">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            className="rp-submit-btn"
            disabled={loading || !allRulesPass(newPassword) || newPassword !== confirmPassword}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </>
    );
  };

  /* ── Modal wrapper ── */
  const card = (
    <div className="rp-container" onClick={e => e.stopPropagation()}>
      {/* Top nav: back arrow + close */}
      <div className="rp-nav">
        <button className="rp-nav-btn" onClick={handleBack} type="button">
          <ArrowLeft size={18} />
        </button>

        {/* Step indicator */}
        <div className="rp-stepper">
          {steps.map((label, i) => (
            <div key={label} className="rp-step-item">
              <div className={`rp-step-dot ${i + 1 < step ? "rp-step-done" : i + 1 === step ? "rp-step-active" : "rp-step-inactive"}`}>
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <span className={`rp-step-label ${i + 1 === step ? "rp-step-label-active" : ""}`}>{label}</span>
              {i < steps.length - 1 && <div className={`rp-step-line ${i + 1 < step ? "rp-step-line-done" : ""}`} />}
            </div>
          ))}
        </div>

        {isModal && (
          <button className="rp-nav-btn" onClick={handleClose} type="button">
            <X size={18} />
          </button>
        )}
      </div>

      {renderContent()}
    </div>
  );

  /* Modal mode */
  if (isModal) {
    if (!isOpen) return null;
    return (
      <div className="rp-overlay" onClick={handleClose}>
        {card}
      </div>
    );
  }

  /* Standalone page mode */
  return <div className="rp-page">{card}</div>;
}