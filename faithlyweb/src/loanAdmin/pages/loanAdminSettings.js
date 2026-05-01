import { useState } from 'react';
import LoanAdminSidebar from './loanAdminSidebar';

import '../styles/loanAdminSettings.css';
import { Circle } from 'lucide-react';


export default function LoanAdminSettings() {
    const [adminName, setAdminName] = useState('Loan Admin');
    const [adminEmail, setAdminEmail] = useState('loanadmin@church.com');


    const handleSaveSettings = () => {
        alert('Settings saved successfully!');
    };

    const handleResetToDefault = () => {
        if (window.confirm('Are you sure you want to reset all settings to default values?')) {
            setAdminName('Loan Admin');
            setAdminEmail('loanadmin@church.com');
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

                {/* Personal Profile Section */}
                <div className="loan-admin-settings-section">
                    <div className="loan-admin-settings-section-header">
                        <div className="loan-admin-settings-section-icon blue">
                            <Circle size={20} color="#155DFC" />
                        </div>
                        <div>
                            <h3 className="loan-admin-settings-section-title">Personal Profile</h3>
                            <p className="loan-admin-settings-section-desc">Manage your admin account details</p>
                        </div>
                    </div>

                    <div className="loan-admin-settings-form">
                        <div className="loan-admin-settings-form-group">
                            <label className="loan-admin-settings-label">Full Name</label>
                            <input
                                type="text"
                                className="loan-admin-settings-input"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                            />
                        </div>

                        <div className="loan-admin-settings-form-group">
                            <label className="loan-admin-settings-label">Email Address</label>
                            <input
                                type="email"
                                className="loan-admin-settings-input"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                            />
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
