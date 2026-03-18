import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { UserPlus, Info, Loader2 } from 'lucide-react';
import API from '../../utils/api';
import '../styles/AdminUserManagement.css';

export default function AdminUserManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    if (role !== 'admin') {
      toast.error('Access denied. Only Main Admin can manage users.');
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'loanAdmin'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email.endsWith('@gmail.com')) {
      toast.error('Please use a valid Gmail address');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Account for ${formData.email} created successfully!`);
        setFormData({
          email: '',
          password: '',
          role: 'loanAdmin'
        });
      } else {
        toast.error(data.message || 'Failed to create account');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users-main">
      <div className="admin-users-header">
        <h1 className="admin-users-title">User Management</h1>
        <p className="admin-users-subtitle">Create new administrative and staff accounts</p>
      </div>

      <div className="admin-users-container">
        <div className="admin-users-card">
          <form className="admin-users-form" onSubmit={handleSubmit}>
            <div className="admin-users-form-group">
              <label className="admin-users-form-label">Gmail Address</label>
              <input
                type="email"
                name="email"
                placeholder="example@gmail.com"
                className="admin-users-input"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="admin-users-form-group">
              <label className="admin-users-form-label">Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="admin-users-input"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="admin-users-form-group">
              <label className="admin-users-form-label">Account Role</label>
              <select
                name="role"
                className="admin-users-select"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="admin">Main Admin</option>
                <option value="loanAdmin">Loan Admin</option>
                <option value="secretaryAdmin">Secretary</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="admin-users-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="admin-users-info">
            <Info className="admin-users-info-icon" size={20} />
            <p className="admin-users-info-text">
              Newly created accounts will be able to log in immediately using the provided Gmail and password. 
              Only the Main Admin has permission to access this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
