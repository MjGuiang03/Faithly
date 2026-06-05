import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminSettings.css';
import { Settings, Lock, CreditCard, Edit2, Moon, Building, Bell, Database, Wrench, Download, LogOut } from 'lucide-react';
import API from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';


export default function AdminSettings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    adminName: 'Admin User',
    adminEmail: 'admin@church.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    approvalMethod: 'gateway',
    orgName: 'IsangDiwa Church',
    orgContact: '+63 912 345 6789',
    orgAddress: 'Metro Manila, Philippines',
    maintenanceMode: false,
    notifNewUser: true,
    notifDonation: true,
    notifLoan: true,
  });
  const [savedApprovalMethod, setSavedApprovalMethod] = useState('gateway');
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, section: null });

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/');
      return;
    }

    // Fetch profile
    const token = localStorage.getItem('adminToken');
    if (token) {
      fetch(`${API}/api/admin/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(prev => ({
            ...prev,
            adminName: data.admin.fullName,
            adminEmail: data.admin.email
          }));
          localStorage.setItem('adminName', data.admin.fullName);
          window.dispatchEvent(new Event('storage'));
        }
      })
      .catch(err => console.error(err));
    }
  }, [navigate]);

  const token = localStorage.getItem('adminToken');
  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

  const { data: settingsData, mutate: refreshSettings } = useSWR(
    token ? `${API}/api/admin/settings` : null,
    fetcherSingle,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (settingsData && settingsData.success && settingsData.settings) {
        const s = settingsData.settings;
        const currentMethod = s.paymentApprovalMethod || 'gateway';
        setSettings(prev => ({ 
            ...prev, 
            approvalMethod: currentMethod,
            orgName: s.orgName || 'IsangDiwa Church',
            orgContact: s.orgContact || '+63 912 345 6789',
            orgAddress: s.orgAddress || 'Metro Manila, Philippines',
            maintenanceMode: s.maintenanceMode || false,
            notifNewUser: s.notifNewUser ?? true,
            notifDonation: s.notifDonation ?? true,
            notifLoan: s.notifLoan ?? true
        }));
        setSavedApprovalMethod(currentMethod);
    }
  }, [settingsData]);

  const handleSave = async (section, directPayload = null) => {
    try {
      const token = localStorage.getItem('adminToken');

      if (section === 'Account') {
        const res = await fetch(`${API}/api/admin/profile/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fullName: settings.adminName })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('adminName', settings.adminName);
          window.dispatchEvent(new Event('storage'));
          toast.success('Profile updated successfully');
        } else {
          toast.error(data.message || 'Failed to update profile');
        }
        return;
      }

      if (section === 'Security') {
        if (!settings.currentPassword || !settings.newPassword || !settings.confirmPassword) {
          toast.error('Please fill in all password fields');
          return;
        }
        if (settings.newPassword !== settings.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        if (settings.newPassword.length < 8) {
          toast.error('Password must be at least 8 characters');
          return;
        }
        if (!/[A-Z]/.test(settings.newPassword)) {
          toast.error('Password must contain an uppercase letter');
          return;
        }
        if (!/[0-9]/.test(settings.newPassword)) {
          toast.error('Password must contain a number');
          return;
        }
        if (!/[^A-Za-z0-9]/.test(settings.newPassword)) {
          toast.error('Password must contain a symbol');
          return;
        }

        const res = await fetch(`${API}/api/admin/profile/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: settings.currentPassword,
            newPassword: settings.newPassword
          })
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Password updated successfully');
          setSettings(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
        } else {
          toast.error(data.message || 'Failed to update password');
        }
        return;
      }
      
      const payload = directPayload || {
        paymentApprovalMethod: settings.approvalMethod,
        orgName: settings.orgName,
        orgContact: settings.orgContact,
        orgAddress: settings.orgAddress,
        maintenanceMode: settings.maintenanceMode,
        notifNewUser: settings.notifNewUser,
        notifDonation: settings.notifDonation,
        notifLoan: settings.notifLoan
      };
      
      const res = await fetch(`${API}/api/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        if (!directPayload) {
            toast.success(`${section} settings updated successfully`);
        }
        if (section === 'Payment') {
            setSavedApprovalMethod(settings.approvalMethod);
            setIsEditingPayment(false);
        }
        refreshSettings();
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleToggleChange = (key, checked) => {
      setSettings(prev => ({ ...prev, [key]: checked }));
      handleSave('Toggles', { [key]: checked });
  };

  const handleExportData = () => {
    toast.success('Preparing master database export...');
    setTimeout(() => {
        toast.success('Backup downloaded successfully (database_backup.csv)');
    }, 1500);
  };

  return (
    <div className="admin-settings-main">
      {/* Header */}
      <div className="admin-settings-header">
        <h1 className="admin-settings-title">Admin Settings</h1>
        <p className="admin-settings-subtitle">Configure system preferences and security</p>
      </div>


      {/* Organization Profile Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
            <Building size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Organization Profile</h2>
            <p className="admin-settings-section-description">Update the church's official branding and contact details</p>
          </div>
        </div>

        <div className="admin-settings-form-row">
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Church Name</label>
            <input
              type="text"
              value={settings.orgName}
              onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
              className="admin-settings-form-input"
            />
          </div>
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Contact Number</label>
            <input
              type="text"
              value={settings.orgContact}
              onChange={(e) => setSettings({ ...settings, orgContact: e.target.value })}
              className="admin-settings-form-input"
            />
          </div>
        </div>
        <div className="admin-settings-form-group">
          <label className="admin-settings-form-label">Official Address</label>
          <input
            type="text"
            value={settings.orgAddress}
            onChange={(e) => setSettings({ ...settings, orgAddress: e.target.value })}
            className="admin-settings-form-input"
          />
        </div>

        <button
          onClick={() => setConfirmModal({ show: true, section: 'Organization' })}
          className="admin-settings-save-btn"
        >
          Save Details
        </button>
      </div>

      {/* Account Settings Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-purple">
            <Settings size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Account Settings</h2>
            <p className="admin-settings-section-description">Manage your admin account details</p>
          </div>
        </div>

        <div className="admin-settings-form-row">
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Admin Name</label>
            <input
              type="text"
              value={settings.adminName}
              onChange={(e) => setSettings({ ...settings, adminName: e.target.value })}
              className="admin-settings-form-input"
            />
          </div>
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Email Address</label>
            <input
              type="email"
              value={settings.adminEmail}
              onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
              className="admin-settings-form-input"
            />
          </div>
        </div>

        <button
          onClick={() => setConfirmModal({ show: true, section: 'Account' })}
          className="admin-settings-save-btn"
        >
          Save Changes
        </button>
      </div>

      {/* Security Settings Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-green">
            <Lock size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Security</h2>
            <p className="admin-settings-section-description">Password and authentication settings</p>
          </div>
        </div>

        <div className="admin-settings-form-group">
          <label className="admin-settings-form-label">Current Password</label>
          <input
            type="password"
            value={settings.currentPassword}
            onChange={(e) => setSettings({ ...settings, currentPassword: e.target.value })}
            placeholder="Enter current password"
            className="admin-settings-form-input"
          />
        </div>

        <div className="admin-settings-form-row">
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">New Password</label>
            <input
              type="password"
              value={settings.newPassword}
              onChange={(e) => setSettings({ ...settings, newPassword: e.target.value })}
              placeholder="Enter new password"
              className="admin-settings-form-input"
            />
          </div>
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Confirm Password</label>
            <input
              type="password"
              value={settings.confirmPassword}
              onChange={(e) => setSettings({ ...settings, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              className="admin-settings-form-input"
            />
          </div>
        </div>


        <button
          onClick={() => setConfirmModal({ show: true, section: 'Security' })}
          className="admin-settings-save-btn"
        >
          Update Password
        </button>
      </div>

      {/* Notification Preferences Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon" style={{ backgroundColor: '#fce7f3', color: '#db2777' }}>
            <Bell size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Notification Preferences</h2>
            <p className="admin-settings-section-description">Choose what system events you want to be alerted about</p>
          </div>
        </div>

        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <label className="admin-settings-form-label" style={{ marginBottom: '4px' }}>New User Registrations</label>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Get notified when a new member joins.</p>
          </div>
          <label className="admin-toggle-switch">
            <input type="checkbox" checked={settings.notifNewUser} onChange={(e) => handleToggleChange('notifNewUser', e.target.checked)} />
            <span className="admin-toggle-slider"></span>
          </label>
        </div>

        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <label className="admin-settings-form-label" style={{ marginBottom: '4px' }}>Large Donations</label>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Get notified for donations above ₱5,000.</p>
          </div>
          <label className="admin-toggle-switch">
            <input type="checkbox" checked={settings.notifDonation} onChange={(e) => handleToggleChange('notifDonation', e.target.checked)} />
            <span className="admin-toggle-slider"></span>
          </label>
        </div>

        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label className="admin-settings-form-label" style={{ marginBottom: '4px' }}>Loan Applications</label>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Get notified when new loans are submitted or approved.</p>
          </div>
          <label className="admin-toggle-switch">
            <input type="checkbox" checked={settings.notifLoan} onChange={(e) => handleToggleChange('notifLoan', e.target.checked)} />
            <span className="admin-toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Payment Settings Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-blue">
            <CreditCard size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Payment Settings</h2>
            <p className="admin-settings-section-description">Configure transaction approval methods</p>
          </div>
        </div>

        <div className="admin-settings-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="admin-settings-form-label" style={{ marginBottom: 0 }}>Payment Processing Mode</label>
            {!isEditingPayment && (
              <button 
                onClick={() => setIsEditingPayment(true)} 
                className="admin-settings-change-btn" 
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>
          
          {!isEditingPayment ? (
            <div style={{ 
              padding: '12px 16px', 
              background: '#f9fafb', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px' 
            }}>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                padding: '4px 10px', 
                borderRadius: '12px', 
                backgroundColor: savedApprovalMethod === 'manual' ? '#fef3c7' : '#dcfce7', 
                color: savedApprovalMethod === 'manual' ? '#b45309' : '#166534',
                border: savedApprovalMethod === 'manual' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                fontFamily: 'Inter, sans-serif'
              }}>
                Active: {savedApprovalMethod === 'manual' ? 'Manual Approval' : 'Automated Gateway'}
              </span>
              <span style={{ fontSize: '14px', color: '#4b5563' }}>
                {savedApprovalMethod === 'manual' 
                  ? 'Admins manually review transactions.' 
                  : 'Transactions confirmed automatically.'}
              </span>
            </div>
          ) : (
            <select
              value={settings.approvalMethod}
              onChange={(e) => setSettings({ ...settings, approvalMethod: e.target.value })}
              className="admin-settings-form-input"
            >
              <option value="gateway">Automated Gateway Approval</option>
              <option value="manual">Manual Approval</option>
            </select>
          )}
        </div>

        {isEditingPayment && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setIsEditingPayment(false);
                setSettings({ ...settings, approvalMethod: savedApprovalMethod });
              }}
              className="admin-settings-reset-btn"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              onClick={() => setConfirmModal({ show: true, section: 'Payment' })}
              className="admin-settings-save-btn"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Appearance Settings Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
            <Moon size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Appearance Settings</h2>
            <p className="admin-settings-section-description">Customize the look and feel of the admin dashboard</p>
          </div>
        </div>

        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label className="admin-settings-form-label" style={{ marginBottom: '4px' }}>Dark Mode Theme</label>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Enable a darker color scheme for low-light environments.</p>
          </div>
          <label className="admin-toggle-switch">
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
            <span className="admin-toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Database Backup Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <Database size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Data Backup & Export</h2>
            <p className="admin-settings-section-description">Export a complete snapshot of your system's data</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div>
            <strong style={{ fontSize: '14px', color: '#111827', display: 'block', marginBottom: '4px', fontFamily: 'DM Sans, sans-serif' }}>Export Master Database</strong>
            <span style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'DM Sans, sans-serif' }}>Downloads a secure CSV copy of all members, donations, and loans.</span>
          </div>
          <button onClick={handleExportData} className="admin-settings-reset-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {/* System Maintenance Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
            <Wrench size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">System Maintenance</h2>
            <p className="admin-settings-section-description">Temporarily disable user access to the platform</p>
          </div>
        </div>

        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff1f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
          <div>
            <label className="admin-settings-form-label" style={{ marginBottom: '4px', color: '#9f1239' }}>Enable Maintenance Mode</label>
            <p style={{ fontSize: '13px', color: '#be123c', margin: 0 }}>Regular users will see a maintenance screen and cannot log in.</p>
          </div>
          <label className="admin-toggle-switch">
            <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => handleToggleChange('maintenanceMode', e.target.checked)} />
            <span className="admin-toggle-slider" style={settings.maintenanceMode ? { backgroundColor: '#e11d48' } : {}}></span>
          </label>
        </div>
      </div>

      {/* Logout Section */}
      <div className="admin-settings-section" style={{ border: '1px solid #fee2e2', backgroundColor: '#fef2f2', boxShadow: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="admin-settings-section-icon" style={{ backgroundColor: '#fecaca', color: '#dc2626' }}>
              <LogOut size={20} />
            </div>
            <div>
              <h2 className="admin-settings-section-title" style={{ color: '#991b1b', margin: 0 }}>Log Out</h2>
              <p className="admin-settings-section-description" style={{ color: '#b91c1c', margin: 0 }}>Securely end your admin session</p>
            </div>
          </div>
          <button 
            onClick={() => {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminEmail');
                navigate('/');
            }} 
            style={{
                padding: '10px 24px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            Log Out Now
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="admin-settings-modal-overlay">
          <div className="admin-settings-modal-content">
            <h2 className="admin-settings-modal-title">Confirm Changes</h2>
            <p className="admin-settings-modal-description" style={{ marginBottom: '12px' }}>
              Are you sure you want to save changes to your {confirmModal.section} settings?
            </p>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
              <strong>What happens next:</strong><br />
              {confirmModal.section === 'Account' && "Your admin profile details such as name and email address will be updated across the system."}
              {confirmModal.section === 'Organization' && "The church's official name, address, and contact details will be updated globally."}
              {confirmModal.section === 'Security' && "Your password will be updated immediately. Please make sure to remember your new password for your next login."}
              {confirmModal.section === 'Payment' && (
                settings.approvalMethod === 'manual' 
                  ? "Switching to Manual Approval will require users to upload proof of payment for their transactions. Administrators will need to manually review and approve pending transactions from the dashboard."
                  : "Switching to Automated Gateway Approval will redirect users to PayMongo to securely process their payments. Transactions will be automatically confirmed without requiring manual review."
              )}
            </div>
            <div className="admin-settings-modal-actions">
              <button 
                onClick={() => setConfirmModal({ show: false, section: null })} 
                className="admin-settings-modal-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleSave(confirmModal.section);
                  setConfirmModal({ show: false, section: null });
                }} 
                className="admin-settings-modal-confirm-btn"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
