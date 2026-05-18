import { useState, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Edit, Lock, Search, Trash2, User, UserPlus, Users as UsersIcon, XCircle, X, MoreVertical, Eye, EyeOff, CreditCard, CheckCircle2 } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminMembers.css';
import React from 'react';

import API from '../../utils/api';
/* ─── query-string builder ──────────────────────────────────────────────── */
function buildQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v !== 'all' && v != null && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/* ─── Pencil (Edit) icon ────────────────────────────────────────────────── */
const IconEdit = () => (
  <Edit size={17} color="#155DFC" />
);

/* ─── Trash (Delete) icon ───────────────────────────────────────────────── */
const IconTrash = () => (
  <Trash2 size={17} color="#F04438" />
);

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT MODAL
═══════════════════════════════════════════════════════════════════════════ */
function EditModal({ member, onClose, onSave }) {
  const [form, setForm] = useState({
    fullName: member.fullName || member.name || '',
    email:    member.email    || '',
    phone:    member.phone    || '',
    branch:   member.branch   || '',
    position: member.position || 'Member',
    churchId: member.churchId || '',
    newPassword: '', // Added for editing password
  });
  const [errors, setErrors] = useState({});
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [saving,        setSaving]        = useState(false);

  const validateField = (name, value, position) => {
    let error = '';
    if (name === 'newPassword' && value) {
      if (value.length < 8) error = 'At least 8 characters';
      else if (!/[A-Z]/.test(value)) error = 'At least one uppercase letter';
      else if (!/[a-z]/.test(value)) error = 'At least one lowercase letter';
      else if (!/[0-9]/.test(value)) error = 'At least one number';
      else if (!/[^A-Za-z0-9]/.test(value)) error = 'At least one symbol';
    } else if (name === 'churchId' && position !== 'Member') {
      if (!value) error = 'Church ID is required';
      else if (!/^\d{2}-\d{2}-\d{2}$/.test(value)) error = 'Format XX-XX-XX';
      else {
        const POSITION_RANGES = {
          'Deacon': { prefix: '00-00' }, 'Local Evangelist': { prefix: '00-01' },
          'District Evangelist': { prefix: '00-02' }, 'National Evangelist': { prefix: '00-03' },
          'Assistant Priest': { prefix: '00-04' }, 'Priest': { prefix: '00-05' },
          'Elder': { prefix: '00-06' }, 'District Elder': { prefix: '00-06' },
          'Bishop': { prefix: '00-07' }, 'District Bishop': { prefix: '00-08' },
          'National Bishop': { prefix: '00-09' }, 'Apostle': { prefix: '00-10' },
        };
        const range = POSITION_RANGES[position];
        if (range) {
          const parts = value.split('-');
          const idPrefix = parts[0] + '-' + parts[1];
          if (idPrefix !== range.prefix) error = `Must start with ${range.prefix} for ${position}`;
        }
      }
    }
    return error;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'churchId') sanitized = value.replace(/[^\d-]/g, '').slice(0, 8);
    setForm(f => ({ ...f, [name]: sanitized }));

    const error = validateField(name, sanitized, name === 'position' ? sanitized : form.position);
    setErrors(prev => ({ ...prev, [name]: error }));

    if (name === 'position' && sanitized !== 'Member') {
      const cidError = validateField('churchId', form.churchId, sanitized);
      setErrors(prev => ({ ...prev, churchId: cidError }));
    }
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return; }
    if (!adminPassword.trim()) { setPasswordError('Admin password is required'); return; }

    const newErrors = {};
    if (form.newPassword) newErrors.newPassword = validateField('newPassword', form.newPassword);
    if (form.position !== 'Member') newErrors.churchId = validateField('churchId', form.churchId, form.position);
    setErrors(newErrors);

    if (Object.values(newErrors).some(err => err)) {
      return toast.error('Please fix the errors in the form');
    }

    setPasswordError('');
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res   = await fetch(`${API}/api/admin/update-member`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ originalEmail: member.email, adminPassword, ...form })
      });
      const data = await res.json();
      if (!data.success) {
        if (data.wrongPassword) { setPasswordError('Incorrect admin password'); return; }
        throw new Error(data.message || 'Update failed');
      }
      toast.success('Member updated successfully');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-members-modal-overlay" onClick={onClose}>
      <div className="admin-members-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-members-modal-header">
          <div className="admin-members-modal-header-icon admin-members-modal-icon-edit"><IconEdit /></div>
          <div className="admin-members-modal-header-text">
            <p className="admin-members-modal-title">Edit Member</p>
            <p className="admin-members-modal-subtitle">Update information for {member.fullName || member.name}</p>
          </div>
          <button className="admin-members-modal-close" onClick={onClose}>
            <X size={20} color="#6a7282" />
          </button>
        </div>

        <div className="admin-members-modal-body">
          <div className="admin-members-form-grid-2col">
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Full Name</label>
              <input className="admin-members-form-input" name="fullName" value={form.fullName} onChange={handleChange} />
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Email Address</label>
              <input className="admin-members-form-input" type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
          </div>
          <div className="admin-members-form-grid-2col">
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Phone Number</label>
              <input className="admin-members-form-input" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Community</label>
              <select className="admin-members-form-input" name="branch" value={form.branch} onChange={handleChange}>
                <optgroup label="Kalinga">
                  <option>Tabuk</option><option>Zapote</option><option>Bliss</option>
                  <option>Libanon</option><option>Batong Buhay</option><option>Balatoc</option><option>Lat-nog</option>
                </optgroup>
                <optgroup label="Isabela"><option>Santiago City</option></optgroup>
                <optgroup label="Abra">
                  <option>Lamao</option><option>Lingey</option><option>Cabaruyan</option><option>Ducligan</option>
                  <option>Gangal</option><option>Bila-Bila</option><option>Naguillian</option><option>Ud-udiao</option>
                  <option>Villa Conchita</option><option>Ay-yeng Manabo</option><option>Dao-angan</option>
                  <option>Kilong-olao</option><option>Bao-yan</option><option>Amti</option><option>Danac</option>
                  <option>Bengued</option><option>Sappaac</option><option>Saccaang</option>
                </optgroup>
                <optgroup label="Benguet"><option>Baguio</option></optgroup>
                <optgroup label="Rizal"><option>Montalban</option></optgroup>
                <optgroup label="NCR">
                  <option>Valenzuela City</option><option>Tandang Sora, Quezon City</option>
                  <option>COA, Quezon City</option><option>Payatas, Quezon City</option><option>Malaria, Caloocan</option>
                </optgroup>
                <optgroup label="Bulacan">
                  <option>Meycauayan City</option><option>Camalig</option><option>San Jose Del Monte</option>
                </optgroup>
                <optgroup label="Tarlac">
                  <option>Pacpaco, San Manuel</option><option>Victoria</option>
                </optgroup>
                <optgroup label="Nueva Ecija"><option>Bambanaba,巧Cuyapo</option></optgroup>
                <optgroup label="Pangasinan">
                  <option>Dagupan</option><option>Mangatarem</option><option>Laoak Langka</option>
                  <option>Orbiztondo</option><option>Malasiqui, Bolaoit</option><option>Taloyan</option>
                  <option>Binmaley</option><option>San Carlos</option><option>Manaoag</option>
                  <option>Pozorrubio</option><option>Alcala</option>
                </optgroup>
                <optgroup label="Agusan Del Norte">
                  <option>Butuan City</option><option>RTR</option><option>Jabonga, Bangonay</option>
                  <option>Kasiklan</option><option>San Mateo</option><option>Fatima Kim.13</option>
                  <option>Bayugan</option><option>Ibuan</option><option>Balubo</option>
                </optgroup>
                <optgroup label="Cebu">
                  <option>Mandaue</option><option>Liloan</option><option>Calero</option><option>Compostela</option>
                </optgroup>
                <optgroup label="Surigao Del Norte">
                  <option>Alegria</option><option>Bonifacio</option><option>Matin-ao</option><option>Ipil</option>
                </optgroup>
                <optgroup label="Surigao Del Sur"><option>Kinabigtasan, Tago</option></optgroup>
              </select>
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Church Position</label>
              <select className="admin-members-form-input" name="position" value={form.position} onChange={handleChange}>
                <option value="Member">Member</option>
                <option value="Deacon">Deacon</option>
                <option value="Local Evangelist">Local Evangelist</option>
                <option value="District Evangelist">District Evangelist</option>
                <option value="National Evangelist">National Evangelist</option>
                <option value="Assistant Priest">Assistant Priest</option>
                <option value="Priest">Priest</option>
                <option value="Elder">Elder</option>
                <option value="District Elder">District Elder</option>
                <option value="Bishop">Bishop</option>
                <option value="District Bishop">District Bishop</option>
                <option value="National Bishop">National Bishop</option>
                <option value="Apostle">Apostle</option>
              </select>
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Church ID</label>
              <input 
                className={`admin-members-form-input${errors.churchId ? ' admin-members-input-error' : ''}`} 
                name="churchId" 
                value={form.churchId} 
                onChange={handleChange} 
                disabled={form.position === 'Member'} 
              />
              {errors.churchId && <p className="admin-members-field-error" style={{marginTop: '4px'}}>{errors.churchId}</p>}
            </div>
          </div>
          <div className="admin-members-form-group admin-members-mb-20">
            <label className="admin-members-form-label">New Password (optional)</label>
            <input
              className={`admin-members-form-input${errors.newPassword ? ' admin-members-input-error' : ''}`}
              type="text"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Enter new password to change"
            />
            {errors.newPassword && <p className="admin-members-field-error" style={{marginTop: '4px'}}>{errors.newPassword}</p>}
          </div>
          <p className="admin-members-admin-confirm-title">Confirm Changes</p>
          <div className="admin-members-form-row admin-members-mb-0">
            <label className="admin-members-form-label">Admin Password</label>
            <div className="admin-members-password-wrapper">
              <input
                className={`admin-members-form-input${passwordError ? ' admin-members-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setPasswordError(''); }}
                placeholder="Enter your admin password"
              />
              <button className="admin-members-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <Lock size={18} color="#99A1AF" />
                ) : (
                  <XCircle size={18} color="#99A1AF" />
                )}
              </button>
            </div>
            {passwordError && <p className="admin-members-field-error">{passwordError}</p>}
          </div>
        </div>

        <div className="admin-members-modal-footer">
          <button className="admin-members-btn admin-members-btn-cancel admin-members-btn-fixed" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="admin-members-btn admin-members-btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE MODAL
═══════════════════════════════════════════════════════════════════════════ */
function DeleteModal({ member, onClose, onConfirm }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleting,      setDeleting]      = useState(false);

  const handleDelete = async () => {
    if (!adminPassword.trim()) { setPasswordError('Admin password is required'); return; }
    setPasswordError('');
    setDeleting(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res   = await fetch(`${API}/api/admin/delete-member-permanent`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ email: member.email, adminPassword })
      });
      const data = await res.json();
      if (!data.success) {
        if (data.wrongPassword) { setPasswordError('Incorrect admin password'); return; }
        throw new Error(data.message || 'Delete failed');
      }
      toast.success('Member permanently deleted');
      onConfirm();
    } catch (err) {
      toast.error(err.message || 'Failed to delete member');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-members-modal-overlay" onClick={onClose}>
      <div className="admin-members-modal admin-members-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="admin-members-modal-header">
          <div className="admin-members-modal-header-icon admin-members-modal-icon-delete"><IconTrash /></div>
          <div className="admin-members-modal-header-text">
            <p className="admin-members-modal-title">Delete Member</p>
            <p className="admin-members-modal-subtitle">This action cannot be undone</p>
          </div>
          <button className="admin-members-modal-close" onClick={onClose}>
            <X size={20} color="#6a7282" />
          </button>
        </div>

        <div className="admin-members-modal-body">
          <div className="admin-members-delete-member-card">
            <div className="admin-members-avatar">
              <User size={20} color="#155DFC" />
            </div>
            <div>
              <p className="admin-members-delete-name">{member.fullName || member.name}</p>
              <p className="admin-members-delete-email">{member.email}</p>
            </div>
          </div>
          <p className="admin-members-delete-warning">
            Are you sure you want to permanently delete this member? All associated data including loans, donations, and attendance records may be affected.
          </p>

          <div className="admin-members-password-divider">
            <span>Confirm your identity to delete</span>
          </div>
          <div className="admin-members-form-row admin-members-mb-0">
            <label className="admin-members-form-label">Admin Password</label>
            <div className="admin-members-password-wrapper">
              <input
                className={`admin-members-form-input${passwordError ? ' admin-members-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setPasswordError(''); }}
                placeholder="Enter your admin password"
              />
              <button className="admin-members-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <Lock size={18} color="#99A1AF" />
                ) : (
                  <XCircle size={18} color="#99A1AF" />
                )}
              </button>
            </div>
            {passwordError && <p className="admin-members-field-error">{passwordError}</p>}
          </div>
        </div>

        <div className="admin-members-modal-footer">
          <button className="admin-members-btn admin-members-btn-cancel admin-members-btn-fixed" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="admin-members-btn admin-members-btn-delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="btn-spinner" /> : 'Delete Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADD MEMBER MODAL
