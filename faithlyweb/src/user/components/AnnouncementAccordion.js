import { useState, useEffect, useRef } from 'react';
import '../styles/AnnouncementAccordion.css';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Circle } from 'lucide-react';


const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function AccordionItem({ item, isOpen, onToggle }) {
  const contentRef = useRef(null);

  return (
    <div className={`aa-item ${isOpen ? 'aa-item--open' : ''}`}>
      <button className="aa-item-header" onClick={onToggle}>
        <div className="aa-item-title-row">
          <span className="aa-item-title">{item.title}</span>
          <span className="aa-item-category">{item.category}</span>
        </div>
        <Circle className="aa-item-chevron" size={16} />
      </button>
      
      <div 
        className="aa-item-content-wrap" 
        style={{ height: isOpen ? contentRef.current?.scrollHeight + 'px' : '0px' }}
      >
        <div className="aa-item-content" ref={contentRef}>
          {item.image && (
            <div className="aa-item-image-wrapper" style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden' }}>
              <img src={item.image} alt="Announcement Banner" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
            </div>
          )}
          <p className="aa-item-body">{item.body}</p>
          
          {item.eventDate && (
            <div className="aa-item-event">
              <CalendarDays size={12} />
              <span>{fmtDateTime(item.eventDate)}</span>
            </div>
          )}
          
          <div className="aa-item-footer">
            <span className="aa-item-date">
              <CalendarDays size={12} />
              {fmtDate(item.createdAt)}
            </span>
            {item.createdBy && <span className="aa-item-author">· by {item.createdBy}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementAccordion({ inline = false }) {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const branch = profile?.branch || '';
    
    fetch(`${API}/api/admin/announcements${branch ? `?branch=${encodeURIComponent(branch)}` : ''}`)
      .then(r => r.json())
      .then(data => {
        if (isMounted && data.success) {
          setItems(data.announcements || []);
          const readIds = new Set(JSON.parse(localStorage.getItem('faithly_ann_read') || '[]'));
          (data.announcements || []).forEach(a => readIds.add(a._id));
          localStorage.setItem('faithly_ann_read', JSON.stringify(Array.from(readIds)));
        }
      })
      .catch(err => console.error('Failed to fetch announcements:', err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [profile?.branch]);

  const handleToggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  if (loading) {
    return (
      <div className={inline ? 'aa-inline-wrapper' : 'aa-container'}>
        {!inline && <h2 className="aa-section-title" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', margin: 0 }}>Church Updates</h2>}
        <div className="aa-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="aa-skeleton-item">
              <div className="user-skeleton" style={{ height: '48px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={inline ? 'aa-inline-wrapper' : 'aa-container'}>
        <div className="ann-empty" style={{ padding: '20px', textAlign: 'center' }}>
          <p className="ann-empty-icon">📢</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No announcements yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  if (inline) {
    return (
      <div className="aa-inline-wrapper">
        <div className="aa-list-wrapper">
          <div className="aa-list">
            {items.map(item => (
              <AccordionItem
                key={item._id}
                item={item}
                isOpen={openId === item._id}
                onToggle={() => handleToggle(item._id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aa-container user-fade-in" id="announcements-section">
      <div className="aa-header">
        <h2 className="aa-section-title">Church Updates</h2>
        <span className="aa-count">{items.length} updates</span>
      </div>
      
      <div className="aa-list-wrapper">
        <div className="aa-list">
          {items.map(item => (
            <AccordionItem 
              key={item._id} 
              item={item} 
              isOpen={openId === item._id} 
              onToggle={() => handleToggle(item._id)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
