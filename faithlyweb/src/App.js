import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './pages/ProtectedRoute';
import AdminProtectedRoute from './AdminPages/AdminProtectedRoute';

// Regular User Pages
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import OTPLogin from './pages/OTPLogin';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import Loans from './pages/Loans';
import Donation from './pages/Donation'
import Attendance from './pages/Attendance'
import Branches from './pages/Branches'
import Settings from './pages/Settings'
import Profile from './pages/Profile';

// Admin Pages
import AdminLogin from './AdminPages/AdminLogin';
import AdminDashboard from './AdminPages/AdminDashboard';



export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          expand={false}
          duration={4000}
        />

        <Routes>
          {/* ========== PUBLIC ROUTES (Anyone can access) ========== */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/otp-login" element={<OTPLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/donation" element={<Donation />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />


          {/* ========== ADMIN ROUTES (Admin only) ========== */}
          {/* Admin Login - Public (so admins can log in) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Admin Dashboard - Protected (only logged-in admins) */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />

          {/* ========== USER ROUTES (Logged-in users only) ========== */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Fallback - Redirect to welcome page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
