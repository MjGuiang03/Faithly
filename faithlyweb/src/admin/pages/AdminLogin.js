import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import puacLogo from '../../assets/puaclogo.png';
import '../styles/AdminLogin.css';

import API from '../../utils/api';

const ROLES = [
  { key: 'admin',          label: 'Main',      icon: 'people' },
  { key: 'loanAdmin',      label: 'Loan',      icon: 'loan' },
  { key: 'secretaryAdmin', label: 'Secretary',  icon: 'secretary' },
];

const ROLE_TITLES = {
  admin:          'Main Admin',
  loanAdmin:      'Loan Admin',
  secretaryAdmin: 'Secretary Admin',
};

/* ---- Inline SVG icons for the role selector ---- */
const RoleIcon = ({ type, active }) => {
  const color = active ? '#2563eb' : '#64748b';
  if (type === 'people') {
    return (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (type === 'loan') {
    return (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="9" y1="15" x2="12" y2="15" />
      </svg>
    );
  }
  // secretary – briefcase
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12.01" />
    </svg>
  );
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleTitle = ROLE_TITLES[selectedRole];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole })
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('❌ Admin Login Failed Status:', res.status);
        console.error('❌ Admin Login Failed Data:', data);
        throw new Error(data.message || 'Login failed');
      }

      // Store admin session
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminEmail', data.admin.email);
      localStorage.setItem('adminRole', data.admin.role);

      toast.success('Signed in successfully');

      // Navigate to the correct dashboard based on role
      const role = data.admin.role;
      if (role === 'loanAdmin') {
        navigate('/loan-admin/dashboard');
      } else if (role === 'secretaryAdmin') {
        navigate('/secretary-admin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">

        {/* Header */}
        <div className="admin-login-header">
          <div className="admin-login-logo">
            <img alt="PUAC Logo" src={puacLogo} />
          </div>
          <h1 className="admin-login-title">{roleTitle}</h1>
          <p className="admin-login-subtitle">Sign in to access the admin dashboard</p>
        </div>

        {/* Role Selector */}
        <div className="admin-login-role-section">
          <p className="admin-login-role-label">Select Admin Role</p>
          <div className="admin-login-role-tabs">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`admin-login-role-tab${selectedRole === r.key ? ' active' : ''}`}
                onClick={() => setSelectedRole(r.key)}
              >
                <RoleIcon type={r.icon} active={selectedRole === r.key} />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="admin-login-form">
          {/* Email Field */}
          <div className="admin-login-field">
            <label className="admin-login-field-label">Admin Email</label>
            <div className="admin-login-input-wrap">
              <div className="admin-login-input-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 20 20">
                  <path
                    d="M2.5 5.833A2.5 2.5 0 0 1 5 3.333h10a2.5 2.5 0 0 1 2.5 2.5v8.334a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 1-2.5-2.5V5.833Z"
                    stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <path
                    d="M2.5 5.833 10 10.833l7.5-5"
                    stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin.puac@gmail.com"
                disabled={loading}
                className="admin-login-input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="admin-login-field">
            <label className="admin-login-field-label">Password</label>
            <div className="admin-login-input-wrap">
              <div className="admin-login-input-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 20 20">
                  <path
                    d="M5.833 9.167V5.833a4.167 4.167 0 0 1 8.334 0v3.334"
                    stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <rect
                    x="3.333" y="9.167" width="13.334" height="9.167" rx="1.667"
                    stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                className="admin-login-input admin-login-input-pw"
              />
              <button
                type="button"
                className="admin-login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                tabIndex={-1}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 20 20">
                  {showPassword ? (
                    <>
                      <path d="M1 10s3.333-6.667 9-6.667S19 10 19 10s-3.333 6.667-9 6.667S1 10 1 10Z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="10" cy="10" r="2.5" stroke="#94a3b8" strokeWidth="1.5"/>
                    </>
                  ) : (
                    <>
                      <path d="M14.95 14.95A8.39 8.39 0 0 1 10 16.667C4.167 16.667.833 10 .833 10a15.39 15.39 0 0 1 4.217-4.95m3.2-1.517A7.1 7.1 0 0 1 10 3.333c5.833 0 9.167 6.667 9.167 6.667a15.5 15.5 0 0 1-1.8 2.658M11.767 11.767a2.5 2.5 0 1 1-3.534-3.534" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M.833.833 19.167 19.167" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} className="admin-login-submit">
            {loading ? 'Signing In...' : `Sign In to ${roleTitle}`}
          </button>
        </form>

        {/* Security Notice */}
        <div className="admin-login-notice">
          <span className="admin-login-notice-icon">🔒</span>
          <span>Secure admin access only. Unauthorized access is prohibited.</span>
        </div>

        {/* Footer */}
        <p className="admin-login-footer">© 2026 FaithLy - {roleTitle}</p>
      </div>
    </div>
  );
}
