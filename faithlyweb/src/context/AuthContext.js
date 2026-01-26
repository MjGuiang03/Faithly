import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, sanitizeInput } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      setSupabaseConfigured(false);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile from custom table
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Sign up with email verification
  const signUp = async (formData) => {
    try {
      const { email, password, fullName, phone, branch, position, gender, birthday } = formData;

      // Sanitize all inputs
      const sanitizedData = {
        email: sanitizeInput(email.toLowerCase().trim()),
        fullName: sanitizeInput(fullName.trim()),
        phone: sanitizeInput(phone.trim()),
        branch: sanitizeInput(branch),
        position: sanitizeInput(position),
        gender: sanitizeInput(gender),
        birthday: birthday
      };

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: sanitizedData.fullName,
            phone: sanitizedData.phone,
            branch: sanitizedData.branch,
            position: sanitizedData.position,
            gender: sanitizedData.gender,
            birthday: sanitizedData.birthday
          }
        }
      });

      if (error) throw error;

      // Create profile in custom table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: sanitizedData.email,
            full_name: sanitizedData.fullName,
            phone: sanitizedData.phone,
            branch: sanitizedData.branch,
            position: sanitizedData.position,
            gender: sanitizedData.gender,
            birthday: sanitizedData.birthday,
            created_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      toast.success('Registration successful! Please check your email to verify your account.');
      return { success: true, data };
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'An error occurred during signup');
      return { success: false, error };
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });

      if (error) throw error;

      // Check if email is verified
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        toast.error('Please verify your email before signing in.');
        return { success: false, error: { message: 'Email not verified' } };
      }

      toast.success('Successfully signed in!');
      return { success: true, data };
    } catch (error) {
      console.error('Signin error:', error);
      toast.error(error.message || 'Invalid email or password');
      return { success: false, error };
    }
  };

  // Sign in with OTP (sent to email)
  const signInWithOTP = async (email) => {
    try {
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

      const { data, error } = await supabase.auth.signInWithOtp({
        email: sanitizedEmail,
        options: {
          shouldCreateUser: false, // Only allow existing users
          emailRedirectTo: `${window.location.origin}/verify-otp`
        }
      });

      if (error) throw error;

      toast.success('OTP sent to your email! Check your inbox.');
      return { success: true, data };
    } catch (error) {
      console.error('OTP error:', error);
      toast.error(error.message || 'Failed to send OTP');
      return { success: false, error };
    }
  };

  // Verify OTP
  const verifyOTP = async (email, token) => {
    try {
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

      const { data, error } = await supabase.auth.verifyOtp({
        email: sanitizedEmail,
        token: token,
        type: 'email'
      });

      if (error) throw error;

      toast.success('OTP verified successfully!');
      return { success: true, data };
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Invalid or expired OTP');
      return { success: false, error };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

      const { data, error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/update-password`
      });

      if (error) throw error;

      toast.success('Password reset link sent to your email!');
      return { success: true, data };
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send reset link');
      return { success: false, error };
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      return { success: true, data };
    } catch (error) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
      return { success: false, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setProfile(null);
      toast.success('Signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('Signout error:', error);
      toast.error(error.message || 'Failed to sign out');
      return { success: false, error };
    }
  };

  // Update user profile
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      const sanitizedUpdates = {};
      Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'string') {
          sanitizedUpdates[key] = sanitizeInput(updates[key]);
        } else {
          sanitizedUpdates[key] = updates[key];
        }
      });

      const { data, error } = await supabase
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast.success('Profile updated successfully!');
      return { success: true, data };
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
      return { success: false, error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signInWithOTP,
    verifyOTP,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    // Legacy login for compatibility
    login: signIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};