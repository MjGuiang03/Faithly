import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import svgPaths from '../../imports/svg-icons';
import '../styles/Settings.css';
import Sidebar from '../components/Sidebar';
import VerifyEmailModal from '../components/VerifyEmail';
import VerificationModal from '../components/OfficerVerification';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

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

  const handleSaveSettings = () => alert('Settings saved successfully!');
  const handleReset = () => {
    setEmailNotifications(true); setSmsNotifications(false);
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
      verified:   { cls: 'user-pi-verify-pill--verified',   label: 'Officer Verified',       actionLabel: null },
      pending:    { cls: 'user-pi-verify-pill--pending',     label: 'Verification Pending',   actionLabel: null },
      rejected:   { cls: 'user-pi-verify-pill--rejected',    label: 'Verification Rejected',  actionLabel: 'Resubmit' },
      unverified: { cls: 'user-pi-verify-pill--unverified',  label: 'Verification Required',  actionLabel: 'Get verified' },
    };
    const { cls, label, actionLabel } = STATUS[verificationStatus] || STATUS.unverified;
    return (
      <div className={`user-pi-verify-pill ${cls}`}>
        <span className="user-pi-verify-pill__label">{label}</span>
        {actionLabel && (
          <>
            <span className="user-pi-verify-pill__sep" aria-hidden="true" />
            <button className="user-pi-verify-pill__action" onClick={() => navigate('/loans')}>
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
    <div className="user-home-layout">
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
      <div className="user-main-content">
        <div className="user-settings-page-header">
          <h1 className="user-settings-page-title">Settings</h1>
          <p className="user-settings-page-subtitle">Manage your account preferences</p>
        </div>

        <div className="user-settings-container">

          {/* ── Personal Information ──────────────────────────────────── */}
          <div className="user-settings-section user-pi-section">
            <div className="user-settings-section-header">
              <div className="user-settings-icon-box user-pi-icon-box">
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                  <path d="M10 10a3.333 3.333 0 1 0 0-6.667A3.333 3.333 0 0 0 10 10Zm0 1.667c-3.683 0-6.667 1.492-6.667 3.333v.833h13.334V15c0-1.841-2.984-3.333-6.667-3.333Z" fill="#155DFC" />
                </svg>
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
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-5.33 0-8 2.686-8 4v1h16v-1c0-1.314-2.67-4-8-4Z" fill="white" />
                    </svg>
                  )}
                </div>
                {isEditing && (
                  <div className="user-pi-card-avatar-badge">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
                    </svg>
                  </div>
                )}
                <input id="user-pi-photo-input-header" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              </div>

              {/* Name / email / badges */}
              <div className="user-pi-card-info">
                <span className="user-pi-card-name">{displayName}</span>
                <span className="user-pi-card-email">{displayEmail}</span>
                <div className="user-pi-card-badges">
                  <span className="user-pi-badge user-pi-badge-member">
                    {verificationStatus === 'verified' ? 'Officer' : 'Member'}
                  </span>
                  <span className="user-pi-badge user-pi-badge-level">
                    {verificationStatus === 'verified' ? 'Level 2' : 'Level 1'}
                  </span>
                  {/* ── Verification badge lives here ── */}
                  {renderVerificationBadge()}
                </div>
              </div>

            </div>

            {/* ── Edit Form ─────────────────────────────────────────── */}
            <div className="user-pi-edit-form">
              {isEditing && (
                <p className="user-pi-edit-notice">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Editing your profile — changes won't be saved until you click Save
                </p>
              )}

                {formError && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 20 20" style={{ flexShrink:0 }}>
                      <circle cx="10" cy="10" r="9" stroke="#F04438" strokeWidth="1.5"/>
                      <path d="M10 6v4M10 14h.01" stroke="#F04438" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize:13, color:'#B91C1C' }}>{formError}</span>
                  </div>
                )}

                <div className="user-pi-form-grid">
                  {/* Full Name */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">FULL NAME</label>
                    <input type="text" className="user-pi-form-input" value={editForm.fullName} onChange={e => handleEditChange('fullName', e.target.value)} placeholder="Enter full name" disabled={!isEditing} />
                  </div>

                  {/* Email */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">EMAIL ADDRESS</label>
                    <input type="email" className="user-pi-form-input" value={editForm.email} onChange={e => handleEditChange('email', e.target.value)} placeholder="Enter email" disabled={!isEditing} />
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
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">PHONE NUMBER</label>
                    <input type="tel" className="user-pi-form-input" value={editForm.phone} onChange={e => handleEditChange('phone', e.target.value)} placeholder="+63 90 000 0000" disabled={!isEditing} />
                  </div>

                  {/* Community */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">COMMUNITY</label>
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
                    <label className="user-pi-form-label">DATE OF BIRTH</label>
                    <div className="user-pi-readonly-text">
                      <svg width="15" height="15" fill="none" viewBox="0 0 20 20">
                        <rect x="2" y="3" width="16" height="15" rx="2" stroke="#9CA3AF" strokeWidth="1.4"/>
                        <path d="M6 1v3M14 1v3M2 8h16" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span>{dateOfBirth}</span>
                    </div>
                  </div>

                  {/* Account Created — readonly */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">ACCOUNT CREATED</label>
                    <div className="user-pi-readonly-text">
                      <svg width="15" height="15" fill="none" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" stroke="#9CA3AF" strokeWidth="1.4"/>
                        <path d="M10 5v5l3 2" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <span>{accountCreated}</span>
                    </div>
                  </div>

                  <div className="user-pi-form-field-full" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="user-pi-btn-cancel-bottom" onClick={handleCancelEdit} disabled={isSaving}>Cancel</button>
                        <button className="user-pi-btn-save-bottom" onClick={handleSaveChanges} disabled={isSaving}>
                          {isSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <button className="user-pi-btn-edit-bottom" onClick={() => setIsEditing(true)}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
            </div>
          </div>

          {/* ── Appearance ─────────────────────────────────────────── */}
          <div className="user-settings-section">
            <div className="user-settings-section-header">
              <div className="user-settings-icon-box" style={{ background: '#f3e8ff' }}>
                <svg className="user-settings-section-icon" fill="none" viewBox="0 0 24 24" stroke="#8B5CF6" strokeWidth="2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
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
                <svg className="user-settings-section-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5789 18.2537 10.292 18.3304 10 18.3304C9.70803 18.3304 9.42117 18.2537 9.16816 18.1079C8.91515 17.9622 8.70486 17.7526 8.55835 17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <div className="user-settings-header-text">
                <h2 className="user-settings-section-title">Notifications</h2>
                <p className="user-settings-section-subtitle">Manage how you receive updates</p>
              </div>
            </div>
            <div className="user-settings-group">
              <div className="user-toggle-setting">
                <div className="user-toggle-setting-info">
                  <h3 className="user-toggle-title">Email Notifications</h3>
                  <p className="user-toggle-description">Receive updates via email</p>
                </div>
                <label className="user-toggle-switch">
                  <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} />
                  <span className="user-toggle-slider"></span>
                </label>
              </div>
              <div className="user-toggle-setting">
                <div className="user-toggle-setting-info">
                  <h3 className="user-toggle-title">SMS Notifications</h3>
                  <p className="user-toggle-description">Receive text message alerts</p>
                </div>
                <label className="user-toggle-switch">
                  <input type="checkbox" checked={smsNotifications} onChange={e => setSmsNotifications(e.target.checked)} />
                  <span className="user-toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ─────────────────────────────────────────── */}
          <div className="user-settings-actions">
            <button className="user-save-settings-btn" onClick={handleSaveSettings}>Save All Settings</button>
            <button className="user-reset-btn" onClick={handleReset}>Reset</button>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button className="user-chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}