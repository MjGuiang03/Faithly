import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

import '../styles/Settings.css';
import VerifyEmailModal from '../components/VerifyEmail';
import { useTheme } from '../../context/ThemeContext';

import API from '../../utils/api';
import { CalendarDays, Circle, Edit, Mail, User, XCircle, ChevronDown, ChevronUp } from 'lucide-react';


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

  /* ── Other settings ──────────────────────────────────────────────────── */
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications,   setSmsNotifications]   = useState(false);

  /* ── Collapsible info ────────────────────────────────────────────────── */
  const [infoExpanded, setInfoExpanded] = useState(false);

  /* ── Derived role from profile ───────────────────────────────────────── */
  const isOfficer = profile?.role === 'officer';

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


  /* ── Derived display values ──────────────────────────────────────────── */
  const displayName      = profile?.fullName || 'Member';
  // const displayCommunity = profile?.branch   || profile?.community || '';
  const avatarSrc        = photoPreview || profile?.photoUrl || null;

  const accountCreatedRaw = user?.created_at || user?.createdAt;
  const accountCreated = accountCreatedRaw
    ? new Date(accountCreatedRaw).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not set';

  const dateOfBirthRaw = profile?.birthday || profile?.dateOfBirth;
  const dateOfBirth    = dateOfBirthRaw
    ? (() => { try { return new Date(dateOfBirthRaw).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return dateOfBirthRaw; } })()
    : 'Not set';


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
                    <Edit size={28} />
                  )}
                </div>
                {isEditing && (
                  <div className="user-pi-card-avatar-badge">
                    <Edit size={13} color="white" />
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
                  <span className="user-pi-badge user-pi-badge-level">
                    {isOfficer ? 'Level 2' : 'Level 1'}
                  </span>
                </div>
              </div>

              {/* Expand/Collapse chevron — right side of blue card */}
              <button
                className="user-pi-card-chevron-btn"
                onClick={() => setInfoExpanded(prev => !prev)}
                title={infoExpanded ? 'Collapse' : 'Expand'}
              >
                {infoExpanded ? <ChevronUp size={18} color="white" /> : <ChevronDown size={18} color="white" />}
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
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
                    <XCircle size={16} color="#F04438" />
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
                        <Edit size={12} color="#D97706" />
                        Changing email requires OTP verification · You can only change your email once per day
                      </span>
                    ) : (
                      <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#9CA3AF', marginTop:5 }}>
                        <Mail size={12} color="#9CA3AF" />
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
                      <CalendarDays size={15} color="#9CA3AF" />
                      <span>{dateOfBirth}</span>
                    </div>
                  </div>

                  {/* Account Created — readonly */}
                  <div className="user-pi-form-field">
                    <label className="user-pi-form-label">ACCOUNT CREATED</label>
                    <div className="user-pi-readonly-text">
                      <Circle size={15} color="#9CA3AF" />
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
              <div className="user-settings-icon-box" style={{ background: '#f3e8ff' }}>
                <User className="user-settings-section-icon" size={20} color="#8B5CF6" />
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
                <User className="user-settings-section-icon" size={20} color="#155DFC" />
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
    </>
  );
}