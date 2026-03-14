import { useState } from 'react';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminSettings.css';

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
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d="M16.1667 12.5C16.0558 12.7513 16.0222 13.0301 16.0704 13.3006C16.1186 13.5711 16.2464 13.8203 16.4367 14.0167L16.4867 14.0667C16.6378 14.2176 16.7576 14.3964 16.8391 14.593C16.9206 14.7897 16.9622 15.0002 16.9622 15.2125C16.9622 15.4248 16.9206 15.6353 16.8391 15.832C16.7576 16.0286 16.6378 16.2074 16.4867 16.3583C16.3358 16.5095 16.157 16.6293 15.9603 16.7107C15.7637 16.7922 15.5532 16.8338 15.3409 16.8338C15.1286 16.8338 14.9181 16.7922 14.7214 16.7107C14.5248 16.6293 14.346 16.5095 14.195 16.3583L14.145 16.3083C13.9487 16.118 13.6994 15.9903 13.4289 15.9421C13.1584 15.8939 12.8797 15.9274 12.6283 16.0383C12.3816 16.1445 12.1715 16.3215 12.0243 16.5477C11.877 16.7739 11.799 17.0391 11.8 17.31V17.5C11.8 17.9421 11.6244 18.366 11.3118 18.6785C10.9993 18.9911 10.5754 19.1667 10.1333 19.1667C9.69129 19.1667 9.26737 18.9911 8.95481 18.6785C8.64225 18.366 8.46665 17.9421 8.46665 17.5V17.4283C8.46115 17.1503 8.37358 16.88 8.21452 16.6518C8.05545 16.4236 7.83204 16.2477 7.57165 16.1467C7.32033 16.0357 7.0415 16.0022 6.77102 16.0504C6.50054 16.0986 6.25132 16.2264 6.05498 16.4167L6.00498 16.4667C5.85405 16.6178 5.67523 16.7376 5.47858 16.8191C5.28192 16.9005 5.07142 16.9422 4.85915 16.9422C4.64687 16.9422 4.43638 16.9005 4.23972 16.8191C4.04306 16.7376 3.86425 16.6178 3.71331 16.4667C3.56221 16.3157 3.44243 16.1369 3.36095 15.9403C3.27947 15.7436 3.23786 15.5331 3.23786 15.3208C3.23786 15.1086 3.27947 14.8981 3.36095 14.7014C3.44243 14.5048 3.56221 14.326 3.71331 14.175L3.76331 14.125C3.95366 13.9287 4.08137 13.6794 4.12958 13.4089C4.17779 13.1385 4.14428 12.8597 4.03331 12.6083C3.92715 12.3617 3.75009 12.1516 3.5239 12.0043C3.2977 11.857 3.03247 11.779 2.76165 11.78H2.56665C2.12462 11.78 1.7007 11.6044 1.38814 11.2919C1.07558 10.9793 0.899979 10.5554 0.899979 10.1133C0.899979 9.67131 1.07558 9.24739 1.38814 8.93483C1.7007 8.62227 2.12462 8.44667 2.56665 8.44667H2.63831C2.91635 8.44117 3.18664 8.3536 3.41483 8.19453C3.64302 8.03547 3.81892 7.81206 3.91998 7.55167C4.03095 7.30035 4.06446 7.02152 4.01625 6.75104C3.96804 6.48056 3.84033 6.23134 3.64998 6.035L3.59998 5.985C3.44888 5.83407 3.3291 5.65525 3.24762 5.45859C3.16614 5.26194 3.12453 5.05144 3.12453 4.83917C3.12453 4.62689 3.16614 4.4164 3.24762 4.21974C3.3291 4.02308 3.44888 3.84427 3.59998 3.69333C3.75092 3.54224 3.92973 3.42245 4.12639 3.34097C4.32305 3.25949 4.53355 3.21788 4.74582 3.21788C4.9581 3.21788 5.16859 3.25949 5.36525 3.34097C5.56191 3.42245 5.74072 3.54224 5.89165 3.69333L5.94165 3.74333C6.13799 3.93368 6.38721 4.06139 6.65769 4.1096C6.92817 4.15781 7.207 4.1243 7.45831 4.01333H7.56665C7.81324 3.90717 8.02334 3.73011 8.17064 3.50392C8.31793 3.27772 8.39594 3.01249 8.39498 2.74167V2.54667C8.39498 2.10464 8.57058 1.68072 8.88314 1.36816C9.1957 1.0556 9.61962 0.880005 10.0617 0.880005C10.5037 0.880005 10.9276 1.0556 11.2402 1.36816C11.5527 1.68072 11.7283 2.10464 11.7283 2.54667V2.61833C11.7273 2.88915 11.8053 3.15438 11.9526 3.38058C12.0999 3.60677 12.31 3.78383 12.5567 3.89H12.665C12.9163 4.00097 13.1951 4.03448 13.4656 3.98627C13.7361 3.93806 13.9853 3.81035 14.1817 3.62L14.2317 3.57C14.3826 3.41891 14.5614 3.29912 14.758 3.21764C14.9547 3.13616 15.1652 3.09455 15.3775 3.09455C15.5897 3.09455 15.8002 3.13616 15.9969 3.21764C16.1935 3.29912 16.3724 3.41891 16.5233 3.57C16.6744 3.72094 16.7942 3.89975 16.8757 4.09641C16.9571 4.29307 16.9987 4.50356 16.9987 4.71584C16.9987 4.92811 16.9571 5.13861 16.8757 5.33527C16.7942 5.53193 16.6744 5.71074 16.5233 5.86167L16.4733 5.91167C16.283 6.10801 16.1553 6.35723 16.1071 6.62771C16.0588 6.89819 16.0923 7.17702 16.2033 7.42833V7.53667C16.3095 7.78326 16.4866 7.99336 16.7128 8.14065C16.9389 8.28795 17.2042 8.36596 17.475 8.365H17.67C18.112 8.365 18.5359 8.5406 18.8485 8.85316C19.1611 9.16572 19.3367 9.58964 19.3367 10.0317C19.3367 10.4737 19.1611 10.8976 18.8485 11.2102C18.5359 11.5227 18.112 11.6983 17.67 11.6983H17.5983C17.3275 11.6973 17.0622 11.7753 16.836 11.9226C16.6098 12.0699 16.4328 12.28 16.3267 12.5267V12.5Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
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
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5789 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42114 18.2537 9.16816 18.1079C8.91517 17.9622 8.70486 17.7526 8.55835 17.5" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
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
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 1.66667L3.33333 5L10 8.33333L16.6667 5L10 1.66667Z" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d="M3.33333 13.3333L10 16.6667L16.6667 13.3333" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                <path d="M3.33333 9.16667L10 12.5L16.6667 9.16667" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                            </svg>
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
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M12.6667 7.33333H3.33333C2.59695 7.33333 2 7.93029 2 8.66667V13.3333C2 14.0697 2.59695 14.6667 3.33333 14.6667H12.6667C13.403 14.6667 14 14.0697 14 13.3333V8.66667C14 7.93029 13.403 7.33333 12.6667 7.33333Z" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                    <path d="M4.66667 7.33333V4.66667C4.66667 3.78261 5.01786 2.93477 5.64298 2.30964C6.2681 1.68452 7.11595 1.33333 8 1.33333C8.88406 1.33333 9.7319 1.68452 10.357 2.30964C10.9821 2.93477 11.3333 3.78261 11.3333 4.66667V7.33333" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                </svg>
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
