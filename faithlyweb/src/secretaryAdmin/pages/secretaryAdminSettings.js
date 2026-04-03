import { useState } from 'react';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminSettings.css';
import { Settings } from 'lucide-react';


export default function SecretaryLoanSettings() {
    const [churchName, setChurchName] = useState('Church of Grace');
    const [defaultCurrency, setDefaultCurrency] = useState('');
    const [timezone, setTimezone] = useState('');

    const [emailNotifications, setEmailNotifications] = useState(true);
    const [smsAlerts, setSmsAlerts] = useState(true);

    const [twoFactorAuth, setTwoFactorAuth] = useState(true);
    const [sessionTimeout, setSessionTimeout] = useState('');

    return (
        <div className="sec-admin-settings-page">
            <SecretaryAdminSidebar />

            <div className="sec-admin-settings-content">
                {/* Header */}
                <div className="sec-admin-settings-header">
                    <h1 className="sec-admin-settings-title">Admin Settings</h1>
                    <p className="sec-admin-settings-subtitle">Configure system preferences and security</p>
                </div>

                {/* System Settings Section */}
                <div className="sec-admin-settings-section">
                    <div className="sec-admin-settings-section-header">
                        <div className="sec-admin-settings-section-icon blue">
                            <Settings size={20} color="#155DFC" />
                        </div>
                        <div>
                            <h3 className="sec-admin-settings-section-title">System Settings</h3>
                            <p className="sec-admin-settings-section-desc">General system configurations</p>
                        </div>
                    </div>

                    <div className="sec-admin-settings-form">
                        <div className="sec-admin-settings-form-group">
                            <label className="sec-admin-settings-label">Church Name</label>
                            <input
                                type="text"
                                className="sec-admin-settings-input"
                                value={churchName}
                                onChange={(e) => setChurchName(e.target.value)}
                            />
                        </div>

                        <div className="sec-admin-settings-form-row">
                            <div className="sec-admin-settings-form-group">
                                <label className="sec-admin-settings-label">Default Currency</label>
                                <input
                                    type="text"
                                    className="sec-admin-settings-input"
                                    placeholder="Default Currency"
                                    value={defaultCurrency}
                                    onChange={(e) => setDefaultCurrency(e.target.value)}
                                />
                            </div>

                            <div className="sec-admin-settings-form-group">
                                <label className="sec-admin-settings-label">Timezone</label>
                                <input
                                    type="text"
                                    className="sec-admin-settings-input"
                                    placeholder="Timezone"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification Settings Section */}
                <div className="sec-admin-settings-section">
                    <div className="sec-admin-settings-section-header">
                        <div className="sec-admin-settings-section-icon purple">
                            <Settings size={20} color="#7C3AED" />
                        </div>
                        <div>
                            <h3 className="sec-admin-settings-section-title">Notification Settings</h3>
                            <p className="sec-admin-settings-section-desc">Configure admin notifications</p>
                        </div>
                    </div>

                    <div className="sec-admin-settings-form">
                        <div className="sec-admin-settings-toggle-group">
                            <div className="sec-admin-settings-toggle-item">
                                <div>
                                    <p className="sec-admin-settings-toggle-label">Email Notifications</p>
                                    <p className="sec-admin-settings-toggle-desc">Receive email alerts for important events</p>
                                </div>
                                <label className="sec-admin-settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={emailNotifications}
                                        onChange={(e) => setEmailNotifications(e.target.checked)}
                                    />
                                    <span className="sec-admin-settings-slider"></span>
                                </label>
                            </div>

                            <div className="sec-admin-settings-toggle-item">
                                <div>
                                    <p className="sec-admin-settings-toggle-label">SMS Alerts</p>
                                    <p className="sec-admin-settings-toggle-desc">Get text messages for urgent matters</p>
                                </div>
                                <label className="sec-admin-settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={smsAlerts}
                                        onChange={(e) => setSmsAlerts(e.target.checked)}
                                    />
                                    <span className="sec-admin-settings-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="sec-admin-settings-notification-events">
                            <p className="sec-admin-settings-events-title">Notification Events</p>
                            <ul className="sec-admin-settings-events-list">
                                <li>New loan applications</li>
                                <li>Payment processing</li>
                                <li>New member registrations</li>
                                <li>Large donations (over ₱10,000)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Security Settings Section */}
                <div className="sec-admin-settings-section">
                    <div className="sec-admin-settings-section-header">
                        <div className="sec-admin-settings-section-icon green">
                            <Settings size={20} color="#00A63E" />
                        </div>
                        <div>
                            <h3 className="sec-admin-settings-section-title">Security Settings</h3>
                            <p className="sec-admin-settings-section-desc">Manage security and access control</p>
                        </div>
                    </div>

                    <div className="sec-admin-settings-form">
                        <div className="sec-admin-settings-toggle-group">
                            <div className="sec-admin-settings-toggle-item">
                                <div>
                                    <p className="sec-admin-settings-toggle-label">Two-Factor Authentication</p>
                                    <p className="sec-admin-settings-toggle-desc">Require 2FA for admin access</p>
                                </div>
                                <label className="sec-admin-settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={twoFactorAuth}
                                        onChange={(e) => setTwoFactorAuth(e.target.checked)}
                                    />
                                    <span className="sec-admin-settings-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="sec-admin-settings-security-item">
                            <div className="sec-admin-settings-security-header">
                                <Settings size={16} color="#6B7280" />
                                <div>
                                    <p className="sec-admin-settings-security-label">Admin Password</p>
                                    <p className="sec-admin-settings-security-desc">Last changed 45 days ago</p>
                                </div>
                            </div>
                            <button className="sec-admin-settings-change-btn">Change</button>
                        </div>

                        <div className="sec-admin-settings-form-group">
                            <label className="sec-admin-settings-label">Session Timeout</label>
                            <p className="sec-admin-settings-helper">Automatically log out after inactivity</p>
                            <input
                                type="text"
                                className="sec-admin-settings-input"
                                placeholder="Session Timeout"
                                value={sessionTimeout}
                                onChange={(e) => setSessionTimeout(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
