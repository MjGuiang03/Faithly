import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Login.css';

export default function OTPLogin() {
  const navigate = useNavigate();
  const { signInWithOTP, verifyOTP } = useAuth();

  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signInWithOTP(email);
    
    if (result.success) {
      setStep('otp');
    } else {
      setError(result.error?.message || 'Failed to send OTP');
    }
    
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    const result = await verifyOTP(email, otp);
    
    if (result.success) {
      navigate('/home');
    } else {
      setError(result.error?.message || 'Invalid or expired OTP');
    }
    
    setLoading(false);
  };

  const handleOTPChange = (value) => {
    setOtp(value);
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <button onClick={() => navigate('/login')} className="back-button">
          <ArrowLeft className="back-icon" />
          Back to Login
        </button>

        <div className="login-card">
          <div className="login-header">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <h1 className="login-title">
              {step === 'email' ? 'Login with OTP' : 'Verify OTP'}
            </h1>
            <p className="login-subtitle">
              {step === 'email' 
                ? 'Enter your email to receive a one-time password'
                : `We've sent a 6-digit code to ${email}`
              }
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="login-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="login-form">
              <div className="form-group">
                <label className="form-label">Enter 6-Digit OTP</label>
                <div className="otp-wrapper">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    placeholder="Enter OTP"
                    className="otp-input"
                  />
                </div>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="otp-info">
                <p className="otp-text">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="resend-button"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                </p>
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}

          <p className="register-link">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="register-button">
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
