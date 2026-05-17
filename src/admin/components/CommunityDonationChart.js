import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Filter, X } from 'lucide-react';
import '../styles/CommunityDonationChart.css';

const BASE_COMMUNITIES = [
  'Tabuk', 'Zapote', 'Bliss', 'Libanon', 'Batong Buhay', 'Balatoc', 'Lat-nog',
  'Lamao', 'Lingey', 'Cabaruyan', 'Ducligan', 'Gangal', 'Bila-Bila', 'Naguillian',
  'Ud-udiao', 'Villa Conchita', 'Ay-yeng Manabo', 'Dao-angan', 'Kilong-olao', 'Bao-yan',
  'Amti', 'Danac', 'Bengued', 'Sappaac', 'Saccaang', 'Baguio', 'Santiago City',
  'Dagupan', 'Mangatarem', 'Laoak Langka', 'Orbiztondo', 'Malasique, Bolaoit',
  'Taloyan', 'Binmaley', 'San Carlos', 'Manaoag', 'Pozorrobio', 'Alcala',
  'Meycauayan City', 'Camalig', 'San Jose Del Monte', 'Pacpaco, San Manuel',
  'Victoria', 'Bambanaba, Cuyapo', 'Valenzuela City', 'Tandang Sora, Quezon City',
  'COA, Quezon City', 'Payatas, Quezon City', 'Malaria, Caloocan', 'Montalban',
  'Mandaue', 'Li-loan', 'Calero', 'Compostela', 'Butuan City', 'RTR',
  'Jabonga, Bangonay', 'Kasiklan', 'San Mateo', 'Fatima Kim.13', 'Bayugan',
  'Ibuan', 'Balubo', 'Alegria', 'Bonifacio', 'Matin-ao', 'Ipil', 'Kinabigtasan Tago'
];

const baseColors = ['#1e3a5f','#2d5282','#3a6ba3','#4a90c8','#6aaed6','#92c5e3','#b8d8ed','#0f6e56','#1d9e75','#5dcaa5','#854f0b','#ba7517','#ef9f27'];
const getColor = (i) => baseColors[i % baseColors.length];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="cdc-custom-tooltip">
        <p className="cdc-tooltip-label">{payload[0].payload.name}</p>
        <p className="cdc-tooltip-val">₱{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function CommunityDonationChart({ communityBreakdown = {} }) {
  // Dynamically map base communities to their actual amounts from the backend
  const allCommunities = useMemo(() => {
    const list = BASE_COMMUNITIES.map(name => ({
      name,
      amount: communityBreakdown[name] || 0
    }));
    // Sort descending by amount so top givers are first
    return list.sort((a, b) => b.amount - a.amount);
  }, [communityBreakdown]);

  const [chartType, setChartType] = useState('bar');
  const [selected, setSelected] = useState(new Set(BASE_COMMUNITIES));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCommunities = useMemo(() => {
    return allCommunities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, allCommunities]);

  const toggleComm = (name) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected(next);
  };

  const selectAll = () => {
    const next = new Set(selected);
    filteredCommunities.forEach(c => next.add(c.name));
    setSelected(next);
  };

  const clearAll = () => {
    const next = new Set(selected);
    filteredCommunities.forEach(c => next.delete(c.name));
    setSelected(next);
  };

  const chartData = useMemo(() => {
    return allCommunities.filter(c => selected.has(c.name));
  }, [selected, allCommunities]);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <div className="cdc-page">
      <div className="cdc-topbar">
        <span className="cdc-page-title">Donations by community</span>
        <div className="cdc-chip-row">
          <span className={`cdc-chip ${chartType === 'bar' ? 'active' : ''}`} onClick={() => setChartType('bar')}>Bar</span>
          <span className={`cdc-chip ${chartType === 'line' ? 'active' : ''}`} onClick={() => setChartType('line')}>Trend</span>
        </div>
      </div>

      <div className="cdc-card" ref={dropdownRef}>
        <div className="cdc-card-header">
          <span className="cdc-card-title">
            {selected.size === allCommunities.length ? `Showing all ${allCommunities.length} communities` 
            : selected.size === 0 ? 'No communities selected'
            : `Showing ${selected.size} of ${allCommunities.length} communities`}
          </span>
          <button className="cdc-filter-btn" onClick={toggleDropdown}>
            <Filter size={14} />
            Filter communities
            <span className="cdc-count-badge">{selected.size === allCommunities.length ? 'All' : selected.size}</span>
          </button>
        </div>

        {dropdownOpen && (
          <div className="cdc-dropdown-panel open">
            <input 
              className="cdc-search-box" 
              type="text" 
              placeholder="Search community..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="cdc-dd-actions">
              <button className="cdc-dd-action-btn" onClick={selectAll}>Select all</button>
              <button className="cdc-dd-action-btn" onClick={clearAll}>Clear all</button>
              <span className="cdc-match-count">{filteredCommunities.length} communities</span>
            </div>
            <div className="cdc-community-grid">
              {filteredCommunities.map(c => (
                <label key={c.name} className="cdc-comm-item">
                  <input type="checkbox" checked={selected.has(c.name)} onChange={() => toggleComm(c.name)} />
                  <span className="cdc-comm-name" title={c.name}>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="cdc-selected-tags">
          {chartData.length > 0 && chartData.length < allCommunities.length && (
            <>
              {chartData.slice(0, 8).map(c => (
                <span key={c.name} className="cdc-tag">
                  {c.name}
                  <button onClick={() => toggleComm(c.name)}><X size={12}/></button>
                </span>
              ))}
              {chartData.length > 8 && (
                <span className="cdc-tag cdc-tag-more">+{chartData.length - 8} more</span>
              )}
            </>
          )}
        </div>

        <div className="cdc-chart-container">
          {chartData.length === 0 ? (
            <div className="cdc-empty-state">No communities selected. Use the filter to choose communities.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} minTickGap={15} tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(val) => val >= 1000 ? `₱${(val/1000).toFixed(0)}k` : `₱${val}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(229, 231, 235, 0.4)' }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} minTickGap={15} tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(val) => val >= 1000 ? `₱${(val/1000).toFixed(0)}k` : `₱${val}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="amount" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3, fill: '#1e3a5f' }} activeDot={{ r: 5 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="cdc-legend-row">
            {chartData.slice(0, 12).map((c, i) => (
              <span key={c.name} className="cdc-leg-item">
                <span className="cdc-leg-dot" style={{ backgroundColor: getColor(i) }}></span>
                {c.name}
              </span>
            ))}
            {chartData.length > 12 && (
              <span className="cdc-leg-item" style={{ color: '#9CA3AF' }}>+{chartData.length - 12} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
