import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminSettings.css';

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
    twoFactorAuth: false
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.1667 12.5C16.0557 12.7513 16.0227 13.0302 16.0719 13.3005C16.121 13.5708 16.2502 13.8203 16.4417 14.0167L16.4917 14.0667C16.6461 14.221 16.7687 14.4044 16.8527 14.6061C16.9368 14.8078 16.9806 15.0238 16.9806 15.2417C16.9806 15.4596 16.9368 15.6756 16.8527 15.8773C16.7687 16.0789 16.6461 16.2624 16.4917 16.4167C16.3373 16.5711 16.1539 16.6937 15.9522 16.7777C15.7505 16.8618 15.5345 16.9056 15.3167 16.9056C15.0988 16.9056 14.8828 16.8618 14.6811 16.7777C14.4794 16.6937 14.296 16.5711 14.1417 16.4167L14.0917 16.3667C13.8952 16.1752 13.6457 16.046 13.3754 15.9968C13.1051 15.9477 12.8262 15.9807 12.575 16.0917C12.3285 16.1983 12.119 16.3766 11.9733 16.604C11.8275 16.8314 11.7517 17.0982 11.7558 17.37V17.5C11.7558 17.9362 11.5825 18.3545 11.2731 18.6636C10.9636 18.9732 10.5453 19.1467 10.1092 19.1467C9.67304 19.1467 9.25476 18.9732 8.94534 18.6636C8.63593 18.3545 8.46263 17.9362 8.46263 17.5V17.425C8.45301 17.1463 8.36704 16.8756 8.21488 16.6447C8.06272 16.4139 7.85089 16.2321 7.60334 16.1192C7.35216 16.0082 7.07328 15.9752 6.80296 16.0244C6.53264 16.0735 6.28316 16.2027 6.08668 16.3942L6.03668 16.4442C5.88237 16.5986 5.69891 16.7212 5.49722 16.8052C5.29553 16.8892 5.07956 16.9331 4.86168 16.9331C4.6438 16.9331 4.42783 16.8892 4.22614 16.8052C4.02445 16.7212 3.84099 16.5986 3.68668 16.4442C3.53226 16.2899 3.40966 16.1064 3.32562 15.9048C3.24158 15.7031 3.19775 15.4871 3.19775 15.2692C3.19775 15.0513 3.24158 14.8353 3.32562 14.6336C3.40966 14.432 3.53226 14.2485 3.68668 14.0942L3.73668 14.0442C3.92818 13.8477 4.05738 13.5982 4.10652 13.3279C4.15567 13.0576 4.12267 12.7787 4.01168 12.5275C3.90503 12.281 3.72673 12.0715 3.49933 11.9258C3.27193 11.78 3.00515 11.7042 2.73334 11.7083H2.60834C2.17223 11.7083 1.75395 11.535 1.44454 11.2256C1.13512 10.9162 0.961823 10.4979 0.961823 10.0617C0.961823 9.62558 1.13512 9.2073 1.44454 8.89788C1.75395 8.58847 2.17223 8.41517 2.60834 8.41517H2.68334C2.96201 8.40555 3.2327 8.31958 3.46352 8.16742C3.69435 8.01526 3.87616 7.80343 3.98918 7.55588C4.10017 7.3047 4.13317 7.02582 4.08402 6.7555C4.03488 6.48518 3.90568 6.2357 3.71418 6.03922L3.66418 5.98922C3.50976 5.83491 3.38716 5.65145 3.30312 5.44976C3.21908 5.24807 3.17525 5.0321 3.17525 4.81422C3.17525 4.59634 3.21908 4.38037 3.30312 4.17868C3.38716 3.97699 3.50976 3.79353 3.66418 3.63922C3.81849 3.4848 4.00195 3.3622 4.20364 3.27816C4.40533 3.19412 4.6213 3.15029 4.83918 3.15029C5.05706 3.15029 5.27303 3.19412 5.47472 3.27816C5.67641 3.3622 5.85987 3.4848 6.01418 3.63922L6.06418 3.68922C6.26066 3.88072 6.51014 4.00992 6.78046 4.05906C7.05078 4.10821 7.32966 4.07521 7.58084 3.96422H7.63084C7.87732 3.85757 8.08681 3.67927 8.23257 3.45187C8.37833 3.22447 8.45413 2.95769 8.45001 2.68588V2.56088C8.45001 2.12477 8.6233 1.70649 8.93272 1.39708C9.24214 1.08766 9.66041 0.914368 10.0965 0.914368C10.5326 0.914368 10.9509 1.08766 11.2603 1.39708C11.5697 1.70649 11.743 2.12477 11.743 2.56088V2.63588C11.7389 2.90769 11.8147 3.17447 11.9605 3.40187C12.1062 3.62927 12.3157 3.80757 12.5622 3.91422C12.8134 4.02521 13.0923 4.05821 13.3626 4.00906C13.6329 3.95992 13.8824 3.83072 14.0788 3.63922L14.1288 3.58922C14.2832 3.4348 14.4666 3.3122 14.6683 3.22816C14.87 3.14412 15.086 3.10029 15.3038 3.10029C15.5217 3.10029 15.7377 3.14412 15.9394 3.22816C16.1411 3.3122 16.3245 3.4348 16.4788 3.58922C16.6333 3.74353 16.7559 3.92699 16.8399 4.12868C16.9239 4.33037 16.9678 4.54634 16.9678 4.76422C16.9678 4.9821 16.9239 5.19807 16.8399 5.39976C16.7559 5.60145 16.6333 5.78491 16.4788 5.93922L16.4288 5.98922C16.2373 6.1857 16.1081 6.43518 16.059 6.7055C16.0099 6.97582 16.0429 7.2547 16.1538 7.50588V7.55588C16.2605 7.80236 16.4388 8.01185 16.6662 8.15761C16.8936 8.30337 17.1604 8.37917 17.4322 8.37505H17.5572C17.9933 8.37505 18.4116 8.54834 18.721 8.85776C19.0304 9.16718 19.2037 9.58545 19.2037 10.0216C19.2037 10.4577 19.0304 10.8759 18.721 11.1854C18.4116 11.4948 17.9933 11.6681 17.5572 11.6681H17.4822C17.2104 11.6639 16.9436 11.7397 16.7162 11.8855C16.4888 12.0312 16.3105 12.2407 16.2038 12.4872V12.5Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.6667 17.5V15.8333C16.6667 14.9493 16.3155 14.1014 15.6904 13.4763C15.0652 12.8512 14.2174 12.5 13.3333 12.5H6.66667C5.78261 12.5 4.93476 12.8512 4.30964 13.4763C3.68452 14.1014 3.33333 14.9493 3.33333 15.8333V17.5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 9.16667C11.8409 9.16667 13.3333 7.67428 13.3333 5.83333C13.3333 3.99238 11.8409 2.5 10 2.5C8.15905 2.5 6.66667 3.99238 6.66667 5.83333C6.66667 7.67428 8.15905 9.16667 10 9.16667Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 1.66667L4.16667 4.16667V9.16667C4.16667 13.0167 6.83333 16.6167 10 17.5C13.1667 16.6167 15.8333 13.0167 15.8333 9.16667V4.16667L10 1.66667Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5789 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42111 18.2537 9.16813 18.1079C8.91515 17.9622 8.70486 17.7526 8.55833 17.5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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

      {/* Data & Backup Section */}
      <div className="admin-settings-section">
        <div className="admin-settings-section-header">
          <div className="admin-settings-section-icon admin-settings-section-icon-pink">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.6667 13.3333V15.8333C16.6667 16.2754 16.4911 16.6993 16.1785 17.0118C15.866 17.3244 15.442 17.5 15 17.5H5C4.55797 17.5 4.13405 17.3244 3.82149 17.0118C3.50893 16.6993 3.33333 16.2754 3.33333 15.8333V13.3333" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.83333 8.33333L10 12.5L14.1667 8.33333" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 12.5V2.5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.6667 13.3333V15.8333C16.6667 16.2754 16.4911 16.6993 16.1785 17.0118C15.866 17.3244 15.442 17.5 15 17.5H5C4.55797 17.5 4.13405 17.3244 3.82149 17.0118C3.50893 16.6993 3.33333 16.2754 3.33333 15.8333V13.3333" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.83333 8.33333L10 12.5L14.1667 8.33333" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 12.5V2.5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Data
          </button>
          <button className="admin-settings-backup-btn admin-settings-backup-btn-secondary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13.3333 2.5H5C4.55797 2.5 4.13405 2.67559 3.82149 2.98816C3.50893 3.30072 3.33333 3.72464 3.33333 4.16667V15.8333C3.33333 16.2754 3.50893 16.6993 3.82149 17.0118C4.13405 17.3244 4.55797 17.5 5 17.5H15C15.442 17.5 15.866 17.3244 16.1785 17.0118C16.4911 16.6993 16.6667 16.2754 16.6667 15.8333V6.66667L13.3333 2.5Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.3333 2.5V6.66667H16.6667" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Backup Now
          </button>
        </div>
      </div>
    </div>
  );
}
