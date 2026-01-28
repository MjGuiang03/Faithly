import { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API = process.env.REACT_APP_API_URL;

console.log('🔥 API URL:', API);

const safeJSON = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Server error. Check backend or API URL.');
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ---------- LOGIN ---------- */
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Login failed');

      setUser(data.user);
      setProfile(data.user);
      toast.success('Signed in successfully');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SIGNUP ---------- */
  const signUp = async (formData) => {
    try {
      setLoading(true);
      console.log('API URL:', API);
      
      const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          branch: formData.branch,
          position: formData.position,
          gender: formData.gender,
          birthday: formData.birthday
        })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      toast.success('Check your email for OTP');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /* ---------- VERIFY OTP (EMAIL VERIFICATION ONLY) ---------- */
  const verifyOTP = async (email, otp) => {
    try {
      const res = await fetch(`${API}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'OTP verification failed');

      toast.success('Email verified');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    }
  };

  /* ---------- RESEND OTP ---------- */
  const resendOTP = async (email) => {
    try {
      const res = await fetch(`${API}/api/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Resend failed');

      toast.success('OTP resent');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    }
  };

  /* ---------- RESET PASSWORD ---------- */
  const resetPassword = async (email) => {
    try {
      const res = await fetch(`${API}/api/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Failed to send reset link');

      toast.success('Password reset link sent to your email');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    }
  };

  const signOut = () => {
    setUser(null);
    setProfile(null);
    toast.success('Signed out successfully');
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      verifyOTP,
      resendOTP,
      resetPassword,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};