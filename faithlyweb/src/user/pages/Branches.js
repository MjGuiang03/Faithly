import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

import '../styles/Branches.css';
import { useState, useMemo, useEffect } from 'react';
import { MapPin, Search, User, Globe, CalendarDays, X } from 'lucide-react';


// ─── Branch data ordered North → South ───────────────────────────────────────
const branchData = [
  // ── CAR: Kalinga ──
  { region: 'CAR', province: 'Kalinga', name: 'Tabuk', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }, { day: 'Wednesday', time: '7:00 PM' }] },
  { region: 'CAR', province: 'Kalinga', name: 'Zapote', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Kalinga', name: 'Bliss', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Kalinga', name: 'Libanon', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Kalinga', name: 'Batong Buhay', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Kalinga', name: 'Balatoc', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Kalinga', name: 'Lat-nog', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── CAR: Abra ──
  { region: 'CAR', province: 'Abra', name: 'Lamao', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Lingey', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Cabaruyan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Ducligan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Gangal', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Bila-Bila', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Naguillian', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Ud-udiao', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Villa Conchita', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Ay-yeng Manabo', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Dao-angan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Kilong-olao', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Bao-yan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Amti', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Danac', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Bengued', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }, { day: 'Wednesday', time: '7:00 PM' }] },
  { region: 'CAR', province: 'Abra', name: 'Sappaac', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'CAR', province: 'Abra', name: 'Saccaang', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── CAR: Benguet ──
  { region: 'CAR', province: 'Benguet', name: 'Baguio', serviceTimes: [{ day: 'Sunday', time: '8:00 AM & 10:00 AM' }, { day: 'Wednesday', time: '7:00 PM' }] },
  // ── Region II: Isabela ──
  { region: 'Region II', province: 'Isabela', name: 'Santiago City', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }, { day: 'Friday', time: '7:00 PM' }] },
  // ── Region I: Pangasinan ──
  { region: 'Region I', province: 'Pangasinan', name: 'Dagupan', serviceTimes: [{ day: 'Sunday', time: '10:00 AM' }, { day: 'Wednesday', time: '7:30 PM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Mangatarem', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Laoak Langka', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Orbiztondo', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Malasique, Bolaoit', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Taloyan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Binmaley', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'San Carlos', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }, { day: 'Friday', time: '7:00 PM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Manaoag', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Pozorrobio', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region I', province: 'Pangasinan', name: 'Alcala', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── Region III: Bulacan ──
  { region: 'Region III', province: 'Bulacan', name: 'Meycauayan City', serviceTimes: [{ day: 'Sunday', time: '8:00 AM & 10:00 AM' }, { day: 'Wednesday', time: '7:00 PM' }, { day: 'Friday', time: '6:00 PM' }] },
  { region: 'Region III', province: 'Bulacan', name: 'Camalig', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region III', province: 'Bulacan', name: 'San Jose Del Monte', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }, { day: 'Wednesday', time: '7:30 PM' }] },
  // ── Region III: Tarlac ──
  { region: 'Region III', province: 'Tarlac', name: 'Pacpaco, San Manuel', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region III', province: 'Tarlac', name: 'Victoria', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── Region III: Nueva Ecija ──
  { region: 'Region III', province: 'Nueva Ecija', name: 'Bambanaba, Cuyapo', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── NCR ──
  { region: 'NCR', province: 'NCR', name: 'Valenzuela City', serviceTimes: [{ day: 'Sunday', time: '9:00 AM & 11:00 AM' }, { day: 'Tuesday', time: '7:00 PM' }] },
  { region: 'NCR', province: 'NCR', name: 'Tandang Sora, Quezon City', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }, { day: 'Wednesday', time: '7:00 PM' }] },
  { region: 'NCR', province: 'NCR', name: 'COA, Quezon City', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'NCR', province: 'NCR', name: 'Payatas, Quezon City', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'NCR', province: 'NCR', name: 'Malaria, Caloocan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── Region IV-A: Rizal ──
  { region: 'Region IV-A', province: 'Rizal', name: 'Montalban', serviceTimes: [{ day: 'Sunday', time: '9:30 AM' }, { day: 'Friday', time: '7:00 PM' }] },
  // ── Region VII: Cebu ──
  { region: 'Region VII', province: 'Cebu', name: 'Mandaue', serviceTimes: [{ day: 'Sunday', time: '9:00 AM & 11:00 AM' }, { day: 'Wednesday', time: '7:00 PM' }] },
  { region: 'Region VII', province: 'Cebu', name: 'Li-loan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region VII', province: 'Cebu', name: 'Calero', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region VII', province: 'Cebu', name: 'Compostela', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── Region XIII: Agusan Del Norte ──
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'Butuan City', serviceTimes: [{ day: 'Sunday', time: '9:00 AM & 11:00 AM' }, { day: 'Wednesday', time: '7:00 PM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'RTR', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'Jabonga, Bangonay', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'Kasiklan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'San Mateo', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'Fatima Kim.13', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'Bayugan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'Ibuan', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Agusan Del Norte', name: 'Balubo', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── Region XIII: Surigao Del Norte ──
  { region: 'Region XIII', province: 'Surigao Del Norte', name: 'Alegria', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Surigao Del Norte', name: 'Bonifacio', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Surigao Del Norte', name: 'Matin-ao', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  { region: 'Region XIII', province: 'Surigao Del Norte', name: 'Ipil', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
  // ── Region XIII: Surigao Del Sur ──
  { region: 'Region XIII', province: 'Surigao Del Sur', name: 'Kinabigtasan Tago', serviceTimes: [{ day: 'Sunday', time: '9:00 AM' }] },
];

const REGION_ORDER = ['CAR', 'Region II', 'Region I', 'Region III', 'NCR', 'Region IV-A', 'Region VII', 'Region XIII'];

const REGION_LABELS = {
  'CAR': 'Cordillera Administrative Region',
  'Region II': 'Cagayan Valley',
  'Region I': 'Ilocos Region',
  'Region III': 'Central Luzon',
  'NCR': 'National Capital Region',
  'Region IV-A': 'CALABARZON',
  'Region VII': 'Central Visayas',
  'Region XIII': 'Caraga Region',
};

const DAY_COLORS = {
  Sunday: { background: '#eff4ff', color: '#155dfc' },
  Tuesday: { background: '#fdf4ff', color: '#9333ea' },
  Wednesday: { background: '#fff7ed', color: '#c2410c' },
  Friday: { background: '#fefce8', color: '#a16207' },
};

const COMMUNITY_MAP = {
  'Tabuk': 'Tabuk', 'Zapote': 'Zapote', 'Bliss': 'Bliss', 'Libanon': 'Libanon',
  'Batong Buhay': 'Batong Buhay', 'Balatoc': 'Balatoc', 'Lat-nog': 'Lat-nog',
  'Santiago City': 'Santiago City',
  'Lamao': 'Lamao', 'Lingey': 'Lingey', 'Cabaruyan': 'Cabaruyan', 'Ducligan': 'Ducligan',
  'Gangal': 'Gangal', 'Bila-Bila': 'Bila-Bila', 'Naguillian': 'Naguillian', 'Ud-udiao': 'Ud-udiao',
  'Villa Conchita': 'Villa Conchita', 'Ay-yeng Manabo': 'Ay-yeng Manabo', 'Dao-angan': 'Dao-angan',
  'Kilong-olao': 'Kilong-olao', 'Bao-yan': 'Bao-yan', 'Amti': 'Amti', 'Danac': 'Danac',
  'Bengued': 'Bengued', 'Sappaac': 'Sappaac', 'Saccaang': 'Saccaang',
  'Baguio': 'Baguio', 'Montalban': 'Montalban',
  'Valenzuela City': 'Valenzuela City',
  'Tandang Sora, Quezon City': 'Tandang Sora, Quezon City',
  'COA, Quezon City': 'COA, Quezon City',
  'Payatas, Quezon City': 'Payatas, Quezon City',
  'Malaria, Caloocan': 'Malaria, Caloocan',
  'Meycauayan City': 'Meycauayan City', 'Camalig': 'Camalig', 'San Jose Del Monte': 'San Jose Del Monte',
  'Pacpaco, San Manuel': 'Pacpaco, San Manuel', 'Victoria': 'Victoria',
  'Bambanaba, Cuyapo': 'Bambanaba, Cuyapo',
  'Dagupan': 'Dagupan', 'Mangatarem': 'Mangatarem', 'Laoak Langka': 'Laoak Langka',
  'Orbiztondo': 'Orbiztondo', 'Malasiqui, Bolaoit': 'Malasique, Bolaoit', 'Taloyan': 'Taloyan',
  'Binmaley': 'Binmaley', 'San Carlos': 'San Carlos', 'Manaoag': 'Manaoag',
  'Pozorrubio': 'Pozorrobio', 'Alcala': 'Alcala',
  'Butuan City': 'Butuan City', 'RTR': 'RTR', 'Jabonga, Bangonay': 'Jabonga, Bangonay',
  'Kasiklan': 'Kasiklan', 'San Mateo': 'San Mateo', 'Fatima Kim.13': 'Fatima Kim.13',
  'Bayugan': 'Bayugan', 'Ibuan': 'Ibuan', 'Balubo': 'Balubo',
  'Mandaue': 'Mandaue', 'Liloan': 'Li-loan', 'Calero': 'Calero', 'Compostela': 'Compostela',
  'Alegria': 'Alegria', 'Bonifacio': 'Bonifacio', 'Matin-ao': 'Matin-ao', 'Ipil': 'Ipil',
  'Kinabigtasan, Tago': 'Kinabigtasan Tago',
};

export default function Branches() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState(null); // key of expanded region
  const [drawerBranch, setDrawerBranch] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [isClosingRegion, setIsClosingRegion] = useState(false);

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

  // Stats
  const totalBranches = branchData.length;

  // Region summary cards
  const regionSummaries = useMemo(() => {
    return REGION_ORDER.map(r => {
      const branches = branchData.filter(b => b.region === r);
      const provinces = [...new Set(branches.map(b => b.province))];
      return { key: r, label: REGION_LABELS[r] || r, count: branches.length, provinces };
    });
  }, []);

  // Search-filtered branches when a region is expanded
  const expandedBranches = useMemo(() => {
    if (!activeRegion) return [];
    return branchData.filter(b => {
      const matchR = b.region === activeRegion;
      const matchS = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.province.toLowerCase().includes(search.toLowerCase());
      return matchR && matchS;
    });
  }, [activeRegion, search]);

  // Search across all branches (when search is active and no region selected)
  const searchResults = useMemo(() => {
    if (!search) return [];
    return branchData.filter(b =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.province.toLowerCase().includes(search.toLowerCase()) ||
      b.region.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const activeRegionData = activeRegion ? regionSummaries.find(r => r.key === activeRegion) : null;

  const handleRegionClick = (key) => {
    if (activeRegion === key) {
      handleClearRegion();
    } else {
      setActiveRegion(key);
      setSearch('');
    }
  };

  const handleClearRegion = () => {
    setIsClosingRegion(true);
    setTimeout(() => {
      setActiveRegion(null);
      setSearch('');
      setIsClosingRegion(false);
    }, 220); // Sync with CSS animation duration
  };

  const displayCount = search && !activeRegion
    ? searchResults.length
    : activeRegion
      ? expandedBranches.length
      : totalBranches;

  return (
    <>
      <div className="user-branches-container">

        {/* ── My Community Spotlight ──────────────────────────── */}
        {userBranch ? (
          <div className="ubr-community-spotlight user-fade-in">
            <div className="ubr-spotlight-details">
              <div className="ubr-spotlight-tag">Your Home Community</div>
              <h2 className="ubr-spotlight-name">{userBranch.name}</h2>
              <div className="ubr-spotlight-info">
                <div className="ubr-info-item">
                  <Globe size={16} />
                  <span>{userBranch.region} · {userBranch.province}</span>
                </div>
                <div className="ubr-info-item">
                  <CalendarDays size={16} />
                  <div className="ubr-service-list">
                    {userBranch.serviceTimes.map((s, idx) => (
                      <span key={idx} className="ubr-service-tag">
                        <strong>{s.day}</strong> {s.time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ubr-spotlight-actions">
                <button className="ubr-cta ubr-cta--primary" onClick={() => openDrawer(userBranch)}>View Complete Profile</button>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(userBranch.name + ', ' + userBranch.province)},Philippines`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ubr-cta ubr-cta--outline"
                >
                  Get Directions
                </a>
              </div>
            </div>
            <div className="ubr-spotlight-map">
              <iframe
                title="Branch Map"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(userBranch.name + ', ' + userBranch.province)},Philippines&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
              />
            </div>
          </div>
        ) : (
          <div className="ubr-no-community-placeholder user-fade-in">
            <div className="ubr-placeholder-icon">🏠</div>
            <h3>Highlight Your Community</h3>
            <p>Select your home community in settings to pins your local church details and service schedules right here.</p>
            <button className="ubr-cta ubr-cta--primary" onClick={() => navigate('/settings')} style={{ marginTop: '16px' }}>
              Set Home Community
            </button>
          </div>
        )}

        {/* ── Search Bar ─────────────────────────────────────── */}
        <div className="ubr-search-row">
          <div className="ubr-search-wrap">
            <Search className="ubr-search-icon" size={20} color="#99A1AF" />
            <input
              className="ubr-search-input"
              placeholder="Search branches…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="ubr-branch-count">{displayCount} {displayCount === 1 ? 'branch' : 'branches'}</span>
        </div>

        {/* ── Region Cards Grid ──────────────────────────────── */}
        {(!search || activeRegion) && (
          <>
            <p className="ubr-select-hint">Select a region to browse branches</p>
            <div className="ubr-region-grid">
              {regionSummaries.map(r => (
                <button
                  key={r.key}
                  className={`ubr-region-card${activeRegion === r.key ? ' ubr-region-card--active' : ''}`}
                  onClick={() => handleRegionClick(r.key)}
                >
                  <span className="ubr-region-badge">{r.key}</span>
                  <span className="ubr-region-name">{r.label}</span>
                  <span className="ubr-region-count">{r.count} {r.count === 1 ? 'branch' : 'branches'}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Expanded Region Branch List ────────────────────── */}
        {activeRegion && (
          <div className={`ubr-expanded-region ${isClosingRegion ? 'ubr-expanded-region--closing' : ''}`}>
            <div className="ubr-expanded-header">
              <div className="ubr-expanded-title-wrap">
                <span className="ubr-expanded-name">{REGION_LABELS[activeRegion]} ({activeRegion})</span>
                <span className="ubr-expanded-meta">
                  {activeRegionData?.count} branches · {activeRegionData?.provinces.join(', ')}
                </span>
              </div>
              <button className="ubr-clear-btn" onClick={handleClearRegion}>
                Clear ×
              </button>
            </div>

            {expandedBranches.length === 0 ? (
              <div className="ubr-no-results">No branches match your search.</div>
            ) : (
              <div className="ubr-branch-list-grid">
                {expandedBranches.map((branch, idx) => {
                  const isMyBranch = userBranchName && branch.name === userBranchName;
                  return (
                    <button
                      key={idx}
                      className={`ubr-branch-row${isMyBranch ? ' ubr-branch-row--mine' : ''}`}
                      onClick={() => openDrawer(branch)}
                    >
                      <div className="ubr-branch-row-left">
                        <MapPin className="ubr-pin-icon" size={14} />
                        <div className="ubr-branch-info">
                          <span className="ubr-branch-name">{branch.name}</span>
                          <div className="ubr-branch-days">
                            {branch.serviceTimes.map((s, i) => (
                              <span key={i} className="ubr-day-pill" style={DAY_COLORS[s.day] || {}}>
                                {s.day.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {isMyBranch && <span className="ubr-my-tag">My Community</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Global Search Results (no region selected) ────── */}
        {search && !activeRegion && (
          <div className={`ubr-expanded-region ${isClosingRegion ? 'ubr-expanded-region--closing' : ''}`}>
            <div className="ubr-expanded-header">
              <span className="ubr-expanded-name">Search results for "{search}"</span>
              <button className="ubr-clear-btn" onClick={() => setSearch('')}>Clear ×</button>
            </div>
            {searchResults.length === 0 ? (
              <div className="ubr-no-results">No branches match your search.</div>
            ) : (
              <div className="ubr-branch-list-grid">
                {searchResults.map((branch, idx) => {
                  const isMyBranch = userBranchName && branch.name === userBranchName;
                  return (
                    <button
                      key={idx}
                      className={`ubr-branch-row${isMyBranch ? ' ubr-branch-row--mine' : ''}`}
                      onClick={() => openDrawer(branch)}
                    >
                      <div className="ubr-branch-row-left">
                        <MapPin className="ubr-pin-icon" size={14} />
                        <div className="ubr-branch-info">
                          <span className="ubr-branch-name">{branch.name}</span>
                          <div className="ubr-branch-days">
                            {branch.serviceTimes.map((s, i) => (
                              <span key={i} className="ubr-day-pill" style={DAY_COLORS[s.day] || {}}>
                                {s.day.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="ubr-region-tag">{branch.region}</span>
                      {isMyBranch && <span className="ubr-my-tag">My Community</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

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