═══════════════════════════════════════════════════════════════════════════ */
function AddMemberModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', branch: '', position: 'Member', churchId: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name, value, position) => {
    let error = '';
    if (name === 'phone') {
      if (!value) error = 'Phone number is required';
      else if (!/^\d{10}$/.test(value)) error = 'Exactly 10 digits required';
      else if (!/^9/.test(value)) error = 'Must start with 9';
      else if (value.startsWith('0')) error = 'Enter 10 digits (no leading 0)';
    } else if (name === 'password') {
      if (!value) error = 'Password is required';
      else if (value.length < 8) error = 'At least 8 characters';
      else if (!/[A-Z]/.test(value)) error = 'At least one uppercase letter';
      else if (!/[a-z]/.test(value)) error = 'At least one lowercase letter';
      else if (!/[0-9]/.test(value)) error = 'At least one number';
      else if (!/[^A-Za-z0-9]/.test(value)) error = 'At least one symbol';
    } else if (name === 'churchId' && position !== 'Member') {
      if (!value) error = 'Church ID is required';
      else if (!/^\d{2}-\d{2}-\d{2}$/.test(value)) error = 'Format XX-XX-XX';
      else {
        const POSITION_RANGES = {
          'Deacon': { prefix: '00-00' }, 'Local Evangelist': { prefix: '00-01' },
          'District Evangelist': { prefix: '00-02' }, 'National Evangelist': { prefix: '00-03' },
          'Assistant Priest': { prefix: '00-04' }, 'Priest': { prefix: '00-05' },
          'Elder': { prefix: '00-06' }, 'District Elder': { prefix: '00-06' },
          'Bishop': { prefix: '00-07' }, 'District Bishop': { prefix: '00-08' },
          'National Bishop': { prefix: '00-09' }, 'Apostle': { prefix: '00-10' },
        };
        const range = POSITION_RANGES[position];
        if (range) {
          const parts = value.split('-');
          const idPrefix = parts[0] + '-' + parts[1];
          if (idPrefix !== range.prefix) error = `Must start with ${range.prefix} for ${position}`;
        }
      }
    } else if (name === 'branch') {
      if (!value) error = 'Please select a community';
    }
    return error;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'phone') sanitized = value.replace(/\D/g, '').slice(0, 10);
    if (name === 'churchId') sanitized = value.replace(/[^\d-]/g, '').slice(0, 8);

    setForm(f => ({ ...f, [name]: sanitized }));
    
    const error = validateField(name, sanitized, name === 'position' ? sanitized : form.position);
    setErrors(prev => ({ ...prev, [name]: error }));

    if (name === 'position' && sanitized !== 'Member') {
      const cidError = validateField('churchId', form.churchId, sanitized);
      setErrors(prev => ({ ...prev, churchId: cidError }));
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};
    newErrors.fullName = !form.fullName.trim() ? 'Required' : '';
    newErrors.email = !form.email.trim() ? 'Required' : '';
    newErrors.password = validateField('password', form.password);
    newErrors.phone = validateField('phone', form.phone);
    newErrors.branch = validateField('branch', form.branch);
    if (form.position !== 'Member') {
      newErrors.churchId = validateField('churchId', form.churchId, form.position);
    }
    setErrors(newErrors);

    if (Object.values(newErrors).some(err => err)) {
      return toast.error('Please fix the errors in the form');
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const payload = {
        ...form,
        phone: `+63${form.phone}`
      };
      const res = await fetch(`${API}/api/admin/create-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Registration failed');
      toast.success('Member added successfully');
      onSave();
    } catch (err) { toast.error(err.message || 'Failed to add member'); } 
    finally { setSaving(false); }
  };

  return (
    <div className="admin-members-modal-overlay" onClick={onClose}>
      <div className="admin-members-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-members-modal-header">
          <div className="admin-members-modal-header-icon admin-members-icon-blue"><UserPlus size={20} /></div>
          <div className="admin-members-modal-header-text">
            <p className="admin-members-modal-title">Add New Member</p>
            <p className="admin-members-modal-subtitle">Register a new member directly</p>
          </div>
          <button className="admin-members-modal-close" onClick={onClose}>
            <X size={20} color="#6a7282" />
          </button>
        </div>

        <div className="admin-members-modal-body">
          <div className="admin-members-form-row">
            <div className="admin-members-form-group admin-members-col-span-2">
              <label className="admin-members-form-label">Full Name</label>
              <input className="admin-members-form-input" type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="e.g. Juan De La Cruz" />
            </div>
          </div>
          <div className="admin-members-form-grid-2col">
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Email Address</label>
              <input className="admin-members-form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="juan@example.com" />
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Default Password</label>
              <div className="admin-members-password-wrapper">
                <input 
                  className={`admin-members-form-input${errors.password ? ' admin-members-input-error' : ''}`} 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  placeholder="Create a password" 
                />
                <button type="button" className="admin-members-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color="#99A1AF" /> : <Eye size={18} color="#99A1AF" />}
                </button>
              </div>
              {errors.password && <p className="admin-members-field-error" style={{marginTop: '4px'}}>{errors.password}</p>}
            </div>
          </div>
          <div className="admin-members-form-grid-2col">
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Phone Number</label>
              <input className={`admin-members-form-input${errors.phone ? ' admin-members-input-error' : ''}`} type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="9171234567" />
              {errors.phone && <p className="admin-members-field-error" style={{marginTop: '4px'}}>{errors.phone}</p>}
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Community</label>
              <select className={`admin-members-form-input${errors.branch ? ' admin-members-input-error' : ''}`} name="branch" value={form.branch} onChange={handleChange}>
                <option value="">Select your Community</option>
                <optgroup label="Kalinga">
                  <option>Tabuk</option><option>Zapote</option><option>Bliss</option>
                  <option>Libanon</option><option>Batong Buhay</option><option>Balatoc</option><option>Lat-nog</option>
                </optgroup>
                <optgroup label="Isabela"><option>Santiago City</option></optgroup>
                <optgroup label="Abra">
                  <option>Lamao</option><option>Lingey</option><option>Cabaruyan</option><option>Ducligan</option>
                  <option>Gangal</option><option>Bila-Bila</option><option>Naguillian</option><option>Ud-udiao</option>
                  <option>Villa Conchita</option><option>Ay-yeng Manabo</option><option>Dao-angan</option>
                  <option>Kilong-olao</option><option>Bao-yan</option><option>Amti</option><option>Danac</option>
                  <option>Bengued</option><option>Sappaac</option><option>Saccaang</option>
                </optgroup>
                <optgroup label="Benguet"><option>Baguio</option></optgroup>
                <optgroup label="Rizal"><option>Montalban</option></optgroup>
                <optgroup label="NCR">
                  <option>Valenzuela City</option><option>Tandang Sora, Quezon City</option>
                  <option>COA, Quezon City</option><option>Payatas, Quezon City</option><option>Malaria, Caloocan</option>
                </optgroup>
                <optgroup label="Bulacan">
                  <option>Meycauayan City</option><option>Camalig</option><option>San Jose Del Monte</option>
                </optgroup>
                <optgroup label="Tarlac">
                  <option>Pacpaco, San Manuel</option><option>Victoria</option>
                </optgroup>
                <optgroup label="Nueva Ecija"><option>Bambanaba,巧Cuyapo</option></optgroup>
                <optgroup label="Pangasinan">
                  <option>Dagupan</option><option>Mangatarem</option><option>Laoak Langka</option>
                  <option>Orbiztondo</option><option>Malasiqui, Bolaoit</option><option>Taloyan</option>
                  <option>Binmaley</option><option>San Carlos</option><option>Manaoag</option>
                  <option>Pozorrubio</option><option>Alcala</option>
                </optgroup>
                <optgroup label="Agusan Del Norte">
                  <option>Butuan City</option><option>RTR</option><option>Jabonga, Bangonay</option>
                  <option>Kasiklan</option><option>San Mateo</option><option>Fatima Kim.13</option>
                  <option>Bayugan</option><option>Ibuan</option><option>Balubo</option>
                </optgroup>
                <optgroup label="Cebu">
                  <option>Mandaue</option><option>Liloan</option><option>Calero</option><option>Compostela</option>
                </optgroup>
                <optgroup label="Surigao Del Norte">
                  <option>Alegria</option><option>Bonifacio</option><option>Matin-ao</option><option>Ipil</option>
                </optgroup>
                <optgroup label="Surigao Del Sur"><option>Kinabigtasan, Tago</option></optgroup>
              </select>
            </div>
          </div>
          <div className="admin-members-form-grid-2col">
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Position / Role</label>
              <select className="admin-members-form-input" name="position" value={form.position} onChange={handleChange}>
                <option value="Member">Member</option>
                <option value="Deacon">Deacon</option>
                <option value="Local Evangelist">Local Evangelist</option>
                <option value="District Evangelist">District Evangelist</option>
                <option value="National Evangelist">National Evangelist</option>
                <option value="Assistant Priest">Assistant Priest</option>
                <option value="Priest">Priest</option>
                <option value="Elder">Elder</option>
                <option value="District Elder">District Elder</option>
                <option value="Bishop">Bishop</option>
                <option value="District Bishop">District Bishop</option>
                <option value="National Bishop">National Bishop</option>
                <option value="Apostle">Apostle</option>
              </select>
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Church ID</label>
              <input 
                className={`admin-members-form-input${errors.churchId ? ' admin-members-input-error' : ''}`} 
                type="text" 
                name="churchId" 
                value={form.churchId} 
                onChange={handleChange} 
                placeholder="e.g. 00-00-01" 
                disabled={form.position === 'Member'}
              />
              {errors.churchId && <p className="admin-members-field-error" style={{marginTop: '4px'}}>{errors.churchId}</p>}
            </div>
          </div>
        </div>

        <div className="admin-members-modal-footer">
          <button className="admin-members-btn admin-members-btn-cancel admin-members-btn-fixed" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="admin-members-btn admin-members-btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LINK RFID MODAL
═══════════════════════════════════════════════════════════════════════════ */
function LinkRFIDModal({ member, onClose, onSave }) {
  const [rfidCode, setRfidCode] = useState('');
  const [saving, setSaving] = useState(false);
  const rfidBuffer = useRef('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Enter') {
        const code = rfidBuffer.current.trim();
        rfidBuffer.current = '';
        if (code) setRfidCode(code);
      } else if (e.key.length === 1) {
        rfidBuffer.current += e.key;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLink = async () => {
    if (!rfidCode) return toast.error('Please scan an RFID card first');
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`${API}/api/admin/update-member-rfid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: member.email, rfidCardId: rfidCode })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to link RFID card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-members-modal-overlay" onClick={onClose}>
      <div className="admin-members-modal admin-members-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="admin-members-modal-header">
          <div className="admin-members-modal-header-icon admin-members-icon-light-blue"><CreditCard size={20} /></div>
          <div className="admin-members-modal-header-text">
            <p className="admin-members-modal-title">Link RFID Card</p>
            <p className="admin-members-modal-subtitle">Assign card to {member.fullName || member.name}</p>
          </div>
          <button className="admin-members-modal-close" onClick={onClose}><X size={20} color="#6a7282" /></button>
        </div>

        <div className="admin-members-modal-body admin-members-modal-center-pad">
          {rfidCode ? (
            <div className="rfid-success-zone">
              <div className="admin-members-text-green-mb-16 admin-members-mx-auto"><CheckCircle2 size={48} /></div>
              <p className="admin-members-title-bold">Card Detected!</p>
              <p className="admin-members-code-block">{rfidCode}</p>
              <p className="admin-members-subtitle-gray">Click "Link Card" to confirm assignment.</p>
            </div>
          ) : (
            <div className="rfid-waiting-zone">
              <div className="admin-att-scanner-panel active admin-members-scanner-container">
                <div className="pulse-indicator admin-members-pulse-circle"></div>
              </div>
              <p className="admin-members-text-medium-dark">Waiting for RFID Scan...</p>
              <p className="admin-members-text-small-gray">Please tap the physical card on the reader now.</p>
            </div>
          )}
        </div>

        <div className="admin-members-modal-footer">
          <button className="admin-members-btn admin-members-btn-cancel admin-members-btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button 
            className="admin-members-btn admin-members-btn-save" 
            onClick={handleLink} 
            disabled={saving || !rfidCode}
            style={{ 
               padding: '8px 16px', borderRadius: '4px', border: 'none', 
               background: !rfidCode ? '#9CA3AF' : '#155DFC', color: 'white', cursor: !rfidCode ? 'not-allowed' : 'pointer' 
            }}
          >
            {saving ? <span className="btn-spinner" /> : 'Link Card'}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
