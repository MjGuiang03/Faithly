import { Navigate } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
  // Check if admin is logged in (separate from regular user auth)
  const adminEmail = localStorage.getItem('adminEmail');
  const adminRole = localStorage.getItem('adminRole');

  // If no admin session, redirect to admin login
  if (!adminEmail || !adminRole) {
    return <Navigate to="/admin/login" replace />;
  }

  // Admin is authenticated, render the protected component
  return children;
};

export default AdminProtectedRoute;
