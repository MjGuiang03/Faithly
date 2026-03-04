import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminMembers.css';
import svgPaths from "../../imports/svg-icons";

const API = process.env.REACT_APP_API_URL;

/* ─── debounce hook ────────────────────────────────────────────────────── */
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─── query-string builder ─────────────────────────────────────────────── */
function buildQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v !== 'all' && v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/* ─── Pencil (Edit) icon ───────────────────────────────────────────────── */
const IconEdit = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M1.5 12.4999V14.9999H4L12.6733 6.32659L10.1733 3.82659L1.5 12.4999Z"
      stroke="#155DFC" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.9267 1.07326C12.1767 0.823262 12.5933 0.823262 12.8433 1.07326L15.4267 3.65659C15.6767 3.90659 15.6767 4.32326 15.4267 4.57326L13.9267 6.07326L11.4267 3.57326L11.9267 1.07326Z"
      stroke="#155DFC" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─── Trash (Delete) icon ──────────────────────────────────────────────── */
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
  const [adminPassword,     setAdminPassword]     = useState('');
  const [showPassword,      setShowPassword]      = useState(false);
  const [passwordError,     setPasswordError]     = useState('');
  const [saving,            setSaving]            = useState(false);

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
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal" onClick={e => e.stopPropagation()}>
        <div className="am-modal-header">
          <div className="am-modal-header-icon am-modal-icon-edit"><IconEdit /></div>
          <div className="am-modal-header-text">
            <p className="am-modal-title">Edit Member</p>
            <p className="am-modal-subtitle">{member.email}</p>
          </div>
          <button className="am-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="#6a7282" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="am-modal-body">
          <div className="am-form-row">
            <label className="am-form-label">Full Name</label>
            <input className="am-form-input" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter full name"/>
          </div>
          <div className="am-form-row">
            <label className="am-form-label">Phone</label>
            <input className="am-form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+63XXXXXXXXXX"/>
          </div>
          <div className="am-form-row">
            <label className="am-form-label">Branch</label>
            <input className="am-form-input" name="branch" value={form.branch} onChange={handleChange} placeholder="Branch name"/>
          </div>
          <div className="am-form-row">
            <label className="am-form-label">Position</label>
            <input className="am-form-input" name="position" value={form.position} onChange={handleChange} placeholder="Position / role"/>
          </div>

          {/* ── Password divider ── */}
          <div className="am-password-divider">
            <span>Confirm your identity to save</span>
          </div>
          <div className="am-form-row" style={{ marginBottom: 0 }}>
            <label className="am-form-label">Admin Password</label>
            <div className="am-password-wrapper">
              <input
                className={`am-form-input${passwordError ? ' am-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setPasswordError(''); }}
                placeholder="Enter your admin password"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button className="am-password-toggle" type="button" onClick={() => setShowPassword(v => !v)}>
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
            {passwordError && <p className="am-field-error">{passwordError}</p>}
          </div>
        </div>

        <div className="am-modal-footer">
          <button className="am-btn am-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="am-btn am-btn-save"   onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
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
    <div className="am-modal-overlay" onClick={onClose}>
      <div className="am-modal am-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="am-modal-header">
          <div className="am-modal-header-icon am-modal-icon-delete"><IconTrash /></div>
          <div className="am-modal-header-text">
            <p className="am-modal-title">Delete Member</p>
            <p className="am-modal-subtitle">This action cannot be undone</p>
          </div>
          <button className="am-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="#6a7282" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="am-modal-body">
          <div className="am-delete-member-card">
            <div className="admin-members-avatar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d={svgPaths.p25397b80} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d={svgPaths.p2c4f400}  stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="am-delete-name">{member.fullName || member.name}</p>
              <p className="am-delete-email">{member.email}</p>
            </div>
          </div>
          <p className="am-delete-warning">
            Are you sure you want to permanently delete this member? All associated data including loans, donations, and attendance records may be affected.
          </p>

          {/* ── Password divider ── */}
          <div className="am-password-divider">
            <span>Confirm your identity to delete</span>
          </div>
          <div className="am-form-row" style={{ marginBottom: 0 }}>
            <label className="am-form-label">Admin Password</label>
            <div className="am-password-wrapper">
              <input
                className={`am-form-input${passwordError ? ' am-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setPasswordError(''); }}
                placeholder="Enter your admin password"
                onKeyDown={e => e.key === 'Enter' && handleDelete()}
              />
              <button className="am-password-toggle" type="button" onClick={() => setShowPassword(v => !v)}>
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
            {passwordError && <p className="am-field-error">{passwordError}</p>}
          </div>
        </div>

        <div className="am-modal-footer">
          <button className="am-btn am-btn-cancel" onClick={onClose}    disabled={deleting}>Cancel</button>
          <button className="am-btn am-btn-delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Member'}
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

  const [members,      setMembers]      = useState([]);
  const [branches,     setBranches]     = useState([]);
  const [stats,        setStats]        = useState({ total: 0, active: 0, newThisMonth: 0, inactive: 0, deactivated: 0 });
  const [pagination,   setPagination]   = useState({ page: 1, totalPages: 1, totalMembers: 0, hasNext: false, hasPrev: false });
  const [searchInput,  setSearchInput]  = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [editMember,   setEditMember]   = useState(null);
  const [deleteMember, setDeleteMember] = useState(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilter, branchFilter]);

  const getToken = () =>
    localStorage.getItem('adminToken') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token');

  useEffect(() => { if (!getToken()) navigate('/admin/login'); }, [navigate]);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/admin/branches`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const data = await res.json();
        if (data.success) setBranches(data.branches || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const qs  = buildQuery({ search: debouncedSearch, status: statusFilter, branch: branchFilter, page: currentPage, limit: ITEMS_PER_PAGE });
      const res = await fetch(`${API}/api/admin/members${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401 || res.status === 403) { navigate('/admin/login'); return; }
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load members');
      setMembers(data.members      || []);
      setStats(data.stats          || {});
      setPagination(data.pagination || { page: 1, totalPages: 1, totalMembers: 0 });
    } catch (err) {
      toast.error(err.message || 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, branchFilter, currentPage, navigate]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A';

  const buildPageNumbers = () => {
    const { totalPages } = pagination;
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (currentPage <= 4)                   pages.push(1, 2, 3, 4, 5, '…', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else                                    pages.push(1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages);
    return pages;
  };

  return (
    <div className="admin-members-main">

      {editMember   && <EditModal   member={editMember}   onClose={() => setEditMember(null)}   onSave={()    => { setEditMember(null);   fetchMembers(); }} />}
      {deleteMember && <DeleteModal member={deleteMember} onClose={() => setDeleteMember(null)} onConfirm={() => { setDeleteMember(null); fetchMembers(); }} />}

      <div className="admin-members-header">
        <h1 className="admin-members-title">Member Management</h1>
        <p className="admin-members-subtitle">View and manage church members</p>
      </div>

      <div className="admin-members-stats-grid">
        {[
          { label: 'New this Month',      value: stats.newThisMonth, color: '#101828' },
          { label: 'Active Members',      value: stats.active,       color: '#00A63E' },
          { label: 'Inactive Members',    value: stats.inactive,     color: '#F54900' },
          { label: 'Deactivated Accounts',value: stats.deactivated,  color: '#F54900' },
          { label: 'Total Members',       value: stats.total,        color: '#155DFC' },
        ].map(s => (
          <div key={s.label} className="admin-members-stat-card">
            <p className="admin-members-stat-label">{s.label}</p>
            <p className="admin-members-stat-value" style={{ color: s.color }}>{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      <div className="admin-members-search-section">
        <div className="admin-members-search-container">
          <div className="admin-members-search-wrapper">
            <div className="admin-members-search-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17.5 17.5L13.8833 13.8833" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d={svgPaths.pcddfd00} stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or member ID…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="admin-members-search-input"
            />
            {searchInput && <button onClick={() => setSearchInput('')} className="am-search-clear">✕</button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-members-filter">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="deactivated">Deactivated</option>
          </select>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="admin-members-branch-filter">
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="admin-members-table-section">
        <table className="admin-members-table">
          <thead>
            <tr className="admin-members-table-header">
              <th className="admin-members-table-header-cell">Member ID</th>
              <th className="admin-members-table-header-cell" style={{ paddingLeft: 78 }}>Name</th>
              <th className="admin-members-table-header-cell" style={{ paddingLeft: 56 }}>Contact</th>
              <th className="admin-members-table-header-cell" style={{ paddingLeft: 61 }}>Branch</th>
              <th className="admin-members-table-header-cell" style={{ paddingLeft:  8 }}>Member Since</th>
              <th className="admin-members-table-header-cell" style={{ paddingLeft: 24 }}>Status</th>
              <th className="admin-members-table-header-cell" style={{ paddingLeft: 27 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <tr key={i} className="admin-members-table-row">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="admin-members-table-cell">
                      <div style={{ height: 14, borderRadius: 4, background: '#f0f2f5', width: j === 1 ? '60%' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-members-table-cell" style={{ textAlign: 'center', color: '#6a7282', padding: '40px 0' }}>
                  {debouncedSearch || statusFilter !== 'all' || branchFilter !== 'all' ? 'No members match your filters.' : 'No members found.'}
                </td>
              </tr>
            ) : members.map(member => (
              <tr key={member._id} className="admin-members-table-row">
                <td className="admin-members-table-cell">
                  {member.memberId || `M-${member._id?.toString().slice(-5).toUpperCase()}`}
                </td>
                <td className="admin-members-table-cell">
                  <div className="admin-members-avatar-container">
                    <div className="admin-members-avatar">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d={svgPaths.p25397b80} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d={svgPaths.p2241fff0} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d={svgPaths.p2c4f400}  stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="admin-members-name">{member.fullName || member.name}</span>
                  </div>
                </td>
                <td className="admin-members-table-cell">
                  <div className="admin-members-contact-info">
                    <span className="admin-members-email">{member.email}</span>
                    <span className="admin-members-phone">{member.phone || 'N/A'}</span>
                  </div>
                </td>
                <td className="admin-members-table-cell">
                  <span className="admin-members-branch">{member.branch || 'N/A'}</span>
                </td>
                <td className="admin-members-table-cell">
                  <span className="admin-members-date">{formatDate(member.createdAt)}</span>
                </td>
                <td className="admin-members-table-cell">
                  <span className={`admin-members-status-badge admin-members-status-${member.status}`}>
                    {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
                  </span>
                </td>
                <td className="admin-members-table-cell">
                  <div className="admin-members-actions">
                    <button className="admin-members-action-btn am-action-edit"   title="Edit member"   onClick={() => setEditMember(member)}>
                      <IconEdit />
                    </button>
                    <button className="admin-members-action-btn am-action-delete" title="Delete member" onClick={() => setDeleteMember(member)}>
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && pagination.totalPages > 1 && (
          <div className="admin-members-pagination">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="admin-members-pagination-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="#4a5565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {buildPageNumbers().map((p, i) =>
              p === '…'
                ? <span key={`el-${i}`} style={{ padding: '0 4px', color: '#6a7282', alignSelf: 'center' }}>…</span>
                : <button key={p} onClick={() => setCurrentPage(p)} className={`admin-members-pagination-number ${currentPage === p ? 'active' : ''}`}>{p}</button>
            )}
            <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext} className="admin-members-pagination-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 15L12.5 10L7.5 5" stroke="#4a5565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}