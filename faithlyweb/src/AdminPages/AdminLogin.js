import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import puacLogo from '../assets/puaclogo.png';
import '../AdminStyles/AdminLogin.css';

const API = process.env.REACT_APP_API_URL;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store admin session
      localStorage.setItem('adminEmail', data.admin.email);
      localStorage.setItem('adminRole', data.admin.role);
      
      toast.success('Signed in successfully');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container" data-name="AdminLogin">
      <div className="admin-login-wrapper" data-name="Container">
        <div className="admin-login-content">
          
          {/* Main Card */}
          <div className="admin-login-card" data-name="Container">
            <div className="admin-login-card-border" aria-hidden="true" />
            <div className="admin-login-card-inner">
              
              {/* Header */}
              <div className="admin-login-header" data-name="Container">
                {/* Logo */}
                <div className="admin-login-logo-container" data-name="Container">
                  <div className="admin-login-logo" data-name="PUAC logo 1">
                    <img alt="PUAC Logo" src={puacLogo} />
                  </div>
                </div>
                
                {/* Heading */}
                <div className="admin-login-heading" data-name="Heading 1">
                  <p>Admin Portal</p>
                </div>
                
                {/* Subtitle */}
                <div className="admin-login-subtitle" data-name="Paragraph">
                  <p>Sign in to access the admin dashboard</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="admin-login-form" data-name="Form">
                {/* Email Field */}
                <div className="admin-login-field email" data-name="Container">
                  <div className="admin-login-label" data-name="Label">
                    <p>Admin Email</p>
                  </div>
                  
                  <div className="admin-login-input-container" data-name="Container">
                    <div className="admin-login-input-wrapper" data-name="Email Input">
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@churchofgrace.org"
                        disabled={loading}
                        className="admin-login-input"
                      />
                      <div className="admin-login-input-border" aria-hidden="true" />
                    </div>
                    
                    {/* Email Icon */}
                    <div className="admin-login-icon" data-name="Icon">
                      <svg fill="none" viewBox="0 0 20 20">
                        <path 
                          d="M2.5 5.83333C2.5 5.17029 2.76339 4.53441 3.23223 4.06557C3.70107 3.59673 4.33696 3.33333 5 3.33333H15C15.663 3.33333 16.2989 3.59673 16.7678 4.06557C17.2366 4.53441 17.5 5.17029 17.5 5.83333V14.1667C17.5 14.8297 17.2366 15.4656 16.7678 15.9344C16.2989 16.4033 15.663 16.6667 15 16.6667H5C4.33696 16.6667 3.70107 16.4033 3.23223 15.9344C2.76339 15.4656 2.5 14.8297 2.5 14.1667V5.83333Z" 
                          stroke="#51A2FF" 
                          strokeWidth="1.66667" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M2.5 5.83333L10 10.8333L17.5 5.83333" 
                          stroke="#51A2FF" 
                          strokeWidth="1.66667" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="admin-login-field password" data-name="Container">
                  <div className="admin-login-label" data-name="Label">
                    <p>Password</p>
                  </div>
                  
                  <div className="admin-login-input-container" data-name="Container">
                    <div className="admin-login-input-wrapper" data-name="Password Input">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loading}
                        className="admin-login-input password-input"
                      />
                      <div className="admin-login-input-border" aria-hidden="true" />
                    </div>
                    
                    {/* Lock Icon */}
                    <div className="admin-login-icon" data-name="Icon">
                      <svg fill="none" viewBox="0 0 20 20">
                        <path 
                          d="M5.83333 9.16667V5.83333C5.83333 4.72826 6.27232 3.66846 7.05372 2.88705C7.83512 2.10565 8.89493 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88705C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" 
                          stroke="#51A2FF" 
                          strokeWidth="1.66667" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        <path 
                          d="M4.16667 9.16667H15.8333C16.7538 9.16667 17.5 9.91286 17.5 10.8333V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5871 2.5 16.6667V10.8333C2.5 9.91286 3.24619 9.16667 4.16667 9.16667Z" 
                          stroke="#51A2FF" 
                          strokeWidth="1.66667" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    
                    {/* Eye Icon Button */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="admin-login-eye-button"
                      data-name="Button"
                    >
                      <svg fill="none" viewBox="0 0 20 20" style={{ width: '20px', height: '20px' }}>
                        {showPassword ? (
                          // Eye icon (password visible)
                          <>
                            <path 
                              d="M0.833374 10C0.833374 10 4.16671 3.33333 10 3.33333C15.8334 3.33333 19.1667 10 19.1667 10C19.1667 10 15.8334 16.6667 10 16.6667C4.16671 16.6667 0.833374 10 0.833374 10Z" 
                              stroke="#51A2FF" 
                              strokeWidth="1.66667" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                            <path 
                              d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" 
                              stroke="#51A2FF" 
                              strokeWidth="1.66667" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </>
                        ) : (
                          // Eye-off icon (password hidden)
                          <>
                            <path 
                              d="M14.95 14.95C13.5255 16.0358 11.7909 16.6373 10 16.6667C4.16671 16.6667 0.833374 10 0.833374 10C1.8694 8.06825 3.30591 6.38051 5.05004 5.05M8.25004 3.53333C8.82365 3.39907 9.41094 3.33195 10 3.33333C15.8334 3.33333 19.1667 10 19.1667 10C18.6609 10.9463 18.0576 11.8373 17.3667 12.6583M11.7667 11.7667C11.5379 12.0123 11.2618 12.2093 10.9549 12.3459C10.6481 12.4826 10.3166 12.556 9.98045 12.562C9.64427 12.568 9.31023 12.5063 8.99874 12.3806C8.68725 12.2549 8.40442 12.0676 8.16738 11.8306C7.93034 11.5935 7.74301 11.3107 7.6173 10.9992C7.49159 10.6877 7.42993 10.3537 7.43594 10.0175C7.44195 9.68133 7.51552 9.34984 7.65219 9.04299C7.78886 8.73614 7.98583 8.46005 8.23171 8.23117" 
                              stroke="#51A2FF" 
                              strokeWidth="1.66667" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                            <path 
                              d="M0.833374 0.833333L19.1667 19.1667" 
                              stroke="#51A2FF" 
                              strokeWidth="1.66667" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="admin-login-submit" 
                  data-name="Button"
                >
                  <p>{loading ? 'Signing In...' : 'Sign In to Admin Portal'}</p>
                </button>
              </form>

              {/* Security Notice */}
              <div className="admin-login-notice" data-name="Container">
                <div className="admin-login-notice-border" aria-hidden="true" />
                <div className="admin-login-notice-content">
                  <div className="admin-login-notice-text" data-name="Paragraph">
                    <p>🔒 Secure admin access only. Unauthorized access is prohibited.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="admin-login-footer" data-name="Paragraph">
            <p>© 2026 FaithLy - Admin Portal</p>
          </div>

        </div>
      </div>
    </div>
  );
}
