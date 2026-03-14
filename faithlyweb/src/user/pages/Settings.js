import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import svgPaths from '../../imports/svg-icons';
import '../styles/Settings.css';
import Sidebar from '../components/Sidebar';
import VerifyEmailModal from '../components/VerifyEmail';
import VerificationModal from '../components/OfficerVerification';

import API from '../../utils/api';

/* ─── Community options ──────────────────────────────────────────────── */
const COMMUNITIES = {
  Kalinga:            ['Tabuk','Zapote','Bliss','Libanon','Batong Buhay','Balatoc','Lat-nog'],
  Isabela:            ['Santiago City'],
  Abra:               ['Lamao','Lingey','Cabaruyan','Ducligan','Gangal','Bila-Bila','Naguillian','Ud-udiao','Villa Conchita','Ay-yeng Manabo','Dao-angan','Kilong-olao','Bao-yan','Amti','Danac','Bengued','Sappaac','Saccaang'],
  Benguet:            ['Baguio'],
  Rizal:              ['Montalban'],
  NCR:                ['Valenzuela City','Tandang Sora, Quezon City','COA, Quezon City','Payatas, Quezon City','Malaria, Caloocan'],
  Bulacan:            ['Meycauayan City','Camalig','San Jose Del Monte'],
  Tarlac:             ['Pacpaco, San Manuel','Victoria'],
  'Nueva Ecija':      ['Bambanaba, Cuyapo'],
  Pangasinan:         ['Dagupan','Mangatarem','Laoak Langka','Orbiztondo','Malasiqui, Bolaoit','Taloyan','Binmaley','San Carlos','Manaoag','Pozorrubio','Alcala'],
  'Agusan Del Norte': ['Butuan City','RTR','Jabonga, Bangonay','Kasiklan','San Mateo','Fatima Kim.13','Bayugan','Ibuan','Balubo'],
  Cebu:               ['Mandaue','Liloan','Calero','Compostela'],
  'Surigao Del Norte':['Alegria','Bonifacio','Matin-ao','Ipil'],
  'Surigao Del Sur':  ['Kinabigtasan, Tago'],
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, requestEmailChange, verifyEmailChange } = useAuth();

  /* ── Personal Info ───────────────────────────────────────────────────── */
  const [isEditing,     setIsEditing]     = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [formError,     setFormError]     = useState('');
  const [photoPreview,  setPhotoPreview]  = useState(null);

  const [editForm, setEditForm] = useState({
    fullName:  profile?.fullName  || '',
    email:     user?.email        || '',
    phone:     profile?.phone     || '',
    community: profile?.branch    || profile?.community || '',
    photoFile: null,
  });

  /* ── Email OTP ───────────────────────────────────────────────────────── */
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  /* ── Officer Verification ────────────────────────────────────────────── */
  const [verificationStatus,  setVerificationStatus]  = useState(null);
  const [showVerifyModal,     setShowVerifyModal]      = useState(false);

  /* ── Other settings ──────────────────────────────────────────────────── */
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications,   setSmsNotifications]   = useState(false);
  const [twoFactorAuth,      setTwoFactorAuth]       = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    loanUpdates: true, paymentReminders: true, upcomingServices: true, churchAnnouncements: true,
  });
  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('GMT+8 Manila');

  /* ── Fetch verification status on mount ──────────────────────────────── */
  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API}/api/verification/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data  = await res.json();
        if (res.ok && data.success) setVerificationStatus(data.verificationStatus);
        else setVerificationStatus('unverified');
      } catch {
        setVerificationStatus('unverified');
      }
    };
    fetchVerification();
  }, []);

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
        phone:    editForm.phone.trim(),
        branch:   editForm.community,
        photoUrl: uploadedPhotoUrl || profile?.photoUrl,
      });
      if (!result.success) { setFormError(result.message || 'Failed to update profile.'); return; }
      setIsEditing(false);
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

  const handleResendEmailOtp  = async () => await requestEmailChange(pendingEmail);
  const handleCancelEmailOtp  = () => { setShowEmailOtp(false); setPendingEmail(''); setIsSaving(false); };

  const handleCancelEdit = () => {
    setEditForm({ fullName: profile?.fullName || '', email: user?.email || '', phone: profile?.phone || '', community: profile?.branch || profile?.community || '', photoFile: null });
    setPhotoPreview(null);
    setFormError('');
    setIsEditing(false);
  };

  const handlePreferenceChange = (pref) =>
    setNotificationPreferences(prev => ({ ...prev, [pref]: !prev[pref] }));

  const handleSaveSettings = () => alert('Settings saved successfully!');
  const handleReset = () => {
    setEmailNotifications(true); setSmsNotifications(false); setTwoFactorAuth(false);
    setNotificationPreferences({ loanUpdates: true, paymentReminders: true, upcomingServices: true, churchAnnouncements: true });
    setLanguage('English'); setTimezone('GMT+8 Manila');
  };

  /* Re-fetch verification after modal closes */
  const handleVerifyModalClose = async () => {
    setShowVerifyModal(false);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/verification/status`, { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (res.ok && data.success) setVerificationStatus(data.verificationStatus);
    } catch {}
  };

  /* ── Derived display values ──────────────────────────────────────────── */
  const displayName      = profile?.fullName || 'Member';
  const displayEmail     = user?.email       || 'member@puac.org';
  // const displayCommunity = profile?.branch   || profile?.community || '';
  const avatarSrc        = photoPreview || profile?.photoUrl || null;

  const accountCreated = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'February 1, 2026';

  const dateOfBirthRaw = profile?.birthday || profile?.dateOfBirth;
  const dateOfBirth    = dateOfBirthRaw
    ? (() => { try { return new Date(dateOfBirthRaw).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return dateOfBirthRaw; } })()
    : 'Not set';

  /* ── Verification badge ──────────────────────────────────────────────── */
  const renderVerificationBadge = () => {
    if (verificationStatus === null) return null;
    const STATUS = {
      verified:   { cls: 'pi-verify-pill--verified',   label: 'Officer Verified',       actionLabel: null },
      pending:    { cls: 'pi-verify-pill--pending',     label: 'Verification Pending',   actionLabel: null },
      rejected:   { cls: 'pi-verify-pill--rejected',    label: 'Verification Rejected',  actionLabel: 'Resubmit' },
      unverified: { cls: 'pi-verify-pill--unverified',  label: 'Verification Required',  actionLabel: 'Get verified' },
    };
    const { cls, label, actionLabel } = STATUS[verificationStatus] || STATUS.unverified;
    return (
      <div className={`pi-verify-pill ${cls}`}>
        <span className="pi-verify-pill__label">{label}</span>
        {actionLabel && (
          <>
            <span className="pi-verify-pill__sep" aria-hidden="true" />
            <button className="pi-verify-pill__action" onClick={() => navigate('/loans')}>
              {actionLabel}
            </button>
          </>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="home-layout">
      <Sidebar />

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

      {/* Officer Verification Modal */}
      <VerificationModal
        isOpen={showVerifyModal}
        onClose={handleVerifyModalClose}
      />

      {/* Main Content */}
      <div className="main-content">
        <div className="settings-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account preferences</p>
        </div>

        <div className="settings-container">

          {/* ── Personal Information ──────────────────────────────────── */}
          <div className="settings-section pi-section">
            <div className="pi-section-header">
              <div className="section-icon-box pi-icon-box">
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                  <path d="M10 10a3.333 3.333 0 1 0 0-6.667A3.333 3.333 0 0 0 10 10Zm0 1.667c-3.683 0-6.667 1.492-6.667 3.333v.833h13.334V15c0-1.841-2.984-3.333-6.667-3.333Z" fill="#155DFC" />
                </svg>
              </div>
              <div className="section-header-text">
                <h2 className="section-title">Personal Information</h2>
                <p className="section-subtitle">View and manage your profile details</p>
              </div>
            </div>

            {/* Blue profile card */}
            <div className="pi-card">
              {/* Avatar */}
              <div
                className="pi-card-avatar-wrapper"
                onClick={() => isEditing && document.getElementById('pi-photo-input-header').click()}
                style={{ cursor: isEditing ? 'pointer' : 'default', position: 'relative' }}
              >
                <div className="pi-card-avatar">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profile" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-5.33 0-8 2.686-8 4v1h16v-1c0-1.314-2.67-4-8-4Z" fill="white" />
                    </svg>
                  )}
                </div>
                {isEditing && (
                  <div className="pi-card-avatar-badge">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
                    </svg>
                  </div>
                )}
                <input id="pi-photo-input-header" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              </div>

              {/* Name / email / badges */}
              <div className="pi-card-info">
                <span className="pi-card-name">{displayName}</span>
                <span className="pi-card-email">{displayEmail}</span>
                <div className="pi-card-badges">
                  <span className="pi-badge pi-badge-member">Member</span>
                  <span className="pi-badge pi-badge-level">Level 1</span>
                  {/* ── Verification badge lives here ── */}
                  {renderVerificationBadge()}
                </div>
              </div>

              {/* Edit / Save buttons */}
              <div className="pi-card-actions">
                {isEditing ? (
                  <>
                    <button className="pi-btn-cancel" onClick={handleCancelEdit} disabled={isSaving}>Cancel</button>
                    <button className="pi-btn-save"   onClick={handleSaveChanges} disabled={isSaving}>
                      {isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button className="pi-btn-edit" onClick={() => setIsEditing(true)}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* ── Edit Form ─────────────────────────────────────────── */}
            {isEditing && (
              <div className="pi-edit-form">
                <p className="pi-edit-notice">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Editing your profile — changes won't be saved until you click Save Changes
                </p>

                {formError && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 20 20" style={{ flexShrink:0 }}>
                      <circle cx="10" cy="10" r="9" stroke="#F04438" strokeWidth="1.5"/>
                      <path d="M10 6v4M10 14h.01" stroke="#F04438" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize:13, color:'#B91C1C' }}>{formError}</span>
                  </div>
                )}

                <div className="pi-form-grid">
                  {/* Full Name */}
                  <div className="pi-form-field">
                    <label className="pi-form-label">FULL NAME</label>
                    <input type="text" className="pi-form-input" value={editForm.fullName} onChange={e => handleEditChange('fullName', e.target.value)} placeholder="Enter full name" />
                  </div>

                  {/* Email */}
                  <div className="pi-form-field">
                    <label className="pi-form-label">EMAIL ADDRESS</label>
                    <input type="email" className="pi-form-input" value={editForm.email} onChange={e => handleEditChange('email', e.target.value)} placeholder="Enter email" />
                    {editForm.email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase() && editForm.email ? (
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#D97706', marginTop:5 }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 20 20"><path d="M10 2L2 17h16L10 2Z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 8v4M10 14h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        Changing email requires OTP verification · You can only change your email once per day
                      </span>
                    ) : (
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#9CA3AF', marginTop:5 }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="#9CA3AF" strokeWidth="1.5"/><path d="M10 6v4M10 14h.01" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        You can only change your email once per day
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="pi-form-field">
                    <label className="pi-form-label">PHONE NUMBER</label>
                    <input type="tel" className="pi-form-input" value={editForm.phone} onChange={e => handleEditChange('phone', e.target.value)} placeholder="+63 90 000 0000" />
                  </div>

                  {/* Community */}
                  <div className="pi-form-field">
                    <label className="pi-form-label">COMMUNITY</label>
                    <select className="pi-form-input pi-form-select" value={editForm.community} onChange={e => handleEditChange('community', e.target.value)}>
                      <option value="">— Select Community —</option>
                      {Object.entries(COMMUNITIES).map(([region, places]) => (
                        <optgroup key={region} label={region}>
                          {places.map(p => <option key={p}>{p}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Date of Birth — readonly */}
                  <div className="pi-form-field">
                    <label className="pi-form-label">DATE OF BIRTH</label>
                    <div className="pi-readonly-text">
                      <svg width="15" height="15" fill="none" viewBox="0 0 20 20">
                        <rect x="2" y="3" width="16" height="15" rx="2" stroke="#9CA3AF" strokeWidth="1.4"/>
                        <path d="M6 1v3M14 1v3M2 8h16" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span>{dateOfBirth}</span>
                    </div>
                  </div>

                  {/* Account Created — readonly */}
                  <div className="pi-form-field">
                    <label className="pi-form-label">ACCOUNT CREATED</label>
                    <div className="pi-readonly-text">
                      <svg width="15" height="15" fill="none" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" stroke="#9CA3AF" strokeWidth="1.4"/>
                        <path d="M10 5v5l3 2" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span>{accountCreated}</span>
                    </div>
                  </div>

                  <div className="pi-form-field-full">
                    <span className="pi-readonly-note">These fields cannot be changed</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Notifications ─────────────────────────────────────────── */}
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
                  <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="toggle-setting">
                <div className="toggle-setting-info">
                  <h3 className="toggle-title">SMS Notifications</h3>
                  <p className="toggle-description">Receive text message alerts</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={smsNotifications} onChange={e => setSmsNotifications(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="notification-preferences">
                <h3 className="preferences-title">Notification Preferences</h3>
                <div className="checkbox-list">
                  {[['loanUpdates','Loan application updates'],['paymentReminders','Payment reminders'],['upcomingServices','Upcoming services'],['churchAnnouncements','Church announcements']].map(([key, label]) => (
                    <label key={key} className="checkbox-item">
                      <input type="checkbox" checked={notificationPreferences[key]} onChange={() => handlePreferenceChange(key)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Security ──────────────────────────────────────────────── */}
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
                <div className="setting-item-icon"><svg fill="none" viewBox="0 0 20 20"><path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" /><path d="M5.83333 9.16667V5.83333C5.83333 4.72826 6.27232 3.66846 7.05372 2.88706C7.83512 2.10565 8.89493 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88706C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" /></svg></div>
                <div className="setting-item-content"><h3 className="setting-item-title">Password</h3><p className="setting-item-description">Last changed 3 months ago</p></div>
                <button className="link-button">Change</button>
              </div>
              <div className="toggle-setting">
                <div className="setting-item-icon"><svg fill="none" viewBox="0 0 20 20"><path d="M15.8333 9.16667H4.16667C3.24619 9.16667 2.5 9.91286 2.5 10.8333V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V10.8333C17.5 9.91286 16.7538 9.16667 15.8333 9.16667Z" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" /><path d="M5.83333 9.16667V5.83333C5.83333 4.72826 6.27232 3.66846 7.05372 2.88706C7.83512 2.10565 8.89493 1.66667 10 1.66667C11.1051 1.66667 12.1649 2.10565 12.9463 2.88706C13.7277 3.66846 14.1667 4.72826 14.1667 5.83333V9.16667" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" /></svg></div>
                <div className="toggle-setting-info"><h3 className="toggle-title">Two-Factor Authentication</h3><p className="toggle-description">Add an extra layer of security</p></div>
                <label className="toggle-switch"><input type="checkbox" checked={twoFactorAuth} onChange={e => setTwoFactorAuth(e.target.checked)} /><span className="toggle-slider"></span></label>
              </div>
              <div className="setting-item">
                <div className="setting-item-icon"><svg fill="none" viewBox="0 0 20 20"><path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" /><path d="M10 5V10L13.3333 11.6667" stroke="#6B7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" /></svg></div>
                <div className="setting-item-content"><h3 className="setting-item-title">Login History</h3><p className="setting-item-description">View recent login activity</p></div>
                <button className="link-button">View</button>
              </div>
            </div>
          </div>

          {/* ── Preferences ───────────────────────────────────────────── */}
          <div className="settings-section">
            <div className="section-header">
              <div className="section-icon-box preferences-icon">
                <svg className="section-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M16.1667 12.5C16.0557 12.7513 16.0226 13.0301 16.0717 13.3006C16.1209 13.5711 16.2501 13.8203 16.4417 14.0167L16.4917 14.0667C16.6461 14.221 16.7687 14.4044 16.8527 14.606C16.9368 14.8076 16.9806 15.0233 16.9806 15.2417C16.9806 15.46 16.9368 15.6757 16.8527 15.8773C16.7687 16.0789 16.6461 16.2623 16.4917 16.4167C16.3373 16.571 16.1539 16.6936 15.9523 16.7777C15.7507 16.8618 15.535 16.9056 15.3167 16.9056C15.0983 16.9056 14.8826 16.8618 14.681 16.7777C14.4794 16.6936 14.296 16.571 14.1417 16.4167L14.0917 16.3667C13.8953 16.1751 13.6461 16.0459 13.3756 15.9967C13.1051 15.9475 12.8263 15.9807 12.575 16.0917C12.3284 16.1975 12.1184 16.3721 11.9712 16.5945C11.824 16.8169 11.7461 17.0777 11.7467 17.3442V17.5C11.7467 17.942 11.5711 18.366 11.2585 18.6785C10.946 18.9911 10.522 19.1667 10.08 19.1667C9.63803 19.1667 9.21405 18.9911 8.90149 18.6785C8.58893 18.366 8.41333 17.942 8.41333 17.5V17.425C8.40736 17.1493 8.32016 16.8814 8.16192 16.6549C8.00368 16.4284 7.78113 16.2529 7.52167 16.15C7.27039 16.039 6.99159 16.0059 6.72108 16.055C6.45057 16.1042 6.20141 16.2334 6.005 16.425L5.955 16.475C5.80064 16.6294 5.61724 16.752 5.41563 16.836C5.21403 16.9201 4.99832 16.9639 4.78 16.9639C4.56168 16.9639 4.34597 16.9201 4.14437 16.836C3.94276 16.752 3.75936 16.6294 3.605 16.475C3.45064 16.3206 3.24802 16.1372 3.16397 15.9356C3.07991 15.734 3.11609 15.5183 3.11609 15.3C3.11609 15.0817 3.15991 14.866 3.24397 14.6644C3.32802 14.4628 3.45064 14.2794 3.605 14.125L3.655 14.075C3.84659 13.8786 3.97575 13.6294 4.0249 13.3589C4.07406 13.0884 4.04089 12.8096 3.93 12.5583C3.82417 12.3117 3.64956 12.1017 3.42718 11.9545C3.2048 11.8073 2.94399 11.7294 2.67833 11.73H2.5C2.05797 11.73 1.63405 11.5544 1.32149 11.2418C1.00893 10.9293 0.833328 10.5053 0.833328 10.0633C0.833328 9.62128 1.00893 9.19731 1.32149 8.88475C1.63405 8.57219 2.05797 8.39658 2.5 8.39658H2.575C2.85072 8.39061 3.11864 8.30341 3.34513 8.14517C3.57162 7.98693 3.74717 7.76438 3.85 7.50492C3.96089 7.25364 3.99406 6.97484 3.9449 6.70433C3.89575 6.43382 3.76659 6.18466 3.575 5.98825L3.525 5.93825C3.37064 5.78389 3.24802 5.60049 3.16397 5.39888C3.07991 5.19728 3.03609 4.98157 3.03609 4.76325C3.03609 4.54493 3.07991 4.32922 3.16397 4.12762C3.24802 3.92601 3.37064 3.74261 3.525 3.58825C3.67936 3.43389 3.86276 3.31127 4.06437 3.22722C4.26597 3.14316 4.48168 3.09934 4.7 3.09934C4.91832 3.09934 5.13403 3.14316 5.33563 3.22722C5.53724 3.31127 5.72064 3.43389 5.875 3.58825L5.925 3.63825C6.12141 3.82984 6.37057 3.959 6.64108 4.00815C6.91159 4.05731 7.19039 4.02414 7.44167 3.91325H7.5C7.74656 3.80742 7.95656 3.63281 8.10377 3.41043C8.25098 3.18805 8.3289 2.92724 8.32833 2.66158V2.5C8.32833 2.05797 8.50393 1.63405 8.81649 1.32149C9.12905 1.00893 9.55303 0.833328 9.99506 0.833328C10.4371 0.833328 10.8611 1.00893 11.1736 1.32149C11.4862 1.63405 11.6618 2.05797 11.6618 2.5V2.575C11.6612 2.84066 11.7392 3.10147 11.8864 3.32385C12.0336 3.54623 12.2436 3.72084 12.4902 3.82667C12.7414 3.93756 13.0202 3.97072 13.2908 3.92157C13.5613 3.87241 13.8104 3.74325 14.0068 3.55167L14.0568 3.50167C14.2112 3.34731 14.3946 3.22469 14.5962 3.14063C14.7978 3.05658 15.0135 3.01276 15.2318 3.01276C15.4502 3.01276 15.6659 3.05658 15.8675 3.14063C16.0691 3.22469 16.2525 3.34731 16.4068 3.50167C16.5612 3.65603 16.6838 3.83943 16.7679 4.04103C16.8519 4.24264 16.8958 4.45835 16.8958 4.67667C16.8958 4.89499 16.8519 5.1107 16.7679 5.3123C16.6838 5.51391 16.5612 5.69731 16.4068 5.85167L16.3568 5.90167C16.1653 6.09808 16.0361 6.34724 15.9869 6.61775C15.9378 6.88826 15.9709 7.16706 16.0818 7.41833V7.5C16.1877 7.74656 16.3623 7.95656 16.5847 8.10377C16.807 8.25098 17.0679 8.3289 17.3335 8.32833H17.5C17.942 8.32833 18.366 8.50393 18.6786 8.81649C18.9911 9.12905 19.1667 9.55303 19.1667 9.99506C19.1667 10.4371 18.9911 10.8611 18.6786 11.1736C18.366 11.4862 17.942 11.6618 17.5 11.6618H17.425C17.1594 11.6612 16.8986 11.7392 16.6762 11.8864C16.4538 12.0336 16.2792 12.2436 16.1733 12.49V12.5Z" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
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
                <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                  <option>English</option><option>Filipino</option><option>Spanish</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="form-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  <option>GMT+8 Manila</option><option>GMT+0 UTC</option><option>GMT-5 New York</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Payment Methods ────────────────────────────────────────── */}
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
                <div className="payment-card-icon"><svg fill="none" viewBox="0 0 32 24"><rect width="32" height="24" fill="#E5E7EB" rx="4" /><rect width="32" height="8" y="6" fill="#9CA3AF" /></svg></div>
                <div className="payment-card-content">
                  <h3 className="payment-card-number">•••• •••• •••• 4242</h3>
                  <p className="payment-card-expiry">Expires 12/2026</p>
                </div>
                <button className="link-button danger">Remove</button>
              </div>
              <button className="add-payment-btn">+ Add Payment Method</button>
            </div>
          </div>

          {/* ── Action Buttons ─────────────────────────────────────────── */}
          <div className="settings-actions">
            <button className="save-settings-btn" onClick={handleSaveSettings}>Save All Settings</button>
            <button className="reset-btn" onClick={handleReset}>Reset</button>
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