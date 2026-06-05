import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';

import '../../admin/styles/AdminSettings.css';
import '../styles/secretaryAdminSettings.css';
import { User, Lock, Bell, LogOut, Eye, EyeOff } from 'lucide-react';
import API from '../../utils/api';

/* ── Password strength helper ────────────────────────────────────────────── */
function getStrength(pw) {
    if (!pw) return { level: 0, label: '' };
    let score = 0;
    if (pw.length >= 8)             score++;
    if (/[A-Z]/.test(pw))           score++;
    if (/[0-9]/.test(pw))           score++;
    if (/[^A-Za-z0-9]/.test(pw))   score++;
    if (score <= 1) return { level: 1, label: 'Weak' };
    if (score <= 2) return { level: 2, label: 'Medium' };
    return { level: 3, label: 'Strong' };
}

function StrengthBar({ password }) {
    const { level, label } = getStrength(password);
    if (!password) return null;
    const cls = level === 1 ? 'weak' : level === 2 ? 'medium' : 'strong';
    return (
        <>
            <div className="sec-settings-strength-bar">
                <div className={`sec-settings-strength-seg ${level >= 1 ? cls : ''}`} />
                <div className={`sec-settings-strength-seg ${level >= 2 ? cls : ''}`} />
                <div className={`sec-settings-strength-seg ${level >= 3 ? cls : ''}`} />
            </div>
            <p className="sec-settings-strength-label">{label} password</p>
        </>
    );
}

/* ── Notification defaults ───────────────────────────────────────────────── */
const NOTIF_DEFAULTS = {
    newLoanApp:    true,
    disbursement:  true,
    paymentRecv:   false,
};

