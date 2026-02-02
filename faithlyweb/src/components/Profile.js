import { useState } from 'react';
import { User, Edit2, Save, X, Trash2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/Profile.css';

export default function Profile() {
  const { user, profile, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || user?.fullName || '',
    email: user?.email || '',
    phone: profile?.phone || user?.phone || '',
    branch: profile?.branch || user?.branch || '',
    position: profile?.position || user?.position || '',
    gender: profile?.gender || user?.gender || '',
    birthday: profile?.birthday || user?.birthday || ''
  });

  // Get account creation date from either profile or user
  const accountCreatedAt = profile?.createdAt || profile?.created_at || user?.createdAt || user?.created_at;
  
  const memberSince = accountCreatedAt 
    ? new Date(accountCreatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form data to original values
    setFormData({
      fullName: profile?.fullName || user?.fullName || '',
      email: user?.email || '',
      phone: profile?.phone || user?.phone || '',
      branch: profile?.branch || user?.branch || '',
      position: profile?.position || user?.position || '',
      gender: profile?.gender || user?.gender || '',
      birthday: profile?.birthday || user?.birthday || ''
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setLoading(true);
    
    const result = await updateProfile(formData);
    
    if (result.success) {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } else {
      toast.error(result.error?.message || 'Failed to update profile');
    }
    
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setPasswordError('Please enter your password');
      return;
    }

    setLoading(true);
    setPasswordError(''); // Clear any previous error
    
    const result = await deleteAccount(user?.email, deletePassword);
    
    if (result.success) {
      setShowDeleteModal(false);
      setDeletePassword('');
      navigate('/');
    } else {
      // Check if it's a password error
      if (result.error?.isPasswordError) {
        setPasswordError(result.error.message);
        setDeletePassword(''); // Clear the password field
      } else {
        // Show other errors via toast
        toast.error(result.error?.message || 'Failed to delete account');
      }
    }
    
    setLoading(false);
  };

  // Summary data
  const summaryData = {
    activeLoans: profile?.activeLoans || 0,
    totalLoans: profile?.totalLoans || 0,
    donationThisYear: profile?.donationThisYear || 0,
    donationTotal: profile?.donationTotal || 0,
    attendanceRate: profile?.attendanceRate || 0,
    totalServices: profile?.totalServices || 0
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div>
          <h1 className="profile-title">My Profile</h1>
          <p className="profile-subtitle">Manage your personal information</p>
        </div>
      </div>

      <div className="profile-content">
        {/* Personal Information Card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2 className="profile-card-title">Personal Information</h2>
            {!isEditing ? (
              <button onClick={handleEditClick} className="edit-button">
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button onClick={handleCancelEdit} className="cancel-button" disabled={loading}>
                  <X size={16} />
                  Cancel
                </button>
                <button onClick={handleSave} className="save-button" disabled={loading}>
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="profile-avatar-section">
            <div className="profile-avatar">
              <User size={48} />
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <label className="profile-label">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="profile-input"
                />
              ) : (
                <p className="profile-value">{formData.fullName || 'Not provided'}</p>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Email Address</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="profile-input"
                />
              ) : (
                <p className="profile-value email">{formData.email || 'Not provided'}</p>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="profile-input"
                />
              ) : (
                <p className="profile-value">{formData.phone || 'Not provided'}</p>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Home Branch</label>
              {isEditing ? (
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="profile-input"
                >
                  <option value="">Select your branch</option>
                  <option value="Main Branch">Main Branch</option>
                  <option value="Downtown Branch">Downtown Branch</option>
                  <option value="Northside Branch">Northside Branch</option>
                  <option value="Southside Branch">Southside Branch</option>
                </select>
              ) : (
                <p className="profile-value">{formData.branch || 'Not provided'}</p>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Position in Church</label>
              {isEditing ? (
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="profile-input"
                >
                  <option value="">Select your position</option>
                  <option value="Member">Member</option>
                  <option value="Deacon">Deacon</option>
                  <option value="Elder">Elder</option>
                  <option value="Pastor">Pastor</option>
                  <option value="Youth Leader">Youth Leader</option>
                  <option value="Worship Leader">Worship Leader</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p className="profile-value">{formData.position || 'Not provided'}</p>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Gender</label>
              <p className="profile-value readonly">{formData.gender || 'Not provided'}</p>
            </div>

            <div className="profile-field">
              <label className="profile-label">Date of Birth</label>
              <p className="profile-value readonly">
                {formData.birthday 
                  ? new Date(formData.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Not provided'}
              </p>
            </div>

            {/* Date of Account Creation - Read-only */}
            <div className="profile-field">
              <label className="profile-label">Date of Account Creation</label>
              <p className="profile-value readonly">{memberSince}</p>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="delete-account-section">
            <button onClick={() => setShowDeleteModal(true)} className="delete-account-btn">
              <Trash2 size={16} />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="profile-summaries">
          {/* Loan Summary */}
          <div className="summary-card">
            <h3 className="summary-title">Loan Summary</h3>
            <div className="summary-content">
              <div className="summary-row">
                <span className="summary-label">Active Loans</span>
                <span className="summary-value">{summaryData.activeLoans}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total Loans</span>
                <span className="summary-value">{summaryData.totalLoans}</span>
              </div>
            </div>
          </div>

          {/* Donation Summary */}
          <div className="summary-card">
            <h3 className="summary-title">Donation Summary</h3>
            <div className="summary-content">
              <div className="summary-row">
                <span className="summary-label">This Year</span>
                <span className="summary-value">₱{summaryData.donationThisYear}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total</span>
                <span className="summary-value">₱{summaryData.donationTotal}</span>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="summary-card">
            <h3 className="summary-title">Attendance Summary</h3>
            <div className="summary-content">
              <div className="summary-row">
                <span className="summary-label">Attendance Rate</span>
                <span className="summary-value">{summaryData.attendanceRate}%</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Total Services</span>
                <span className="summary-value">{summaryData.totalServices}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <h2 className="delete-modal-title">Delete Account</h2>
            <p className="delete-modal-message">
              Are you sure you want to delete your account? This action is irreversible and will permanently remove all your data.
            </p>
            
            <div className="delete-password-field">
              <label className="delete-password-label">Enter your password to confirm</label>
              <div className="delete-password-wrapper">
                <Lock className="delete-password-icon" size={18} />
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setPasswordError(''); // Clear error when user types
                  }}
                  placeholder="Enter your password"
                  className={`delete-password-input ${passwordError ? 'error' : ''}`}
                  disabled={loading}
                />
              </div>
              {passwordError && (
                <p className="delete-password-error">{passwordError}</p>
              )}
            </div>

            <div className="delete-modal-actions">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }} 
                className="delete-modal-cancel"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount} 
                className="delete-modal-delete" 
                disabled={loading || !deletePassword}
              >
                <Trash2 size={16} />
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}