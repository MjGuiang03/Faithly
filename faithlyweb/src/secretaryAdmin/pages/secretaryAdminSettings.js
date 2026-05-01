import { useState } from 'react';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminSettings.css';
import { Circle } from 'lucide-react';


export default function SecretaryLoanSettings() {
    const [secName, setSecName] = useState('Secretary');
    const [secEmail, setSecEmail] = useState('secretary@church.com');

    return (
        <div className="sec-admin-settings-page">
            <SecretaryAdminSidebar />

            <div className="sec-admin-settings-content">
                {/* Header */}
                <div className="sec-admin-settings-header">
                    <h1 className="sec-admin-settings-title">Admin Settings</h1>
                    <p className="sec-admin-settings-subtitle">Configure system preferences and security</p>
                </div>

                {/* Personal Profile Section */}
                <div className="sec-admin-settings-section">
                    <div className="sec-admin-settings-section-header">
                        <div className="sec-admin-settings-section-icon blue">
                            <Circle size={20} color="#155DFC" />
                        </div>
                        <div>
                            <h3 className="sec-admin-settings-section-title">Personal Profile</h3>
                            <p className="sec-admin-settings-section-desc">Manage your admin account details</p>
                        </div>
                    </div>

                    <div className="sec-admin-settings-form">
                        <div className="sec-admin-settings-form-group">
                            <label className="sec-admin-settings-label">Full Name</label>
                            <input
                                type="text"
                                className="sec-admin-settings-input"
                                value={secName}
                                onChange={(e) => setSecName(e.target.value)}
                            />
                        </div>

                        <div className="sec-admin-settings-form-group">
                            <label className="sec-admin-settings-label">Email Address</label>
                            <input
                                type="email"
                                className="sec-admin-settings-input"
                                value={secEmail}
                                onChange={(e) => setSecEmail(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