const NOTIF_META = [
    {
        key:   'newLoanApp',
        label: 'New Loan Application',
        desc:  'Get notified when a member submits a new loan request',
    },
    {
        key:   'disbursement',
        label: 'Loan Disbursement Approved',
        desc:  'Alert when main admin approves a disbursement',
    },
    {
        key:   'paymentRecv',
        label: 'Payment Received',
        desc:  'Alert when a member submits a loan payment',
    },
];

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function SecretaryLoanSettings() {
    const navigate = useNavigate();

    const token = localStorage.getItem('secretaryToken')
               || localStorage.getItem('adminToken')
               || localStorage.getItem('token');

    /* Profile */
    const [secName,  setSecName]  = useState('');
    const [secEmail, setSecEmail] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);

    /* Password */
    const [currentPw,  setCurrentPw]  = useState('');
    const [newPw,       setNewPw]       = useState('');
    const [confirmPw,   setConfirmPw]   = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew,     setShowNew]     = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwSaving,    setPwSaving]    = useState(false);

    /* Notification prefs (persisted to localStorage) */
    const [notifPrefs, setNotifPrefs] = useState(() => {
        try {
            const stored = localStorage.getItem('sec_notif_prefs');
            return stored ? JSON.parse(stored) : NOTIF_DEFAULTS;
        } catch {
            return NOTIF_DEFAULTS;
        }
    });
    const [notifSaving, setNotifSaving] = useState(false);

    /* ── Load profile from API ─────────────────────────────────────────── */
    useEffect(() => {
        if (!token) { navigate('/'); return; }
        fetch(`${API}/api/admin/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (data.success && data.admin) {
                    setSecName(data.admin.fullName || '');
                    setSecEmail(data.admin.email || '');
                }
            })
            .catch(() => {
                // Fallback to localStorage
                setSecName(localStorage.getItem('adminName') || '');
                setSecEmail(localStorage.getItem('adminEmail') || '');
            });
    }, [token, navigate]);

    /* ── Handlers ──────────────────────────────────────────────────────── */

    const handleSaveProfile = async () => {
        if (!secName.trim()) return toast.error('Name cannot be empty');
        setProfileSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/profile/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ fullName: secName.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminName', secName.trim());
                window.dispatchEvent(new Event('admin-profile-updated'));
                toast.success('Profile updated successfully');
            } else {
                toast.error(data.message || 'Failed to update profile');
            }
        } catch {
            toast.error('Network error. Could not save profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPw || !newPw || !confirmPw)
            return toast.error('Please fill in all password fields');
        if (newPw !== confirmPw)
            return toast.error('New passwords do not match');
        if (newPw.length < 8)
            return toast.error('New password must be at least 8 characters');
        if (getStrength(newPw).level < 2)
            return toast.error('Please choose a stronger password');

        setPwSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/profile/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Password changed successfully');
                setCurrentPw(''); setNewPw(''); setConfirmPw('');
            } else {
                toast.error(data.message || 'Failed to change password');
            }
        } catch {
            toast.error('Network error. Could not change password.');
        } finally {
            setPwSaving(false);
        }
    };

    const handleSaveNotifPrefs = () => {
        setNotifSaving(true);
        try {
            localStorage.setItem('sec_notif_prefs', JSON.stringify(notifPrefs));
            toast.success('Notification preferences saved');
        } catch {
            toast.error('Could not save preferences');
        } finally {
            setNotifSaving(false);
        }
    };

    const toggleNotif = (key) => {
        setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleLogout = () => {
        localStorage.removeItem('secAdminToken');
        localStorage.removeItem('secretaryToken');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminName');
        navigate('/');
    };

    /* ── Render ────────────────────────────────────────────────────────── */
    return (
        <div className="sec-settings-page">
            <SecretaryAdminSidebar />

            <div className="sec-settings-content">
                <div className="admin-settings-main">

                    {/* Header */}
                    <div className="admin-settings-header">
                        <h1 className="admin-settings-title">Settings</h1>
                        <p className="admin-settings-subtitle">Manage your profile, security, and notification preferences</p>
                    </div>

                    {/* ── 1. Personal Profile ──────────────────────────────── */}
                    <div className="admin-settings-section">
                        <div className="admin-settings-section-header">
                            <div className="admin-settings-section-icon admin-settings-section-icon-blue">
                                <User size={18} />
                            </div>
                            <div className="admin-settings-section-title-wrapper">
                                <h3 className="admin-settings-section-title">Personal Profile</h3>
                                <p className="admin-settings-section-description">Update your display name and email address</p>
                            </div>
                        </div>

                        <div className="admin-settings-form-row">
                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="admin-settings-form-input"
                                    placeholder="Your full name"
                                    value={secName}
                                    onChange={(e) => setSecName(e.target.value)}
                                />
                            </div>
                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="admin-settings-form-input"
                                    placeholder="you@church.com"
                                    value={secEmail}
                                    disabled
                                    title="Email cannot be changed here"
                                />
                            </div>
                        </div>

                        <div className="sec-settings-actions">
                            <button
                                className="admin-settings-save-btn"
                                onClick={handleSaveProfile}
                                disabled={profileSaving}
                            >
                                {profileSaving ? 'Saving…' : 'Save Profile'}
                            </button>
                        </div>
                    </div>

                    {/* ── 2. Change Password ───────────────────────────────── */}
                    <div className="admin-settings-section">
                        <div className="admin-settings-section-header">
                            <div className="admin-settings-section-icon admin-settings-section-icon-purple">
                                <Lock size={18} />
                            </div>
                            <div className="admin-settings-section-title-wrapper">
                                <h3 className="admin-settings-section-title">Change Password</h3>
                                <p className="admin-settings-section-description">Choose a strong password to keep your account secure</p>
                            </div>
                        </div>

                        <div className="admin-settings-form-group">
                            <label className="admin-settings-form-label">Current Password</label>
                            <div className="sec-settings-pw-wrap">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    className="admin-settings-form-input"
                                    placeholder="Enter current password"
                                    value={currentPw}
                                    onChange={(e) => setCurrentPw(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="sec-settings-pw-eye"
                                    onClick={() => setShowCurrent(v => !v)}
                                >
                                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="admin-settings-form-row">
                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">New Password</label>
                                <div className="sec-settings-pw-wrap">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        className="admin-settings-form-input"
                                        placeholder="Min. 8 characters"
                                        value={newPw}
                                        onChange={(e) => setNewPw(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="sec-settings-pw-eye"
                                        onClick={() => setShowNew(v => !v)}
                                    >
                                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <StrengthBar password={newPw} />
                            </div>

                            <div className="admin-settings-form-group">
                                <label className="admin-settings-form-label">Confirm New Password</label>
                                <div className="sec-settings-pw-wrap">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className="admin-settings-form-input"
                                        placeholder="Repeat new password"
                                        value={confirmPw}
                                        onChange={(e) => setConfirmPw(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="sec-settings-pw-eye"
                                        onClick={() => setShowConfirm(v => !v)}
                                    >
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {confirmPw && newPw !== confirmPw && (
                                    <p className="sec-settings-hint error">Passwords do not match</p>
                                )}
                                {confirmPw && newPw === confirmPw && (
                                    <p className="sec-settings-hint success">Passwords match ✓</p>
                                )}
                            </div>
                        </div>

                        <div className="sec-settings-actions">
                            <button
                                className="admin-settings-reset-btn"
                                onClick={() => { setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                            >
                                Clear
                            </button>
                            <button
                                className="admin-settings-save-btn"
                                onClick={handleChangePassword}
                                disabled={pwSaving}
                            >
                                {pwSaving ? 'Updating…' : 'Update Password'}
                            </button>
                        </div>
                    </div>

                    {/* ── 3. Notification Preferences ──────────────────────── */}
                    <div className="admin-settings-section">
                        <div className="admin-settings-section-header">
                            <div className="admin-settings-section-icon admin-settings-section-icon-green">
                                <Bell size={18} />
                            </div>
                            <div className="admin-settings-section-title-wrapper">
                                <h3 className="admin-settings-section-title">Notification Preferences</h3>
                                <p className="admin-settings-section-description">Choose which in-app alerts you want to receive</p>
                            </div>
                        </div>

                        {NOTIF_META.map(({ key, label, desc }) => (
                            <div key={key} className="sec-settings-notif-row">
                                <div className="sec-settings-notif-info">
                                    <span className="sec-settings-notif-label">{label}</span>
                                    <span className="sec-settings-notif-desc">{desc}</span>
                                </div>
                                <label className="admin-toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={notifPrefs[key]}
                                        onChange={() => toggleNotif(key)}
                                    />
                                    <span className="admin-toggle-slider" />
                                </label>
                            </div>
                        ))}

                        <div className="sec-settings-actions">
                            <button
                                className="admin-settings-save-btn"
                                onClick={handleSaveNotifPrefs}
                                disabled={notifSaving}
                            >
                                {notifSaving ? 'Saving…' : 'Save Preferences'}
                            </button>
                        </div>
                    </div>

                    {/* ── 4. Logout ─────────────────────────────────────────── */}
                    <div className="admin-settings-section sec-settings-danger-section">
                        <div className="sec-settings-danger-row">
                            <div className="admin-settings-section-header" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                                <div className="admin-settings-section-icon" style={{ backgroundColor: '#FECACA', color: '#DC2626' }}>
                                    <LogOut size={18} />
                                </div>
                                <div>
                                    <h3 className="admin-settings-section-title" style={{ color: '#991B1B' }}>Log Out</h3>
                                    <p className="admin-settings-section-description" style={{ color: '#B91C1C' }}>Securely end your session</p>
                                </div>
                            </div>
                            <button className="sec-settings-logout-btn" onClick={handleLogout}>
                                Log Out Now
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
