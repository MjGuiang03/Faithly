import { useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import svgPaths from '../imports/svg-kfi3zq3ims';
import '../styles/Settings.css';
import Sidebar from '../components/Sidebar'

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  
  const [notificationPreferences, setNotificationPreferences] = useState({
    loanUpdates: true,
    paymentReminders: true,
    upcomingServices: true,
    churchAnnouncements: true
  });
  
  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('GMT+8 Manila');

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  const handlePreferenceChange = (pref) => {
    setNotificationPreferences({
      ...notificationPreferences,
      [pref]: !notificationPreferences[pref]
    });
  };

  const handleSaveSettings = () => {
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    setEmailNotifications(true);
    setSmsNotifications(false);
    setTwoFactorAuth(false);
    setNotificationPreferences({
      loanUpdates: true,
      paymentReminders: true,
      upcomingServices: true,
      churchAnnouncements: true
    });
    setLanguage('English');
    setTimezone('GMT+8 Manila');
  };

  return (
    <div className="home-layout">
      
      <Sidebar/>
      

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="settings-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="settings-container">
          {/* Notifications Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon-box notifications-icon">
                <svg className="section-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5789 18.2537 10.292 18.3304 10 18.3304C9.70803 18.3304 9.42117 18.2537 9.16816 18.1079C8.91515 17.9622 8.70486 17.7526 8.55835 17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <div className="section-header-text">
                <h2 className="section-title">Notifications</h2>
                <p className="section-subtitle">Manage how you receive updates</p>
              </div>
            </div>

            <div className="settings-group">
              <div className="toggle-setting">
                <div className="toggle-setting-info">
                  <h3 className="toggle-title">Email Notifications</h3>
                  <p className="toggle-description">Receive updates via email</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-setting">
                <div className="toggle-setting-info">
                  <h3 className="toggle-title">SMS Notifications</h3>
                  <p className="toggle-description">Receive text message alerts</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={smsNotifications}
                    onChange={(e) => setSmsNotifications(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="notification-preferences">
                <h3 className="preferences-title">Notification Preferences</h3>
                <div className="checkbox-list">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.loanUpdates}
                      onChange={() => handlePreferenceChange('loanUpdates')}
                    />
                    <span>Loan application updates</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.paymentReminders}
                      onChange={() => handlePreferenceChange('paymentReminders')}
                    />
                    <span>Payment reminders</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.upcomingServices}
                      onChange={() => handlePreferenceChange('upcomingServices')}
                    />
                    <span>Upcoming services</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.churchAnnouncements}
                      onChange={() => handlePreferenceChange('churchAnnouncements')}
                    />
                    <span>Church announcements</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon-box security-icon">
                <svg className="section-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M10 1.66667L3.33333 5.00001V9.16667C3.33333 13.5 6.16667 17.5167 10 18.3333C13.8333 17.5167 16.6667 13.5 16.6667 9.16667V5.00001L10 1.66667Z" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <div className="section-header-text">
                <h2 className="section-title">Security</h2>
                <p className="section-subtitle">Manage your security settings</p>
              </div>
            </div>

            <div className="settings-group">
              <div className="setting-item">
                <div className="setting-item-icon">
                  <svg fill="none" viewBox="0 0 20 20">
                    <path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M5.83333 9.16667V5.83333C5.83333 4.72826 6.27232 3.66846 7.05372 2.88706C7.83512 2.10565 8.89493 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88706C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                </div>
                <div className="setting-item-content">
                  <h3 className="setting-item-title">Password</h3>
                  <p className="setting-item-description">Last changed 3 months ago</p>
                </div>
                <button className="link-button">Change</button>
              </div>

              <div className="toggle-setting">
                <div className="setting-item-icon">
                  <svg fill="none" viewBox="0 0 20 20">
                    <path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M5.83333 9.16667V5.83333C5.83333 4.72826 6.27232 3.66846 7.05372 2.88706C7.83512 2.10565 8.89493 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88706C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                </div>
                <div className="toggle-setting-info">
                  <h3 className="toggle-title">Two-Factor Authentication</h3>
                  <p className="toggle-description">Add an extra layer of security</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={twoFactorAuth}
                    onChange={(e) => setTwoFactorAuth(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-item-icon">
                  <svg fill="none" viewBox="0 0 20 20">
                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M10 5V10L13.3333 11.6667" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                </div>
                <div className="setting-item-content">
                  <h3 className="setting-item-title">Login History</h3>
                  <p className="setting-item-description">View recent login activity</p>
                </div>
                <button className="link-button">View</button>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon-box preferences-icon">
                <svg className="section-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M16.1667 12.5C16.0557 12.7513 16.0226 13.0301 16.0717 13.3006C16.1209 13.5711 16.2501 13.8203 16.4417 14.0167L16.4917 14.0667C16.6461 14.221 16.7687 14.4044 16.8527 14.606C16.9368 14.8076 16.9806 15.0233 16.9806 15.2417C16.9806 15.46 16.9368 15.6757 16.8527 15.8773C16.7687 16.0789 16.6461 16.2623 16.4917 16.4167C16.3373 16.571 16.1539 16.6936 15.9523 16.7777C15.7507 16.8618 15.535 16.9056 15.3167 16.9056C15.0983 16.9056 14.8826 16.8618 14.681 16.7777C14.4794 16.6936 14.296 16.571 14.1417 16.4167L14.0917 16.3667C13.8953 16.1751 13.6461 16.0459 13.3756 15.9967C13.1051 15.9475 12.8263 15.9807 12.575 16.0917C12.3284 16.1975 12.1184 16.3721 11.9712 16.5945C11.824 16.8169 11.7461 17.0777 11.7467 17.3442V17.5C11.7467 17.942 11.5711 18.366 11.2585 18.6785C10.946 18.9911 10.522 19.1667 10.08 19.1667C9.63803 19.1667 9.21405 18.9911 8.90149 18.6785C8.58893 18.366 8.41333 17.942 8.41333 17.5V17.425C8.40736 17.1493 8.32016 16.8814 8.16192 16.6549C8.00368 16.4284 7.78113 16.2529 7.52167 16.15C7.27039 16.039 6.99159 16.0059 6.72108 16.055C6.45057 16.1042 6.20141 16.2334 6.005 16.425L5.955 16.475C5.80064 16.6294 5.61724 16.752 5.41563 16.836C5.21403 16.9201 4.99832 16.9639 4.78 16.9639C4.56168 16.9639 4.34597 16.9201 4.14437 16.836C3.94276 16.752 3.75936 16.6294 3.605 16.475C3.45064 16.3206 3.32802 16.1372 3.24397 15.9356C3.15991 15.734 3.11609 15.5183 3.11609 15.3C3.11609 15.0817 3.15991 14.866 3.24397 14.6644C3.32802 14.4628 3.45064 14.2794 3.605 14.125L3.655 14.075C3.84659 13.8786 3.97575 13.6294 4.0249 13.3589C4.07406 13.0884 4.04089 12.8096 3.93 12.5583C3.82417 12.3117 3.64956 12.1017 3.42718 11.9545C3.2048 11.8073 2.94399 11.7294 2.67833 11.73H2.5C2.05797 11.73 1.63405 11.5544 1.32149 11.2418C1.00893 10.9293 0.833328 10.5053 0.833328 10.0633C0.833328 9.62128 1.00893 9.19731 1.32149 8.88475C1.63405 8.57219 2.05797 8.39658 2.5 8.39658H2.575C2.85072 8.39061 3.11864 8.30341 3.34513 8.14517C3.57162 7.98693 3.74717 7.76438 3.85 7.50492C3.96089 7.25364 3.99406 6.97484 3.9449 6.70433C3.89575 6.43382 3.76659 6.18466 3.575 5.98825L3.525 5.93825C3.37064 5.78389 3.24802 5.60049 3.16397 5.39888C3.07991 5.19728 3.03609 4.98157 3.03609 4.76325C3.03609 4.54493 3.07991 4.32922 3.16397 4.12762C3.24802 3.92601 3.37064 3.74261 3.525 3.58825C3.67936 3.43389 3.86276 3.31127 4.06437 3.22722C4.26597 3.14316 4.48168 3.09934 4.7 3.09934C4.91832 3.09934 5.13403 3.14316 5.33563 3.22722C5.53724 3.31127 5.72064 3.43389 5.875 3.58825L5.925 3.63825C6.12141 3.82984 6.37057 3.959 6.64108 4.00815C6.91159 4.05731 7.19039 4.02414 7.44167 3.91325H7.5C7.74656 3.80742 7.95656 3.63281 8.10377 3.41043C8.25098 3.18805 8.3289 2.92724 8.32833 2.66158V2.5C8.32833 2.05797 8.50393 1.63405 8.81649 1.32149C9.12905 1.00893 9.55303 0.833328 9.99506 0.833328C10.4371 0.833328 10.8611 1.00893 11.1736 1.32149C11.4862 1.63405 11.6618 2.05797 11.6618 2.5V2.575C11.6612 2.84066 11.7392 3.10147 11.8864 3.32385C12.0336 3.54623 12.2436 3.72084 12.4902 3.82667C12.7414 3.93756 13.0202 3.97072 13.2908 3.92157C13.5613 3.87241 13.8104 3.74325 14.0068 3.55167L14.0568 3.50167C14.2112 3.34731 14.3946 3.22469 14.5962 3.14063C14.7978 3.05658 15.0135 3.01276 15.2318 3.01276C15.4502 3.01276 15.6659 3.05658 15.8675 3.14063C16.0691 3.22469 16.2525 3.34731 16.4068 3.50167C16.5612 3.65603 16.6838 3.83943 16.7679 4.04103C16.8519 4.24264 16.8958 4.45835 16.8958 4.67667C16.8958 4.89499 16.8519 5.1107 16.7679 5.3123C16.6838 5.51391 16.5612 5.69731 16.4068 5.85167L16.3568 5.90167C16.1653 6.09808 16.0361 6.34724 15.9869 6.61775C15.9378 6.88826 15.9709 7.16706 16.0818 7.41833V7.5C16.1877 7.74656 16.3623 7.95656 16.5847 8.10377C16.807 8.25098 17.0679 8.3289 17.3335 8.32833H17.5C17.942 8.32833 18.366 8.50393 18.6786 8.81649C18.9911 9.12905 19.1667 9.55303 19.1667 9.99506C19.1667 10.4371 18.9911 10.8611 18.6786 11.1736C18.366 11.4862 17.942 11.6618 17.5 11.6618H17.425C17.1594 11.6612 16.8986 11.7392 16.6762 11.8864C16.4538 12.0336 16.2792 12.2436 16.1733 12.49V12.5Z" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <div className="section-header-text">
                <h2 className="section-title">Preferences</h2>
                <p className="section-subtitle">Customize your experience</p>
              </div>
            </div>

            <div className="settings-group">
              <div className="form-group">
                <label className="form-label">Language</label>
                <select
                  className="form-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option>English</option>
                  <option>Filipino</option>
                  <option>Spanish</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select
                  className="form-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option>GMT+8 Manila</option>
                  <option>GMT+0 UTC</option>
                  <option>GMT-5 New York</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Methods Section */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon-box payment-icon">
                <svg className="section-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M17.5 3.33333H2.5C1.57953 3.33333 0.833328 4.07953 0.833328 5V15C0.833328 15.9205 1.57953 16.6667 2.5 16.6667H17.5C18.4205 16.6667 19.1667 15.9205 19.1667 15V5C19.1667 4.07953 18.4205 3.33333 17.5 3.33333Z" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M0.833328 8.33333H19.1667" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <div className="section-header-text">
                <h2 className="section-title">Payment Methods</h2>
                <p className="section-subtitle">Manage your saved payment methods</p>
              </div>
            </div>

            <div className="settings-group">
              <div className="payment-card-item">
                <div className="payment-card-icon">
                  <svg fill="none" viewBox="0 0 32 24">
                    <rect width="32" height="24" fill="#E5E7EB" rx="4" />
                    <rect width="32" height="8" y="6" fill="#9CA3AF" />
                  </svg>
                </div>
                <div className="payment-card-content">
                  <h3 className="payment-card-number">•••• •••• •••• 4242</h3>
                  <p className="payment-card-expiry">Expires 12/2026</p>
                </div>
                <button className="link-button danger">Remove</button>
              </div>

              <button className="add-payment-btn">+ Add Payment Method</button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="settings-actions">
            <button className="save-settings-btn" onClick={handleSaveSettings}>
              Save All Settings
            </button>
            <button className="reset-btn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button className="chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
