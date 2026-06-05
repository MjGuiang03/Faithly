/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import { useTheme } from '../../context/ThemeContext';
import API from '../../utils/api';

import '../../admin/styles/AdminSettings.css';
import { User, Moon, Lock, Bell, LogOut } from 'lucide-react';

export default function LoanAdminSettings() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [adminName, setAdminName] = useState(localStorage.getItem('adminName') || 'Loan Admin');
    const [adminEmail, setAdminEmail] = useState(localStorage.getItem('adminEmail') || 'loanadmin@church.com');

    // Security
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Notification prefs (local state)
    const [notifNewLoan, setNotifNewLoan] = useState(true);
    const [notifPayment, setNotifPayment] = useState(true);
    const [notifDelinquent, setNotifDelinquent] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/');
            return;
        }

        // Fetch profile details
        fetch(`${API}/api/admin/profile/me`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setAdminName(data.admin.fullName);
                setAdminEmail(data.admin.email);
                localStorage.setItem('adminName', data.admin.fullName);
                window.dispatchEvent(new Event('storage'));
            }
        })
        .catch(err => console.error(err));

        // Fetch global notification settings
        fetch(`${API}/api/admin/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.settings) {
                setNotifNewLoan(data.settings.notifNewLoan ?? true);
                setNotifPayment(data.settings.notifPayment ?? true);
                setNotifDelinquent(data.settings.notifDelinquent ?? true);
            }
        })
        .catch(err => console.error(err));
    }, [navigate]);

    const handleSaveProfile = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/profile/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ fullName: adminName })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminName', adminName);
                toast.success('Profile updated successfully');
                window.dispatchEvent(new Event('storage'));
            } else {
                toast.error(data.message || 'Failed to update profile');
            }
        } catch (err) {
            toast.error('Network error');
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            toast.error('Password must contain an uppercase letter');
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            toast.error('Password must contain a number');
            return;
        }
        if (!/[^A-Za-z0-9]/.test(newPassword)) {
            toast.error('Password must contain a symbol');
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/profile/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(data.message || 'Failed to update password');
            }
        } catch (err) {
            toast.error('Network error');
        }
    };

    const handleToggleChange = async (key, checked, setter) => {
        setter(checked);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ [key]: checked })
            });
            const data = await res.json();
            if (!data.success) {
                toast.error('Failed to save notification preference');
                setter(!checked);
            }
        } catch (err) {
            toast.error('Network error saving preferences');
            setter(!checked);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminName');
        toast.success('Signed out successfully');
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <LoanAdminSidebar />

            <div style={{ flex: 1, overflowY: 'auto', background: '#F9FAFB', padding: '40px' }}>
                <div className="admin-settings-main">
                    {/* Header */}
                    <div className="admin-settings-header">
                        <h1 className="admin-settings-title">Loan Admin Settings</h1>
                        <p className="admin-settings-subtitle">Configure your preferences and account security</p>
                    </div>

                    {/* Personal Profile Section */}
                    <div className="admin-settings-section">
                        <div className="admin-settings-section-header">
                            <div className="admin-settings-section-icon admin-settings-section-icon-blue">
                                <User size={20} />
                            </div>
                            <div className="admin-settings-section-title-wrapper">
                                <h3 className="admin-settings-section-title">Personal Profile</h3>
                                <p className="admin-settings-section-description">Manage your admin account details</p>
                            </div>
                        </div>

                        <div className="admin-settings-form-row">
                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="admin-settings-form-input"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                />
                            </div>

                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="admin-settings-form-input"
                                    value={adminEmail}
                                    disabled
                                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>

                        <button
                            className="admin-settings-save-btn"
                            onClick={handleSaveProfile}
                        >
                            Save Changes
                        </button>
                    </div>

                    {/* Security Section */}
                    <div className="admin-settings-section">
                        <div className="admin-settings-section-header">
                            <div className="admin-settings-section-icon admin-settings-section-icon-green">
                                <Lock size={20} />
                            </div>
                            <div className="admin-settings-section-title-wrapper">
                                <h3 className="admin-settings-section-title">Security</h3>
                                <p className="admin-settings-section-description">Password and authentication settings</p>
                            </div>
                        </div>

                        <div className="admin-settings-form-group">
                            <label className="admin-settings-form-label">Current Password</label>
                            <input
                                type="password"
                                className="admin-settings-form-input"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                            />
                        </div>

                        <div className="admin-settings-form-row">
                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">New Password</label>
                                <input
                                    type="password"
                                    className="admin-settings-form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">Confirm Password</label>
                                <input
                                    type="password"
                                    className="admin-settings-form-input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <button
                            className="admin-settings-save-btn"
                            onClick={handleChangePassword}
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
                                <h3 className="admin-settings-section-title">Notification Preferences</h3>
                                <p className="admin-settings-section-description">Choose which loan events trigger alerts</p>
                            </div>
                        </div>

                        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                                <label className="admin-settings-form-label" style={{ marginBottom: '4px' }}>New Loan Applications</label>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Get notified when a member submits a new loan request.</p>
                            </div>
                            <label className="admin-toggle-switch">
                                <input type="checkbox" checked={notifNewLoan} onChange={(e) => handleToggleChange('notifNewLoan', e.target.checked, setNotifNewLoan)} />
                                <span className="admin-toggle-slider"></span>
                            </label>
                        </div>

                        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                                <label className="admin-settings-form-label" style={{ marginBottom: '4px' }}>Payment Submissions</label>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Get notified when a borrower submits a repayment.</p>
                            </div>
                            <label className="admin-toggle-switch">
                                <input type="checkbox" checked={notifPayment} onChange={(e) => handleToggleChange('notifPayment', e.target.checked, setNotifPayment)} />
                                <span className="admin-toggle-slider"></span>
                            </label>
                        </div>

                        <div className="admin-settings-form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <label className="admin-settings-form-label" style={{ marginBottom: '4px' }}>Delinquency Alerts</label>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Get notified when a borrower becomes delinquent or at risk.</p>
                            </div>
                            <label className="admin-toggle-switch">
                                <input type="checkbox" checked={notifDelinquent} onChange={(e) => handleToggleChange('notifDelinquent', e.target.checked, setNotifDelinquent)} />
                                <span className="admin-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {/* Appearance Settings Section */}
                    <div className="admin-settings-section">
                        <div className="admin-settings-section-header">
                            <div className="admin-settings-section-icon" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
                                <Moon size={20} />
                            </div>
                            <div className="admin-settings-section-title-wrapper">
                                <h3 className="admin-settings-section-title">Appearance</h3>
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
                                onClick={handleLogout} 
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontFamily: 'DM Sans, sans-serif',
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
                </div>
            </div>
        </div>
    );
}
