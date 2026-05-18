import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Calendar, Clock, Edit, Globe, MapPin, Megaphone, Trash2 } from 'lucide-react';
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
    title: '', body: '', category: 'Divine Service',
    customCategory: '', // Added for 'Other' option
    eventDate: '', expiresAt: '',
    visibility: 'all', targetBranches: [],
    images: [] // Changed from imageBase64 to images array
  });

  const token = localStorage.getItem('adminToken');
  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

  const { data: announcementsData, isValidating: loadingAnnouncements, mutate: fetchAnnouncements } = useSWR(
    token ? `${API}/api/admin/announcements?admin=true` : null,
    fetcherSingle,
    { revalidateOnFocus: false, revalidateIfStale: true }
  );

  useEffect(() => {
    if (announcementsData && announcementsData.success) {
      setItems(announcementsData.announcements || []);
    }
  }, [announcementsData]);

  const { data: branchesData } = useSWR(
    token ? `${API}/api/admin/branches` : null,
    fetcherSingle,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (branchesData && branchesData.success) {
      setBranches((branchesData.branches || []).map(b => b.name));
    }
  }, [branchesData]);

  useEffect(() => {
    setLoading(loadingAnnouncements && !announcementsData);
  }, [loadingAnnouncements, announcementsData]);

  useEffect(() => {
    if (!token) { navigate('/'); }
  }, [navigate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Reset custom category if choosing a fixed one
      if (name === 'category' && value !== 'Other') {
        updated.customCategory = '';
      }
      return updated;
    });
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
    
    const predefined = [
      'General', 'Events', 'Services', 'Donations', 'Urgent',
      'Divine Service', 'Bible Study', 'Summer Youth Camp', 'Bible School',
      'Vacation Bible School', 'Annual Thanksgiving Anniversary', 'Youth Fellowship',
      'Men’s Fellowship', 'Women’s Fellowship', 'Children’s Fellowship'
    ];
    const isCustom = a.category && !predefined.includes(a.category);

    setForm({
      title: a.title || '',
      body: a.body || '',
      category: isCustom ? 'Other' : (a.category || 'Divine Service'),
      customCategory: isCustom ? a.category : '',
      eventDate: a.eventDate ? new Date(new Date(a.eventDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : '',
      visibility: a.visibility || 'all',
      targetBranches: a.targetBranches || [],
      images: Array.isArray(a.images) ? a.images : (a.image ? [a.image] : [])
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTemplate('banner');
    setForm({
      title: '', body: '', category: 'Divine Service',
      customCategory: '', eventDate: '', expiresAt: '',
      visibility: 'all', targetBranches: [],
      images: []
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

    const now = new Date();
    if (form.eventDate && new Date(form.eventDate) < now) {
      toast.error('Event date cannot be in the past');
      return;
    }
    if (form.expiresAt && new Date(form.expiresAt) < now) {
      toast.error('Auto-disappear date cannot be in the past');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload = {
        ...form,
        category: form.category === 'Other' ? form.customCategory : form.category,
        template,
        eventDate: form.eventDate || null,
        expiresAt: form.expiresAt || null,
      };
      // Remove helper field before sending
      delete payload.customCategory;
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

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentCount = form.images.length;
    const remaining = 8 - currentCount;
    if (remaining <= 0) {
      toast.error('Maximum 8 images allowed');
      e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`Only the first ${remaining} images were added (limit 8).`);
    }

    setSubmitting(true);
    try {
      const newImages = await Promise.all(
        filesToProcess.map(file => {
          return new Promise((resolve, reject) => {
            if (file.size > 2 * 1024 * 1024) {
              toast.error(`${file.name} is too large (>2MB)`);
              return resolve(null);
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Read failed'));
            reader.readAsDataURL(file);
          });
        })
      );

      const filtered = newImages.filter(img => img !== null);
      setForm(prev => ({ ...prev, images: [...prev.images, ...filtered] }));
    } catch {
      toast.error('Failed to process some images');
    } finally {
      setSubmitting(false);
      e.target.value = ''; // Reset for same file selection
    }
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
                <label className="admin-announce-label">Images / Banner (Max 8)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="admin-announce-input"
                  disabled={form.images.length >= 8}
                />
                
                {form.images.length > 0 && (
                  <div className="admin-announce-gallery">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="admin-announce-gallery-item">
                        <button type="button" className="admin-announce-remove-img" onClick={() => removeImage(idx)}>×</button>
                        <img src={img} alt="Preview" />
                      </div>
                    ))}
                  </div>
                )}
                <p className="admin-announce-img-count">{form.images.length} / 8 images added</p>
              </div>
            )}

            <div className="admin-announce-form-row">
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">Category</label>
                <select name="category" className="admin-announce-select" value={form.category} onChange={handleChange}>
                  <option value="Divine Service">Divine Service</option>
                  <option value="Bible Study">Bible Study</option>
                  <option value="Summer Youth Camp">Summer Youth Camp</option>
                  <option value="Bible School">Bible School</option>
                  <option value="Vacation Bible School">Vacation Bible School</option>
                  <option value="Annual Thanksgiving Anniversary">Annual Thanksgiving Anniversary</option>
                  <option value="Youth Fellowship">Youth Fellowship</option>
                  <option value="Men’s Fellowship">Men’s Fellowship</option>
                  <option value="Women’s Fellowship">Women’s Fellowship</option>
                  <option value="Children’s Fellowship">Children’s Fellowship</option>
                  <option disabled>──────────</option>
                  <option value="Other">Other (Type manually)</option>
                </select>

                {form.category === 'Other' && (
                  <input
                    type="text"
                    name="customCategory"
                    className="admin-announce-input admin-ann-mt-8"
                    placeholder="Enter custom category..."
                    value={form.customCategory}
                    onChange={handleChange}
                    required
                  />
                )}
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
                  <Calendar size={13} className="admin-ann-icon-align" />
                  Event Date &amp; Time
                </label>
                <input 
                  type="datetime-local" 
                  name="eventDate" 
                  className="admin-announce-input" 
                  value={form.eventDate} 
                  onChange={handleChange} 
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                />
              </div>
              <div className="admin-announce-form-group">
                <label className="admin-announce-label">
                  <Clock size={13} className="admin-ann-icon-align" />
                  Auto-Disappear Date
                </label>
                <input 
                  type="datetime-local" 
                  name="expiresAt" 
                  className="admin-announce-input" 
                  value={form.expiresAt} 
                  onChange={handleChange} 
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                />
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
        <div className="admin-announce-card admin-ann-card-col">

          {/* Live Preview */}
          <div className="admin-announce-card-header admin-ann-header-no-border">
            <p className="admin-announce-card-title">Live Preview</p>
          </div>
          <div className="admin-ann-pad-20">
            <div className="admin-announce-preview-wrap">
              <div className={`ann-card ann-card-${template}`}>
                {template === 'banner' && (
                  <div className="ann-banner">
                    {form.images.length > 0
                      ? (
                        <div className="ann-slider">
                          {form.images.map((img, i) => (
                            <img key={i} src={img} alt="" onClick={() => window.open(img, '_blank')} />
                          ))}
                        </div>
                      )
                      : <div className="ann-banner-placeholder"><Megaphone size={24} color="#1E3A8A" /></div>
                    }
                  </div>
                )}
                {template === 'side' && (
                  <div className="ann-side-img">
                    {form.images.length > 0
                      ? (
                        <div className="ann-slider">
                          {form.images.map((img, i) => (
                            <img key={i} src={img} alt="" onClick={() => window.open(img, '_blank')} />
                          ))}
                        </div>
                      )
                      : <div className="ann-banner-placeholder"><Megaphone size={20} color="#1E3A8A" /></div>
                    }
                  </div>
                )}
                <div className="ann-body">
                  <span className="ann-cat">{form.category === 'Other' ? (form.customCategory || 'Custom Category') : form.category}</span>
                  <p className="ann-title">
                    {form.title || <span className="admin-ann-placeholder-italic">Announcement title...</span>}
                  </p>
                  <p className="ann-msg">
                    {form.body || <span className="admin-ann-placeholder-italic">Your message will appear here.</span>}
                  </p>
                  <div className="ann-meta">
                    <span><Calendar size={10} /> {previewDate}</span>
                    <span><Globe size={10} /> {previewAudience}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-ann-divider" />

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
              <p className="admin-announce-card-title admin-ann-text-13">Recent Announcements</p>
              <p className="admin-ann-subtitle-11">Manage active and expired announcements</p>
            </div>
            <button 
              type="button"
              className="admin-announce-toggle-btn"
              onClick={() => setShowPosted(!showPosted)}
            >
              {showPosted ? 'Hide List' : 'View List'}
              <span className="admin-announce-active-badge admin-ann-active-badge-style">
                {items.filter(a => !isExpired(a.expiresAt)).length} active
              </span>
            </button>
          </div>

          <div className={`admin-announce-slide-container ${showPosted ? 'open' : ''}`}>
            <div className="admin-announce-slide-content">
              <div className="admin-announce-filter-tabs">
                {['All', 'Divine Service', 'Bible Study', 'Youth Fellowship', 'Men’s Fellowship', 'Women’s Fellowship'].map(cat => (
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
                      <div className="admin-ann-flex-1">
                        <div className="user-skeleton admin-ann-skel-title" />
                        <div className="user-skeleton admin-ann-skel-desc" />
                      </div>
                    </div>
                  ))
                ) : (filteredItems => filteredItems.length === 0 ? (
                  <div className="admin-announce-empty">
                    <Megaphone size={28} color="#cbd5e1" className="admin-ann-mb-8" />
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
                            <Edit size={14} />
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