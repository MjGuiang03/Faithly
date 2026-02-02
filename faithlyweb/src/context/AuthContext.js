import { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API = process.env.REACT_APP_API_URL;

console.log('🔥 API URL:', API);

const safeJSON = async (res) => {
  const text = await res.text();
  console.log('📄 Raw response text:', text);
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('❌ JSON parse error. Response was:', text);
    throw new Error(`Server error. Check backend or API URL. Response: ${text.substring(0, 100)}`);
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

      console.log('Login response data:', data.user);
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
      const res = await fetch(`${API}/api/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
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

  const signOut = () => {
    setUser(null);
    setProfile(null);
    toast.success('Signed out successfully');
    return { success: true };
  };

  /* ---------- DELETE ACCOUNT ---------- */
  const deleteAccount = async (email, password) => {
    try {
      setLoading(true);
      
      console.log('🗑️ Attempting to delete account for:', email);
      console.log('🌐 API endpoint:', `${API}/api/delete-account`);
      
      const res = await fetch(`${API}/api/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('📥 Response status:', res.status);
      console.log('📥 Response headers:', res.headers);
      
      const data = await safeJSON(res);
      console.log('📦 Response data:', data);
      
      if (!res.ok) {
        // Handle specific error cases - don't show toast for password errors
        if (res.status === 401 || data.message?.toLowerCase().includes('password')) {
          return { success: false, error: { message: 'Password is incorrect', isPasswordError: true } };
        }
        throw new Error(data.message || 'Failed to delete account');
      }

      setUser(null);
      setProfile(null);
      toast.success('Account deleted successfully');
      return { success: true };
    } catch (err) {
      console.error('❌ Delete account error:', err);
      console.error('❌ Error details:', err.message);
      
      // Don't show toast for password errors
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
      
      console.log('🔄 Updating profile with data:', {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        branch: formData.branch,
        position: formData.position
      });
      
      console.log('🌐 API URL:', `${API}/api/update-profile`);
      
      const res = await fetch(`${API}/api/update-profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          branch: formData.branch,
          position: formData.position
        })
      });

      console.log('📥 Response status:', res.status);
      
      const data = await safeJSON(res);
      console.log('📦 Response data:', data);
      
      if (!res.ok) throw new Error(data.message || 'Update failed');

      // Update local state (keep gender and birthday from original profile)
      const updatedProfile = {
        ...profile,
        ...data.user,
        fullName: data.user.fullName || formData.fullName,
        email: data.user.email || formData.email,
        phone: data.user.phone || formData.phone,
        branch: data.user.branch || formData.branch,
        position: data.user.position || formData.position
      };
      
      console.log('✅ Updated profile state:', updatedProfile);
      
      setProfile(updatedProfile);
      setUser(updatedProfile);
      
      return { success: true };
    } catch (err) {
      console.error('❌ Update profile error:', err);
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