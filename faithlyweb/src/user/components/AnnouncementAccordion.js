import { useState, useEffect, useRef } from 'react';
import '../styles/AnnouncementAccordion.css';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

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
        <svg 
          className="aa-item-chevron" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          width="16" height="16"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      <div 
        className="aa-item-content-wrap" 
        style={{ height: isOpen ? contentRef.current?.scrollHeight + 'px' : '0px' }}
      >
        <div className="aa-item-content" ref={contentRef}>
          <p className="aa-item-body">{item.body}</p>
          
          {item.eventDate && (
            <div className="aa-item-event">
              <svg fill="none" viewBox="0 0 16 16" width="12" height="12">
                <path d="M5.333 1.333v2.667M10.667 1.333v2.667M2 6.667h12M12.667 2.667H3.333c-.736 0-1.333.597-1.333 1.333v8c0 .736.597 1.333 1.333 1.333h9.334c.736 0 1.333-.597 1.333-1.333V4c0-.736-.597-1.333-1.333-1.333z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{fmtDateTime(item.eventDate)}</span>
            </div>
          )}
          
          <div className="aa-item-footer">
            <span className="aa-item-date">
              <svg fill="none" viewBox="0 0 16 16" width="12" height="12">
                <path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 4v4l2.667 1.333" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {fmtDate(item.createdAt)}
            </span>
            {item.createdBy && <span className="aa-item-author">· by {item.createdBy}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementAccordion() {
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
          // Automatically mark as read
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
      <div className="aa-container">
        <h2 className="aa-section-title">Church Updates</h2>
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

  if (items.length === 0) return null;

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
