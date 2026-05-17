import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

import '../styles/Branches.css';
import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, Search, Globe, CalendarDays, X, ChevronDown } from 'lucide-react';
import BranchMap from '../components/BranchMap';
import { branchData, REGION_ORDER, REGION_LABELS, DAY_COLORS, COMMUNITY_MAP } from '../components/branchData';


export default function Branches() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [search, setSearch] = useState('');
  const [drawerBranch, setDrawerBranch] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [openRegions, setOpenRegions] = useState(new Set(['CAR']));
  const [activeBranch, setActiveBranch] = useState(null);
  const flyToRef = useRef(null);

  const toggleRegion = (key) => {
    setOpenRegions(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Resolve user's community branch more robustly
  const userBranch = useMemo(() => {
    const rawBranch = profile?.branch || profile?.community;
    if (!rawBranch) return null;

    const normalizedUserBranch = rawBranch.toLowerCase().replace(/\s*city\s*/gi, '').trim();

    // 1. Try inclusive match first (e.g. "Meycauayan" matches "Meycauayan City")
    let match = branchData.find(b => {
      const normalizedName = b.name.toLowerCase().replace(/\s*city\s*/gi, '').trim();
      return normalizedName.includes(normalizedUserBranch) || normalizedUserBranch.includes(normalizedName);
    });

    // 2. Try mapped match as fallback
    if (!match) {
      const mappedName = COMMUNITY_MAP[rawBranch];
      if (mappedName) {
        match = branchData.find(b => b.name.toLowerCase() === mappedName.toLowerCase());
      }
    }

    return match || null;
  }, [profile]);

  const userBranchName = userBranch?.name || null;

  const openDrawer = (branch) => {
    setDrawerBranch(branch);
    setDrawerMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setDrawerVisible(true)));
  };
  const closeDrawer = () => {
    setDrawerVisible(false);
    setTimeout(() => { setDrawerMounted(false); setDrawerBranch(null); }, 300);
  };
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);


  return (
    <>
      <div className="ubr-map-shell">
        {/* Left sidebar */}
        <div className="ubr-map-sidebar">
          {/* Home branch banner */}
          {userBranch && (
            <div className="ubr-map-home-banner" onClick={() => { flyToRef.current?.(userBranch); setActiveBranch(userBranch); }}>
              <div className="ubr-map-home-label">Your Home Community</div>
              <div className="ubr-map-home-name">{userBranch.name}</div>
              <div className="ubr-map-home-meta">{userBranch.region} · {userBranch.province}</div>
            </div>
          )}

          {/* Search */}
          <div style={{ padding: '12px 14px', borderBottom: '0.8px solid var(--border)', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search className="ubr-search-icon" size={16} />
              <input className="ubr-search-input" placeholder="Search communities…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Region accordion list */}
          <div className="ubr-map-region-list">
            {REGION_ORDER.map(regionKey => {
              const regionBranches = branchData.filter(b => b.region === regionKey);
              const filtered = search
                ? regionBranches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
                : regionBranches;
              if (filtered.length === 0) return null;
              const isOpen = openRegions.has(regionKey);
              return (
                <div key={regionKey} className="ubr-map-region-group">
                  <button className="ubr-map-region-header"
                    onClick={() => toggleRegion(regionKey)}>
                    <span className="ubr-region-badge">{regionKey}</span>
                    <span className="ubr-map-region-label">{REGION_LABELS[regionKey]}</span>
                    <span className="ubr-map-region-count">{filtered.length}</span>
                    <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform 0.2s', color: '#9aa3b8', marginLeft: 'auto' }} />
                  </button>
                  {isOpen && (
                    <div className="ubr-map-branch-list">
                      {filtered.map((branch, i) => (
                        <button key={i}
                          className={`ubr-map-branch-item ${activeBranch?.name === branch.name ? 'active' : ''} ${userBranch?.name === branch.name ? 'mine' : ''}`}
                          onClick={() => { flyToRef.current?.(branch); setActiveBranch(branch); }}>
                          <MapPin size={12} />
                          <span>{branch.name}</span>
                          {userBranch?.name === branch.name && <span className="ubr-my-tag">Mine</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="ubr-map-area">
          <BranchMap
            branches={branchData}
            userBranch={userBranch}
            onBranchClick={(branch) => { openDrawer(branch); }}
            flyToRef={flyToRef}
          />
        </div>
      </div>

      {/* ── Drawer ─────────────────────────────────────────────── */}
      {drawerMounted && (
        <>
          <div className={`user-drawer-overlay${drawerVisible ? ' user-visible' : ''}`} onClick={closeDrawer} />
          <div className={`user-branch-drawer${drawerVisible ? ' user-visible' : ''}`}>
            <div className="user-drawer-header">
              <div className={`user-drawer-header-icon${userBranchName && drawerBranch?.name === userBranchName ? ' user-my-branch-icon' : ''}`}>
                <MapPin size={20} />
              </div>
              <div className="user-drawer-header-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="user-drawer-branch-name">{drawerBranch?.name}</h2>
                  {userBranchName && drawerBranch?.name === userBranchName && (
                    <span className="user-drawer-my-badge">My Community</span>
                  )}
                </div>
                <div className="user-drawer-branch-meta">
                  <span className="user-detail-region-badge">{drawerBranch?.region}</span>
                  {drawerBranch?.province !== drawerBranch?.region && (
                    <span className="user-drawer-province">{drawerBranch?.province}</span>
                  )}
                </div>
              </div>
              <button className="user-drawer-close" onClick={closeDrawer}>
                <X size={18} color="#6b7280" />
              </button>
            </div>

            <div className="user-drawer-body">
              <div className="user-drawer-section">
                <p className="user-drawer-section-label">Contact Information</p>
                <div className="user-drawer-contact-list">
                  {[
                    { icon: '📍', val: `${drawerBranch?.name}, ${drawerBranch?.province}` },
                    { icon: '📞', val: '+63 90 000 0000' },
                    { icon: '✉️', val: 'puac@gmail.com' },
                  ].map(({ icon, val }) => (
                    <div key={val} className="user-drawer-contact-row">
                      <span className="user-drawer-contact-emoji">{icon}</span>
                      <span className="user-drawer-contact-val">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="user-drawer-section">
                <p className="user-drawer-section-label">Service Times</p>
                <div className="user-drawer-service-list">
                  {drawerBranch?.serviceTimes.map((s, i) => (
                    <div key={i} className="user-drawer-service-row">
                      <span className="user-drawer-day-pill" style={DAY_COLORS[s.day] || {}}>{s.day}</span>
                      <span className="user-drawer-time">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="user-drawer-section">
                <p className="user-drawer-section-label">Location</p>
                <div className="user-drawer-map-container" style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc' }}>
                  <iframe
                    title={`${drawerBranch?.name} Map`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(drawerBranch?.name + ', ' + drawerBranch?.province)},Philippines&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                </div>
              </div>
            </div>

            <div className="user-drawer-footer">
              <button className="user-get-directions-btn">Get Directions</button>
              <button className="user-contact-btn">Contact Branch</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}