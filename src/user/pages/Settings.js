import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

import '../styles/Settings.css';
import VerifyEmailModal from '../components/VerifyEmail';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
import { CalendarDays, Edit, Mail, User, XCircle, ChevronDown, ChevronUp, Check, Bell, Lock, Clock, Eye, EyeOff, AlertTriangle, LogOut } from 'lucide-react';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../../utils/desktopNotify';

/* ─── Community options removed in favor of dynamic fetching ─── */

/* ─── Password strength helper ──────────────────────────────────────── */
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#F59E0B' };
  if (score === 3) return { score: 3, label: 'Good', color: '#3B82F6' };
  return { score: 4, label: 'Strong', color: '#10B981' };
}

/* ─── Toast component ───────────────────────────────────────────────── */
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`user-settings-toast user-settings-toast--${type}`}>
      {type === 'success'
        ? <Check size={15} />
        : <XCircle size={15} />}
      <span>{message}</span>
    </div>
  );
}

/* ─── Notification category groups ─────────────────────────────────── */
const NOTIF_GROUPS = [
  {
    group: 'Financial',
    items: [
      { key: 'loan', label: 'Loans' },
      { key: 'payment_pending', label: 'Payments' },
      { key: 'savings', label: 'Savings' },
    ],
  },
  {
    group: 'Community',
    items: [
      { key: 'announcement', label: 'Announcements' },
      { key: 'attendance', label: 'Attendance' },
      { key: 'donation', label: 'Donations' },
    ],
  },
];

