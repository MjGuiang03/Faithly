import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft } from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Login.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await resetPassword(email);
    
    if (result.success) {
      setSent(true);
    }
    
    setLoading(false);
  };

  if (sent) {
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
              <h1 className="login-title">Check Your Email</h1>
              <p className="login-subtitle">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <div className="reset-success">
              <p className="reset-info">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              <p className="reset-info">
                Didn't receive the email? Check your spam folder.
              </p>
            </div>

            <button 
              onClick={() => navigate('/login')} 
              className="submit-button"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="login-title">Reset Your Password</h1>
            <p className="login-subtitle">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
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

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="register-link">
            Remember your password?{' '}
            <button onClick={() => navigate('/login')} className="register-button">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
