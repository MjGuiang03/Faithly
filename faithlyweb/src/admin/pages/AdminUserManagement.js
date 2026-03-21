import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { UserPlus, Search, Edit2, Trash2, Shield, Loader2, X, Info } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import API from '../../utils/api';
import '../styles/AdminUserManagement.css';

const ROLE_LABELS = {
  admin: 'Main Admin',
  loanAdmin: 'Loan Officer',
  secretaryAdmin: 'Secretary',
};

const ROLE_COLORS = {
  admin: '#155DFC',
  loanAdmin: '#F59E0B',
  secretaryAdmin: '#10b981',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/* ══════════════════════════════════════════════════════
   PASSWORD CONFIRMATION MODAL
══════════════════════════════════════════════════════ */
function PasswordModal({ title, description, onConfirm, onClose, loading }) {
  const [password, setPassword] = useState('');

  return (
    <div className="admin-users-modal-overlay" onClick={onClose}>
      <div className="admin-users-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-users-modal-header">
          <h3>{title}</h3>
          <button className="admin-users-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-users-modal-body">
          <p className="admin-users-modal-desc">{description}</p>
          <div className="admin-users-form-group">
            <label className="admin-users-form-label">Your Admin Password</label>
            <input
              type="password"
              className="admin-users-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="admin-users-modal-actions">
          <button className="admin-users-btn secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="admin-users-btn primary"
            onClick={() => onConfirm(password)}
            disabled={!password || loading}
          >
            {loading ? <><Loader2 className="animate-spin" size={16} /> Confirming...</> : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AdminUserManagement() {
  const navigate = useNavigate();
  const [adminList, setAdminList] = useState([]);
  const [stats, setStats] = useState({ total: 0, admins: 0, loanAdmins: 0, secretaryAdmins: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editRole, setEditRole] = useState('');

  // Create form
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'loanAdmin' });
  const [createLoading, setCreateLoading] = useState(false);

  const token = localStorage.getItem('adminToken');
  const superAdminEmail = localStorage.getItem('adminEmail');

  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    if (role !== 'admin') {
      toast.error('Access denied. Only Main Admin can manage users.');
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const res = await fetch(`${API}/api/admin/admins?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAdminList(data.admins || []);
        setStats(data.stats || { total: 0, admins: 0, loanAdmins: 0, secretaryAdmins: 0 });
      }
    } catch {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  /* ── Create ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.email.endsWith('@gmail.com')) {
      toast.error('Please use a valid Gmail address'); return;
    }
    if (createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/create-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Account created for ${createForm.email}`);
        setCreateForm({ email: '', password: '', role: 'loanAdmin' });
        setShowAddModal(false);
        fetchAdmins();
      } else {
        toast.error(data.message || 'Failed to create account');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCreateLoading(false);
    }
  };

  /* ── Edit Role ── */
  const handleEditRole = async (adminPassword) => {
    if (!editTarget || !editRole) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/update-admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: editTarget.email, role: editRole, adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        setEditTarget(null);
        fetchAdmins();
      } else {
        toast.error(data.message || 'Failed to update role');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (adminPassword) => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/delete-admin`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: deleteTarget.email, adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        setDeleteTarget(null);
        fetchAdmins();
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const isSuperAdmin = (email) => email === superAdminEmail;

  return (
    <div className="admin-users-main">
      {/* Header */}
      <div className="admin-users-header">
        <div>
          <h1 className="admin-users-title">User Management</h1>
          <p className="admin-users-subtitle">Manage administrative and staff accounts</p>
        </div>
        <button className="admin-users-add-btn" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      {/* Stats */}
      <div className="admin-users-stats">
        <div className="admin-users-stat-card">
          <p className="admin-users-stat-label">Total Accounts</p>
          <p className="admin-users-stat-value">{loading ? '—' : stats.total}</p>
        </div>
        <div className="admin-users-stat-card">
          <p className="admin-users-stat-label">Main Admins</p>
          <p className="admin-users-stat-value" style={{ color: ROLE_COLORS.admin }}>{loading ? '—' : stats.admins}</p>
        </div>
        <div className="admin-users-stat-card">
          <p className="admin-users-stat-label">Loan Officers</p>
          <p className="admin-users-stat-value" style={{ color: ROLE_COLORS.loanAdmin }}>{loading ? '—' : stats.loanAdmins}</p>
        </div>
        <div className="admin-users-stat-card">
          <p className="admin-users-stat-label">Secretaries</p>
          <p className="admin-users-stat-value" style={{ color: ROLE_COLORS.secretaryAdmin }}>{loading ? '—' : stats.secretaryAdmins}</p>
        </div>
      </div>

      {/* Search */}
      <div className="admin-users-toolbar">
        <div className="admin-users-search-wrapper">
          <Search size={18} className="admin-users-search-icon" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="admin-users-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="admin-users-table-section">
        {loading ? (
          <div className="admin-users-loading"><Loader2 className="animate-spin" size={20} /> Loading...</div>
        ) : (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminList.length === 0 ? (
                <tr><td colSpan={4} className="admin-users-empty">{searchQuery ? 'No results found.' : 'No accounts yet.'}</td></tr>
              ) : (
                adminList.map(a => (
                  <tr key={a._id}>
                    <td className="admin-users-email-cell">
                      <Shield size={14} style={{ color: ROLE_COLORS[a.role] || '#6b7280' }} />
                      <span>{a.email}</span>
                      {isSuperAdmin(a.email) && <span className="admin-users-super-badge">Super</span>}
                    </td>
                    <td>
                      <span className="admin-users-role-badge" style={{ background: `${ROLE_COLORS[a.role]}18`, color: ROLE_COLORS[a.role] }}>
                        {ROLE_LABELS[a.role] || a.role}
                      </span>
                    </td>
                    <td className="admin-users-date-cell">{fmtDate(a.createdAt)}</td>
                    <td>
                      {isSuperAdmin(a.email) ? (
                        <span className="admin-users-protected">Protected</span>
                      ) : (
                        <div className="admin-users-actions-cell">
                          <button
                            className="admin-users-action-btn edit"
                            title="Change Role"
                            onClick={() => { setEditTarget(a); setEditRole(a.role); }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="admin-users-action-btn delete"
                            title="Delete"
                            onClick={() => setDeleteTarget(a)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Info */}
      <div className="admin-users-info-box">
        <Info size={18} className="admin-users-info-icon" />
        <p>Only the Main Super Admin can create, edit, or delete accounts. The Main Super Admin account is protected and cannot be modified.</p>
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div className="admin-users-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="admin-users-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-users-modal-header">
              <h3>Create New Account</h3>
              <button className="admin-users-modal-close" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form className="admin-users-modal-body" onSubmit={handleCreate}>
              <div className="admin-users-form-group">
                <label className="admin-users-form-label">Gmail Address</label>
                <input
                  type="email" className="admin-users-input" placeholder="example@gmail.com"
                  value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required
                />
              </div>
              <div className="admin-users-form-group">
                <label className="admin-users-form-label">Password</label>
                <input
                  type="password" className="admin-users-input" placeholder="••••••••"
                  value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} required
                />
              </div>
              <div className="admin-users-form-group">
                <label className="admin-users-form-label">Account Role</label>
                <select
                  className="admin-users-select"
                  value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="admin">Main Admin</option>
                  <option value="loanAdmin">Loan Officer</option>
                  <option value="secretaryAdmin">Secretary</option>
                </select>
              </div>
              <div className="admin-users-modal-actions">
                <button type="button" className="admin-users-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="admin-users-btn primary" disabled={createLoading}>
                  {createLoading ? <><Loader2 className="animate-spin" size={16} /> Creating...</> : <><UserPlus size={16} /> Create Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ── */}
      {editTarget && (
        <div className="admin-users-modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="admin-users-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-users-modal-header">
              <h3>Change Role</h3>
              <button className="admin-users-modal-close" onClick={() => setEditTarget(null)}><X size={18} /></button>
            </div>
            <div className="admin-users-modal-body">
              <p className="admin-users-modal-desc">Change role for <strong>{editTarget.email}</strong></p>
              <div className="admin-users-form-group">
                <label className="admin-users-form-label">New Role</label>
                <select className="admin-users-select" value={editRole} onChange={e => setEditRole(e.target.value)}>
                  <option value="admin">Main Admin</option>
                  <option value="loanAdmin">Loan Officer</option>
                  <option value="secretaryAdmin">Secretary</option>
                </select>
              </div>
            </div>
            <div className="admin-users-modal-actions">
              <button className="admin-users-btn secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="admin-users-btn primary" onClick={() => {
                // Show password confirmation
                setEditTarget({ ...editTarget, confirmStep: true });
              }} disabled={editRole === editTarget.role}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget?.confirmStep && (
        <PasswordModal
          title="Confirm Role Change"
          description={`Changing ${editTarget.email} to ${ROLE_LABELS[editRole]}.`}
          onConfirm={handleEditRole}
          onClose={() => setEditTarget(null)}
          loading={actionLoading}
        />
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <PasswordModal
          title="Delete Account"
          description={`Are you sure you want to permanently delete ${deleteTarget.email}?`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
