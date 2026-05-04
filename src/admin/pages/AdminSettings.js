import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminSettings.css';
import { Settings, Lock, CreditCard, Edit2 } from 'lucide-react';
import API from '../../utils/api';


export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    adminName: 'Admin User',
    adminEmail: 'admin@church.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    approvalMethod: 'gateway'
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

    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.settings) {
          const currentMethod = data.settings.paymentApprovalMethod || 'gateway';
          setSettings(prev => ({ ...prev, approvalMethod: currentMethod }));
          setSavedApprovalMethod(currentMethod);
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, [navigate]);

  const handleSave = async (section) => {
    if (section === 'Payment') {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API}/api/admin/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ paymentApprovalMethod: settings.approvalMethod })
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Payment settings updated successfully');
          setSavedApprovalMethod(settings.approvalMethod);
          setIsEditingPayment(false);
        } else {
          toast.error(data.message || 'Failed to update payment settings');
        }
      } catch (err) {
        toast.error('Network error');
      }
      return;
    }
    toast.success(`${section} settings saved successfully`);
  };

  return (
    <div className="admin-settings-main">
      {/* Header */}
      <div className="admin-settings-header">
        <h1 className="admin-settings-title">Admin Settings</h1>
        <p className="admin-settings-subtitle">Configure system preferences and security</p>
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
