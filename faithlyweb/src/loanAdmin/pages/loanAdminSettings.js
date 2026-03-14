import { useState } from 'react';
import LoanAdminSidebar from './loanAdminSidebar';
import svgPaths from "../../imports/svg-icons";
import '../styles/loanAdminSettings.css';

export default function LoanAdminSettings() {
    const [churchName, setChurchName] = useState('Church of Grace');
    const [defaultCurrency, setDefaultCurrency] = useState('Philippine Peso (₱)');
    const [timezone, setTimezone] = useState('Asia/Manila (GMT+8)');

    const [emailNotifications, setEmailNotifications] = useState(true);
    const [smsAlerts, setSmsAlerts] = useState(true);

    const [twoFactorAuth, setTwoFactorAuth] = useState(true);
    const [sessionTimeout, setSessionTimeout] = useState('30 minutes');

    const [autoApproval, setAutoApproval] = useState(false);
    const [minLoanAmount, setMinLoanAmount] = useState('500');
    const [maxLoanAmount, setMaxLoanAmount] = useState('50000');
    const [defaultInterestRate, setDefaultInterestRate] = useState('5.0');

    const [smtpServer, setSmtpServer] = useState('smtp.example.com');
    const [smtpPort, setSmtpPort] = useState('587');
    const [fromEmail, setFromEmail] = useState('noreply@churchofgrace.org');

    const handleSaveSettings = () => {
        alert('Settings saved successfully!');
    };

    const handleResetToDefault = () => {
        if (window.confirm('Are you sure you want to reset all settings to default values?')) {
            setChurchName('Church of Grace');
            setDefaultCurrency('Philippine Peso (₱)');
            setTimezone('Asia/Manila (GMT+8)');
            setEmailNotifications(true);
            setSmsAlerts(true);
            setTwoFactorAuth(true);
            setSessionTimeout('30 minutes');
            setAutoApproval(false);
            setMinLoanAmount('500');
            setMaxLoanAmount('50000');
            setDefaultInterestRate('5.0');
            setSmtpServer('smtp.example.com');
            setSmtpPort('587');
            setFromEmail('noreply@churchofgrace.org');
            alert('Settings reset to default values');
        }
    };

    return (
        <div className="loan-admin-settings-page">
            <LoanAdminSidebar />

            <div className="loan-admin-settings-content">
                {/* Header */}
                <div className="loan-admin-settings-header">
                    <h1 className="loan-admin-settings-title">Admin Settings</h1>
                    <p className="loan-admin-settings-subtitle">Configure system preferences and security</p>
                </div>

                {/* System Settings Section */}
                <div className="loan-admin-settings-section">
                    <div className="loan-admin-settings-section-header">
                        <div className="loan-admin-settings-section-icon blue">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d={svgPaths.p35168980} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.p3d26e2c0} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="loan-admin-settings-section-title">System Settings</h3>
                            <p className="loan-admin-settings-section-desc">General system configurations</p>
                        </div>
                    </div>

                    <div className="loan-admin-settings-form">
                        <div className="loan-admin-settings-form-group">
                            <label className="loan-admin-settings-label">Church Name</label>
                            <input
                                type="text"
                                className="loan-admin-settings-input"
                                value={churchName}
                                onChange={(e) => setChurchName(e.target.value)}
                            />
                        </div>

                        <div className="loan-admin-settings-form-row">
                            <div className="loan-admin-settings-form-group">
                                <label className="loan-admin-settings-label">Default Currency</label>
                                <select
                                    className="loan-admin-settings-input"
                                    value={defaultCurrency}
                                    onChange={(e) => setDefaultCurrency(e.target.value)}
                                >
                                    <option>Philippine Peso (₱)</option>
                                    <option>US Dollar ($)</option>
                                    <option>Euro (€)</option>
                                </select>
                            </div>

                            <div className="loan-admin-settings-form-group">
                                <label className="loan-admin-settings-label">Timezone</label>
                                <select
                                    className="loan-admin-settings-input"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                >
                                    <option>Asia/Manila (GMT+8)</option>
                                    <option>UTC (GMT+0)</option>
                                    <option>America/New_York (GMT-5)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification Settings Section */}
                <div className="loan-admin-settings-section">
                    <div className="loan-admin-settings-section-header">
                        <div className="loan-admin-settings-section-icon purple">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d={svgPaths.p1c3efea0} stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.p25877f40} stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="loan-admin-settings-section-title">Notification Settings</h3>
                            <p className="loan-admin-settings-section-desc">Configure admin notifications</p>
                        </div>
                    </div>

                    <div className="loan-admin-settings-form">
                        <div className="loan-admin-settings-toggle-group">
                            <div className="loan-admin-settings-toggle-item">
                                <div>
                                    <p className="loan-admin-settings-toggle-label">Email Notifications</p>
                                    <p className="loan-admin-settings-toggle-desc">Receive email alerts for important events</p>
                                </div>
                                <label className="loan-admin-settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={emailNotifications}
                                        onChange={(e) => setEmailNotifications(e.target.checked)}
                                    />
                                    <span className="loan-admin-settings-slider"></span>
                                </label>
                            </div>

                            <div className="loan-admin-settings-toggle-item">
                                <div>
                                    <p className="loan-admin-settings-toggle-label">SMS Alerts</p>
                                    <p className="loan-admin-settings-toggle-desc">Get text messages for urgent matters</p>
                                </div>
                                <label className="loan-admin-settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={smsAlerts}
                                        onChange={(e) => setSmsAlerts(e.target.checked)}
                                    />
                                    <span className="loan-admin-settings-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="loan-admin-settings-notification-events">
                            <p className="loan-admin-settings-events-title">Notification Events</p>
                            <ul className="loan-admin-settings-events-list">
                                <li>New loan applications</li>
                                <li>Payment failures</li>
                                <li>New member registrations</li>
                                <li>Large donations (over ₱1000)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Security Settings Section */}
                <div className="loan-admin-settings-section">
                    <div className="loan-admin-settings-section-header">
                        <div className="loan-admin-settings-section-icon green">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d={svgPaths.ped54800} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.p3b27f100} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="loan-admin-settings-section-title">Security Settings</h3>
                            <p className="loan-admin-settings-section-desc">Manage security and access control</p>
                        </div>
                    </div>

                    <div className="loan-admin-settings-form">
                        <div className="loan-admin-settings-toggle-group">
                            <div className="loan-admin-settings-toggle-item">
                                <div>
                                    <p className="loan-admin-settings-toggle-label">Two-Factor Authentication</p>
                                    <p className="loan-admin-settings-toggle-desc">Require 2FA for extra security</p>
                                </div>
                                <label className="loan-admin-settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={twoFactorAuth}
                                        onChange={(e) => setTwoFactorAuth(e.target.checked)}
                                    />
                                    <span className="loan-admin-settings-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="loan-admin-settings-security-item">
                            <div className="loan-admin-settings-security-header">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d={svgPaths.p15fea100} stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                    <path d={svgPaths.p3b5dcf80} stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                </svg>
                                <div>
                                    <p className="loan-admin-settings-security-label">Admin Password</p>
                                    <p className="loan-admin-settings-security-desc">Last changed 45 days ago</p>
                                </div>
                            </div>
                            <button className="loan-admin-settings-change-btn">Change</button>
                        </div>

                        <div className="loan-admin-settings-form-group">
                            <label className="loan-admin-settings-label">Session Timeout</label>
                            <p className="loan-admin-settings-helper">Automatically log out after inactivity</p>
                            <select
                                className="loan-admin-settings-input"
                                value={sessionTimeout}
                                onChange={(e) => setSessionTimeout(e.target.value)}
                            >
                                <option>15 minutes</option>
                                <option>30 minutes</option>
                                <option>1 hour</option>
                                <option>2 hours</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Loan Settings Section */}
                <div className="loan-admin-settings-section">
                    <div className="loan-admin-settings-section-header">
                        <div className="loan-admin-settings-section-icon orange">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d={svgPaths.p3713e00} stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.pd2076c0} stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d="M8.33333 7.5H6.66667" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d="M13.3333 10.8333H6.66667" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d="M13.3333 14.1667H6.66667" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="loan-admin-settings-section-title">Loan Settings</h3>
                            <p className="loan-admin-settings-section-desc">Configure loan approval and limits</p>
                        </div>
                    </div>

                    <div className="loan-admin-settings-form">
                        <div className="loan-admin-settings-toggle-group">
                            <div className="loan-admin-settings-toggle-item">
                                <div>
                                    <p className="loan-admin-settings-toggle-label">Auto Approval</p>
                                    <p className="loan-admin-settings-toggle-desc">Automatically approve loans under ₱500</p>
                                </div>
                                <label className="loan-admin-settings-switch">
                                    <input
                                        type="checkbox"
                                        checked={autoApproval}
                                        onChange={(e) => setAutoApproval(e.target.checked)}
                                    />
                                    <span className="loan-admin-settings-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="loan-admin-settings-form-row">
                            <div className="loan-admin-settings-form-group">
                                <label className="loan-admin-settings-label">Minimum Loan Amount</label>
                                <div className="loan-admin-settings-input-wrapper">
                                    <span className="loan-admin-settings-input-prefix">₱</span>
                                    <input
                                        type="number"
                                        className="loan-admin-settings-input with-prefix"
                                        value={minLoanAmount}
                                        onChange={(e) => setMinLoanAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="loan-admin-settings-form-group">
                                <label className="loan-admin-settings-label">Maximum Loan Amount</label>
                                <div className="loan-admin-settings-input-wrapper">
                                    <span className="loan-admin-settings-input-prefix">₱</span>
                                    <input
                                        type="number"
                                        className="loan-admin-settings-input with-prefix"
                                        value={maxLoanAmount}
                                        onChange={(e) => setMaxLoanAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="loan-admin-settings-form-group">
                            <label className="loan-admin-settings-label">Default Interest Rate (%)</label>
                            <div className="loan-admin-settings-input-wrapper">
                                <input
                                    type="number"
                                    step="0.1"
                                    className="loan-admin-settings-input with-suffix"
                                    value={defaultInterestRate}
                                    onChange={(e) => setDefaultInterestRate(e.target.value)}
                                />
                                <span className="loan-admin-settings-input-suffix">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Email Configuration Section */}
                <div className="loan-admin-settings-section">
                    <div className="loan-admin-settings-section-header">
                        <div className="loan-admin-settings-section-icon pink">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d={svgPaths.p3b998a80} stroke="#EC4899" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d={svgPaths.p2bb6700} stroke="#EC4899" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="loan-admin-settings-section-title">Email Configuration</h3>
                            <p className="loan-admin-settings-section-desc">Configure email server settings</p>
                        </div>
                    </div>

                    <div className="loan-admin-settings-form">
                        <div className="loan-admin-settings-form-group">
                            <label className="loan-admin-settings-label">SMTP Server</label>
                            <input
                                type="text"
                                className="loan-admin-settings-input"
                                placeholder="smtp.example.com"
                                value={smtpServer}
                                onChange={(e) => setSmtpServer(e.target.value)}
                            />
                        </div>

                        <div className="loan-admin-settings-form-row">
                            <div className="loan-admin-settings-form-group">
                                <label className="loan-admin-settings-label">Port</label>
                                <input
                                    type="number"
                                    className="loan-admin-settings-input"
                                    value={smtpPort}
                                    onChange={(e) => setSmtpPort(e.target.value)}
                                />
                            </div>

                            <div className="loan-admin-settings-form-group">
                                <label className="loan-admin-settings-label">From Email</label>
                                <input
                                    type="email"
                                    className="loan-admin-settings-input"
                                    value={fromEmail}
                                    onChange={(e) => setFromEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="loan-admin-settings-actions">
                    <button
                        className="loan-admin-settings-btn secondary"
                        onClick={handleResetToDefault}
                    >
                        Reset to Default
                    </button>
                    <button
                        className="loan-admin-settings-btn primary"
                        onClick={handleSaveSettings}
                    >
                        Save All Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
