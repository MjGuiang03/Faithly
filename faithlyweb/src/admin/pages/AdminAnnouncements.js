import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Megaphone, Loader2, Trash2, Calendar, Clock, Globe, MapPin } from 'lucide-react';
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
  const [form, setForm] = useState({
    title: '', body: '', category: 'General',
    eventDate: '', expiresAt: '',
    visibility: 'all', targetBranches: []
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
    if (!token) { navigate('/admin/login'); return; }
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
        eventDate: form.eventDate || null,
        expiresAt: form.expiresAt || null,
      };
      const res = await fetch(`${API}/api/admin/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Announcement posted!');
        setForm({
          title: '', body: '', category: 'General',
          eventDate: '', expiresAt: '',
          visibility: 'all', targetBranches: []
        });
        fetchAnnouncements();
      } else {
        toast.error(data.message || 'Failed to post announcement');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="admin-announce-main">
      <div className="admin-announce-header">
        <h1 className="admin-announce-title">Announcements</h1>
        <p className="admin-announce-subtitle">Post and manage church announcements visible to members</p>
      </div>

      <div className="admin-announce-grid">
        {/* Create Form */}
        <div className="admin-announce-card">
          <div className="admin-announce-card-header">
            <p className="admin-announce-card-title">Post New Announcement</p>
          </div>
          <form className="admin-announce-form" onSubmit={handleSubmit}>
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

            {/* Event Date & Time */}
            <div className="admin-announce-form-row">
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">
                  <Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Event Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="eventDate"
                  className="admin-announce-input"
                  value={form.eventDate}
                  onChange={handleChange}
                />
              </div>
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">
                  <Clock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Auto-Disappear Date
                </label>
                <input
                  type="datetime-local"
                  name="expiresAt"
                  className="admin-announce-input"
                  value={form.expiresAt}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Target Audience */}
            <div className="admin-announce-form-group">
              <label className="admin-announce-label">
                <Globe size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Target Audience
              </label>
              <div className="admin-announce-radio-group">
                {[
                  { value: 'all', label: 'All Branches' },
                  { value: 'branches', label: 'Selected Branch(es)' }
                ].map(opt => (
                  <label key={opt.value} className={`admin-announce-radio-item${form.visibility === opt.value ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      checked={form.visibility === opt.value}
                      onChange={handleChange}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Branch Multi-Select */}
            {form.visibility === 'branches' && (
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">Select Branches</label>
                <div className="admin-announce-branch-list">
                  {branches.length === 0 ? (
                    <p className="admin-announce-no-branches">No branches found.</p>
                  ) : (
                    branches.map(b => (
                      <label
                        key={b}
                        className={`admin-announce-branch-chip${form.targetBranches.includes(b) ? ' selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.targetBranches.includes(b)}
                          onChange={() => toggleBranch(b)}
                        />
                        <MapPin size={12} />
                        <span>{b}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="admin-announce-submit" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="animate-spin" size={18} /> Posting...</>
              ) : (
                <><Megaphone size={18} /> Post Announcement</>
              )}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="admin-announce-card">
          <div className="admin-announce-card-header">
            <p className="admin-announce-card-title">Posted Announcements ({items.length})</p>
          </div>
          <div className="admin-announce-list">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="admin-announce-item">
                  <div style={{ flex: 1 }}>
                    <div className="user-skeleton" style={{ height: '14px', width: '60%', marginBottom: '8px', borderRadius: '6px' }} />
                    <div className="user-skeleton" style={{ height: '12px', width: '90%', borderRadius: '6px' }} />
                  </div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="admin-announce-empty">
                <p style={{ fontSize: '32px' }}>📢</p>
                <p>No announcements yet. Post one!</p>
              </div>
            ) : (
              items.map(a => (
                <div key={a._id} className={`admin-announce-item${isExpired(a.expiresAt) ? ' expired' : ''}`}>
                  <div className="admin-announce-item-content">
                    <p className="admin-announce-item-title">{a.title}</p>
                    <p className="admin-announce-item-body">{a.body}</p>
                    <div className="admin-announce-item-meta">
                      <span className="admin-announce-item-cat">{a.category}</span>
                      {a.eventDate && (
                        <span className="admin-announce-item-badge event">
                          <Calendar size={10} /> {fmtDateTime(a.eventDate)}
                        </span>
                      )}
                      {a.expiresAt && (
                        <span className={`admin-announce-item-badge${isExpired(a.expiresAt) ? ' expired' : ' expiry'}`}>
                          <Clock size={10} /> {isExpired(a.expiresAt) ? 'Expired' : `Expires ${fmtDate(a.expiresAt)}`}
                        </span>
                      )}
                      <span className="admin-announce-item-badge scope">
                        <Globe size={10} /> {getVisibilityLabel(a)}
                      </span>
                    </div>
                    <div className="admin-announce-item-footer">
                      <span>{fmtDate(a.createdAt)}</span>
                      {a.createdBy && <span>· by {a.createdBy}</span>}
                    </div>
                  </div>
                  <button
                    className="admin-announce-delete"
                    onClick={() => handleDelete(a._id)}
                    title="Delete announcement"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
