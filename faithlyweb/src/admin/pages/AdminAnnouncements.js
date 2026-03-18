import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Megaphone, Loader2, Trash2 } from 'lucide-react';
import API from '../../utils/api';
import '../styles/AdminAnnouncements.css';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function AdminAnnouncements() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', category: 'General' });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/announcements`);
      const data = await res.json();
      if (data.success) setItems(data.announcements || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin/login'); return; }
    fetchAnnouncements();
  }, [navigate, fetchAnnouncements]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Announcement posted!');
        setForm({ title: '', body: '', category: 'General' });
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

  return (
    <div className="admin-announce-main">
      <div className="admin-announce-header">
        <h1 className="admin-announce-title">Announcements</h1>
        <p className="admin-announce-subtitle">Post and manage church announcements visible to all members</p>
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
                <div key={a._id} className="admin-announce-item">
                  <div className="admin-announce-item-content">
                    <p className="admin-announce-item-title">{a.title}</p>
                    <p className="admin-announce-item-body">{a.body}</p>
                    <div className="admin-announce-item-meta">
                      <span className="admin-announce-item-cat">{a.category}</span>
                      <span>{fmtDate(a.createdAt)}</span>
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
