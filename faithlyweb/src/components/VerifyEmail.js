import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Verify.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user came from email verification link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'signup' && accessToken) {
      handleEmailVerification();
    } else if (user?.email_confirmed_at) {
      setVerified(true);
      setVerifying(false);
    } else {
      setVerifying(false);
    }
  }, [user]);

  const handleEmailVerification = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      if (data.session) {
        setVerified(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const resendVerification = async () => {
    try {
      if (!user?.email) {
        setError('No email address found. Please sign up again.');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      });

      if (error) throw error;

      alert('Verification email sent! Please check your inbox.');
    } catch (err) {
      console.error('Resend error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-wrapper">
        <div className="verify-card">
          <img src={puacLogo} alt="PUAC Logo" className="verify-logo" />

          {verifying ? (
            <div className="verify-content">
              <Loader2 className="verify-icon spinning" />
              <h1 className="verify-title">Verifying Your Email...</h1>
              <p className="verify-text">Please wait while we verify your account.</p>
            </div>
          ) : verified ? (
            <div className="verify-content success">
              <CheckCircle className="verify-icon success-icon" />
              <h1 className="verify-title">Email Verified!</h1>
              <p className="verify-text">
                Your email has been successfully verified. You can now sign in to your account.
              </p>
              <button onClick={() => navigate('/login')} className="verify-button">
                Go to Login
              </button>
            </div>
          ) : error ? (
            <div className="verify-content error">
              <XCircle className="verify-icon error-icon" />
              <h1 className="verify-title">Verification Failed</h1>
              <p className="verify-text error-text">{error}</p>
              <div className="verify-buttons">
                <button onClick={resendVerification} className="verify-button secondary">
                  Resend Email
                </button>
                <button onClick={() => navigate('/signup')} className="verify-button">
                  Sign Up Again
                </button>
              </div>
            </div>
          ) : (
            <div className="verify-content">
              <Mail className="verify-icon" />
              <h1 className="verify-title">Check Your Email</h1>
              <p className="verify-text">
                We've sent a verification link to your email address. Please click the link to verify your account.
              </p>
              <p className="verify-subtext">
                Didn't receive the email? Check your spam folder or click below to resend.
              </p>
              <div className="verify-buttons">
                <button onClick={resendVerification} className="verify-button secondary">
                  Resend Email
                </button>
                <button onClick={() => navigate('/login')} className="verify-button">
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
