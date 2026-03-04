import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import puacLogo from '../../assets/puaclogo.png';
import svgPaths from "../../imports/svg-icons";
import '../styles/Verify.css';

export default function VerifyEmailModal({ isOpen, onClose, email }) {
  const navigate = useNavigate();
  const { verifyOTP, resendOTP } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  useEffect(() => {
    if (isOpen) {
      // Focus first input when modal opens
      if (inputRefs[0].current) {
        inputRefs[0].current.focus();
      }
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleChange = (index, value) => {
  // Strip anything non-numeric, take only last char
  const sanitized = value.replace(/\D/g, '').slice(-1);
  if (value && !sanitized) return;

  const newOtp = [...otp];
  newOtp[index] = sanitized;
  setOtp(newOtp);
  setError('');

  if (sanitized && index < 5) {
    inputRefs[index + 1].current?.focus();
  }
};

  const handleKeyDown = (index, e) => {
    
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        if (digits.length > 0) {
          inputRefs[Math.min(digits.length, 5)].current?.focus();
        }
      });
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOTP(email, otpString);
    
    if (result.success) {
      setSuccess(true);
      toast.success('Email verified successfully!');
      setTimeout(() => {
        onClose();
        navigate('/login');
      }, 1500);
    } else {
      setError(result.error?.message || 'Invalid or expired OTP');
      toast.error('Verification failed');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();
    }

    setLoading(false);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    setOtp(['', '', '', '', '', '']);
    
    const result = await resendOTP(email);
    
    if (result?.success) {
      toast.success('New OTP sent to your email');
    } else {
      toast.error('Failed to resend OTP. Please try again.');
    }
    
    setResendLoading(false);
    inputRefs[0].current?.focus();
  };



  if (!isOpen) return null;

  if (success) {
    return (
      <div className="verify-container">
        <div className="verify-wrapper">
          <div className="verify-card">
            <CheckCircle className="verify-icon success-icon" size={64} />
            <h2 className="verify-title">Verification Successful!</h2>
            <p className="verify-text">Your email has been verified.</p>
            <p className="verify-subtext">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-container">
      <div className="verify-wrapper">
        <div className="verify-card">
          
          <div className="verify-header">
            <div className="verify-icon-wrapper">
              <img src={puacLogo} alt="PUAC Logo" className="verify-mail-icon" size={48} />
            </div>
            <h1 className="verify-title">Check Your Email</h1>
            <p className="verify-text">
              We've sent a 6-digit verification code to
            </p>
            <p className="verify-email">{email}</p>
          </div>

          <form onSubmit={handleVerify} className="verify-form">
            <div className="otp-inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`otp-input ${error ? 'error' : ''} ${digit ? 'filled' : ''}`}
                  disabled={loading || success}
                  autoComplete="off"
                />
              ))}
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="verify-button primary"
              disabled={loading || otp.join('').length !== 6}
            >
              {loading ? (
                <>
                  <Loader className="spinning" size={20} />
                  <span>Verifying...</span>
                </>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="verify-footer">
            <p className="verify-footer-text">Didn't receive the code?</p>
            <button 
              type="button"
              onClick={handleResend}
              className="resend-button"
              disabled={resendLoading || loading}
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
            <p className="verify-footer-conditions">
              By continuing, you agree to our{" "}
              <span className="verify-footer-termsandprivacy">Terms of Service</span> and{" "}
              <span className="verify-footer-termsandprivacy">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
