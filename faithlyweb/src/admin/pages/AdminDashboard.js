/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/AdminDashboard.css';

import API from '../../utils/api';
import { Banknote, Heart, Printer, Users, MapPin } from 'lucide-react';




const INITIAL_DONATION_CATEGORIES = [
  { name: 'General Fund',      value: 0, color: '#0D1F45' },
  { name: 'Children Ministry', value: 0, color: '#152B5C' },
  { name: 'Building Fund',     value: 0, color: '#1C3873' },
  { name: 'Youth Ministry',    value: 0, color: '#23448A' },
  { name: 'Mission Fund',      value: 0, color: '#2B51A1' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [memberStats,   setMemberStats]   = useState({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });
  const [loanStats,     setLoanStats]     = useState({ active: 0, pending: 0, totalDisbursed: 0 });
  const [donationStats, setDonationStats] = useState({ thisMonth: 0, total: 0 });

  const [membersByBranch, setMembersByBranch] = useState([]);
  const [pieData, setPieData] = useState(INITIAL_DONATION_CATEGORIES);
  const [growthData, setGrowthData] = useState([]);
  const [attendVsDonData, setAttendVsDonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawMembers, setRawMembers] = useState([]);
  const [rawAttendance, setRawAttendance] = useState([]);
  
  const [growthYear, setGrowthYear] = useState(new Date().getFullYear());
  const [growthMonth, setGrowthMonth] = useState('all');
  const [growthView, setGrowthView] = useState('both'); // 'both', 'total', 'new'
  
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [attMonth, setAttMonth] = useState('all');
  const [attBranch, setAttBranch] = useState('all');


  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [membersRes, loansRes, donationsRes, attendRes] = await Promise.all([
        fetch(`${API}/api/admin/members?limit=1000`,      { headers }),
        fetch(`${API}/api/admin/loans`,                  { headers }),
        fetch(`${API}/api/admin/donations`,              { headers }),
        fetch(`${API}/api/admin/attendance`,             { headers }),
      ]);

      const [membersData, loansData, donationsData, attendData] = await Promise.all([
        membersRes.json(),
        loansRes.json(),
        donationsRes.json(),
        attendRes.json(),
      ]);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // --- 1. Recalculate Member Stats (Active/Verified Only) ---
      if (membersData.success && membersData.members) {
        setRawMembers(membersData.members);
        const activeMembers = membersData.members.filter(m => {
          const s = (m.status || '').toLowerCase();
          return s === 'active' || s === 'verified';
        });

        let newThisMonthCount = 0;
        activeMembers.forEach(m => {
          const d = new Date(m.createdAt);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            newThisMonthCount++;
          }
        });

        setMemberStats({
          total: activeMembers.length,
          active: activeMembers.length, // approximation or based on status
          inactive: membersData.members.length - activeMembers.length,
          newThisMonth: newThisMonthCount
        });
      }

      if (loansData.success && loansData.stats) {
        setLoanStats({ active: loansData.stats.active || 0, pending: loansData.stats.pending || 0, totalDisbursed: loansData.stats.totalDisbursed || 0 });
      }

      // --- 2. Recalculate Donation Stats (Confirmed Only) ---
      if (donationsData.success && donationsData.donations) {
        const confirmedDonations = donationsData.donations.filter(d => (d.status || '').toLowerCase() === 'confirmed');
        
        let thisMonthAmount = 0;
        let totalAmount = 0;
        confirmedDonations.forEach(d => {
          const amt = Number(d.amount) || 0;
          totalAmount += amt;
          const date = new Date(d.createdAt || d.date);
          if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
            thisMonthAmount += amt;
          }
        });

        setDonationStats({
          thisMonth: thisMonthAmount,
          total: totalAmount
        });
      }


      // Members by branch
      if (membersData.success && membersData.members) {
        setRawMembers(membersData.members);
        const branchMap = {};
        membersData.members.forEach(m => {
          const b = m.branch || 'Unknown';
          branchMap[b] = (branchMap[b] || 0) + 1;
        });
        setMembersByBranch(Object.entries(branchMap).map(([branch, count]) => ({ branch, count })));
      }

      // ── Process Donation Categories (Pie Chart) ──
      if (donationsData.success && donationsData.donations) {
        const catTotals = {
          'General Fund': 0, 'Children Ministry': 0, 'Building Fund': 0, 'Youth Ministry': 0, 'Mission Fund': 0
        };
        const confirmedDonations = donationsData.donations.filter(d => (d.status || '').toLowerCase() === 'confirmed');
        confirmedDonations.forEach(d => {
          const amt = Number(d.amount) || 0;
          const cat = d.category || 'General Fund';
          if (catTotals[cat] !== undefined) {
            catTotals[cat] += amt;
          } else {
            catTotals['General Fund'] += amt; // fallback
          }
        });
        
        setPieData(INITIAL_DONATION_CATEGORIES.map(cat => ({
          ...cat,
          value: catTotals[cat.name]
        })));
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/'); return; }
    fetchAll();
  }, [navigate, fetchAll]);


  // --- Derived Growth Data ---
  useEffect(() => {
    if (!rawMembers.length) return;
    
    const validMembers = rawMembers.filter(m => {
      const s = (m.status || '').toLowerCase();
      return s === 'active' || s === 'verified';
    }).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

    let growth = [];
    if (growthMonth === 'all') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      growth = monthNames.map((m, i) => ({ label: m, totalMembers: 0, newMembers: 0, sortKey: i }));
      
      let runningTotal = 0;
      const windowStartDate = new Date(growthYear, 0, 1);
      validMembers.forEach(m => {
        if (new Date(m.createdAt) < windowStartDate) runningTotal++;
      });

      growth.forEach(g => {
        let newThisMonth = 0;
        validMembers.forEach(m => {
          const date = new Date(m.createdAt);
          if (date.getFullYear() === growthYear && date.getMonth() === g.sortKey) {
            newThisMonth++;
          }
        });
        runningTotal += newThisMonth;
        g.totalMembers = runningTotal;
        g.newMembers = newThisMonth;
      });
    } else {
      // Days in month
      const daysInMonth = new Date(growthYear, parseInt(growthMonth) + 1, 0).getDate();
      growth = Array.from({length: daysInMonth}, (_, i) => ({ label: `${i+1}`, totalMembers: 0, newMembers: 0, sortKey: i+1 }));
      
      let runningTotal = 0;
      const windowStartDate = new Date(growthYear, parseInt(growthMonth), 1);
      validMembers.forEach(m => {
        if (new Date(m.createdAt) < windowStartDate) runningTotal++;
      });

      growth.forEach(g => {
        let newThisDay = 0;
        validMembers.forEach(m => {
          const date = new Date(m.createdAt);
          if (date.getFullYear() === growthYear && date.getMonth() === parseInt(growthMonth) && date.getDate() === g.sortKey) {
            newThisDay++;
          }
        });
        runningTotal += newThisDay;
        g.totalMembers = runningTotal;
        g.newMembers = newThisDay;
      });
    }
    setGrowthData(growth);
  }, [rawMembers, growthYear, growthMonth]);

  // --- Derived Attendance Data ---
  useEffect(() => {
    let att = [];
    let filteredAtt = rawAttendance;
    if (attBranch !== 'all') {
      filteredAtt = filteredAtt.filter(a => a.branch === attBranch || a.community === attBranch);
    }

    if (attMonth === 'all') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      att = monthNames.map((m, i) => ({ label: m, attendance: 0, sortKey: i }));
      
      filteredAtt.forEach(a => {
        const d = new Date(a.date || a.createdAt);
        if (d.getFullYear() === attYear) {
          att[d.getMonth()].attendance += (Number(a.adultsCount) || 0) + (Number(a.kidsCount) || 0);
        }
      });
    } else {
      const daysInMonth = new Date(attYear, parseInt(attMonth) + 1, 0).getDate();
      att = Array.from({length: daysInMonth}, (_, i) => ({ label: `${i+1}`, attendance: 0, sortKey: i+1 }));
      
      filteredAtt.forEach(a => {
        const d = new Date(a.date || a.createdAt);
        if (d.getFullYear() === attYear && d.getMonth() === parseInt(attMonth)) {
          const dayMatch = att.find(x => x.sortKey === d.getDate());
          if (dayMatch) dayMatch.attendance += (Number(a.adultsCount) || 0) + (Number(a.kidsCount) || 0);
        }
      });
    }
    setAttendVsDonData(att);
  }, [rawAttendance, attYear, attMonth, attBranch]);
  const dash = (v) => loading ? '—' : v;

  return (
    <div className="admin-dashboard-main">
      {/* Header removed and moved to the bottom */}

      {/* ── Row 1: 4 Stat Cards ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card blue adm-clickable-card" onClick={() => navigate('/admin/members')}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Members</span>
            <div className="adm-stat-icon adm-icon-blue">
              <Users size={18} color="white" />
            </div>
          </div>
          <div className="adm-stat-value">{dash(memberStats.total.toLocaleString())}</div>
          <div className="adm-stat-sub"><span className="adm-stat-sub-highlight">+{dash(memberStats.newThisMonth)} new</span> this month</div>
        </div>

        <div className="adm-stat-card green adm-clickable-card" onClick={() => navigate('/admin/branches')}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Branches</span>
            <div className="adm-stat-icon adm-icon-green">
              <MapPin size={18} color="white" />
            </div>
          </div>
          <div className="adm-stat-value">{dash(membersByBranch.length > 0 ? membersByBranch.length : 68)}</div>
          <div className="adm-stat-sub"><span className="adm-stat-sub-highlight">Active</span> communities</div>
        </div>

        <div className="adm-stat-card orange adm-clickable-card" onClick={() => navigate('/admin/donations')}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Donations</span>
            <div className="adm-stat-icon adm-icon-orange">
              <Heart size={18} color="white" />
            </div>
          </div>
          <div className="adm-stat-value">{loading ? '—' : `₱${(donationStats.total || 0).toLocaleString()}`}</div>
          <div className="adm-stat-sub"><span className="adm-stat-sub-highlight">+₱{loading ? '—' : (donationStats.thisMonth || 0).toLocaleString()}</span> this month</div>
        </div>
      </div>

      {/* ── Row 2: Analytics Row ── */}
      <div className="adm-analytics-row">
        {/* Donation Categories Pie */}
        <div className="adm-card adm-card-pie">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Donation Categories</h3>
          </div>
          <div className="adm-pie-chart-container">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₱${(value || 0).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="adm-pie-legend">
              {pieData.map((cat, i) => (
                <div key={i} className="adm-pie-legend-item">
                  <div className="adm-pie-dot" style={{ background: cat.color }} />
                  <span className="adm-pie-label">{cat.name}</span>
                  <span className="adm-pie-val">₱{cat.value >= 1000 ? (cat.value / 1000).toFixed(0) + 'k' : cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Members by Branch Bar */}
        <div className="adm-card adm-card-bar" >
          <div className="adm-card-header">
            <h3 className="adm-card-title">Members by Branch</h3>
          </div>
          <div className="adm-bar-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={membersByBranch.length > 0 ? membersByBranch : [{ branch: 'No data', count: 0 }]} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} angle={-15} textAnchor="end" height={35} tickMargin={5} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="count" fill="#0D1F45" radius={[4, 4, 0, 0]} name="Members" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 3 & 4: Charts ── */}
      <div className="adm-charts-row">
        <div className="adm-card adm-chart-full">
          <div className="adm-card-header adm-card-header-col">
            <div className="adm-card-header-row">
              <h3 className="adm-card-title">Member Growth Trends</h3>
              <div className="adm-filter-group">
                <select value={growthView} onChange={e => setGrowthView(e.target.value)} className="adm-filter-select">
                  <option value="both">Total & New</option>
                  <option value="total">Total Only</option>
                  <option value="new">New Only</option>
                </select>
                <select value={growthMonth} onChange={e => setGrowthMonth(e.target.value)} className="adm-filter-select">
                  <option value="all">All Months</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={growthYear} onChange={e => setGrowthYear(parseInt(e.target.value))} className="adm-filter-select">
                  {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
              {(growthView === 'both' || growthView === 'total') && <Line type="monotone" dataKey="totalMembers" stroke="#155DFC" strokeWidth={2} dot={{ r: 3 }} name="Total Members" />}
              {(growthView === 'both' || growthView === 'new') && <Line type="monotone" dataKey="newMembers"   stroke="#00A63E" strokeWidth={2} dot={{ r: 3 }} name="New Members" />}
            </LineChart>
          </ResponsiveContainer>
        </div>

<div className="adm-card adm-chart-full">
          <div className="adm-card-header adm-card-header-col">
            <div className="adm-card-header-row">
              <h3 className="adm-card-title">Attendance Trends</h3>
              <div className="adm-filter-group">
                <select value={attBranch} onChange={e => setAttBranch(e.target.value)} className="adm-filter-select adm-filter-select-sm">
                  <option value="all">All Branches</option>
                  {membersByBranch.map((b,i) => <option key={i} value={b.branch}>{b.branch}</option>)}
                </select>
                <select value={attMonth} onChange={e => setAttMonth(e.target.value)} className="adm-filter-select">
                  <option value="all">All Months</option>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={attYear} onChange={e => setAttYear(parseInt(e.target.value))} className="adm-filter-select">
                  {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendVsDonData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip />
              <Legend iconType="square" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
              <Bar dataKey="attendance" fill="#00A63E" radius={[6, 6, 0, 0]} name="Attendance" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Export Button */}
      <div className="admin-dashboard-footer" >
        <button
          className="admin-dashboard-export-btn"
          onClick={() => window.print()}
          style={{
            padding: '8px 16px', background: '#1E3A8A', color: 'white', border: 'none',
            borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600,
            fontSize: '14px', display: 'flex', gap: '8px', alignItems: 'center'
          }}
        >
          <Printer size={18} />
          Export to PDF
        </button>
      </div>
    </div>
  );
}