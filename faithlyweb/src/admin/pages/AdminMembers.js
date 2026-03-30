import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, UserPlus, Users as UsersIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminMembers.css';
import svgPaths from "../../imports/svg-icons";

import API from '../../utils/api';
import SignupModal from '../../user/components/SignupModal';

/* ─── query-string builder ──────────────────────────────────────────────── */
function buildQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v !== 'all' && v != null && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/* ─── Pencil (Edit) icon ────────────────────────────────────────────────── */
const IconEdit = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M1.5 12.4999V14.9999H4L12.6733 6.32659L10.1733 3.82659L1.5 12.4999Z"
      stroke="#155DFC" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.9267 1.07326C12.1767 0.823262 12.5933 0.823262 12.8433 1.07326L15.4267 3.65659C15.6767 3.90659 15.6767 4.32326 15.4267 4.57326L13.9267 6.07326L11.4267 3.57326L11.9267 1.07326Z"
      stroke="#155DFC" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─── Trash (Delete) icon ───────────────────────────────────────────────── */
const IconTrash = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M1 3.5H16" stroke="#F04438" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 7.25V12.5" stroke="#F04438" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 7.25V12.5" stroke="#F04438" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.75 3.5L2.5 14C2.5 14.8284 3.17157 15.5 4 15.5H13C13.8284 15.5 14.5 14.8284 14.5 14L15.25 3.5"
      stroke="#F04438" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.25 3.5V1.5C6.25 1.08579 6.58579 0.75 7 0.75H10C10.4142 0.75 10.75 1.08579 10.75 1.5V3.5"
      stroke="#F04438" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT MODAL
