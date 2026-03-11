import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './user/components/ProtectedRoute';
import AdminProtectedRoute from './admin/pages/AdminProtectedRoute';

// Regular User Pages
import Welcome from './user/pages/Welcome';
import ResetPassword from './user/components/ResetPassword';
import UpdatePassword from './user/components/UpdatePassword';
import VerifyEmail from './user/components/VerifyEmail';

import Home from './user/pages/Home';
import Loans from './user/pages/Loans';
import Donation from './user/pages/Donation';
import Attendance from './user/pages/Attendance';
import Branches from './user/pages/Branches';
import Settings from './user/pages/Settings';

// Admin Pages
import AdminLogin from './admin/pages/AdminLogin';
import AdminLayout from './admin/pages/AdminLayout';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminLoanManagement from './admin/pages/AdminLoanManagement';
import AdminMembers from './admin/pages/AdminMembers';
import AdminDonations from './admin/pages/AdminDonations';
import AdminAttendance from './admin/pages/AdminAttendance';
import AdminBranches from './admin/pages/AdminBranches';
import AdminSettings from './admin/pages/AdminSettings';
import AdminNotifications from './admin/pages/AdminNotification';
import AdminOfficerVerification from './admin/pages/AdminOfficerVerification';
import AdminReports from './admin/pages/AdminReports';

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
          {/* ========== PUBLIC ROUTES ========== */}
          <Route path="/" element={<Welcome />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* ========== ADMIN ROUTES ========== */}
          {/* Public admin login — no layout */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Redirect /admin → /admin/dashboard */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/*
            All protected admin routes share AdminLayout (sidebar rendered ONCE).
            AdminProtectedRoute wraps AdminLayout so unauthenticated users
            are redirected before the layout even mounts.
          */}
          <Route
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route path="/admin/dashboard"  element={<AdminDashboard />} />
            <Route path="/admin/notification"      element={<AdminNotifications />} />
            <Route path="/admin/officerverification"    element={<AdminOfficerVerification />} />
            <Route path="/admin/members"    element={<AdminMembers />} />
            <Route path="/admin/donations"  element={<AdminDonations />} />
            <Route path="/admin/attendance" element={<AdminAttendance />} />
            <Route path="/admin/branches"   element={<AdminBranches />} />
            <Route path="/admin/reports"   element={<AdminReports />} />
            <Route path="/admin/settings"   element={<AdminSettings />} />
          </Route>

          {/* ========== USER ROUTES ========== */}
          <Route path="/home"       element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/loans"      element={<ProtectedRoute><Loans /></ProtectedRoute>} />
          <Route path="/donation"   element={<ProtectedRoute><Donation /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/branches"   element={<ProtectedRoute><Branches /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}