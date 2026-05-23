
import { useAuth } from '../../context/AuthContext';

import '../styles/Branches.css';
import { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import useSWR from 'swr';
import { MapPin, Search, X, ChevronDown, Check } from 'lucide-react';
import { branchData, REGION_ORDER, REGION_LABELS, DAY_COLORS, COMMUNITY_MAP } from '../components/branchData';
import { useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import { Calendar } from 'lucide-react';

const BranchMap = lazy(() => import('../components/BranchMap'));


export default function Branches() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [drawerBranch, setDrawerBranch] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [openRegions, setOpenRegions] = useState(new Set(['CAR']));
  const [activeBranch, setActiveBranch] = useState(null);
  const flyToRef = useRef(null);


  const token = localStorage.getItem('token');
  const fetcher = (url) => fetch(url).then(res => res.json());
  const authFetcher = async (url) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  };

  const { data: branchesData } = useSWR(`${API}/api/public/branches`, fetcher, { revalidateOnFocus: false });
  const { data: eventsData } = useSWR(`${API}/api/admin/announcements`, fetcher, { revalidateOnFocus: false });
  const { data: visitedData } = useSWR(token ? `${API}/api/attendance/visited-stats` : null, authFetcher, { revalidateOnFocus: false });

  const visitedStats = useMemo(() => {
    return visitedData?.success ? visitedData.visited : {};
  }, [visitedData]);

  const branchStats = useMemo(() => {
    const stats = {};
    if (branchesData?.success) {
      branchesData.branches.forEach(b => {
        stats[b.name] = { members: Number(b.members) || 0, officers: Number(b.officers) || 0 };
      });
    }
    return stats;
  }, [branchesData]);

  const events = useMemo(() => {
    return eventsData?.success && Array.isArray(eventsData.announcements) ? eventsData.announcements : [];
  }, [eventsData]);

  const branchEvents = useMemo(() => {
    if (!drawerBranch || !events) return [];
    return events.filter(ev => {
      if (!ev.targetBranches || ev.targetBranches.length === 0 || ev.targetBranches === 'all') return true;
      if (Array.isArray(ev.targetBranches)) return ev.targetBranches.includes(drawerBranch.name);
      return ev.targetBranches === drawerBranch.name;
    });
  }, [drawerBranch, events]);

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
                      {filtered.map((branch, i) => {
                        const isVisited = visitedStats[branch.name]?.count > 0;
                        return (
                          <button key={i}
                            className={`ubr-map-branch-item ${activeBranch?.name === branch.name ? 'active' : ''} ${userBranch?.name === branch.name ? 'mine' : ''}`}
                            onClick={() => { flyToRef.current?.(branch); setActiveBranch(branch); }}>
                            <MapPin size={12} />
                            <span>{branch.name}</span>
                            {userBranch?.name === branch.name && <span className="ubr-my-tag">Mine</span>}
                            {isVisited && <span className="ubr-visited-tag">✓ Visited</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="ubr-map-area" style={{ position: 'relative', overflow: 'hidden' }}>
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', color: '#64748b', fontSize: '14px' }}>Loading Map...</div>}>
            <BranchMap
              branches={branchData}
              userBranch={userBranch}
              onBranchClick={(branch) => { openDrawer(branch); }}
              flyToRef={flyToRef}
            />
          </Suspense>
          
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
                        { icon: '✉️', val: 'isangdiwa@gmail.com' },
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
                    <p className="user-drawer-section-label">Community Statistics</p>
                    <div className="user-drawer-stats-grid">
                      <div className="user-drawer-stat-card">
                        <div className="user-drawer-stat-val">
                          {branchStats[drawerBranch?.name]?.members || 0}
                        </div>
                        <div className="user-drawer-stat-label">MEMBERS</div>
                      </div>
                      <div className="user-drawer-stat-card">
                        <div className="user-drawer-stat-val">
                          {branchStats[drawerBranch?.name]?.officers || 0}
                        </div>
                        <div className="user-drawer-stat-label">OFFICERS</div>
                      </div>
                    </div>
                  </div>

                  {visitedStats[drawerBranch?.name] && (
                    <div className="user-drawer-section">
                      <p className="user-drawer-section-label">Your Visit History</p>
                      <div className="user-drawer-visit-card">
                        <div className="user-drawer-visit-header">
                          <span className="user-drawer-visit-badge">
                            <Check size={10} style={{ marginRight: '3px', strokeWidth: 3 }} />
                            Visited
                          </span>
                          <span className="user-drawer-visit-count">
                            {visitedStats[drawerBranch.name].count} {visitedStats[drawerBranch.name].count === 1 ? 'visit' : 'visits'}
                          </span>
                        </div>
                        <div className="user-drawer-visit-meta">
                          Last visited on <strong>{visitedStats[drawerBranch.name].lastVisited}</strong>
                        </div>

                        <div className="user-drawer-visit-toggle-wrap">
                          <button 
                            className="user-drawer-visit-toggle-btn"
                            onClick={() => navigate('/attendance', { state: { highlightBranch: drawerBranch.name } })}
                          >
                            View Visit History
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="user-drawer-section">
                    <p className="user-drawer-section-label">Upcoming Events</p>
                    {branchEvents.length > 0 ? (
                      <div className="user-drawer-events-list">
                        {branchEvents.slice(0, 3).map((ev, idx) => (
                          <div key={idx} className="user-drawer-event-card">
                            <div className="user-drawer-event-icon">
                              <Calendar size={18} color="#1E3A8A" />
                            </div>
                            <div className="user-drawer-event-info">
                              <div className="user-drawer-event-title">
                                {ev.title}
                              </div>
                              <div className="user-drawer-event-meta">
                                <span>{new Date(ev.createdAt).toLocaleDateString()}</span>
                                {ev.category && (
                                  <>
                                    <span>•</span>
                                    <span className="user-drawer-event-cat">{ev.category}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '0.8px solid var(--border)', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>No upcoming events scheduled.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="user-drawer-footer">
                  <button className="user-get-directions-btn">Get Directions</button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}