═══════════════════════════════════════════════════════════════════════════ */
function EditModal({ member, onClose, onSave }) {
  const [form, setForm] = useState({
    fullName: member.fullName || member.name || '',
    phone:    member.phone    || '',
    branch:   member.branch   || '',
    position: member.position || '',
  });
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [saving,        setSaving]        = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return; }
    if (!adminPassword.trim()) { setPasswordError('Admin password is required'); return; }
    setPasswordError('');
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res   = await fetch(`${API}/api/admin/update-member`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ email: member.email, adminPassword, ...form })
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="#6a7282" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="admin-members-modal-body">
          <div className="admin-members-form-row">
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Full Name</label>
              <input className="admin-members-form-input" name="fullName" value={form.fullName} onChange={handleChange} />
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Phone Number</label>
              <input className="admin-members-form-input" name="phone" value={form.phone} onChange={handleChange} />
            </div>
          </div>
          <div className="admin-members-form-row">
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Branch</label>
              <input className="admin-members-form-input" name="branch" value={form.branch} onChange={handleChange} />
            </div>
            <div className="admin-members-form-group">
              <label className="admin-members-form-label">Church Position</label>
              <select className="admin-members-form-input" name="position" value={form.position} onChange={handleChange}>
                <option value="Member">Member</option>
                <option value="Pastor">Pastor</option>
                <option value="Secretary">Secretary</option>
                <option value="Deacon">Deacon</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <p className="admin-members-admin-confirm-title">Confirm Changes</p>
          <div className="admin-members-form-row" style={{ marginBottom: 0 }}>
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
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M2.5 2.5L17.5 17.5" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8.82 4.02A9.31 9.31 0 0110 3.89c4.17 0 7.5 6.11 7.5 6.11a16.17 16.17 0 01-1.96 2.77" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11.94 14.06A4.17 4.17 0 016.06 8.18M4.61 5.83C3.12 6.9 2.11 8.6 1.67 10c.83 2.78 3.89 6.11 8.33 6.11a8.68 8.68 0 003.39-.7" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4.17C5.83 4.17 2.5 10 2.5 10s3.33 5.83 7.5 5.83S17.5 10 17.5 10 14.17 4.17 10 4.17z" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <p className="admin-members-field-error">{passwordError}</p>}
          </div>
        </div>

        <div className="admin-members-modal-footer">
          <button className="admin-members-btn admin-members-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="#6a7282" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="admin-members-modal-body">
          <div className="admin-members-delete-member-card">
            <div className="admin-members-avatar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d={svgPaths.p25397b80} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d={svgPaths.p2c4f400}  stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
          <div className="admin-members-form-row" style={{ marginBottom: 0 }}>
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
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M2.5 2.5L17.5 17.5" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M8.82 4.02A9.31 9.31 0 0110 3.89c4.17 0 7.5 6.11 7.5 6.11a16.17 16.17 0 01-1.96 2.77" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11.94 14.06A4.17 4.17 0 016.06 8.18M4.61 5.83C3.12 6.9 2.11 8.6 1.67 10c.83 2.78 3.89 6.11 8.33 6.11a8.68 8.68 0 003.39-.7" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4.17C5.83 4.17 2.5 10 2.5 10s3.33 5.83 7.5 5.83S17.5 10 17.5 10 14.17 4.17 10 4.17z" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="#99A1AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <p className="admin-members-field-error">{passwordError}</p>}
          </div>
        </div>

        <div className="admin-members-modal-footer">
          <button className="admin-members-btn admin-members-btn-cancel" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="admin-members-btn admin-members-btn-delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? <span className="btn-spinner" /> : 'Delete Member'}
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
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editMember,     setEditMember]     = useState(null);
  const [deleteMember,   setDeleteMember]   = useState(null);
  const [showAddModal,   setShowAddModal]   = useState(false);

  const debouncedSearchMembers  = useDebounce(searchMembers,  400);

  const getToken = () =>
    localStorage.getItem('adminToken') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token');

  useEffect(() => { if (!getToken()) navigate('/'); }, [navigate]);

  /* ── Fetch members with filters ── */
  const fetchMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const q  = buildQuery({ search: debouncedSearchMembers.trim(), page: currentPage, limit: ITEMS_PER_PAGE, role: roleFilter === 'all' ? undefined : roleFilter });
      const res = await fetch(`${API}/api/admin/members?${q}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.status === 401 || res.status === 403) { navigate('/'); return; }
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load members');
      setMembers(data.members    || []);
      setStats(data.stats        || {});
      setPagination(data.pagination || { page: 1, totalPages: 1, totalMembers: 0 });
    } catch (err) {
      toast.error(err.message || 'Failed to fetch members');
    } finally {
      setLoadingMembers(false);
    }
  }, [debouncedSearchMembers, currentPage, navigate, roleFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

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
      {showAddModal && <SignupModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); fetchMembers(); }} onSwitchToLogin={() => {}} />}

      {/* Header */}
      <div className="admin-members-header-container">
        <div className="admin-members-header-left">
          <h1 className="admin-members-title">Member Management</h1>
          <p className="admin-members-subtitle">View and manage church members and officers</p>
        </div>
        <button className="admin-members-add-btn" onClick={() => setShowAddModal(true)}>
          <UserPlus size={20} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="admin-members-stats-grid">
        <div className="admin-members-stat-card">
          <p className="admin-members-stat-label">Total Members</p>
          <p className="admin-members-stat-value admin-members-stat-value-blue">{stats.total ?? 0}</p>
        </div>
        <div className="admin-members-stat-card">
          <p className="admin-members-stat-label">Officers</p>
          <p className="admin-members-stat-value admin-members-stat-value-blue">{stats.officers ?? 0}</p>
        </div>
        <div className="admin-members-stat-card">
          <p className="admin-members-stat-label">Active Members</p>
          <p className="admin-members-stat-value admin-members-stat-value-green">{stats.active ?? 0}</p>
        </div>
        <div className="admin-members-stat-card">
          <p className="admin-members-stat-label">Inactive Members</p>
          <p className="admin-members-stat-value admin-members-stat-value-orange">{stats.inactive ?? 0}</p>
        </div>
        <div className="admin-members-stat-card">
          <p className="admin-members-stat-label">New This Month</p>
          <p className="admin-members-stat-value admin-members-stat-value-blue">{stats.newThisMonth ?? 0}</p>
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
            <div className="admin-members-search-wrapper" style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} className="admin-members-search-icon" style={{ position: 'absolute', top: 12, left: 14 }} />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchMembers}
                  onChange={e => setSearchMembers(e.target.value)}
                  className="admin-members-search-input"
                  style={{ width: '100%', paddingLeft: 40, height: 42, borderRadius: 8, border: '1px solid #D1D5DB' }}
                />
              </div>
              <select
                className="admin-members-filter-btn"
                onChange={e => setRoleFilter(e.target.value)}
                value={roleFilter}
                style={{ height: 42, borderRadius: 8, padding: '0 12px', border: '1px solid #D1D5DB' }}
              >
                <option value="all">All Roles</option>
                <option value="member">Members</option>
                <option value="officer">Officers</option>
              </select>
            </div>
          </div>
        </div>

        <div className="loan-admin-mgmt-table-container">
          <table className="loan-admin-mgmt-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Branch</th>
                <th>Position</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingMembers ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="loan-admin-mgmt-table-row-hover">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}><div className="admin-members-skeleton" /></td>
                    ))}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No members found</td></tr>
              ) : (
                members.map(m => (
                  <tr key={m._id} className="loan-admin-mgmt-table-row-hover">
                    <td style={{ fontWeight: 600, color: '#111827' }}>{m.memberId || '—'}</td>
                    <td>
                      <div className="admin-members-avatar-name" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="admin-members-avatar-circle" style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEF2FF', color: '#155DFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>{(m.fullName || m.name || 'M').charAt(0)}</div>
                        <span style={{ fontWeight: 500, color: '#111827' }}>{m.fullName || m.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-members-contact-info" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', color: '#374151' }}>{m.email}</span>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{m.phone}</span>
                      </div>
                    </td>
                    <td style={{ color: '#374151' }}>{m.branch || 'Bulacan Main'}</td>
                    <td style={{ color: '#374151', textTransform: 'capitalize' }}>{m.position || 'Member'}</td>
                    <td><span className={`ps-status-badge ${m.status?.toLowerCase() === 'active' ? 'on-track' : 'default'}`}>{m.status || 'Active'}</span></td>
                    <td>
                      <div className="admin-members-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button className="admin-members-action-btn admin-members-action-edit" onClick={() => setEditMember(m)}><IconEdit /></button>
                        <button className="admin-members-action-btn admin-members-action-delete" onClick={() => setDeleteMember(m)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="admin-members-pagination">
            <button className="admin-members-pagination-nav" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            <div className="admin-members-pagination-numbers">
              {buildPageNumbers(pagination).map((num, i) => (
                num === '…' ? <span key={`dots-${i}`} className="admin-members-pagination-dots">…</span> :
                <button key={num} onClick={() => setCurrentPage(num)} className={`admin-members-pagination-num ${currentPage === num ? 'active' : ''}`} style={{ background: currentPage === num ? '#155DFC' : 'transparent', color: currentPage === num ? 'white' : '#4B5563', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer' }}>{num}</button>
              ))}
            </div>
            <button className="admin-members-pagination-nav" onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p+1))} disabled={currentPage === pagination.totalPages}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}