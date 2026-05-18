/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { CalendarDays, Circle, MapPin, Search, Users, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminBranches.css';

import API from '../../utils/api';
import { Plus, XCircle, MoreVertical, Edit2, Trash2 } from 'lucide-react';

function EditCommunityModal({ branch, onClose, onSave }) {
  const [name, setName] = useState(branch.name || '');
  const [address, setAddress] = useState(branch.address || '');
  const [pastor, setPastor] = useState(branch.pastor || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Community name is required');

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/branches/${branch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), address: address.trim(), pastor: pastor.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Community updated successfully');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to update community');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-att-modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="admin-att-modal admin-att-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header">
           <div className="admin-att-modal-icon" style={{ background: '#EFF6FF', color: '#155DFC' }}>
             <Edit2 size={20} />
           </div>
          <div className="admin-att-modal-title-group">
            <h2 className="admin-att-modal-title">Edit Community</h2>
            <p className="admin-att-modal-subtitle">Update branch information</p>
          </div>
          <button className="admin-att-modal-close" onClick={onClose}><XCircle size={20} color="#6B7280" /></button>
        </div>
        <form onSubmit={handleSubmit} className="admin-att-modal-body">
          <div className="admin-att-form-row">
             <label className="admin-att-form-label">Branch Name</label>
             <input type="text" className="admin-att-form-input" autoFocus placeholder="e.g. San Pedro" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="admin-att-form-row">
             <label className="admin-att-form-label">Address</label>
             <input type="text" className="admin-att-form-input" placeholder="Branch Address" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="admin-att-form-row">
             <label className="admin-att-form-label">Pastor</label>
             <input type="text" className="admin-att-form-input" placeholder="Lead Pastor" value={pastor} onChange={e => setPastor(e.target.value)} />
          </div>
        </form>
        <div className="admin-att-modal-footer">
          <button type="button" className="admin-att-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="admin-att-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCommunityModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [pastor, setPastor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Community name is required');

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), address: address.trim(), pastor: pastor.trim() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Community added successfully');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to add community');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-att-modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="admin-att-modal admin-att-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header">
           <div className="admin-att-modal-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
             <Plus size={20} />
           </div>
          <div className="admin-att-modal-title-group">
            <h2 className="admin-att-modal-title">Add Community</h2>
            <p className="admin-att-modal-subtitle">Create a new church branch</p>
          </div>
          <button className="admin-att-modal-close" onClick={onClose}><XCircle size={20} color="#6B7280" /></button>
        </div>
        <form onSubmit={handleSubmit} className="admin-att-modal-body">
          <div className="admin-att-form-row">
             <label className="admin-att-form-label">Branch Name</label>
             <input type="text" className="admin-att-form-input" autoFocus placeholder="e.g. San Pedro" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="admin-att-form-row">
             <label className="admin-att-form-label">Address</label>
             <input type="text" className="admin-att-form-input" placeholder="Branch Address" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="admin-att-form-row">
             <label className="admin-att-form-label">Pastor</label>
             <input type="text" className="admin-att-form-input" placeholder="Lead Pastor" value={pastor} onChange={e => setPastor(e.target.value)} />
          </div>
        </form>
        <div className="admin-att-modal-footer">
          <button type="button" className="admin-att-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="admin-att-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Add Community'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommunityInfoModal({ branch, onClose, onEdit, totalAllDonations }) {
  if (!branch) return null;

  const sameCommunity = branch.sameCommunityAmount || 0;
  const otherCommunities = branch.otherCommunityAmount || 0;
  const totalShare = sameCommunity + otherCommunities;

  const pieData = [
    { name: 'Within Community', value: sameCommunity, fill: '#1E3A8A' },
    { name: 'Outside Community', value: otherCommunities, fill: '#60A5FA' }
  ];

  // Process Attendance History for Jan-Dec (Current Year)
  const attHistory = branch.attendanceHistory || [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  
  const barData = monthNames.map((name, index) => {
    const monthNum = index + 1;
    const match = attHistory.find(a => a.month === monthNum && a.year === currentYear);
    return {
      name,
      attendance: match ? match.count : 0
    };
  });

  const hasAttendanceData = barData.some(d => d.attendance > 0);
  const hasDonationData = totalShare > 0;

  return (
    <div className="admin-att-modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="admin-att-modal admin-branch-info-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header">
           <div className="admin-att-modal-icon admin-branch-info-icon">
             <MapPin size={20} />
           </div>
          <div className="admin-att-modal-title-group">
            <h2 className="admin-att-modal-title">{branch.name}</h2>
            <p className="admin-att-modal-subtitle">{branch.province || 'Community Info'}</p>
          </div>
          <button className="admin-att-modal-close" onClick={onClose}><XCircle size={20} color="#6B7280" /></button>
        </div>

        <div className="admin-branch-info-top-wrapper">
          <div className="admin-branch-info-top-chart">
            <span className="admin-branch-info-att-header">Attendance Performance</span>
            <div className="admin-branch-info-att-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ fontSize: '12px', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="attendance" fill="#155DFC" radius={[4, 4, 0, 0]} maxBarSize={30} name="Attendees">
                    <LabelList dataKey="attendance" position="top" style={{ fontSize: '9px', fill: '#64748B' }} formatter={(val) => val > 0 ? val : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="admin-att-modal-body admin-branch-info-body">
          
          {/* Left Column (Charts and Cards) */}
          <div className="admin-branch-info-left">
            {/* Main Stats */}
            <div className="admin-branch-info-stats-grid">
              <div className="admin-branch-info-stat-box">
                 <span className="admin-branch-info-stat-label">Total Members</span>
                 <span className="admin-branch-info-stat-val-members">{branch.members || 0}</span>
              </div>
              <div className="admin-branch-info-stat-box">
                 <span className="admin-branch-info-stat-label">Total Donations</span>
                 <span className="admin-branch-info-stat-val-donations">₱{(branch.totalDonations || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Chart */}
            <div className="admin-branch-info-chart-box">
              <span className="admin-branch-info-chart-label">Donation Share</span>
              <div className="admin-branch-info-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={totalShare > 0 ? pieData : [{ name: 'No Data', value: 1, fill: '#E2E8F0' }]} 
                      cx="50%" cy="45%" innerRadius={22} outerRadius={32} paddingAngle={2} dataKey="value" stroke="none"
                      labelLine={totalShare > 0 ? { stroke: '#CBD5E1', strokeWidth: 1 } : false}
                      label={totalShare > 0 ? ({ cx, cy, midAngle, outerRadius, percent, value, name }) => {
                        const radius = outerRadius + 12;
                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                        return (
                          <text x={x} y={y} fill="#64748B" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="9px">
                            {`₱${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}
                          </text>
                        );
                      } : false}
                    >
                      {(totalShare > 0 ? pieData : [{ name: 'No Data', value: 1, fill: '#E2E8F0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => totalShare > 0 ? `₱${value.toLocaleString()}` : 'No donations'} />
                    <Legend 
                      payload={[
                        { id: 'within', type: 'circle', value: 'Within Community', color: '#1E3A8A' },
                        { id: 'outside', type: 'circle', value: 'Outside Community', color: '#60A5FA' }
                      ]}
                      verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '11px', color: '#64748B', marginTop: '10px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column (Info) */}
          <div className="admin-branch-info-right">
            <div className="admin-branch-info-right-header">
              <span className="admin-branch-info-right-title">Community Details</span>
              <button onClick={() => onEdit(branch)} className="admin-branch-info-edit-btn" title="Edit Details">
                <Edit2 size={14} />
              </button>
            </div>
            
            <div className="admin-branch-info-details">
              <div className="admin-branch-info-detail-row">
                <span className="admin-branch-info-detail-label">Lead Pastor</span>
                <span className="admin-branch-info-detail-val">{branch.pastor || 'Not assigned'}</span>
              </div>
              <div className="admin-branch-info-detail-row">
                <span className="admin-branch-info-detail-label">Address</span>
                <span className="admin-branch-info-detail-val">{branch.address || branch.location || 'No address provided'}</span>
              </div>
              <div className="admin-branch-info-detail-row">
                <span className="admin-branch-info-detail-label">Status</span>
                <span className={`admin-branch-info-detail-val ${branch.members > 0 ? 'active' : 'idle'}`}>{branch.members > 0 ? 'Active Community' : 'Idle'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function AdminBranches() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [viewingBranch, setViewingBranch] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Track visible count per province for "View More" pagination
  const [visibleCounts, setVisibleCounts] = useState({});
  const [filterActive, setFilterActive] = useState(false);
  const [totalServices, setTotalServices] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const LIMIT = 68;

  const token = localStorage.getItem('adminToken');

  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', LIMIT);
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    return params.toString();
  }, [page, debouncedSearch]);

  const { data: branchesData, isValidating: loadingBranches, mutate: fetchBranches } = useSWR(
    token ? `${API}/api/admin/branches?${queryParams}` : null,
    fetcherSingle,
    { revalidateOnFocus: false, revalidateIfStale: true }
  );

  useEffect(() => {
    if (branchesData && branchesData.success) {
      setBranches(branchesData.branches || []);
      setTotalCount(branchesData.totalCount || 0);
      setTotalServices(branchesData.totalServices || 0);
      setGrowthRate(branchesData.growthRate || 0);
    }
  }, [branchesData]);

  useEffect(() => {
    setLoading(loadingBranches);
  }, [loadingBranches]);

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Are you sure you want to remove this community? This will not delete the members associated with it.')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/branches/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Community removed');
        fetchBranches();
      }
    } catch (err) { toast.error('Failed to remove community'); }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Compute stats from fetched branches
  const totalMembers = branches.reduce((s, b) => s + (b.members || 0), 0);
  const totalAllDonations = branches.reduce((sum, b) => sum + (b.totalDonations || 0), 0);

  const groupedBranches = (branches || []).reduce((acc, b) => {
    if (filterActive && (b.members || 0) === 0) return acc;
    
    // Parse province from address if not explicitly present
    let province = b.province;
    if (!province && b.address) {
      const parts = b.address.split(', ');
      if (parts.length > 0) province = parts[0];
    }
    province = province || 'Other Provinces';
    if (!acc[province]) acc[province] = [];
    acc[province].push(b);
    return acc;
  }, {});

  const provinceOrder = Object.keys(groupedBranches).sort();


  return (
    <div className="admin-branch-main">
      {/* Header */}
      <div className="admin-branch-header">
        <div>
          <h1 className="admin-branch-title">Communities</h1>
          <p className="admin-branch-subtitle">Manage church communities by province</p>
        </div>
        <div className="admin-branch-search-container">
          <div className="admin-branch-search-input-box">
            <Search size={18} className="admin-branch-search-icon" />
            <input
              type="text"
              placeholder="Search by province or branch..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-branch-search-input"
            />
          </div>
          <button className="admin-branch-btn-add" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Community
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-branch-stats">
        <div 
          className={`admin-branch-stat-card ${!filterActive ? 'active-stat-card' : ''}`}
          onClick={() => setFilterActive(false)}
        >
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Communities</span>
            <div className="adm-stat-icon-wrap" style={{ background: 'rgba(255,255,255,0.1) !important' }}><MapPin size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">{loading ? '—' : totalCount}</p>
        </div>

        <div 
          className={`admin-branch-stat-card ${filterActive ? 'active-stat-card' : ''}`}
          onClick={() => setFilterActive(true)}
        >
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Members</span>
            <div className="adm-stat-icon-wrap" style={{ background: 'rgba(255,255,255,0.1) !important' }}><Users size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">
            {loading ? '—' : totalMembers.toLocaleString()}
            <span style={{ fontSize: '14px', fontWeight: '400', marginLeft: '8px', color: 'rgba(255,255,255,0.6)' }}>
               ({(branches || []).filter(b => (b.members || 0) > 0).length} active)
            </span>
          </p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Total Services</span>
            <div className="adm-stat-icon-wrap" style={{ background: 'rgba(255,255,255,0.1) !important' }}><CalendarDays size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">{loading ? '—' : totalServices.toLocaleString()}</p>
        </div>

        <div className="admin-branch-stat-card">
          <div className="admin-branch-stat-header">
            <span className="admin-branch-stat-label">Growth Rate (this month)</span>
            <div className="adm-stat-icon-wrap" style={{ background: 'rgba(255,255,255,0.1) !important' }}><TrendingUp size={20} color="white" /></div>
          </div>
          <p className="admin-branch-stat-value">
            {loading ? '—' : `+${growthRate}%`}
            <span style={{ fontSize: '12px', fontWeight: '400', marginLeft: '8px', color: (growthRate > 0 ? '#4ADE80' : 'rgba(255,255,255,0.6)') }}>
              {growthRate > 0 ? 'Trending Up' : 'Steady'}
            </span>
          </p>
        </div>
      </div>

      {/* Grouped Table View */}
      <div className="admin-branch-list-wrapper">
        {loading ? (
           <div className="admin-branch-loading">
             <div className="admin-branch-spinner"></div>
             <p>Loading communities...</p>
           </div>
        ) : branches.length === 0 ? (
          <div className="admin-branch-empty">No communities found.</div>
        ) : (
          provinceOrder.map(province => {
            const list = groupedBranches[province];
            if (!list || list.length === 0) return null;
            
            const visibleLimit = visibleCounts[province] || 5;
            const displayedList = list.slice(0, visibleLimit);
            const hasMore = list.length > visibleLimit;

            return (
              <div key={province} className="admin-branch-region-section">
                <div className="admin-branch-region-header">
                  <div className="adm-reg-icon"><MapPin size={16} color="white" /></div>
                  <span className="adm-reg-name">{province}</span>
                  <span className="adm-reg-count">{list.length} {list.length === 1 ? 'Branch' : 'Branches'}</span>
                </div>
                <div className="admin-branch-table-container">
                  <table className="admin-branch-table">
                    <thead>
                      <tr>
                        <th>Branch Name</th>
                        <th>Lead Pastor</th>
                        <th>Full Address</th>
                        <th>Members</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedList.map(branch => (
                        <tr key={branch._id} onClick={() => setViewingBranch(branch)} style={{ cursor: 'pointer' }} className="adm-branch-row-hover">
                          <td className="adm-br-name-cell">{branch.name}</td>
                          <td>{branch.pastor || '—'}</td>
                          <td className="adm-br-addr-cell">{branch.address || branch.location || '—'}</td>
                          <td className="adm-td-members">{branch.members || 0}</td>
                          <td>
                            <span className={`adm-status-pill ${branch.members > 0 ? 'adm-status-active' : 'adm-status-idle'}`}>
                              {branch.members > 0 ? 'Active' : 'Idle'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', position: 'relative' }}>
                            <button 
                              className="adm-action-menu-btn" 
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === branch._id ? null : branch._id); }}
                            >
                              <MoreVertical size={18} />
                            </button>
                            
                            {openMenuId === branch._id && (
                              <div className="adm-action-dropdown">
                                <button className="adm-action-item" onClick={() => setEditingBranch(branch)}>
                                  <Edit2 size={14} /> Edit Details
                                </button>
                                <button className="adm-action-item adm-action-delete" onClick={() => handleDeleteBranch(branch._id)}>
                                  <Trash2 size={14} /> Remove Branch
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasMore && (
                  <div className="admin-branch-view-more-container">
                    <button 
                      className="admin-branch-view-more-btn"
                      onClick={() => setVisibleCounts(prev => ({ ...prev, [province]: (prev[province] || 5) + 5 }))}
                    >
                      View More ({list.length - visibleLimit} left)
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showAddModal && <AddCommunityModal onClose={() => setShowAddModal(false)} onSave={() => { setShowAddModal(false); fetchBranches(); }} />}
      {editingBranch && <EditCommunityModal branch={editingBranch} onClose={() => setEditingBranch(null)} onSave={() => { setEditingBranch(null); fetchBranches(); }} />}
      {viewingBranch && (
        <CommunityInfoModal 
          branch={viewingBranch} 
          totalAllDonations={totalAllDonations}
          onClose={() => setViewingBranch(null)} 
          onEdit={(b) => {
            setViewingBranch(null);
            setEditingBranch(b);
          }}
        />
      )}
    </div>
  );
}
