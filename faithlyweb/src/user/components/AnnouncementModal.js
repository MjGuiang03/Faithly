import { useState, useEffect } from 'react';
import '../styles/AnnouncementModal.css';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Circle, X } from 'lucide-react';


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
        if (data.success) {
          setItems(data.announcements || []);
          const readIds = new Set(JSON.parse(localStorage.getItem('faithly_ann_read') || '[]'));
          (data.announcements || []).forEach(a => readIds.add(a._id));
          localStorage.setItem('faithly_ann_read', JSON.stringify(Array.from(readIds)));
        }
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
              <Circle size={20} color="white" />
            </div>
            <div>
              <p className="ann-modal-title">Announcements</p>
              <p className="ann-modal-subtitle">Latest updates from the church</p>
            </div>
          </div>
          <button className="ann-modal-close" onClick={onClose}>
            <X size={16} />
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
                {a.image && (
                  <div className="ann-item-image-wrapper" style={{ marginTop: '12px', marginBottom: '12px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={a.image} alt="Announcement Banner" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                  </div>
                )}
                <p className="ann-item-body">{a.body}</p>
                {a.eventDate && (
                  <div className="ann-item-event">
                    <CalendarDays size={12} />
                    <span>{fmtDateTime(a.eventDate)}</span>
                  </div>
                )}
                <div className="ann-item-footer">
                  <CalendarDays size={12} />
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
