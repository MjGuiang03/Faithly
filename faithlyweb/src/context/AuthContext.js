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
  } catch (err) {
    console.error('❌ JSON parse error. Response was:', text);
    throw new Error(`Server error. Check backend or API URL. Response: ${text.substring(0, 100)}`);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ---------- LOGIN ---------- */
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const res  = await fetch(`${API}/api/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });

      const data = await safeJSON(res);

      // ✅ Do NOT throw — return raw data so LoginModal can read
      //    locked / remainingSeconds / permanent / recommendReset fields
      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Login failed',
          data               // ← full server payload passed back to LoginModal
        };
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setProfile(data.user);
      toast.success('Signed in successfully');
      return { success: true };

    } catch (err) {
      // Only fires on network errors / JSON parse failures
      toast.error(err.message);
      return { success: false, message: err.message, data: {} };
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SIGNUP ---------- */
  const signUp = async (formData) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:    formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone:    formData.phone,
          branch:   formData.branch,
          position: formData.position,
          gender:   formData.gender,
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp })
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
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
      const res = await fetch(`${API}/api/reset-password-request`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

      toast.success('OTP sent to your email');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    }
  };

  /* ---------- VERIFY PASSWORD RESET OTP ---------- */
  const verifyResetOTP = async (email, otp) => {
    try {
      const res = await fetch(`${API}/api/reset-password-verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');

      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    }
  };

  /* ---------- UPDATE PASSWORD AFTER RESET ---------- */
  const updatePasswordWithOTP = async (email, otp, newPassword) => {
    try {
      const res = await fetch(`${API}/api/reset-password-update`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp, newPassword })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Failed to update password');

      toast.success('Password updated successfully');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    }
  };

  /* ---------- SIGN OUT ---------- */
  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
    toast.success('Signed out successfully');
    return { success: true };
  };

  /* ---------- DELETE ACCOUNT ---------- */
  const deleteAccount = async (email, password) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/delete-account`, {
        method:  'DELETE',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email, password })
      });

      const data = await safeJSON(res);

      if (!res.ok) {
        if (res.status === 401 || data.message?.toLowerCase().includes('password')) {
          return { success: false, error: { message: 'Password is incorrect', isPasswordError: true } };
        }
        throw new Error(data.message || 'Failed to delete account');
      }

      setUser(null);
      setProfile(null);
      toast.success('Account deleted successfully.');
      return { success: true };
    } catch (err) {
      if (!err.isPasswordError) {
        toast.error(err.message || 'Failed to delete account');
      }
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UPDATE PROFILE ---------- */
  const updateProfile = async (formData) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/update-profile`, {
        method:  'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          email:    formData.email,
          fullName: formData.fullName,
          phone:    formData.phone,
          branch:   formData.branch,
          position: formData.position
        })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Update failed');

      const updatedProfile = {
        ...profile,
        ...data.user,
        fullName: data.user.fullName || formData.fullName,
        email:    data.user.email    || formData.email,
        phone:    data.user.phone    || formData.phone,
        branch:   data.user.branch   || formData.branch,
        position: data.user.position || formData.position
      };

      setProfile(updatedProfile);
      setUser(updatedProfile);
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
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
      verifyResetOTP,
      updatePasswordWithOTP,
      updateProfile,
      signOut,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};