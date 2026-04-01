import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Megaphone, Trash2, Calendar, Clock, Globe, MapPin } from 'lucide-react';
import API from '../../utils/api';
import '../styles/AdminAnnouncements.css';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const isExpired = (d) => d && new Date(d) < new Date();

export default function AdminAnnouncements() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [template, setTemplate] = useState('banner');
  const [showPosted, setShowPosted] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', category: 'General',
    eventDate: '', expiresAt: '',
    visibility: 'all', targetBranches: [],
    imageBase64: ''
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/announcements?admin=true`);
      const data = await res.json();
      if (data.success) setItems(data.announcements || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBranches(data.branches || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/'); return; }
    fetchAnnouncements();
    fetchBranches();
  }, [navigate, fetchAnnouncements, fetchBranches]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleBranch = (branch) => {
    setForm(prev => ({
      ...prev,
      targetBranches: prev.targetBranches.includes(branch)
        ? prev.targetBranches.filter(b => b !== branch)
        : [...prev.targetBranches, branch]
    }));
  };

  const handleEdit = (a) => {
    setEditingId(a._id);
    setTemplate(a.template || 'banner');
    setForm({
      title: a.title || '',
      body: a.body || '',
      category: a.category || 'General',
      eventDate: a.eventDate ? new Date(new Date(a.eventDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
      expiresAt: a.expiresAt ? new Date(new Date(a.expiresAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
      visibility: (!a.visibility || a.visibility === 'all') ? 'all' : 'branches',
      targetBranches: a.targetBranches || [],
      imageBase64: a.image || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTemplate('banner');
    setForm({
      title: '', body: '', category: 'General',
      eventDate: '', expiresAt: '',
      visibility: 'all', targetBranches: [], imageBase64: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (form.visibility === 'branches' && form.targetBranches.length === 0) {
      toast.error('Please select at least one branch');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload = {
        ...form,
        template,
        eventDate: form.eventDate || null,
        expiresAt: form.expiresAt || null,
      };
      const url = editingId ? `${API}/api/admin/announcements/${editingId}` : `${API}/api/admin/announcements`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editingId ? 'Announcement updated!' : 'Announcement posted!');
        cancelEdit();
        fetchAnnouncements();
      } else {
        toast.error(data.message || (editingId ? 'Failed to update' : 'Failed to post'));
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setForm(prev => ({ ...prev, imageBase64: '' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, imageBase64: reader.result }));
    reader.onerror = () => toast.error('Failed to read image');
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Announcement deleted');
        setItems(prev => prev.filter(a => a._id !== id));
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const getVisibilityLabel = (a) => {
    if (!a.visibility || a.visibility === 'all') return 'All Branches';
    if (a.visibility === 'branches' && Array.isArray(a.targetBranches)) {
      return a.targetBranches.join(', ');
    }
    return a.visibility;
  };

  const previewDate = form.eventDate
    ? new Date(form.eventDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date set';

  const previewAudience = form.visibility === 'all'
    ? 'All Branches'
    : form.targetBranches.join(', ') || 'No branch selected';

  return (
    <div className="admin-announce-main">
      <div className="admin-announce-header">
        <h1 className="admin-announce-title">Announcements</h1>
        <p className="admin-announce-subtitle">Post and manage church announcements visible to members</p>
      </div>

      <div className="admin-announce-grid">

        {/* ── LEFT: Create / Edit Form ── */}
        <div className="admin-announce-card">
          <div className="admin-announce-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="admin-announce-card-title">{editingId ? 'Edit Announcement' : 'Post New Announcement'}</p>
            {editingId && (
              <button type="button" onClick={cancelEdit} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>
                Cancel Edit
              </button>
            )}
          </div>

          <form className="admin-announce-form" onSubmit={handleSubmit}>

            {/* Template Picker */}
            <div className="admin-announce-form-group">
              <label className="admin-announce-label">Template</label>
              <div className="admin-announce-template-grid">
                {[
                  { id: 'banner', label: 'Banner top' },
                  { id: 'side', label: 'Side image' },
                  { id: 'text', label: 'Text only' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`admin-announce-tpl-btn${template === t.id ? ' active' : ''}`}
                    onClick={() => setTemplate(t.id)}
                  >
                    <div className={`admin-announce-tpl-thumb admin-announce-tpl-${t.id}`} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-announce-form-group">
              <label className="admin-announce-label">Title</label>
              <input
                type="text"
                name="title"
                className="admin-announce-input"
                placeholder="Announcement title..."
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="admin-announce-form-group">
              <label className="admin-announce-label">Message</label>
              <textarea
                name="body"
                className="admin-announce-textarea"
                placeholder="Write the announcement message..."
                value={form.body}
                onChange={handleChange}
                required
              />
            </div>

            {template !== 'text' && (
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">Banner / Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="admin-announce-input"
                />
                {form.imageBase64 && (
                  <div className={`admin-announce-img-preview admin-announce-img-${template}`}>
                    <img src={form.imageBase64} alt="Preview" />
                  </div>
                )}
              </div>
            )}

            <div className="admin-announce-form-row">
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">Category</label>
                <select name="category" className="admin-announce-select" value={form.category} onChange={handleChange}>
                  <option value="General">General</option>
                  <option value="Events">Events</option>
                  <option value="Services">Services</option>
                  <option value="Donations">Donations</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">Target Audience</label>
                <div className="admin-announce-radio-group">
                  {[
                    { value: 'all', label: 'All Branches' },
                    { value: 'branches', label: 'Selected' },
                  ].map(opt => (
                    <label key={opt.value} className={`admin-announce-radio-item${form.visibility === opt.value ? ' active' : ''}`}>
                      <input type="radio" name="visibility" value={opt.value} checked={form.visibility === opt.value} onChange={handleChange} />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-announce-form-row">
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">
                  <Calendar size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Event Date &amp; Time
                </label>
                <input type="datetime-local" name="eventDate" className="admin-announce-input" value={form.eventDate} onChange={handleChange} />
              </div>
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">
                  <Clock size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Auto-Disappear Date
                </label>
                <input type="datetime-local" name="expiresAt" className="admin-announce-input" value={form.expiresAt} onChange={handleChange} />
              </div>
            </div>

            {form.visibility === 'branches' && (
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">Select Branches</label>
                <div className="admin-announce-branch-list">
                  {branches.length === 0 ? (
                    <p className="admin-announce-no-branches">No branches found.</p>
                  ) : (
                    branches.map(b => (
                      <label key={b} className={`admin-announce-branch-chip${form.targetBranches.includes(b) ? ' selected' : ''}`}>
                        <input type="checkbox" checked={form.targetBranches.includes(b)} onChange={() => toggleBranch(b)} />
                        <MapPin size={11} />
                        <span>{b}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="admin-announce-submit" disabled={submitting}>
              {submitting
                ? <span className="btn-spinner" />
                : <><Megaphone size={16} /> {editingId ? 'Update Announcement' : 'Post Announcement'}</>}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Compact List ── */}
        <div className="admin-announce-card" style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Live Preview */}
          <div className="admin-announce-card-header" style={{ paddingBottom: '12px', borderBottom: 'none' }}>
            <p className="admin-announce-card-title">Live Preview</p>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <div className="admin-announce-preview-wrap">
              <div className={`ann-card ann-card-${template}`}>
                {template === 'banner' && (
                  <div className="ann-banner">
                    {form.imageBase64
                      ? <img src={form.imageBase64} alt="" />
                      : <div className="ann-banner-placeholder"><Megaphone size={24} color="#1E3A8A" /></div>}
                  </div>
                )}
                {template === 'side' && (
                  <div className="ann-side-img">
                    {form.imageBase64
                      ? <img src={form.imageBase64} alt="" />
                      : <div className="ann-banner-placeholder"><Megaphone size={20} color="#1E3A8A" /></div>}
                  </div>
                )}
                <div className="ann-body">
                  <span className="ann-cat">{form.category}</span>
                  <p className="ann-title">
                    {form.title || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Announcement title...</span>}
                  </p>
                  <p className="ann-msg">
                    {form.body || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Your message will appear here.</span>}
                  </p>
                  <div className="ann-meta">
                    <span><Calendar size={10} /> {previewDate}</span>
                    <span><Globe size={10} /> {previewAudience}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: '8px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }} />

          {/* Stats Bar */}
          <div className="admin-announce-stats-bar">
            <div className="admin-announce-stat-item">
              <span className="admin-announce-stat-number">{items.length}</span>
              <span className="admin-announce-stat-label">Total</span>
            </div>
            <div className="admin-announce-stat-divider" />
            <div className="admin-announce-stat-item">
              <span className="admin-announce-stat-number">{items.filter(a => !isExpired(a.expiresAt)).length}</span>
              <span className="admin-announce-stat-label">Active</span>
            </div>
            <div className="admin-announce-stat-divider" />
            <div className="admin-announce-stat-item">
              <span className="admin-announce-stat-number">{items.filter(a => isExpired(a.expiresAt)).length}</span>
              <span className="admin-announce-stat-label">Expired</span>
            </div>
          </div>

          <div className="admin-announce-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: showPosted ? '1px solid #f1f5f9' : 'none' }}>
            <div>
              <p className="admin-announce-card-title" style={{ fontSize: '13px' }}>Recent Announcements</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 1 }}>Manage active and expired announcements</p>
            </div>
            <button 
              type="button"
              className="admin-announce-toggle-btn"
              onClick={() => setShowPosted(!showPosted)}
            >
              {showPosted ? 'Hide List' : 'View List'}
              <span className="admin-announce-active-badge" style={{ padding: '2px 6px', marginLeft: '6px', background: '#DBEAFE' }}>
                {items.filter(a => !isExpired(a.expiresAt)).length} active
              </span>
            </button>
          </div>

          <div className={`admin-announce-slide-container ${showPosted ? 'open' : ''}`}>
            <div className="admin-announce-slide-content">
              <div className="admin-announce-filter-tabs">
                {['All', 'General', 'Events', 'Prayer', 'Services', 'Donations', 'Urgent'].map(cat => (
                  <button
                    key={cat}
                    className={`admin-announce-filter-tab${categoryFilter === cat ? ' active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="admin-announce-list">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="admin-announce-item">
                      <div style={{ flex: 1 }}>
                        <div className="user-skeleton" style={{ height: 12, width: '60%', marginBottom: 6, borderRadius: 4 }} />
                        <div className="user-skeleton" style={{ height: 10, width: '90%', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))
                ) : (filteredItems => filteredItems.length === 0 ? (
                  <div className="admin-announce-empty">
                    <Megaphone size={28} color="#cbd5e1" style={{ marginBottom: 8 }} />
                    <p>{items.length === 0 ? 'No announcements yet. Post one!' : `No ${categoryFilter} announcements.`}</p>
                  </div>
                ) : (
                  filteredItems.map(a => (
                      <div key={a._id} className={`admin-announce-item${isExpired(a.expiresAt) ? ' expired' : ''}`}>
                        <div className="admin-announce-item-content">
                          <p className="admin-announce-item-title">{a.title}</p>
                          <p className="admin-announce-item-body">{a.body}</p>
                          <div className="admin-announce-item-meta">
                            <span className="admin-announce-item-cat">{a.category}</span>
                            {a.eventDate && (
                              <span className="admin-announce-item-badge event">
                                <Calendar size={9} /> {fmtDateTime(a.eventDate)}
                              </span>
                            )}
                            {a.expiresAt && (
                              <span className={`admin-announce-item-badge${isExpired(a.expiresAt) ? ' expired' : ' expiry'}`}>
                                <Clock size={9} /> {isExpired(a.expiresAt) ? 'Expired' : `Expires ${fmtDate(a.expiresAt)}`}
                              </span>
                            )}
                            <span className="admin-announce-item-badge scope">
                              <Globe size={9} /> {getVisibilityLabel(a)}
                            </span>
                          </div>
                          <div className="admin-announce-item-footer">
                            <span>{fmtDate(a.createdAt)}</span>
                            {a.createdBy && <span>· by {a.createdBy}</span>}
                          </div>
                        </div>
                        <div className="admin-announce-actions">
                          <button className="admin-announce-edit" onClick={() => handleEdit(a)} title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="admin-announce-delete" onClick={() => handleDelete(a._id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                ))(items.filter(a => categoryFilter === 'All' || a.category === categoryFilter))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}