const ITEMS_PER_PAGE = 5;

export default function AdminMembers() {
  const navigate = useNavigate();

  const [members,        setMembers]        = useState([]);
  const [stats,          setStats]          = useState({ total: 0, active: 0, inactive: 0, officers: 0 });
  const [pagination,     setPagination]     = useState({ page: 1, totalPages: 1, totalMembers: 0 });
  const [searchMembers,  setSearchMembers]  = useState('');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [currentPage,    setCurrentPage]    = useState(1);
  const [editMember,     setEditMember]     = useState(null);
  const [deleteMember,   setDeleteMember]   = useState(null);
  const [viewMember,     setViewMember]     = useState(null);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [enrollRFIDMember, setEnrollRFIDMember] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const debouncedSearchMembers  = useDebounce(searchMembers,  400);

  const getToken = () =>
    localStorage.getItem('adminToken') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token');

  useEffect(() => { if (!getToken()) navigate('/'); }, [navigate]);

  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } }).then(res => {
    if (res.status === 401 || res.status === 403) { navigate('/'); return { success: false }; }
    return res.json();
  });

  const queryParams = useMemo(() => {
    let isOfficerVal = undefined;
    let statusVal = undefined;
    let isNewVal = undefined;

    if (roleFilter === 'officer') isOfficerVal = 'true';
    else if (roleFilter === 'member') isOfficerVal = 'false';
    else if (roleFilter === 'active') statusVal = 'active';
    else if (roleFilter === 'inactive') statusVal = 'inactive';
    else if (roleFilter === 'new') isNewVal = 'true';

    return buildQuery({ search: debouncedSearchMembers.trim(), page: currentPage, limit: ITEMS_PER_PAGE, isOfficer: isOfficerVal, status: statusVal, isNew: isNewVal });
  }, [debouncedSearchMembers, currentPage, roleFilter]);

  const { data, isValidating: loadingMembers, mutate: fetchMembers } = useSWR(
    `${API}/api/admin/members?${queryParams}`,
    fetcherSingle,
    { revalidateOnFocus: false, revalidateIfStale: true }
  );

  useEffect(() => {
    if (data?.success) {
      setMembers(data.members || []);
      setStats(data.stats || {});
      setPagination(data.pagination || { page: 1, totalPages: 1, totalMembers: 0 });
    } else if (data && !data.success && data.message) {
      toast.error(data.message);
    }
  }, [data]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearchMembers, roleFilter]);


  const buildPageNumbers = (p) => {
    const { totalPages } = p;
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const curr = p.page;
    const pages = [];
    if (curr <= 4)                    pages.push(1, 2, 3, 4, 5, '…', totalPages);
    else if (curr >= totalPages - 3)  pages.push(1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else                                     pages.push(1, '…', curr - 1, curr, curr + 1, '…', totalPages);
    return pages;
  };

  return (
    <div className="admin-members-main">

      {editMember   && <EditModal   member={editMember}   onClose={() => setEditMember(null)}   onSave={()    => { setEditMember(null);   fetchMembers(); }} />}
      {deleteMember && <DeleteModal member={deleteMember} onClose={() => setDeleteMember(null)} onConfirm={() => { setDeleteMember(null); fetchMembers(); }} />}
      {showAddModal && <AddMemberModal onClose={() => setShowAddModal(false)} onSave={() => { setShowAddModal(false); fetchMembers(); }} />}
      {enrollRFIDMember && <LinkRFIDModal member={enrollRFIDMember} onClose={() => setEnrollRFIDMember(null)} onSave={() => { setEnrollRFIDMember(null); fetchMembers(); }} />}

      {viewMember   && (
        <div className="admin-members-modal-overlay" onClick={() => setViewMember(null)}>
          <div className="admin-members-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-members-modal-header">
              <div className="admin-members-modal-header-icon admin-members-icon-bg-blue"><Eye size={20} color="#155DFC" /></div>
              <div className="admin-members-modal-header-text">
                <p className="admin-members-modal-title">View Member</p>
                <p className="admin-members-modal-subtitle">Details for {viewMember.fullName || viewMember.name}</p>
              </div>
              <button className="admin-members-modal-close" onClick={() => setViewMember(null)}>
                <X size={20} color="#6a7282" />
              </button>
            </div>
            <div className="admin-members-modal-body">
               <div className="admin-members-delete-member-card">
                <div className="admin-members-avatar">
                  <User size={20} color="#155DFC" />
                </div>
                <div>
                  <p className="admin-members-delete-name">{viewMember.fullName || viewMember.name}</p>
                  <p className="admin-members-delete-email">{viewMember.email}</p>
                </div>
              </div>
              <div className="admin-members-form-grid-2col admin-members-mt-20">
                <div>
                  <p className="admin-members-form-label admin-members-label-gray">Phone</p>
                  <p className="admin-members-val-dark">{viewMember.phone || '—'}</p>
                </div>
                <div>
                  <p className="admin-members-form-label admin-members-label-gray">Community</p>
                  <p className="admin-members-val-dark">{viewMember.branch || '—'}</p>
                </div>
                <div>
                  <p className="admin-members-form-label admin-members-label-gray">Position</p>
                  <p className="admin-members-val-dark-cap">{viewMember.position || 'Member'}</p>
                </div>
                <div>
                  <p className="admin-members-form-label admin-members-label-gray">Member ID</p>
                  <p className="admin-members-val-dark">{viewMember.memberId || '—'}</p>
                </div>
                <div>
                  <p className="admin-members-form-label admin-members-label-gray">RFID Card ID</p>
                  <p className="admin-members-val-dark-mono">{viewMember.rfidCardId || 'Not Linked'}</p>
                </div>

                {(viewMember.churchId || (viewMember.position !== 'member' && viewMember.position !== 'Member')) && (
                  <div>
                    <p className="admin-members-form-label admin-members-label-gray">Church ID</p>
                    <p className="admin-members-val-dark">{viewMember.churchId || '—'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="admin-members-header-container">
        <div className="admin-members-header-left">
          <h1 className="admin-members-title">Member Management</h1>

        </div>
        <button className="admin-members-add-btn" onClick={() => setShowAddModal(true)}>
          <UserPlus size={20} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="admin-members-stats-grid">
        <div className={`admin-members-stat-card adm-clickable-card ${roleFilter === 'all' ? 'active' : ''}`} onClick={() => setRoleFilter('all')}>
          <p className="admin-members-stat-label">Total Members</p>
          <p className="admin-members-stat-value">{stats.total ?? 0}</p>
        </div>
        <div className={`admin-members-stat-card adm-clickable-card ${roleFilter === 'officer' ? 'active' : ''}`} onClick={() => setRoleFilter('officer')}>
          <p className="admin-members-stat-label">Officers</p>
          <p className="admin-members-stat-value">{stats.officers ?? 0}</p>
        </div>
        <div className={`admin-members-stat-card adm-clickable-card ${roleFilter === 'active' ? 'active' : ''}`} onClick={() => setRoleFilter('active')}>
          <p className="admin-members-stat-label">Active Members</p>
          <p className="admin-members-stat-value admin-members-stat-value-green">{stats.active ?? 0}</p>
        </div>
        <div className={`admin-members-stat-card adm-clickable-card ${roleFilter === 'inactive' ? 'active' : ''}`} onClick={() => setRoleFilter('inactive')}>
          <p className="admin-members-stat-label">Inactive Members</p>
          <p className="admin-members-stat-value admin-members-stat-value-orange">{stats.inactive ?? 0}</p>
        </div>
        <div className={`admin-members-stat-card adm-clickable-card ${roleFilter === 'new' ? 'active' : ''}`} onClick={() => setRoleFilter('new')}>
          <p className="admin-members-stat-label">New This Month</p>
          <p className="admin-members-stat-value">{stats.newThisMonth ?? 0}</p>
        </div>
      </div>



      {/* Regular Members Section */}
      <div className="admin-members-section">
        <div className="admin-members-section-header">
          <div className="admin-members-section-title-wrapper">
            <UsersIcon size={24} color="#155DFC" strokeWidth={2} />
            <h2 className="admin-members-section-title">All Members</h2>
          </div>
          <div className="admin-members-search-toolbar">
            <div className="admin-members-search-wrapper">
              <Search size={18} className="admin-members-search-icon" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchMembers}
                onChange={e => setSearchMembers(e.target.value)}
                className="admin-members-search-input"
              />
            </div>
            <select
              className="admin-members-filter-select"
              onChange={e => setRoleFilter(e.target.value)}
              value={roleFilter}
            >
              <option value="all">All Members</option>
              <option value="officer">Officers</option>
              <option value="member">Regular Members</option>
              <option value="active">Active Members</option>
              <option value="inactive">Inactive</option>
              <option value="new">New</option>
            </select>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Community</th>
                <th>Position</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingMembers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="admin-table-row-hover">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}><div className="admin-members-skeleton" /></td>
                    ))}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr><td colSpan={7} className="admin-members-empty-cell">No members found</td></tr>
              ) : (
                members.map(m => (
                  <tr key={m._id} className="admin-table-row-hover">
                    <td className="admin-members-cell-bold-dark">{m.memberId || '—'}</td>
                    <td>
                      <div className="admin-members-avatar-name admin-members-avatar-wrapper">
                        <div className="admin-members-avatar-circle admin-members-avatar-circle">{(m.fullName || m.name || 'M').charAt(0)}</div>
                        <span className="admin-members-avatar-name-text">{m.fullName || m.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-members-contact-info admin-members-flex-col">
                        <span className="admin-members-email-text">{m.email}</span>
                        <span className="admin-members-phone-text">{m.phone}</span>
                      </div>
                    </td>
                    <td className="admin-members-branch-text">{m.branch || 'Bulacan Main'}</td>
                    <td className="admin-members-position-text">{m.position || 'Member'}</td>
                    <td><span className={`ps-status-badge ${m.status?.toLowerCase() === 'active' ? 'on-track' : 'default'}`}>{m.status || 'Active'}</span></td>
                    <td className="admin-members-relative">
                      <div className="admin-members-actions-wrapper">
                        <button 
                          className="admin-members-actions-btn" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setOpenDropdownId(openDropdownId === m._id ? null : m._id); 
                          }}
                        >
                          <MoreVertical size={20} color="#6B7280" />
                        </button>
                        {openDropdownId === m._id && (
                          <div className="admin-members-actions-dropdown" onClick={(e) => e.stopPropagation()}>
                            <button className="admin-members-actions-item" onClick={() => { setOpenDropdownId(null); setViewMember(m); }}>
                              <Eye size={16} /> View
                            </button>
                            <button className="admin-members-actions-item" onClick={() => { setOpenDropdownId(null); setEditMember(m); }}>
                              <Edit size={16} /> Edit
                            </button>
                            <button className="admin-members-actions-item" onClick={() => { setOpenDropdownId(null); setEnrollRFIDMember(m); }}>
                              <CreditCard size={16} /> Link RFID
                            </button>
                            <button className="admin-members-actions-item delete" onClick={() => { setOpenDropdownId(null); setDeleteMember(m); }}>
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="admin-members-pagination-wrapper">
            <div className="admin-members-pagination">
              <button 
                className="admin-members-pagination-btn" 
                onClick={() => setCurrentPage(p => Math.max(1, p-1))} 
                disabled={currentPage === 1}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="admin-members-pagination-numbers">
                {buildPageNumbers(pagination).map((num, i) => (
                  num === '…' ? <span key={`dots-${i}`} className="admin-members-pagination-dots">…</span> :
                  <button 
                    key={num} 
                    onClick={() => setCurrentPage(num)} 
                    className={`admin-members-pagination-number ${currentPage === num ? 'active' : ''}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button 
                className="admin-members-pagination-btn" 
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p+1))} 
                disabled={currentPage === pagination.totalPages}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}