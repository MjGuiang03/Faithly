import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminSettings.css';
import { ArrowLeft, Bell, Lock, Printer, Settings, Mail } from 'lucide-react';


export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    churchName: 'Church of Grace',
    currency: 'PHP',
    timezone: 'Asia/Manila',
    language: 'English',
    adminName: 'Admin User',
    adminEmail: 'admin@church.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    smsNotifications: false,
    weeklyReports: true,
    monthlyReports: true,
    backupEnabled: true,
    twoFactorAuth: false,
    smtpServer: 'smtp.example.com',
    smtpPort: '587',
    fromEmail: 'noreply@church.com'
  });

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/');
      return;
    }
  }, [navigate]);

  const handleSave = (section) => {
    toast.success(`${section} settings saved successfully`);
  };

  return (
    <div className="admin-settings-main">
      {/* Header */}
      <div className="admin-settings-header">
        <h1 className="admin-settings-title">Admin Settings</h1>
        <p className="admin-settings-subtitle">Configure system preferences and security</p>
      </div>

      {/* System Settings Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-blue">
            <Settings size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">System Settings</h2>
            <p className="admin-settings-section-description">General system configurations</p>
          </div>
        </div>

        <div className="admin-settings-form-row">
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Church Name</label>
            <input
              type="text"
              value={settings.churchName}
              onChange={(e) => setSettings({ ...settings, churchName: e.target.value })}
              className="admin-settings-form-input"
            />
          </div>
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Default Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="admin-settings-form-input"
            >
              <option value="PHP">PHP (₱)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div className="admin-settings-form-row">
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="admin-settings-form-input"
            >
              <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
              <option value="America/New_York">America/New_York (UTC-5)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
            </select>
          </div>
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">Language</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="admin-settings-form-input"
            >
              <option value="English">English</option>
              <option value="Filipino">Filipino</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => handleSave('System')}
          className="admin-settings-save-btn"
        >
          Save Changes
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
          onClick={() => handleSave('Account')}
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

        <div className="admin-settings-toggle-item">
          <div className="admin-settings-toggle-label-wrapper">
            <p className="admin-settings-toggle-label">Two-Factor Authentication</p>
            <p className="admin-settings-toggle-description">Add an extra layer of security</p>
          </div>
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={settings.twoFactorAuth}
              onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
            />
            <span className="admin-settings-toggle-slider"></span>
          </label>
        </div>

        <button
          onClick={() => handleSave('Security')}
          className="admin-settings-save-btn"
        >
          Update Password
        </button>
      </div>

      {/* Notification Settings Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-orange">
            <Bell size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Notifications</h2>
            <p className="admin-settings-section-description">Choose how you receive updates</p>
          </div>
        </div>

        <div className="admin-settings-toggle-item">
          <div className="admin-settings-toggle-label-wrapper">
            <p className="admin-settings-toggle-label">Email Notifications</p>
            <p className="admin-settings-toggle-description">Receive notifications via email</p>
          </div>
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
            />
            <span className="admin-settings-toggle-slider"></span>
          </label>
        </div>

        <div className="admin-settings-toggle-item">
          <div className="admin-settings-toggle-label-wrapper">
            <p className="admin-settings-toggle-label">SMS Notifications</p>
            <p className="admin-settings-toggle-description">Receive notifications via SMS</p>
          </div>
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
            />
            <span className="admin-settings-toggle-slider"></span>
          </label>
        </div>

        <div className="admin-settings-toggle-item">
          <div className="admin-settings-toggle-label-wrapper">
            <p className="admin-settings-toggle-label">Weekly Reports</p>
            <p className="admin-settings-toggle-description">Get weekly summary reports</p>
          </div>
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={settings.weeklyReports}
              onChange={(e) => setSettings({ ...settings, weeklyReports: e.target.checked })}
            />
            <span className="admin-settings-toggle-slider"></span>
          </label>
        </div>

        <div className="admin-settings-toggle-item">
          <div className="admin-settings-toggle-label-wrapper">
            <p className="admin-settings-toggle-label">Monthly Reports</p>
            <p className="admin-settings-toggle-description">Get monthly summary reports</p>
          </div>
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={settings.monthlyReports}
              onChange={(e) => setSettings({ ...settings, monthlyReports: e.target.checked })}
            />
            <span className="admin-settings-toggle-slider"></span>
          </label>
        </div>

        <button
          onClick={() => handleSave('Notification')}
          className="admin-settings-save-btn"
        >
          Save Preferences
        </button>
      </div>

      {/* Email Configuration Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-blue">
            <Mail size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Email Configuration</h2>
            <p className="admin-settings-section-description">Configure system-wide email server settings</p>
          </div>
        </div>

        <div className="admin-settings-form-group">
          <label className="admin-settings-form-label">SMTP Server</label>
          <input
            type="text"
            value={settings.smtpServer}
            onChange={(e) => setSettings({ ...settings, smtpServer: e.target.value })}
            placeholder="smtp.gmail.com"
            className="admin-settings-form-input"
          />
        </div>

        <div className="admin-settings-form-row">
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">SMTP Port</label>
            <input
              type="text"
              value={settings.smtpPort}
              onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
              placeholder="587"
              className="admin-settings-form-input"
            />
          </div>
          <div className="admin-settings-form-group">
            <label className="admin-settings-form-label">From Email Address</label>
            <input
              type="email"
              value={settings.fromEmail}
              onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
              placeholder="noreply@churchofgrace.org"
              className="admin-settings-form-input"
            />
          </div>
        </div>

        <button
          onClick={() => handleSave('Email')}
          className="admin-settings-save-btn"
        >
          Save Configuration
        </button>
      </div>

      {/* Data & Backup Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-pink">
            <ArrowLeft size={20} />
          </div>
          <div className="admin-settings-section-title-wrapper">
            <h2 className="admin-settings-section-title">Data & Backup</h2>
            <p className="admin-settings-section-description">Manage data backup and export</p>
          </div>
        </div>

        <div className="admin-settings-toggle-item">
          <div className="admin-settings-toggle-label-wrapper">
            <p className="admin-settings-toggle-label">Automatic Backup</p>
            <p className="admin-settings-toggle-description">Enable daily automatic backups</p>
          </div>
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={settings.backupEnabled}
              onChange={(e) => setSettings({ ...settings, backupEnabled: e.target.checked })}
            />
            <span className="admin-settings-toggle-slider"></span>
          </label>
        </div>

        <div className="admin-settings-backup-actions">
          <button className="admin-settings-backup-btn">
            <Printer size={20} />
            Export Data
          </button>
          <button className="admin-settings-backup-btn admin-settings-backup-btn-secondary">
            <Printer size={20} />
            Backup Now
          </button>
        </div>
      </div>
    </div>
  );
}
