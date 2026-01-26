import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password);
    
    if (result.success) {
      navigate('/home');
    } else {
      setError(result.error?.message || 'Failed to sign in');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <button onClick={() => navigate('/')} className="back-button">
          <ArrowLeft className="back-icon" />
          Back to Home
        </button>

        <div className="login-card">
          <div className="login-header">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to access your account</p>
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

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input password-input"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="forgot-password"
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="divider">
              <span className="divider-text">OR</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/otp-login')}
              className="otp-button"
            >
              <KeyRound size={20} />
              Sign in with OTP
            </button>
          </form>

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