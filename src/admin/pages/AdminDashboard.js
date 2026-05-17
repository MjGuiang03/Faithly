/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceDot, LabelList, Label, ReferenceArea
} from 'recharts';
import '../styles/AdminDashboard.css';

import API from '../../utils/api';
import { 
  Banknote, Heart, Printer, Users, MapPin, Expand, X, Sparkles, RefreshCw, 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Calendar, Activity 
} from 'lucide-react';

const InsightIcon = ({ name }) => {
  const icons = {
    TrendingUp: <TrendingUp size={18} />,
    TrendingDown: <TrendingDown size={18} />,
    AlertCircle: <AlertCircle size={18} />,
    CheckCircle: <CheckCircle size={18} />,
    DollarSign: <DollarSign size={18} />,
    Calendar: <Calendar size={18} />,
    Activity: <Activity size={18} />,
    Users: <Users size={18} />,
  };
  return icons[name] || <Sparkles size={18} />;
};




const INITIAL_DONATION_CATEGORIES = [
  { name: 'General Fund',           value: 0, color: '#0D1F45' },
  { name: 'Children\'s Department', value: 0, color: '#152B5C' },
  { name: 'Men\'s Department',      value: 0, color: '#1C3873' },
  { name: 'Women\'s Department',    value: 0, color: '#1F408A' },
  { name: 'Youth Department',       value: 0, color: '#23448A' },
  { name: 'Mission Fund',           value: 0, color: '#2B51A1' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [memberStats,   setMemberStats]   = useState({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });
  const [loanStats,     setLoanStats]     = useState({ active: 0, pending: 0, totalDisbursed: 0 });
  const [donationStats, setDonationStats] = useState({ thisMonth: 0, total: 0 });

  const [membersByBranch, setMembersByBranch] = useState([]);
  const [pieData, setPieData] = useState(INITIAL_DONATION_CATEGORIES);
  const [donationsByBranch, setDonationsByBranch] = useState([]);
  const [growthData, setGrowthData] = useState([]);
  const [attendVsDonData, setAttendVsDonData] = useState([]);
  const [growthByBranch, setGrowthByBranch] = useState([]);
  const [attendanceByBranch, setAttendanceByBranch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawMembers, setRawMembers] = useState([]);
  const [rawAttendance, setRawAttendance] = useState([]);
  
  const [growthYear, setGrowthYear] = useState(new Date().getFullYear());
  const [growthMonth, setGrowthMonth] = useState('all');
  const [growthView, setGrowthView] = useState('both'); // 'both', 'total', 'new'
  
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [attMonth, setAttMonth] = useState('all');
  const [attBranch, setAttBranch] = useState('all');
  const [expandedChart, setExpandedChart] = useState(null);

  /* ── AI Insights State ── */
  const [aiInsights, setAiInsights] = useState([]);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(true);
  const [aiInsightsTime, setAiInsightsTime] = useState(null);


  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [membersRes, loansRes, donationsRes, attendRes] = await Promise.all([
        fetch(`${API}/api/admin/members?limit=1000`,      { headers }),
        fetch(`${API}/api/admin/loans`,                  { headers }),
        fetch(`${API}/api/admin/donations`,              { headers }),
        fetch(`${API}/api/admin/attendance?limit=10000`,  { headers }),
      ]);

      const [membersData, loansData, donationsData, attendData] = await Promise.all([
        membersRes.json(),
        loansRes.json(),
        donationsRes.json(),
        attendRes.json(),
      ]);

      if (attendData && attendData.success && attendData.attendance) {
        setRawAttendance(attendData.attendance);
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // --- 1. Use Member Stats from server ---
      if (membersData.success && membersData.stats) {
        setRawMembers(membersData.members || []);
        setMemberStats({
          total: membersData.stats.total || 0,
          active: membersData.stats.active || 0,
          inactive: membersData.stats.inactive || 0,
          newThisMonth: membersData.stats.newThisMonth || 0
        });
      }

      if (loansData.success && loansData.stats) {
        setLoanStats({ active: loansData.stats.active || 0, pending: loansData.stats.pending || 0, totalDisbursed: loansData.stats.totalDisbursed || 0 });
      }

      // --- 2. Use Donation Stats from server ---
      if (donationsData.success && donationsData.stats) {
        setDonationStats({
          thisMonth: donationsData.stats.thisMonth || 0,
          total: donationsData.stats.total || 0
        });
      }


      // Members by branch
      if (membersData.success && membersData.members) {
        setRawMembers(membersData.members);
        const branchMap = {};
        membersData.members.forEach(m => {
          const b = m.branch || m.community;
          if (b && b !== 'Unknown') {
            branchMap[b] = (branchMap[b] || 0) + 1;
          }
        });
        setMembersByBranch(Object.entries(branchMap).map(([branch, count]) => ({ branch, count })));
      }

      // ── Process Donation Categories (Pie Chart) ──
      if (donationsData.success && donationsData.stats) {
        const catStats = donationsData.stats.categoryBreakdown || {};
        setPieData(INITIAL_DONATION_CATEGORIES.map(cat => ({
          ...cat,
          value: catStats[cat.name] || 0
        })));

        // ── Donations by Branch ──
        // Since the backend now aggregates this over ALL donations, we use it directly.
        const commStats = donationsData.stats.communityBreakdown || {};
        
        // If there are legacy donations without a community, we can fallback to members mapping
        // but for now, we'll map what the backend gives us, plus any legacy ones we can find in the first page
        const branchDonMap = { ...commStats };
        const confirmedDonations = (donationsData.donations || []).filter(d => (d.status || '').toLowerCase() === 'confirmed');
        
        const emailToBranch = {};
        if (membersData.success && membersData.members) {
          membersData.members.forEach(m => { 
            const b = m.branch || m.community;
            if (b && b !== 'Unknown') emailToBranch[m.email] = b; 
          });
        }
        
        // Only add to branchDonMap if it wasn't already tracked natively by the backend
        confirmedDonations.forEach(d => {
          if (!d.community) {
            const branch = emailToBranch[d.email];
            if (branch) {
              branchDonMap[branch] = (branchDonMap[branch] || 0) + (Number(d.amount) || 0);
            }
          }
        });

        setDonationsByBranch(
          Object.entries(branchDonMap)
            .map(([branch, total]) => ({ branch, total }))
            .sort((a, b) => b.total - a.total)
        );
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch AI Insights ── */
  const fetchAiInsights = useCallback(async (refresh = false) => {
    setAiInsightsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const url = `${API}/api/admin/ai-insights${refresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setAiInsights(data.insights || []);
        setAiInsightsTime(data.generatedAt);
      }
    } catch (err) {
      console.error('[AI Insights] Fetch error:', err);
    } finally {
      setAiInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/'); return; }
    fetchAll();
    fetchAiInsights();
  }, [navigate, fetchAll, fetchAiInsights]);


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

    const branchCounts = {};
    validMembers.forEach(m => {
      const date = new Date(m.createdAt);
      let inPeriod = false;
      if (growthMonth === 'all') {
        if (date.getFullYear() === growthYear) inPeriod = true;
      } else {
        if (date.getFullYear() === growthYear && date.getMonth() === parseInt(growthMonth)) inPeriod = true;
      }
      if (inPeriod) {
        const b = m.branch || m.community;
        if (b && b !== 'Unknown') {
          branchCounts[b] = (branchCounts[b] || 0) + 1;
        }
      }
    });
    setGrowthByBranch(
      Object.entries(branchCounts)
        .map(([branch, count]) => ({ branch, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
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
        const s = (a.status || '').toLowerCase();
        if (s === 'present' || s === 'late') {
          const d = new Date(a.date || a.createdAt);
          if (d.getFullYear() === attYear) {
            att[d.getMonth()].attendance += 1;
          }
        }
      });
    } else {
      const daysInMonth = new Date(attYear, parseInt(attMonth) + 1, 0).getDate();
      att = Array.from({length: daysInMonth}, (_, i) => ({ label: `${i+1}`, attendance: 0, sortKey: i+1 }));
      
      filteredAtt.forEach(a => {
        const s = (a.status || '').toLowerCase();
        if (s === 'present' || s === 'late') {
          const d = new Date(a.date || a.createdAt);
          if (d.getFullYear() === attYear && d.getMonth() === parseInt(attMonth)) {
            const dayMatch = att.find(x => x.sortKey === d.getDate());
            if (dayMatch) dayMatch.attendance += 1;
          }
        }
      });
    }
    setAttendVsDonData(att);

    if (attBranch === 'all') {
      const branchAtt = {};
      const branchSessions = {};
      rawAttendance.forEach(a => {
        const s = (a.status || '').toLowerCase();
        const d = new Date(a.date || a.createdAt);
        let inPeriod = false;
        if (attMonth === 'all') {
          if (d.getFullYear() === attYear) inPeriod = true;
        } else {
          if (d.getFullYear() === attYear && d.getMonth() === parseInt(attMonth)) inPeriod = true;
        }
        if (inPeriod) {
          const b = a.branch || a.community || a.userBranch;
          if (b && b !== 'Unknown') {
            if (!branchSessions[b]) branchSessions[b] = new Set();
            branchSessions[b].add(a.sessionId || a.date);
            
            if (s === 'present' || s === 'late') {
              branchAtt[b] = (branchAtt[b] || 0) + 1;
            }
          }
        }
      });
      const avgByBranch = Object.entries(branchAtt).map(([branch, total]) => {
        const sessionCount = branchSessions[branch] ? branchSessions[branch].size : 1;
        return {
          branch,
          avg: Math.round(total / (sessionCount || 1))
        };
      }).sort((a,b) => b.avg - a.avg).slice(0, 5);
      setAttendanceByBranch(avgByBranch);
    } else {
      setAttendanceByBranch([]);
    }
  }, [rawAttendance, attYear, attMonth, attBranch]);
  const dash = (v) => loading ? '—' : v;

  const pieTotal = pieData.reduce((sum, item) => sum + (item.value || 0), 0);
  const activePieData = pieData.filter(d => d.value > 0);
  const zeroPieData = pieData.filter(d => d.value === 0);

  const maxMembersInBranch = membersByBranch.length > 0 ? Math.max(...membersByBranch.map(b => b.count)) : 0;
  const isHorizontalMembers = maxMembersInBranch <= 3;

  let maxNewMembers = 0;
  let spikeLabel = null;
  growthData.forEach(g => {
    if (g.newMembers > maxNewMembers) {
      maxNewMembers = g.newMembers;
      spikeLabel = g.label;
    }
  });

  let momGrowth = 0;
  if (growthData.length >= 2) {
    const last = growthData[growthData.length - 1].totalMembers;
    const prev = growthData[growthData.length - 2].totalMembers;
    if (prev > 0) momGrowth = Math.round(((last - prev) / prev) * 100);
  }

  const enhancedGrowthData = growthData.map((d) => {
    let isZero = d.totalMembers === 0;
    return {
      ...d,
      actualTotal: isZero ? null : d.totalMembers,
      noDataTotal: isZero ? 0 : null // Not ideal for connecting but we will use connectNulls
    };
  });
  // Connect the zero line to the first real data point
  let firstDataIdx = enhancedGrowthData.findIndex(d => d.actualTotal !== null);
  if (firstDataIdx > 0) enhancedGrowthData[firstDataIdx].noDataTotal = enhancedGrowthData[firstDataIdx].actualTotal;

  const totalAttendanceCount = rawAttendance.filter(a => ['present', 'late'].includes((a.status || '').toLowerCase())).length;

  return (
    <div className="admin-dashboard-main">
      {!expandedChart && (<>
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
            <span className="adm-stat-label">Total Communities</span>
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

      {/* ── AI Insights Card ── */}
      <div className={`adm-ai-insights-card ${aiInsightsExpanded ? '' : 'collapsed'}`}>
        <div className="adm-ai-header" onClick={() => setAiInsightsExpanded(!aiInsightsExpanded)}>
          <div className="adm-ai-title-group">
            <Sparkles size={18} className="adm-ai-sparkle" />
            <h3 className="adm-ai-title">AI Insights</h3>
            <span className="adm-ai-badge">Powered by Gemini</span>
          </div>
          <div className="adm-ai-actions">
            {aiInsightsTime && (
              <span className="adm-ai-time">
                {new Date(aiInsightsTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            )}
            <button
              className="adm-ai-refresh-btn"
              onClick={(e) => {
                e.stopPropagation();
                fetchAiInsights(true);
              }}
              disabled={aiInsightsLoading}
              title="Refresh insights"
            >
              <RefreshCw size={14} className={aiInsightsLoading ? 'spinning' : ''} />
            </button>
          </div>
        </div>
        {aiInsightsExpanded && (
          <div className="adm-ai-body">
            {aiInsightsLoading ? (
              <div className="adm-ai-skeleton">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="adm-ai-skeleton-item">
                    <div className="adm-ai-skeleton-icon" />
                    <div className="adm-ai-skeleton-lines">
                      <div className="adm-ai-skeleton-line short" />
                      <div className="adm-ai-skeleton-line long" />
                    </div>
                  </div>
                ))}
              </div>
            ) : aiInsights.length > 0 ? (
              <div className="adm-ai-insights-list">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="adm-ai-insight-item">
                    <span className="adm-ai-insight-icon">
                      <InsightIcon name={insight.icon} />
                    </span>
                    <div className="adm-ai-insight-content">
                      <p className="adm-ai-insight-title">{insight.title}</p>
                      <p className="adm-ai-insight-detail">{insight.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="adm-ai-empty">Click refresh to generate AI insights from your data.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Row 2: Analytics Row ── */}
      <div className="adm-analytics-row">
        {/* Donation Categories Pie */}
        <div className="adm-card adm-card-pie">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Donation Categories</h3>
            <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('donations')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
          </div>
          <div className="adm-pie-chart-container">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={activePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                  {activePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label 
                    value={`₱${pieTotal >= 1000 ? (pieTotal/1000).toFixed(1).replace(/\\.0$/, '') + 'k' : pieTotal}`} 
                    position="center" 
                    fill="#1e3a5f" 
                    style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Inter' }} 
                  />
                  <Label 
                    value="Total" 
                    position="center" 
                    dy={12} 
                    fill="#6B7280" 
                    style={{ fontSize: '10px', fontFamily: 'Inter' }} 
                  />
                </Pie>
                <Tooltip formatter={(value, name, props) => [`₱${(value || 0).toLocaleString()} (${Math.round((value/pieTotal)*100)}%)`, props.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="adm-pie-legend">
              {activePieData.map((cat, i) => (
                <div key={i} className="adm-pie-legend-item">
                  <div className="adm-pie-dot" style={{ background: cat.color }} />
                  <span className="adm-pie-label">{cat.name}</span>
                  <span className="adm-pie-val">₱{cat.value.toLocaleString()} — {Math.round((cat.value/pieTotal)*100)}%</span>
                </div>
              ))}
            </div>
            {zeroPieData.length > 0 && (
              <div style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
                ({zeroPieData.map(c => c.name).join(', ')}: no donations yet)
              </div>
            )}
          </div>
        </div>

        {/* Members by Branch Bar */}
        <div className="adm-card adm-card-bar" >
          <div className="adm-card-header">
            <div>
              <h3 className="adm-card-title">Members by Community</h3>
              <span className="adm-card-sub">{memberStats.total} total across {membersByBranch.length} communities</span>
            </div>
            <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('branches')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
          </div>
          <div className="adm-bar-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={membersByBranch.length > 0 ? membersByBranch : [{ branch: 'No data', count: 0 }]} 
                layout={isHorizontalMembers ? "vertical" : "horizontal"}
                margin={isHorizontalMembers ? { top: 0, right: 30, left: 10, bottom: 0 } : { top: 20, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={!isHorizontalMembers} vertical={isHorizontalMembers} />
                {isHorizontalMembers ? (
                  <>
                    <XAxis type="number" stroke="#9CA3AF" fontSize={11} domain={[0, maxMembersInBranch + 1]} allowDecimals={false} hide />
                    <YAxis dataKey="branch" type="category" stroke="#9CA3AF" fontSize={11} width={80} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} angle={-15} textAnchor="end" height={35} tickMargin={5} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                    <YAxis stroke="#9CA3AF" fontSize={11} domain={[0, maxMembersInBranch + 1]} allowDecimals={false} />
                  </>
                )}
                <Tooltip cursor={{ fill: '#F9FAFB' }} formatter={(value) => [value, 'Members']} />
                <Bar dataKey="count" fill="#0D1F45" radius={isHorizontalMembers ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={isHorizontalMembers ? 20 : 32} name="Members">
                  <LabelList dataKey="count" position={isHorizontalMembers ? "right" : "top"} fill="#6B7280" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 3 & 4: Charts ── */}
      <div className="adm-charts-row">
        <div className="adm-card adm-chart-full">
          <div className="adm-card-header">
            <div>
              <h3 className="adm-card-title">Member Growth Trends</h3>
              <span className="adm-card-sub">
                <span style={{ color: momGrowth >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                  {momGrowth >= 0 ? '↑' : '↓'} {Math.abs(momGrowth)}%
                </span> vs last month
              </span>
            </div>
            <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('growth')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={enhancedGrowthData} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
              <Tooltip formatter={(value, name) => [value, name === 'actualTotal' ? 'Total Members' : name === 'noDataTotal' ? 'No Data' : name]} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="noDataTotal" stroke="#D1D5DB" strokeDasharray="5 5" strokeWidth={2} dot={false} name="No Data" connectNulls />
              <Line type="monotone" dataKey="actualTotal" stroke="#155DFC" strokeWidth={2} dot={{ r: 3 }} name="Total Members" connectNulls />
              {spikeLabel && maxNewMembers > 0 && (
                <ReferenceDot x={spikeLabel} y={growthData.find(g => g.label === spikeLabel)?.totalMembers} r={5} fill="#EF4444" stroke="none">
                  <Label value="Registration opened" position="top" fill="#EF4444" fontSize={10} offset={10} />
                </ReferenceDot>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="adm-card adm-chart-full">
          <div className="adm-card-header">
            <div>
              <h3 className="adm-card-title">Attendance Trends</h3>
              <span className="adm-card-sub">{totalAttendanceCount} total attendees recorded — {new Date().getFullYear()}</span>
            </div>
            <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('attendance')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendVsDonData} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#F9FAFB' }} />
              <Legend iconType="square" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
              <Bar dataKey="attendance" fill="#155DFC" radius={[4, 4, 0, 0]} name="Attendance" background={{ fill: '#F3F4F6' }} />
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
      </>)}

      {/* ── Expanded Chart View (inline, sidebar stays visible) ── */}
      {expandedChart && (
        <div className="adm-expand-overlay">
          <div className="adm-expand-modal">
            <div className="adm-expand-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="adm-expand-title">
                {expandedChart === 'donations' && 'Donation Categories — Detailed View'}
                {expandedChart === 'branches' && 'Members by Community — Detailed View'}
                {expandedChart === 'growth' && 'Member Growth Trends — Detailed View'}
                {expandedChart === 'attendance' && 'Attendance Trends — Detailed View'}
              </h2>
              {expandedChart === 'growth' && (
                <div className="adm-filter-group" style={{ marginLeft: 'auto', marginRight: '16px' }}>
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
              )}
              {expandedChart === 'attendance' && (
                <div className="adm-filter-group" style={{ marginLeft: 'auto', marginRight: '16px' }}>
                  <select value={attBranch} onChange={e => setAttBranch(e.target.value)} className="adm-filter-select adm-filter-select-sm">
                    <option value="all">All Communities</option>
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
              )}
              <button className="adm-expand-close" onClick={() => setExpandedChart(null)}><X size={20} /></button>
            </div>

            <div className="adm-expand-body">
              {expandedChart === 'donations' && (
                <>
                  <div className="adm-expand-grid" style={{ gridTemplateColumns: '3fr 7fr' }}>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Distribution Overview</h4>
                      <div className="adm-expand-panel-chart" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ flex: 1, minHeight: '260px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={activePieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value">
                                {activePieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                <Label 
                                  value={`₱${pieTotal >= 1000 ? (pieTotal/1000).toFixed(1).replace(/\\.0$/, '') + 'k' : pieTotal}`} 
                                  position="center" 
                                  fill="#1e3a5f" 
                                  style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Inter' }} 
                                />
                                <Label 
                                  value="Total" 
                                  position="center" 
                                  dy={12} 
                                  fill="#6B7280" 
                                  style={{ fontSize: '10px', fontFamily: 'Inter' }} 
                                />
                              </Pie>
                              <Tooltip formatter={(value, name, props) => [`₱${(value || 0).toLocaleString()} (${Math.round((value/pieTotal)*100)}%)`, props.payload.name]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="adm-pie-legend">
                          {activePieData.map((cat, i) => (
                            <div key={i} className="adm-pie-legend-item">
                              <div className="adm-pie-dot" style={{ background: cat.color }} />
                              <span className="adm-pie-label">{cat.name}</span>
                              <span className="adm-pie-val">₱{cat.value.toLocaleString()} — {Math.round((cat.value/pieTotal)*100)}%</span>
                            </div>
                          ))}
                        </div>
                        {zeroPieData.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
                            ({zeroPieData.map(c => c.name).join(', ')}: no donations yet)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Top Donor by Community</h4>
                      <div className="adm-expand-panel-chart">
                        {(() => {
                          const avgDonation = donationsByBranch.length ? donationsByBranch.reduce((sum, b) => sum + b.total, 0) / donationsByBranch.length : 0;
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={donationsByBranch} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} angle={-20} textAnchor="end" height={55} />
                                <YAxis stroke="#9CA3AF" fontSize={12} />
                                <Tooltip formatter={(value) => `₱${(value || 0).toLocaleString()}`} cursor={{ fill: '#F9FAFB' }} />
                                {avgDonation > 0 && <ReferenceLine y={avgDonation} stroke="#EF4444" strokeDasharray="3 3" />}
                                <Bar dataKey="total" name="Total Donations" radius={[4, 4, 0, 0]} barSize={28}>
                                  {donationsByBranch.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4a90d9' : '#0D1F45'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel shows the proportional distribution of confirmed donations across six ministry fund categories. The right panel ranks communities by their total donation contributions, helping leadership identify which communities are the most active givers and where fundraising support may be needed.
                  </div>
                </>
              )}

              {expandedChart === 'branches' && (() => {
                const totalMembers = rawMembers.length;
                const officers = rawMembers.filter(m => m.position && m.position.toLowerCase() !== 'member').length;
                const regularMembers = totalMembers - officers;
                const officerPct = totalMembers > 0 ? Math.round((officers / totalMembers) * 100) : 0;
                const gaugeData = [
                  { name: 'Officers', value: officers, fill: '#155DFC' },
                  { name: 'Members', value: regularMembers, fill: '#0D1F45' }
                ];
                return (
                <>
                  <div className="adm-expand-grid" style={{ gridTemplateColumns: '8fr 2fr' }}>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Member Count by Community</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={membersByBranch.length > 0 ? membersByBranch : [{ branch: 'No data', count: 0 }]} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} angle={-20} textAnchor="end" height={55} />
                            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                            <Tooltip cursor={{ fill: '#F9FAFB' }} />
                            <Bar dataKey="count" fill="#0D1F45" radius={[4, 4, 0, 0]} name="Members" barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <h4 className="adm-expand-panel-title">Members & Officers</h4>
                      <div className="adm-expand-panel-chart" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={gaugeData} cx="50%" cy="85%" startAngle={180} endAngle={0} innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                              {gaugeData.map((entry, i) => (<Cell key={`gauge-${i}`} fill={entry.fill} />))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ textAlign: 'center', marginTop: '-24px', fontFamily: 'Inter', display: 'flex', gap: '32px', justifyContent: 'center', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#155DFC', lineHeight: 1 }}>{officerPct}%</span>
                            <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600, marginTop: '4px' }}>Officers</span>
                          </div>
                          <div style={{ width: '1px', height: '24px', backgroundColor: '#E5E7EB' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#0D1F45', lineHeight: 1 }}>{100 - officerPct}%</span>
                            <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600, marginTop: '4px' }}>Members</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', marginTop: '16px', fontSize: '11px', fontFamily: 'Inter' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0D1F45' }} />
                            <span style={{ color: '#374151' }}>Members ({regularMembers})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#155DFC' }} />
                            <span style={{ color: '#374151' }}>Officers ({officers})</span>
                          </div>
                        </div>
                        {officerPct > 50 && (
                          <div style={{ marginTop: '12px', padding: '6px 12px', background: '#FEF3C7', color: '#B45309', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={14} /> High officer ratio — review membership
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel shows the member count distribution across communities. The right panel displays a gauge showing the proportion of verified officers ({officerPct}%) to total members, helping leadership assess organizational capacity and identify communities that may need more officer appointments.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'growth' && (
                <div className="adm-expand-growth-wrapper">
                  <div className="adm-expand-panel adm-expand-growth-line-panel">
                    <h4 className="adm-expand-panel-title">Growth Trend (Line)</h4>
                    <div className="adm-expand-panel-chart adm-expand-growth-line-chart">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} tickFormatter={val => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                          <Tooltip />
                          <Legend iconType="circle" />
                          {(growthView === 'both' || growthView === 'total') && <Line type="monotone" dataKey="totalMembers" stroke="#155DFC" strokeWidth={2.5} dot={{ r: 3 }} name="Total Members" />}
                          {(growthView === 'both' || growthView === 'new') && <Line type="monotone" dataKey="newMembers" stroke="#0D1F45" strokeWidth={2.5} dot={{ r: 3 }} name="New Members" />}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="adm-expand-grid adm-expand-growth-bottom-grid">
                    <div className="adm-expand-panel adm-expand-growth-bar-panel">
                      <h4 className="adm-expand-panel-title">Growth by Community (Top {growthByBranch.length || 0})</h4>
                      <div className="adm-expand-panel-chart adm-expand-growth-bar-chart">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={growthByBranch} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} angle={-20} textAnchor="end" height={45} />
                            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} tickFormatter={val => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                            <Tooltip cursor={{ fill: '#F9FAFB' }} />
                            <Bar dataKey="count" fill="#0D1F45" radius={[4, 4, 0, 0]} name="New Members" barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel adm-expand-growth-pie-panel">
                      <h4 className="adm-expand-panel-title">Active vs Inactive</h4>
                      <div className="adm-expand-panel-chart adm-expand-growth-pie-chart">
                        {(() => {
                          const activePct = memberStats.total > 0 ? (memberStats.active / memberStats.total) * 100 : 0;
                          const inactivePct = memberStats.total > 0 ? (memberStats.inactive / memberStats.total) * 100 : 0;
                          return (
                            <>
                              <ResponsiveContainer width="100%" height={220}>
                                <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                                  <Pie data={[
                                    { name: 'Active', value: memberStats.active, fill: '#0D1F45' },
                                    { name: 'Inactive', value: memberStats.inactive, fill: '#155DFC' }
                                  ]} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                                    <Cell fill="#0D1F45" />
                                    <Cell fill="#155DFC" />
                                  </Pie>
                                  <Tooltip formatter={(value) => [value, 'Members']} />
                                  <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    formatter={(value, entry) => {
                                      const pct = value === 'Active' ? activePct : inactivePct;
                                      return <span style={{ color: '#4B5563', fontSize: '12px', fontWeight: 500 }}>{value}: {entry.payload.value} ({pct.toFixed(1)}%)</span>;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="adm-expand-growth-total-badge">
                                {memberStats.total} Total Members
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The top panel shows cumulative membership growth over time. The bottom-left panel highlights the top communities driving new registrations, while the bottom-right panel contextualizes overall growth against the current ratio of active to inactive members.
                  </div>
                </div>
              )}

              {expandedChart === 'attendance' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Attendance Volume (Bar)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={attendVsDonData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="attendance" fill="#155DFC" radius={[4, 4, 0, 0]} name="Attendance" barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {attBranch === 'all' ? (
                      <div className="adm-expand-panel">
                        <h4 className="adm-expand-panel-title">Avg Attendance by Community (Top {attendanceByBranch.length || 0})</h4>
                        <div className="adm-expand-panel-chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceByBranch} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                              <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} angle={-20} textAnchor="end" height={55} />
                              <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="avg" fill="#0D1F45" radius={[4, 4, 0, 0]} name="Avg Attendance" barSize={28} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="adm-expand-panel">
                        <h4 className="adm-expand-panel-title">Attendance Trend (Line)</h4>
                        <div className="adm-expand-panel-chart">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={attendVsDonData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                              <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                              <Tooltip />
                              <Line type="monotone" dataKey="attendance" stroke="#155DFC" strokeWidth={2.5} dot={{ r: 3 }} name="Attendance" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel shows attendance volume per period as a bar chart for easy comparison. The right panel presents the same data as a line chart to highlight the overall trend direction. This dual view helps leadership monitor worship service engagement, identify seasonal patterns, and measure the impact of outreach initiatives.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}