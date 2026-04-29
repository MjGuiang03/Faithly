import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

import '../styles/Settings.css';
import VerifyEmailModal from '../components/VerifyEmail';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
import { CalendarDays, Circle, Edit, Mail, User, XCircle, ChevronDown, ChevronUp, Check, Bell, Lock, Clock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { isOfficerPosition } from '../../utils/officerPositions';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../../utils/desktopNotify';

/* ─── Community options ──────────────────────────────────────────────── */
const COMMUNITIES = {
  Kalinga: ['Tabuk', 'Zapote', 'Bliss', 'Libanon', 'Batong Buhay', 'Balatoc', 'Lat-nog'],
  Isabela: ['Santiago City'],
  Abra: ['Lamao', 'Lingey', 'Cabaruyan', 'Ducligan', 'Gangal', 'Bila-Bila', 'Naguillian', 'Ud-udiao', 'Villa Conchita', 'Ay-yeng Manabo', 'Dao-angan', 'Kilong-olao', 'Bao-yan', 'Amti', 'Danac', 'Bengued', 'Sappaac', 'Saccaang'],
  Benguet: ['Baguio'],
  Rizal: ['Montalban'],
  NCR: ['Valenzuela City', 'Tandang Sora, Quezon City', 'COA, Quezon City', 'Payatas, Quezon City', 'Malaria, Caloocan'],
  Bulacan: ['Meycauayan City', 'Camalig', 'San Jose Del Monte'],
  Tarlac: ['Pacpaco, San Manuel', 'Victoria'],
  'Nueva Ecija': ['Bambanaba, Cuyapo'],
  Pangasinan: ['Dagupan', 'Mangatarem', 'Laoak Langka', 'Orbiztondo', 'Malasiqui, Bolaoit', 'Taloyan', 'Binmaley', 'San Carlos', 'Manaoag', 'Pozorrubio', 'Alcala'],
  'Agusan Del Norte': ['Butuan City', 'RTR', 'Jabonga, Bangonay', 'Kasiklan', 'San Mateo', 'Fatima Kim.13', 'Bayugan', 'Ibuan', 'Balubo'],
  Cebu: ['Mandaue', 'Liloan', 'Calero', 'Compostela'],
  'Surigao Del Norte': ['Alegria', 'Bonifacio', 'Matin-ao', 'Ipil'],
  'Surigao Del Sur': ['Kinabigtasan, Tago'],
};

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
  const { user, profile, updateProfile, requestEmailChange, verifyEmailChange } = useAuth();
  const { theme, toggleTheme } = useTheme();

  /* ── Toast ───────────────────────────────────────────────────────────── */
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  /* ── Personal Info ───────────────────────────────────────────────────── */
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  const [editForm, setEditForm] = useState({
    fullName: profile?.fullName || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    community: profile?.branch || profile?.community || '',
    photoFile: null,
  });

  /* ── Email OTP ───────────────────────────────────────────────────────── */
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

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
  const noneSelected = ALL_NOTIF_KEYS.every(k => !notifPrefs[k]);

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

  /* ── Collapsible info ────────────────────────────────────────────────── */
  const [infoExpanded, setInfoExpanded] = useState(false);

  /* ── Derived role from profile ───────────────────────────────────────── */
  const isOfficer = isOfficerPosition(profile?.position);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditForm(prev => ({ ...prev, photoFile: file }));
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    setFormError('');
    if (!editForm.fullName.trim()) { setFormError('Full name is required.'); return; }
    setIsSaving(true);
    try {
      let uploadedPhotoUrl = null;
      if (editForm.photoFile && photoPreview) {
        const token = localStorage.getItem('token');
        const photoRes = await fetch(`${API}/api/upload-photo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photoBase64: photoPreview })
        });
        const photoData = await photoRes.json();
        if (!photoRes.ok) throw new Error(photoData.message || 'Failed to upload photo');
        uploadedPhotoUrl = photoData.photoUrl;
      }

      const emailChanged = editForm.email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase();
      if (emailChanged) {
        if (!editForm.email.includes('@') || !editForm.email.includes('.')) {
          setFormError('Please enter a valid email address.'); return;
        }
        const reqResult = await requestEmailChange(editForm.email.trim());
        if (!reqResult.success) { setFormError(reqResult.message || 'Failed to send verification email.'); return; }
        setPendingEmail(editForm.email.trim());
        setShowEmailOtp(true);
        return;
      }
      const result = await updateProfile({
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        branch: editForm.community,
        photoUrl: uploadedPhotoUrl || profile?.photoUrl,
      });
      if (!result.success) { setFormError(result.message || 'Failed to update profile.'); return; }
      setIsEditing(false);
      showToast('Profile updated successfully');
    } catch (err) {
      setFormError(err.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyEmailOtp = async (otp) => {
    const verifyResult = await verifyEmailChange(pendingEmail, otp);
    if (!verifyResult.success) return { success: false, message: verifyResult.message };
    await updateProfile({ fullName: editForm.fullName.trim(), phone: editForm.phone.trim(), branch: editForm.community });
    setShowEmailOtp(false);
    setIsEditing(false);
    return { success: true };
  };

  const handleResendEmailOtp = async () => await requestEmailChange(pendingEmail);
  const handleCancelEmailOtp = () => { setShowEmailOtp(false); setPendingEmail(''); setIsSaving(false); };

  const handleCancelEdit = () => {
    setEditForm({ fullName: profile?.fullName || '', email: user?.email || '', phone: profile?.phone || '', community: profile?.branch || profile?.community || '', photoFile: null });
    setPhotoPreview(null);
    setFormError('');
    setIsEditing(false);
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


  /* ── Derived display values ──────────────────────────────────────────── */
  const displayName = profile?.fullName || 'Member';
  const avatarSrc = photoPreview || profile?.photoUrl || null;

  const accountCreatedRaw = user?.created_at || user?.createdAt;
  const accountCreated = accountCreatedRaw
    ? new Date(accountCreatedRaw).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not set';

  const dateOfBirthRaw = profile?.birthday || profile?.dateOfBirth;
  const dateOfBirth = dateOfBirthRaw
    ? (() => { try { return new Date(dateOfBirthRaw).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return dateOfBirthRaw; } })()
    : 'Not set';

  /* ── Password strength ───────────────────────────────────────────────── */
  const strength = getPasswordStrength(passForm.new);
  const passwordsMatch = passForm.confirm.length > 0 && passForm.new === passForm.confirm;
  const passwordsMismatch = passForm.confirm.length > 0 && passForm.new !== passForm.confirm;


  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Email OTP Modal */}
      {showEmailOtp && (
        <VerifyEmailModal
          isOpen={showEmailOtp}
          onClose={handleCancelEmailOtp}
          email={pendingEmail}
          onVerify={handleVerifyEmailOtp}
          onResend={handleResendEmailOtp}
        />
      )}

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

          {/* ── Personal Information ──────────────────────────────────── */}
          <div className="user-settings-section user-pi-section">
            <div className="user-settings-section-header">
              <div className="user-settings-icon-box" style={{ background: '#E6EFFF' }}>
                <User className="user-settings-section-icon" size={20} color="#155DFC" />
              </div>
              <div className="user-settings-header-text">
                <h2 className="user-settings-section-title">Personal Information</h2>
                <p className="user-settings-section-subtitle">View and manage your profile details</p>
              </div>
            </div>

            {/* Blue profile card */}
            <div className="user-pi-card">
              {/* Avatar */}
              <div
                className="user-pi-card-avatar-wrapper"
                onClick={() => isEditing && document.getElementById('user-pi-photo-input-header').click()}
                style={{ cursor: isEditing ? 'pointer' : 'default', position: 'relative' }}
              >
                <div className="user-pi-card-avatar">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profile" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
                      {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <div className="user-pi-card-avatar-badge">
                    <Edit size={13} color="#ffffff" />
                  </div>
                )}
                <input id="user-pi-photo-input-header" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              </div>

              {/* Name / badges */}
              <div className="user-pi-card-info">
                <span className="user-pi-card-name">{displayName}</span>
                <div className="user-pi-card-badges">
                  <span className="user-pi-badge user-pi-badge-member">
                    {isOfficer ? 'Officer' : 'Member'}
                  </span>
                </div>
              </div>

              {/* Expand/Collapse chevron — right side of blue card */}
              <button
                className="user-pi-card-chevron-btn"
                onClick={() => setInfoExpanded(prev => !prev)}
                title={infoExpanded ? 'Collapse' : 'Expand'}
              >
                {infoExpanded ? <ChevronUp size={18} color="#ffffff" /> : <ChevronDown size={18} color="#ffffff" />}
              </button>

            </div>

            {/* ── Edit Form ─────────────────────────────────────────── */}
            <div className={`user-pi-collapsible ${infoExpanded ? 'user-pi-collapsible--open' : ''}`}>
              <div className="user-pi-edit-form">
                {isEditing && (
                  <p className="user-pi-edit-notice">
                    <Edit size={14} color="#155DFC" />
                    Editing your profile — changes won't be saved until you click Save
                  </p>
                )}

                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                    <XCircle size={16} color="#F04438" />
                    <span style={{ fontSize: 13, color: '#B91C1C' }}>{formError}</span>
                  </div>
                )}

                <div className="user-pi-form-grid">
                  {/* Full Name */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">Full name</label>
                    <input type="text" className="user-pi-form-input" value={editForm.fullName} onChange={e => handleEditChange('fullName', e.target.value)} placeholder="Enter full name" disabled={true} />
                  </div>

                  {/* Email */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">Email address</label>
                    <input type="email" className="user-pi-form-input" value={editForm.email} onChange={e => handleEditChange('email', e.target.value)} placeholder="Enter email" disabled={!isEditing} />
                    {editForm.email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase() && editForm.email ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#D97706', marginTop: 5 }}>
                        <Edit size={12} color="#D97706" />
                        Changing email requires OTP verification · You can only change your email once per day
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>
                        <Mail size={12} color="#9CA3AF" />
                        You can only change your email once per day
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">Phone number</label>
                    <input type="tel" className="user-pi-form-input" value={editForm.phone} onChange={e => handleEditChange('phone', e.target.value)} placeholder="+63 90 000 0000" disabled={!isEditing} />
                  </div>

                  {/* Community */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">Community</label>
                    <select className="user-pi-form-input user-pi-form-select" value={editForm.community} onChange={e => handleEditChange('community', e.target.value)} disabled={!isEditing}>
                      <option value="">— Select Community —</option>
                      {Object.entries(COMMUNITIES).map(([region, places]) => (
                        <optgroup key={region} label={region}>
                          {places.map(p => <option key={p}>{p}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Date of Birth — readonly */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">Date of birth</label>
                    <div className="user-pi-readonly-text">
                      <CalendarDays size={15} color="#9CA3AF" />
                      <span>{dateOfBirth}</span>
                    </div>
                  </div>

                  {/* Account Created — readonly */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">Account created</label>
                    <div className="user-pi-readonly-text">
                      <Clock size={15} color="#9CA3AF" />
                      <span>{accountCreated}</span>
                    </div>
                  </div>

                  <div className="user-pi-form-field-full" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="user-pi-btn-cancel-bottom" onClick={handleCancelEdit} disabled={isSaving}>Cancel</button>
                        <button className="user-pi-btn-save-bottom" onClick={handleSaveChanges} disabled={isSaving}>
                          {isSaving ? <span className="btn-spinner" /> : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <button className="user-pi-btn-edit-bottom" onClick={() => setIsEditing(true)}>
                        <Edit size={14} />
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

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

        </div>
      </div>

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