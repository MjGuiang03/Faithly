import { createContext, useContext, useState } from 'react';
import API from '../utils/api';
import { toast } from 'sonner';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);


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

      if (!res.ok) {
        return { success: false, message: data.message || 'Login failed', data };
      }

      const role = data.user?.role || 'user';

      // Store token under the unified key
      localStorage.setItem('token', data.token);

      // For admin roles, also populate legacy admin keys so existing
      // admin dashboard pages (which read localStorage directly) keep working
      if (role === 'admin' || role === 'loanAdmin' || role === 'secretaryAdmin') {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminEmail', data.user.email);
        localStorage.setItem('adminRole', role);
      }

      setUser(data.user);
      setProfile(data.user);
      toast.success('Signed in successfully');
      return { success: true, role };
    } catch (err) {
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
  const resendOTP = async (email, method = 'email') => {
    try {
      const res = await fetch(`${API}/api/resend-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, method })
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

  /* ---------- RESET PASSWORD - STEP 1: Request OTP ---------- */
  const resetPassword = async (email) => {
    try {
      const res  = await fetch(`${API}/api/reset-password-request`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email })
      });

      const data = await safeJSON(res);

      if (!res.ok) {
        if (res.status !== 429) toast.error(data.message || 'Failed to send OTP');
        return { success: false, retryAfter: data.retryAfter || 0 };
      }

      toast.success('OTP sent to your email');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, retryAfter: 0 };
    }
  };

  /* ---------- RESET PASSWORD - STEP 2: Verify OTP ---------- */
  const verifyResetOTP = async (email, otp) => {
    try {
      const res  = await fetch(`${API}/api/reset-password-verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp })
      });

      const data = await safeJSON(res);

      if (!res.ok) {
        if (res.status !== 429) toast.error(data.message || 'Invalid OTP');
        return { success: false, retryAfter: data.retryAfter || 0 };
      }

      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, retryAfter: 0 };
    }
  };

  /* ---------- RESET PASSWORD - STEP 3: Update Password ---------- */
  const updatePasswordWithOTP = async (email, otp, newPassword) => {
    try {
      const res  = await fetch(`${API}/api/reset-password-update`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp, newPassword })
      });

      const data = await safeJSON(res);

      if (!res.ok) {
        if (res.status !== 429) toast.error(data.message || 'Failed to update password');
        return { success: false, retryAfter: data.retryAfter || 0 };
      }

      toast.success('Password updated successfully');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, retryAfter: 0 };
    }
  };

  /* ---------- SIGN OUT ---------- */
  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
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
          branch:   formData.branch,   // community → branch in the DB
          position: formData.position,
        })
      });

      const data = await safeJSON(res);
      if (!res.ok) throw new Error(data.message || 'Update failed');

      const updatedProfile = {
        ...profile,
        ...data.user,
        fullName: data.user.fullName || formData.fullName,
        email:    data.user.email    || formData.email    || profile?.email,
        phone:    data.user.phone    || formData.phone,
        branch:   data.user.branch   || formData.branch,
        position: data.user.position || formData.position,
      };
      if (formData.photoUrl) {
        updatedProfile.photoUrl = formData.photoUrl;
      }

      setProfile(updatedProfile);
      setUser(updatedProfile);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (err) {
      toast.error(err.message);
      return { success: false, message: err.message, error: err };
    } finally {
      setLoading(false);
    }
  };

  /* ---------- REQUEST EMAIL CHANGE (sends OTP to NEW email) ---------- */
  const requestEmailChange = async (newEmail) => {
    try {
      const res = await fetch(`${API}/api/request-email-change`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ newEmail }),
      });

      const data = await safeJSON(res);

      if (!res.ok) {
        return { success: false, message: data.message || 'Failed to send verification email' };
      }

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: err.message || 'Something went wrong' };
    }
  };

  /* ---------- VERIFY EMAIL CHANGE OTP + COMMIT NEW EMAIL ---------- */
  const verifyEmailChange = async (newEmail, otp) => {
    try {
      const res = await fetch(`${API}/api/verify-email-change`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ otp }),
      });

      const data = await safeJSON(res);

      if (!res.ok) {
        return { success: false, message: data.message || 'Invalid or expired OTP' };
      }

      // Server returns a new token because the email (JWT subject) changed
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Update local user / profile state with the new email
      const updatedEmail = data.newEmail || newEmail;
      setUser(prev    => prev    ? { ...prev,    email: updatedEmail } : prev);
      setProfile(prev => prev    ? { ...prev,    email: updatedEmail } : prev);

      toast.success('Email updated successfully');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Verification failed' };
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
      requestEmailChange,
      verifyEmailChange,
      signOut,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};