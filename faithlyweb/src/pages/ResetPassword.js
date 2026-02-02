import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Lock } from 'lucide-react';
import '../styles/ResetPassword.css';
import puacLogo from '../assets/puaclogo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword, verifyResetOTP, updatePasswordWithOTP } = useAuth();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef([]);

  // Step 1: Request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await resetPassword(email);
    if (result.success) {
      setStep(2);
    }

    setLoading(false);
  };

  // Handle OTP Input
  const handleOTPChange = (index, value) => {
    if (isNaN(value)) return;

    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOTP = pastedData.split('');
    
    while (newOTP.length < 6) {
      newOTP.push('');
    }
    
    setOtp(newOTP);
    otpRefs.current[5]?.focus();
  };

  // Step 2: Verify OTP and move to password reset
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const otpCode = otp.join('');
    const result = await verifyResetOTP(email, otpCode);
    
    if (result.success) {
      setStep(3);
    }

    setLoading(false);
  };

  // Step 3: Update Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const otpCode = otp.join('');
    const result = await updatePasswordWithOTP(email, otpCode, newPassword);
    
    if (result.success) {
      navigate('/login');
    }

    setLoading(false);
  };

  // Step 1: Email Input
  if (step === 1) {
    return (
      <div className="login-container">
        <div className="login-wrapper">
          <button onClick={() => navigate('/login')} className="back-button">
            <ArrowLeft className="back-icon" /> Back to Login
          </button>

          <div className="login-card">
            <div className="login-header">
              <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
              <h1 className="login-title">Reset Your Password</h1>
              <p className="login-subtitle">
                Enter your email address and we'll send you a verification code
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="login-form">
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="form-input"
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <div className="login-container">
        <div className="login-wrapper">
          <button onClick={() => setStep(1)} className="back-button">
            <ArrowLeft className="back-icon" /> Back
          </button>

          <div className="login-card">
            <div className="login-header">
              <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
              <h1 className="login-title">Enter Verification Code</h1>
              <p className="login-subtitle">
                We sent a 6-digit code to
              </p>
              <p className="login-subtitle" style={{ fontWeight: '600', color: '#155DFC', marginTop: '0.25rem' }}>
                {email}
              </p>
            </div>

            <form onSubmit={handleOTPSubmit} className="login-form">
              <div className="otp-container" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '2rem 0' }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    onPaste={handleOTPPaste}
                    className="respass-otp-input"
                    disabled={loading}
                    
                  />
                ))}
              </div>

              <button 
                type="button" 
                onClick={handleEmailSubmit} 
                className="resend-button"
                disabled={loading}
              >
                Resend Code
              </button>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: New Password
  return (
    <div className="login-container">
      <div className="login-wrapper">
        <button onClick={() => setStep(2)} className="back-button">
          <ArrowLeft className="back-icon" /> Back
        </button>

        <div className="login-card">
          <div className="login-header">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <h1 className="login-title">Create New Password</h1>
            <p className="login-subtitle">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="login-form">
            <div className="form-group">
              <label className='respass-info'>New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength="6"
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className='respass-info'>Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength="6"
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