const ALL_NOTIF_KEYS = NOTIF_GROUPS.flatMap(g => g.items.map(i => i.key));

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  /* ── Password ────────────────────────────────────────────────────────── */
  const [passForm, setPassForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /* ── Show/hide password toggles ──────────────────────────────────────── */
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [emailConfirmModal, setEmailConfirmModal] = useState({ show: false, names: '' });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  /* ── Notification prefs ──────────────────────────────────────────────── */
  const [notifPrefs, setNotifPrefs] = useState({
    loan: true,
    payment_pending: true,
    announcement: true,
    attendance: true,
    savings: true,
    donation: true
  });

  useEffect(() => {
    if (profile) {
      if (profile.emailNotifications !== undefined) setEmailNotifications(profile.emailNotifications);
      if (profile.pushNotifications !== undefined) setPushNotifications(profile.pushNotifications);
      if (profile.notifPrefs) setNotifPrefs(profile.notifPrefs);
    }
  }, [profile]);

  const allSelected = ALL_NOTIF_KEYS.every(k => notifPrefs[k]);


  const savePreferencesToBackend = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/api/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
    } catch (e) { console.error('Failed to save settings', e); }
  };

  const handleTogglePref = (key) => {
    const newVal = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(newVal);
    savePreferencesToBackend({ notifPrefs: newVal });
    showToast('Preferences saved');
  };

  const handleSelectAll = () => {
    const newVal = ALL_NOTIF_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setNotifPrefs(newVal);
    savePreferencesToBackend({ notifPrefs: newVal });
    showToast('All notifications enabled');
  };

  const handleDeselectAll = () => {
    const newVal = ALL_NOTIF_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {});
    setNotifPrefs(newVal);
    savePreferencesToBackend({ notifPrefs: newVal });
    showToast('All notifications disabled');
  };

  /* ── Email master toggle with dim ───────────────────────────────────── */
  const handleEmailToggle = (checked) => {
    if (!checked) {
      const active = ALL_NOTIF_KEYS.filter(k => notifPrefs[k]);
      if (active.length > 0) {
        const names = active.map(k => {
          const flat = NOTIF_GROUPS.flatMap(g => g.items);
          return flat.find(i => i.key === k)?.label || k;
        });
        setEmailConfirmModal({ show: true, names: names.join(', ') });
        return;
      }
    }
    setEmailNotifications(checked);
    savePreferencesToBackend({ emailNotifications: checked });
  };

  const handlePushToggle = async (checked) => {
    setPushNotifications(checked);
    if (checked) {
      const sub = await subscribeToPushNotifications();
      savePreferencesToBackend({ pushNotifications: true, pushSubscription: sub });
      showToast('Push notifications enabled');
    } else {
      await unsubscribeFromPushNotifications();
      savePreferencesToBackend({ pushNotifications: false, pushSubscription: null });
      showToast('Push notifications disabled');
    }
  };

  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!passForm.current || !passForm.new || !passForm.confirm) {
      setPassError('Please fill in all password fields.');
      return;
    }

    if (passForm.new !== passForm.confirm) {
      setPassError('New passwords do not match.');
      return;
    }

    if (passForm.new.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }

    setPassLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/user/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passForm.current,
          newPassword: passForm.new
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');

      setPassSuccess('Password updated successfully!');
      setPassForm({ current: '', new: '', confirm: '' });
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      showToast('Password updated successfully');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };


  /* ── Password strength ───────────────────────────────────────────────── */
  const strength = getPasswordStrength(passForm.new);
  const passwordsMatch = passForm.confirm.length > 0 && passForm.new === passForm.confirm;
  const passwordsMismatch = passForm.confirm.length > 0 && passForm.new !== passForm.confirm;


  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Main Content */}
      <div className="user-settings-page-wrapper">
        <div className="user-settings-page-header">
          <h1 className="user-settings-page-title">Settings</h1>
          <p className="user-settings-page-subtitle">Manage your account preferences</p>
        </div>

        <div className="user-settings-container">

          {/* ── Appearance ─────────────────────────────────────────── */}
          <div className="user-settings-section">
            <div className="user-settings-section-header">
              <div className="user-settings-icon-box" style={{ background: '#E6EFFF' }}>
                <User className="user-settings-section-icon" size={20} color="#155DFC" />
              </div>
              <div className="user-settings-header-text">
                <h2 className="user-settings-section-title">Appearance</h2>
                <p className="user-settings-section-subtitle">Customize your interface theme</p>
              </div>
            </div>
            <div className="user-settings-group">
              <div className="user-toggle-setting">
                <div className="user-toggle-setting-info">
                  <h3 className="user-toggle-title">Dark Mode</h3>
                  <p className="user-toggle-description">Switch between light and dark themes</p>
                </div>
                <label className="user-toggle-switch">
                  <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                  <span className="user-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Notifications ─────────────────────────────────────────── */}
          <div className="user-settings-section">
            <div className="user-settings-section-header">
              <div className="user-settings-icon-box user-notifications-icon">
                <Bell className="user-settings-section-icon" size={20} color="#155DFC" />
              </div>
              <div className="user-settings-header-text">
                <h2 className="user-settings-section-title">Notifications</h2>
                <p className="user-settings-section-subtitle">Manage how you receive updates</p>
              </div>
            </div>
            <div className="user-settings-group">
              <h3 className="user-settings-group-title">Communication channels</h3>

              {/* Email toggle */}
              <div className="user-toggle-setting">
                <div className="user-toggle-setting-info">
                  <h3 className="user-toggle-title">Email notifications</h3>
                  <p className="user-toggle-description">{user?.email || 'Receive updates via email'}</p>
                </div>
                <label className="user-toggle-switch">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={e => handleEmailToggle(e.target.checked)}
                  />
                  <span className="user-toggle-slider"></span>
                </label>
              </div>

              {/* Push Notifications */}
              <div className="user-toggle-setting">
                <div className="user-toggle-setting-info">
                  <h3 className="user-toggle-title">
                    Push notifications
                  </h3>
                  <p className="user-toggle-description">Browser &amp; mobile alerts</p>
                </div>
                <label className="user-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={pushNotifications} 
                    onChange={e => handlePushToggle(e.target.checked)} 
                  />
                  <span className="user-toggle-slider"></span>
                </label>
              </div>

              {/* SMS — coming soon */}
              <div className="user-toggle-setting user-toggle-setting--disabled">
                <div className="user-toggle-setting-info">
                  <h3 className="user-toggle-title">
                    SMS
                    <span className="user-coming-soon-badge">Coming soon</span>
                  </h3>
                  <p className="user-toggle-description">Text message alerts</p>
                </div>
                <label className="user-toggle-switch" style={{ opacity: 0.4, pointerEvents: 'none' }}>
                  <input type="checkbox" disabled />
                  <span className="user-toggle-slider"></span>
                </label>
              </div>

              <div className="user-settings-divider" />

              {/* Categories header + select all */}
              <div className="user-notif-categories-header">
                <div>
                  <h3 className="user-settings-group-title" style={{ marginBottom: 2 }}>Notification categories</h3>
                  <p className="user-settings-group-desc" style={{ marginBottom: 0 }}>Choose which activity you want to be notified about.</p>
                </div>
                <button
                  className="user-notif-select-all-btn"
                  onClick={allSelected ? handleDeselectAll : handleSelectAll}
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {/* Grouped pill categories */}
              <div className={`user-notif-groups-wrap ${!emailNotifications ? 'user-notif-groups-wrap--dimmed' : ''}`}>
                {NOTIF_GROUPS.map(({ group, items }) => (
                  <div key={group} className="user-notif-group">
                    <p className="user-notif-group-label">{group}</p>
                    <div className="user-notif-pills-row">
                      {items.map(({ key, label }) => (
                        <button
                          key={key}
                          className={`user-notif-pill ${notifPrefs[key] ? 'user-notif-pill--on' : ''}`}
                          onClick={() => !(!emailNotifications) && handleTogglePref(key)}
                          disabled={!emailNotifications}
                          aria-pressed={notifPrefs[key]}
                        >
                          <span className="user-notif-pill-dot" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ── Security & Password ────────────────────────────────────── */}
          <div className="user-settings-section">
            <div className="user-settings-section-header">
              <div className="user-settings-icon-box" style={{ background: '#E6EFFF' }}>
                <Lock className="user-settings-section-icon" size={20} color="#155DFC" />
              </div>
              <div className="user-settings-header-text">
                <h2 className="user-settings-section-title">Security &amp; Password</h2>
                <p className="user-settings-section-subtitle">Manage your password and account security</p>
              </div>
            </div>

            <div className="user-settings-group">
              <h3 className="user-settings-group-title">Update password</h3>

              {passError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                  <XCircle size={16} color="#F04438" />
                  <span style={{ fontSize: 13, color: '#B91C1C' }}>{passError}</span>
                </div>
              )}
              {passSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                  <Check size={16} color="#16A34A" />
                  <span style={{ fontSize: 13, color: '#16A34A' }}>{passSuccess}</span>
                </div>
              )}

              {!isChangingPassword ? (
                <button
                  className="user-pi-btn-edit-bottom"
                  onClick={() => setIsChangingPassword(true)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Lock size={14} />
                  Change password
                </button>
              ) : (
                <>
                  <div className="user-pi-form-grid" style={{ marginBottom: 16 }}>

                    {/* Current password */}
                    <div className="user-pi-form-field user-pi-form-field-full">
                      <label className="user-pi-form-label">Current password</label>
                      <div className="user-pass-input-wrap">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          className="user-pi-form-input user-pass-input"
                          value={passForm.current}
                          onChange={e => setPassForm({ ...passForm, current: e.target.value })}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="user-pass-eye-btn"
                          onClick={() => setShowCurrent(v => !v)}
                          tabIndex={-1}
                          aria-label={showCurrent ? 'Hide password' : 'Show password'}
                        >
                          {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <span className="user-pass-hint">
                        <Mail size={11} />
                        Forgot your current password? <button className="user-pass-link" type="button" onClick={() => setShowResetModal(true)}>Reset via email</button>
                      </span>
                    </div>

                    {/* New password */}
                    <div className="user-pi-form-field">
                      <label className="user-pi-form-label">New password</label>
                      <div className="user-pass-input-wrap">
                        <input
                          type={showNew ? 'text' : 'password'}
                          className="user-pi-form-input user-pass-input"
                          value={passForm.new}
                          onChange={e => setPassForm({ ...passForm, new: e.target.value })}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="user-pass-eye-btn"
                          onClick={() => setShowNew(v => !v)}
                          tabIndex={-1}
                          aria-label={showNew ? 'Hide password' : 'Show password'}
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {/* Strength indicator */}
                      {passForm.new.length > 0 && (
                        <div className="user-pass-strength">
                          <div className="user-pass-strength-bars">
                            {[1, 2, 3, 4].map(n => (
                              <div
                                key={n}
                                className="user-pass-strength-bar"
                                style={{
                                  background: n <= strength.score ? strength.color : 'var(--border)',
                                  transition: 'background 0.25s ease'
                                }}
                              />
                            ))}
                          </div>
                          <span className="user-pass-strength-label" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm new password */}
                    <div className="user-pi-form-field">
                      <label className="user-pi-form-label">Confirm new password</label>
                      <div className="user-pass-input-wrap">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          className={`user-pi-form-input user-pass-input ${passwordsMismatch ? 'user-pass-input--error' : ''} ${passwordsMatch ? 'user-pass-input--success' : ''}`}
                          value={passForm.confirm}
                          onChange={e => setPassForm({ ...passForm, confirm: e.target.value })}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="user-pass-eye-btn"
                          onClick={() => setShowConfirm(v => !v)}
                          tabIndex={-1}
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {/* Match feedback */}
                      {passwordsMatch && (
                        <span className="user-pass-match user-pass-match--ok">
                          <Check size={12} /> Passwords match
                        </span>
                      )}
                      {passwordsMismatch && (
                        <span className="user-pass-match user-pass-match--err">
                          <XCircle size={12} /> Passwords don't match
                        </span>
                      )}
                    </div>

                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="user-pi-btn-cancel-bottom"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPassForm({ current: '', new: '', confirm: '' });
                        setPassError('');
                        setPassSuccess('');
                        setShowCurrent(false);
                        setShowNew(false);
                        setShowConfirm(false);
                      }}
                      disabled={passLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="user-pi-btn-save-bottom"
                      onClick={handleUpdatePassword}
                      disabled={passLoading || passwordsMismatch}
                    >
                      {passLoading ? <span className="btn-spinner" /> : 'Update password'}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ── Sign Out ────────────────────────────────────────── */}
          <div className="user-settings-section user-settings-logout-section">
            <button
              className="user-settings-logout-btn"
              onClick={() => setShowLogoutModal(true)}
            >
              <LogOut size={18} />
              Sign out
            </button>
            <p className="user-settings-logout-hint">You will be redirected to the welcome page.</p>
          </div>

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="user-logout-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          <div className="logout-modal-content">
            <h2 className="user-logout-modal-title">Confirm Logout</h2>
            <p className="user-logout-modal-message">Are you sure you want to log out of your account?</p>
            <div className="user-logout-modal-actions">
              <button className="user-logout-modal-cancel" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="user-logout-modal-confirm" onClick={handleSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="user-logout-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          <div className="user-logout-modal-content">
            <h2 className="user-logout-modal-title">Reset Password</h2>
            <p className="user-logout-modal-message">A password reset link will be sent to your registered email address ({user?.email || 'your email'}). Please check your inbox.</p>
            <div className="user-logout-modal-actions" style={{ justifyContent: 'flex-end', marginTop: 24 }}>
              <button 
                className="user-logout-modal-cancel" 
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button 
                className="user-logout-modal-confirm" 
                style={{ background: '#155DFC', borderColor: '#155DFC' }}
                onClick={() => {
                  setShowResetModal(false);
                  showToast('Reset link sent to your email');
                }}
              >
                Send Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Disable Confirm Modal */}
      {emailConfirmModal.show && (
        <div 
          className="user-email-disable-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-disable-title"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEmailConfirmModal({ show: false, names: '' });
          }}
          ref={(el) => { if (el) el.focus(); }}
        >
          <div className="user-email-disable-modal">
            <div className="user-email-disable-header">
              <div className="user-email-disable-icon-ring">
                <AlertTriangle size={20} color="#DC2626" strokeWidth={2.5} />
              </div>
              <h2 id="email-disable-title" className="user-email-disable-title">Disable email notifications?</h2>
            </div>
            
            <div className="user-email-disable-body">
              <p className="user-email-disable-text">
                {emailConfirmModal.names 
                  ? "You'll stop receiving email alerts for these categories:"
                  : "No active categories will be affected."}
              </p>
              {emailConfirmModal.names && (
                <div className="user-email-disable-chips">
                  {emailConfirmModal.names.split(', ').map(name => (
                    <span key={name} className="user-email-disable-chip">{name}</span>
                  ))}
                </div>
              )}
            </div>

            <hr className="user-email-disable-divider" />

            <div className="user-email-disable-actions">
              <button 
                className="user-email-disable-btn-cancel" 
                onClick={() => setEmailConfirmModal({ show: false, names: '' })}
                autoFocus
              >
                Keep enabled
              </button>
              <button 
                className="user-email-disable-btn-confirm" 
                onClick={() => {
                  setEmailNotifications(false);
                  setEmailConfirmModal({ show: false, names: '' });
                }}
              >
                Yes, disable
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}