import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import svgPaths from '../../imports/svg-icons';
import '../styles/Branches.css';
import Sidebar from '../components/Sidebar';
import { useState, useMemo, useEffect } from 'react';

// ─── Branch data ordered North → South ───────────────────────────────────────
// CAR (Cordillera) → Region II → Region I → Region III → NCR → Region IV-A → Region VII → Region XIII
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

// North-to-south region order
const REGION_ORDER = ['CAR', 'Region II', 'Region I', 'Region III', 'NCR', 'Region IV-A', 'Region VII', 'Region XIII'];

const DAY_COLORS = {
  Sunday: { background: '#eff4ff', color: '#155dfc' },
  Tuesday: { background: '#fdf4ff', color: '#9333ea' },
  Wednesday: { background: '#fff7ed', color: '#c2410c' },
  Friday: { background: '#fefce8', color: '#a16207' },
};

// Maps signup community values → branch names (to match profile.branch)
const COMMUNITY_MAP = {
  'Tabuk': 'Tabuk', 'Zapote': 'Zapote', 'Bliss': 'Bliss', 'Libanon': 'Libanon',
  'Batong Buhay': 'Batong Buhay', 'Balatoc': 'Balatoc', 'Lat-nog': 'Lat-nog',
  'Santiago City': 'Santiago City',
  'Lamao': 'Lamao', 'Lingey': 'Lingey', 'Cabaruyan': 'Cabaruyan', 'Ducligan': 'Ducligan',
  'Gangal': 'Gangal', 'Bila-Bila': 'Bila-Bila', 'Naguillian': 'Naguillian', 'Ud-udiao': 'Ud-udiao',
  'Villa Conchita': 'Villa Conchita', 'Ay-yeng Manabo': 'Ay-yeng Manabo', 'Dao-angan': 'Dao-angan',
  'Kilong-olao': 'Kilong-olao', 'Bao-yan': 'Bao-yan', 'Amti': 'Amti', 'Danac': 'Danac',
  'Bengued': 'Bengued', 'Sappaac': 'Sappaac', 'Saccaang': 'Saccaang',
  'Baguio': 'Baguio',
  'Montalban': 'Montalban',
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
  const { signOut, profile } = useAuth();

  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [search, setSearch] = useState('');
  const [drawerBranch, setDrawerBranch] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);

  // Resolve user's community branch name
  const userBranchName = profile?.branch ? (COMMUNITY_MAP[profile.branch] ?? profile.branch) : null;
  const userBranch = userBranchName ? branchData.find(b => b.name === userBranchName) : null;

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) navigate('/');
  };

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

  const regions = useMemo(() => {
    const present = REGION_ORDER.filter(r => branchData.some(b => b.region === r));
    return ['All', ...present];
  }, []);

  const provinces = useMemo(() => {
    const source = selectedRegion === 'All' ? branchData : branchData.filter(b => b.region === selectedRegion);
    // Keep north-to-south order within provinces
    const seen = new Set();
    const ordered = [];
    source.forEach(b => { if (!seen.has(b.province)) { seen.add(b.province); ordered.push(b.province); } });
    return ['All', ...ordered];
  }, [selectedRegion]);

  const filtered = useMemo(() => branchData.filter(b => {
    const matchR = selectedRegion === 'All' || b.region === selectedRegion;
    const matchP = selectedProvince === 'All' || b.province === selectedProvince;
    const matchS = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.province.toLowerCase().includes(search.toLowerCase());
    return matchR && matchP && matchS;
  }), [selectedRegion, selectedProvince, search]);

  // Group preserving north-to-south order
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(b => {
      const key = `${b.region}||${b.province}`;
      if (!map[key]) map[key] = { region: b.region, province: b.province, branches: [] };
      map[key].branches.push(b);
    });
    return Object.values(map);
  }, [filtered]);

  // Accurate stats
  const totalBranches = branchData.length;
  const totalRegions = [...new Set(branchData.map(b => b.region))].length;
  const totalProvinces = [...new Set(branchData.map(b => b.province))].length;
  const totalServices = branchData.reduce((s, b) => s + b.serviceTimes.length, 0);

  return (
    <div className="home-layout">
      <Sidebar />

      <div className="main-content">
        <div className="branches-header">
          <h1 className="page-title">Our Branches</h1>
          <p className="page-subtitle">Find a church location near you</p>
        </div>

        {/* ── My Community Banner ─────────────────────────────── */}
        {userBranch && (
          <div className="my-community-banner" onClick={() => openDrawer(userBranch)}>
            <div className="mcb-left">
              <div className="mcb-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12Z" stroke="#155dfc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="9" r="2.5" stroke="#155dfc" strokeWidth="1.8" />
                </svg>
              </div>
              <div className="mcb-text">
                <span className="mcb-eyebrow">Your Community</span>
                <span className="mcb-name">{userBranch.name}</span>
                <span className="mcb-province">{userBranch.province} · {userBranch.region}</span>
              </div>
            </div>
            <div className="mcb-right">
              <div className="mcb-services">
                {userBranch.serviceTimes.map((s, i) => (
                  <span key={i} className="mcb-day-tag" style={DAY_COLORS[s.day] || {}}>
                    {s.day.slice(0, 3)} {s.time}
                  </span>
                ))}
              </div>
              <svg className="mcb-chevron" fill="none" viewBox="0 0 16 16">
                <path d="m6 4 4 4-4 4" stroke="#155dfc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}

        {/* ── Stats ──────────────────────────────────────────── */}
        <div className="branches-stats">
          {[
            { label: 'Total Branches', value: totalBranches },
            { label: 'Regions', value: totalRegions },
            { label: 'Provinces', value: totalProvinces },
            { label: 'Weekly Services', value: totalServices },
          ].map(s => (
            <div key={s.label} className="branch-stat-card">
              <p className="branch-stat-label">{s.label}</p>
              <p className="branch-stat-value">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ─────────────────────────────────────── */}
        <div className="filter-bar">
          <div className="search-wrap">
            <svg className="search-icon" fill="none" viewBox="0 0 20 20">
              <path d="M17.5 17.5 13.875 13.875M15.833 9.167a6.667 6.667 0 1 1-13.333 0 6.667 6.667 0 0 1 13.333 0Z" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.67" />
            </svg>
            <input className="branch-search" placeholder="Search branches…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-group">
            <label className="filter-label">Region</label>
            <select className="filter-select" value={selectedRegion} onChange={e => { setSelectedRegion(e.target.value); setSelectedProvince('All'); }}>
              {regions.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Province</label>
            <select className="filter-select" value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)}>
              {provinces.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <span className="filter-count">{filtered.length} branch{filtered.length !== 1 ? 'es' : ''}</span>
        </div>

        {/* ── Branch Groups ──────────────────────────────────── */}
        {grouped.length === 0
          ? <div className="no-results">No branches match your filters.</div>
          : grouped.map(({ region, province, branches }) => (
            <div key={`${region}-${province}`} className="branch-group">
              <div className="branch-group-header">
                <span className="group-region-badge">{region}</span>
                <span className="group-province">{province}</span>
                <span className="group-count">{branches.length}</span>
              </div>

              <div className="branch-card-grid">
                {branches.map((branch, idx) => {
                  const isMyBranch = userBranchName && branch.name === userBranchName;
                  return (
                    <button
                      key={idx}
                      className={`branch-card-item${isMyBranch ? ' my-branch' : ''}`}
                      onClick={() => openDrawer(branch)}
                    >
                      {isMyBranch && <span className="my-branch-badge">My Community</span>}
                      <div className="bci-top">
                        <div className={`bci-icon${isMyBranch ? ' my-branch-icon' : ''}`}>
                          <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                            <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12Z" stroke={isMyBranch ? '#fff' : '#155dfc'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="9" r="2.5" stroke={isMyBranch ? '#fff' : '#155dfc'} strokeWidth="1.8" />
                          </svg>
                        </div>
                        <span className="bci-name">{branch.name}</span>
                        <svg className="bci-arrow" fill="none" viewBox="0 0 16 16">
                          <path d="m6 4 4 4-4 4" stroke={isMyBranch ? '#155dfc' : '#d1d5db'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="bci-days">
                        {branch.serviceTimes.map((s, i) => (
                          <span key={i} className="bci-day-tag" style={DAY_COLORS[s.day] || {}}>
                            {s.day.slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        }
      </div>

      {/* ── Drawer ─────────────────────────────────────────────── */}
      {drawerMounted && (
        <>
          <div className={`drawer-overlay${drawerVisible ? ' visible' : ''}`} onClick={closeDrawer} />
          <div className={`branch-drawer${drawerVisible ? ' visible' : ''}`}>
            <div className="drawer-header">
              <div className={`drawer-header-icon${userBranchName && drawerBranch?.name === userBranchName ? ' my-branch-icon' : ''}`}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12Z" stroke={userBranchName && drawerBranch?.name === userBranchName ? '#fff' : '#155dfc'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="9" r="2.5" stroke={userBranchName && drawerBranch?.name === userBranchName ? '#fff' : '#155dfc'} strokeWidth="1.8" />
                </svg>
              </div>
              <div className="drawer-header-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="drawer-branch-name">{drawerBranch?.name}</h2>
                  {userBranchName && drawerBranch?.name === userBranchName && (
                    <span className="drawer-my-badge">My Community</span>
                  )}
                </div>
                <div className="drawer-branch-meta">
                  <span className="detail-region-badge">{drawerBranch?.region}</span>
                  <span className="drawer-province">{drawerBranch?.province}</span>
                </div>
              </div>
              <button className="drawer-close" onClick={closeDrawer}>
                <svg fill="none" viewBox="0 0 20 20" width="16" height="16">
                  <path d="M15 5 5 15M5 5l10 10" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <p className="drawer-section-label">Contact Information</p>
                <div className="drawer-contact-list">
                  {[
                    { icon: '📍', val: `${drawerBranch?.name}, ${drawerBranch?.province}` },
                    { icon: '📞', val: '+63 90 000 0000' },
                    { icon: '✉️', val: 'puac@gmail.com' },
                  ].map(({ icon, val }) => (
                    <div key={val} className="drawer-contact-row">
                      <span className="drawer-contact-emoji">{icon}</span>
                      <span className="drawer-contact-val">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="drawer-section">
                <p className="drawer-section-label">Service Times</p>
                <div className="drawer-service-list">
                  {drawerBranch?.serviceTimes.map((s, i) => (
                    <div key={i} className="drawer-service-row">
                      <span className="drawer-day-pill" style={DAY_COLORS[s.day] || {}}>{s.day}</span>
                      <span className="drawer-time">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="drawer-section">
                <p className="drawer-section-label">Location</p>
                <div className="drawer-map-placeholder">
                  <svg width="28" height="28" fill="none" viewBox="0 0 48 48">
                    <path d="M24 42S10 29 10 18a14 14 0 1 1 28 0c0 11-14 24-14 24Z" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="24" cy="18" r="5" stroke="#d1d5db" strokeWidth="2.5" />
                  </svg>
                  <span>Map view coming soon</span>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="get-directions-btn">Get Directions</button>
              <button className="contact-btn">Contact Branch</button>
            </div>
          </div>
        </>
      )}

      <button className="chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}