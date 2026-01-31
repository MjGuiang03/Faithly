import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Verify.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || '';
  const { verifyOTP, resendOTP } = useAuth();

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await verifyOTP(email, otp);
    if (result.success) {
      navigate('/login'); // verified → login normally
    } else {
      setError(result.error?.message);
    }

    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    await resendOTP(email);
    setLoading(false);
  };

  return (
    <div className="verify-container">
      <form onSubmit={handleVerify}>
        <h2>Verify Your Email</h2>

        <input value={email} disabled />
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          placeholder="6-digit OTP"
        />

        {error && <div className="error-message">{error}</div>}

        <button disabled={loading || otp.length !== 6}>
          Verify Email
        </button>

        <button type="button" onClick={handleResend}>
          Resend OTP
        </button>
      </form>
    </div>
  );
}
