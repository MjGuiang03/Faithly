import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './user/components/ProtectedRoute';
import AdminProtectedRoute from './admin/pages/AdminProtectedRoute';
import UserLayout from './user/components/UserLayout';

// Regular User Pages
import WelcomePage from './user/pages/WelcomePage';
import UpdatePassword from './user/components/UpdatePassword';
import VerifyEmail from './user/components/VerifyEmail';

import Home from './user/pages/Home';
import Loans from './user/pages/Loans';
import Donation from './user/pages/Donation';
import Attendance from './user/pages/Attendance';
import Branches from './user/pages/Branches';
import Notifications from './user/pages/Notifications';
import Settings from './user/pages/Settings';
import LoanDetail from './user/pages/LoanDetail';
import Savings from './user/pages/Savings';

// Admin Pages

import AdminLayout from './admin/pages/AdminLayout';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminMembers from './admin/pages/AdminMembers';
import AdminDonations from './admin/pages/AdminDonations';
import AdminAttendance from './admin/pages/AdminAttendance';
import AdminBranches from './admin/pages/AdminBranches';
import AdminSettings from './admin/pages/AdminSettings';
import AdminNotifications from './admin/pages/AdminNotification';


import AdminAnnouncements from './admin/pages/AdminAnnouncements';
import AdminUserManagement from './admin/pages/AdminUserManagement';
import AdminFinancialReport from './admin/pages/AdminFinancialReport';
import AdminRFIDPreview from './admin/pages/AdminRFIDPreview';

// Loan Admin Pages
import LoanAdminDashboard from './loanAdmin/pages/loanAdminDashboard';
import LoanAdminNotif from './loanAdmin/pages/loanAdminNotif';
import LoanAdminLoanManagement from './loanAdmin/pages/loanAdminLoanManagement';
import LoanAdminPaymentStatus from './loanAdmin/pages/loanAdminPaymentStatus';
import LoanAdminDelinquency from './loanAdmin/pages/loanAdminDelinquency';
import LoanAdminSettings from './loanAdmin/pages/loanAdminSettings';

// Secretary Admin Pages
import SecretaryAdminDashboard from './secretaryAdmin/pages/secretaryAdminDashboard';
import SecretaryAdminNotif from './secretaryAdmin/pages/secretaryAdminNotif';
import SecretaryAdminLoanProcess from './secretaryAdmin/pages/secretaryAdminLoanProcess';
import SecretaryAdminRecords from './secretaryAdmin/pages/secretaryAdminRecords';
import SecretaryAdminSettings from './secretaryAdmin/pages/secretaryAdminSettings';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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
            <Route path="/" element={<WelcomePage
            />} />
            <Route path="/reset-password" element={<WelcomePage />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Standalone RFID Preview Route */}
            <Route path="/admin/rfid-preview" element={<AdminProtectedRoute><AdminRFIDPreview /></AdminProtectedRoute>} />

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
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/notification" element={<AdminNotifications />} />

              <Route path="/admin/members" element={<AdminMembers />} />
              <Route path="/admin/donations" element={<AdminDonations />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/branches" element={<AdminBranches />} />

              <Route path="/admin/announcements" element={<AdminAnnouncements />} />
              <Route path="/admin/users" element={<AdminUserManagement />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/financial-report" element={<AdminFinancialReport />} />

            </Route>

            {/* ========== LOAN ADMIN ROUTES ========== */}
            {/* Redirect /loan-admin → /loan-admin/dashboard */}
            <Route path="/loan-admin" element={<Navigate to="/loan-admin/dashboard" replace />} />

            {/* Each loanAdmin page embeds its own sidebar, so no layout wrapper needed */}
            <Route path="/loan-admin/dashboard" element={<AdminProtectedRoute><LoanAdminDashboard /></AdminProtectedRoute>} />
            <Route path="/loan-admin/notifications" element={<AdminProtectedRoute><LoanAdminNotif /></AdminProtectedRoute>} />
            <Route path="/loan-admin/loan-management" element={<AdminProtectedRoute><LoanAdminLoanManagement /></AdminProtectedRoute>} />
            <Route path="/loan-admin/payments/loans" element={<AdminProtectedRoute><LoanAdminPaymentStatus /></AdminProtectedRoute>} />
            <Route path="/loan-admin/payments/savings" element={<AdminProtectedRoute><LoanAdminPaymentStatus /></AdminProtectedRoute>} />
            <Route path="/loan-admin/payment-status" element={<Navigate to="/loan-admin/payments/loans" replace />} />
            <Route path="/loan-admin/delinquency" element={<AdminProtectedRoute><LoanAdminDelinquency /></AdminProtectedRoute>} />
            <Route path="/loan-admin/settings" element={<AdminProtectedRoute><LoanAdminSettings /></AdminProtectedRoute>} />

            {/* ========== SECRETARY ADMIN ROUTES ========== */}
            {/* Redirect /secretary-admin → /secretary-admin/dashboard */}
            <Route path="/secretary-admin" element={<Navigate to="/secretary-admin/dashboard" replace />} />

            {/* Each secretaryAdmin page embeds its own sidebar */}
            <Route path="/secretary-admin/dashboard" element={<AdminProtectedRoute><SecretaryAdminDashboard /></AdminProtectedRoute>} />
            <Route path="/secretary-admin/notifications" element={<AdminProtectedRoute><SecretaryAdminNotif /></AdminProtectedRoute>} />
            <Route path="/secretary-admin/loan-process" element={<AdminProtectedRoute><SecretaryAdminLoanProcess /></AdminProtectedRoute>} />
            <Route path="/secretary-admin/records" element={<AdminProtectedRoute><SecretaryAdminRecords /></AdminProtectedRoute>} />
            <Route path="/secretary-admin/settings" element={<AdminProtectedRoute><SecretaryAdminSettings /></AdminProtectedRoute>} />

            {/* ========== USER ROUTES ========== */}
            <Route
              element={
                <ProtectedRoute>
                  <UserLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/donation" element={<Donation />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/savings" element={<Savings />} />
              <Route path="/loans/:loanId" element={<LoanDetail />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
