import { useState, useEffect } from 'react';
import '../styles/AnnouncementModal.css';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function AnnouncementModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const branch = user?.branch || '';
    fetch(`${API}/api/admin/announcements${branch ? `?branch=${encodeURIComponent(branch)}` : ''}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setItems(data.announcements || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, user?.branch]);

  if (!isOpen) return null;

  return (
    <div className="ann-modal-overlay" onClick={onClose}>
      <div className="ann-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ann-modal-header">
          <div className="ann-modal-header-left">
            <div className="ann-modal-icon">
              <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <p className="ann-modal-title">Announcements</p>
              <p className="ann-modal-subtitle">Latest updates from the church</p>
            </div>
          </div>
          <button className="ann-modal-close" onClick={onClose}>
            <svg fill="none" viewBox="0 0 24 24" width="16" height="16">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="ann-modal-body">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="ann-item">
                <div className="user-skeleton" style={{ height: '16px', width: '60%', marginBottom: '10px', borderRadius: '6px' }} />
                <div className="user-skeleton" style={{ height: '13px', width: '90%', marginBottom: '6px', borderRadius: '6px' }} />
                <div className="user-skeleton" style={{ height: '13px', width: '70%', borderRadius: '6px' }} />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="ann-empty">
              <p className="ann-empty-icon">📢</p>
              <p>No announcements yet. Check back soon!</p>
            </div>
          ) : (
            items.map((a) => (
              <div key={a._id} className="ann-item">
                <div className="ann-item-header">
                  <h3 className="ann-item-title">{a.title}</h3>
                  <span className="ann-item-category">{a.category}</span>
                </div>
                <p className="ann-item-body">{a.body}</p>
                {a.eventDate && (
                  <div className="ann-item-event">
                    <svg fill="none" viewBox="0 0 16 16" width="12" height="12">
                      <path d="M5.333 1.333v2.667M10.667 1.333v2.667M2 6.667h12M12.667 2.667H3.333c-.736 0-1.333.597-1.333 1.333v8c0 .736.597 1.333 1.333 1.333h9.334c.736 0 1.333-.597 1.333-1.333V4c0-.736-.597-1.333-1.333-1.333z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{fmtDateTime(a.eventDate)}</span>
                  </div>
                )}
                <div className="ann-item-footer">
                  <svg fill="none" viewBox="0 0 16 16" width="12" height="12">
                    <path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 4v4l2.667 1.333" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{fmtDate(a.createdAt)}</span>
                  {a.createdBy && <span>· by {a.createdBy}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
