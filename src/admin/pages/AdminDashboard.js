/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceDot, LabelList, Label, ReferenceArea
} from 'recharts';
import '../styles/AdminDashboard.css';
import API from '../../utils/api';
import { 
  Banknote, Heart, Printer, Users, MapPin, Expand, X, Sparkles, RefreshCw, 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Calendar, Activity 
} from 'lucide-react';

const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

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
  { name: 'General Fund',           value: 0, color: '#0D1F45' }, // Navy
  { name: 'Children\'s Department', value: 0, color: '#3B82F6' }, // Blue
  { name: 'Men\'s Department',      value: 0, color: '#10B981' }, // Emerald
  { name: 'Women\'s Department',    value: 0, color: '#8B5CF6' }, // Violet
  { name: 'Youth Department',       value: 0, color: '#F59E0B' }, // Amber
  { name: 'Mission Fund',           value: 0, color: '#14B8A6' }, // Teal
];

const formatK = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
  return num.toString();
};


export default function AdminDashboard() {
  const navigate = useNavigate();

  const [growthYear, setGrowthYear] = useState(new Date().getFullYear());
  const [growthMonth, setGrowthMonth] = useState('all');
  const [growthView, setGrowthView] = useState('both'); // 'both', 'total', 'new'
  const [topCommunitiesLimit, setTopCommunitiesLimit] = useState(20);
  
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [attMonth, setAttMonth] = useState('all');
  const [attBranch, setAttBranch] = useState('all');
  const [expandedChart, setExpandedChart] = useState(null);
  const [branchSearchInput, setBranchSearchInput] = useState('');
  const [branchSearchQuery, setBranchSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setBranchSearchQuery(branchSearchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [branchSearchInput]);

  /* ── AI Insights State ── */
  const [aiInsights, setAiInsights] = useState([]);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(true);
  const [aiInsightsTime, setAiInsightsTime] = useState(null);

  const fetcherSingle = (url) => 
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } })
      .then(res => res.ok ? res.json() : { success: false });

  const { data: membersData, isValidating: membersValidating } = useSWR(
    `${API}/api/admin/members?limit=5000`, 
    fetcherSingle, 
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );
  
  const { data: loansData } = useSWR(
    `${API}/api/admin/loans?limit=1`, 
    fetcherSingle, 
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );
  
  const { data: donationsData, isValidating: donationsValidating } = useSWR(
    `${API}/api/admin/donations?limit=1`, 
    fetcherSingle, 
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );
  
  const { data: attendData, isValidating: attendValidating } = useSWR(
    `${API}/api/admin/attendance?limit=5000`, 
    fetcherSingle, 
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  // Progressive loading states
  const membersLoading = !membersData && membersValidating;
  const donationsLoading = !donationsData && donationsValidating;
  const attendanceLoading = !attendData && attendValidating;

  const rawAttendance = useMemo(() => attendData?.attendance || [], [attendData]);
  const rawMembers = useMemo(() => membersData?.members || [], [membersData]);

  const memberStats = useMemo(() => ({
    total: membersData?.stats?.total || 0,
    active: membersData?.stats?.active || 0,
    inactive: membersData?.stats?.inactive || 0,
    newThisMonth: membersData?.stats?.newThisMonth || 0
  }), [membersData]);

  const membersByBranch = useMemo(() => {
    const branchMap = {};
    rawMembers.forEach(m => {
      const b = m.branch || m.community;
      if (b && b !== 'Unknown') {
        branchMap[b] = (branchMap[b] || 0) + 1;
      }
    });
    return Object.entries(branchMap)
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawMembers]);

  const loanStats = useMemo(() => ({
    active: loansData?.stats?.active || 0,
    pending: loansData?.stats?.pending || 0,
    totalDisbursed: loansData?.stats?.totalDisbursed || 0
  }), [loansData]);

  const donationStats = useMemo(() => ({
    thisMonth: donationsData?.stats?.thisMonth || 0,
    total: donationsData?.stats?.total || 0
  }), [donationsData]);

  const pieData = useMemo(() => {
    const catStats = donationsData?.stats?.categoryBreakdown || {};
    return INITIAL_DONATION_CATEGORIES.map(cat => ({
      ...cat,
      value: catStats[cat.name] || 0
    }));
  }, [donationsData]);

  const donationsByBranch = useMemo(() => {
    if (!donationsData || !donationsData.success) return [];
    const commStats = donationsData.stats?.communityBreakdown || {};
    const branchDonMap = { ...commStats };
    
    const confirmedDonations = (donationsData.donations || []).filter(d => (d.status || '').toLowerCase() === 'confirmed');
    const emailToBranch = {};
    
    rawMembers.forEach(m => { 
      const b = m.branch || m.community;
      if (b && b !== 'Unknown') emailToBranch[m.email] = b; 
    });
    
    confirmedDonations.forEach(d => {
      if (!d.community) {
        const branch = emailToBranch[d.email];
        if (branch) {
          branchDonMap[branch] = (branchDonMap[branch] || 0) + (Number(d.amount) || 0);
        }
      }
    });

    return Object.entries(branchDonMap)
      .map(([branch, total]) => ({ branch, total }))
      .sort((a, b) => b.total - a.total);
  }, [donationsData, rawMembers]);

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
    fetchAiInsights();
  }, [navigate, fetchAiInsights]);

  // --- Derived Growth Data ---
  const growthInfo = useMemo(() => {
    const validMembers = rawMembers.filter(m => {
      const s = (m.status || '').toLowerCase();
      return s !== 'deactivated';
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

    const growthByBranch = Object.entries(branchCounts)
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { growthData: growth, growthByBranch };
  }, [rawMembers, growthYear, growthMonth]);

  const { growthData, growthByBranch } = growthInfo;

  // --- Derived Attendance Data ---
  const attendanceInfo = useMemo(() => {
    let att = [];
    let filteredAtt = rawAttendance;
    if (attBranch !== 'all') {
      filteredAtt = filteredAtt.filter(a => a.branch === attBranch || a.community === attBranch);
    }

    if (attMonth === 'all') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      att = monthNames.map((m, i) => ({ label: m, present: 0, late: 0, absent: 0, sortKey: i }));
      
      filteredAtt.forEach(a => {
        const s = (a.status || '').toLowerCase();
        const d = new Date(a.date || a.createdAt);
        if (d.getFullYear() === attYear) {
          if (s === 'present') att[d.getMonth()].present += 1;
          else if (s === 'late') att[d.getMonth()].late += 1;
          else if (s === 'absent') att[d.getMonth()].absent += 1;
        }
      });
    } else {
      const daysInMonth = new Date(attYear, parseInt(attMonth) + 1, 0).getDate();
      att = Array.from({length: daysInMonth}, (_, i) => ({ label: `${i+1}`, present: 0, late: 0, absent: 0, sortKey: i+1 }));
      
      filteredAtt.forEach(a => {
        const s = (a.status || '').toLowerCase();
        const d = new Date(a.date || a.createdAt);
        if (d.getFullYear() === attYear && d.getMonth() === parseInt(attMonth)) {
          const dayMatch = att.find(x => x.sortKey === d.getDate());
          if (dayMatch) {
            if (s === 'present') dayMatch.present += 1;
            else if (s === 'late') dayMatch.late += 1;
            else if (s === 'absent') dayMatch.absent += 1;
          }
        }
      });
    }

    let attendanceByBranch = [];
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
      attendanceByBranch = Object.entries(branchAtt).map(([branch, total]) => {
        const sessionCount = branchSessions[branch] ? branchSessions[branch].size : 1;
        return {
          branch,
          avg: Math.round(total / (sessionCount || 1))
        };
      }).sort((a,b) => b.avg - a.avg).slice(0, 5);
    }

    return { attendVsDonData: att, attendanceByBranch };
  }, [rawAttendance, attYear, attMonth, attBranch]);

  const { attendVsDonData, attendanceByBranch } = attendanceInfo;


  const pieTotal = pieData.reduce((sum, item) => sum + (item.value || 0), 0);
  const activePieData = pieData.filter(d => d.value > 0);
  const zeroPieData = pieData.filter(d => d.value === 0);

  const sortedDonationData = [...pieData].sort((a, b) => b.value - a.value).map(item => {
    const percentage = pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0;
    
    let shortName = item.name.replace('Department', 'Dept');
    
    return {
      ...item,
      shortName,
      percentage,
      displayLabel: `₱${formatK(item.value || 0)} • ${percentage}%`,
      fillColor: item.value > 0 ? item.color : '#D1D5DB'
    };
  });

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
      {/* ── Dashboard Header ── */}
      <div className="adm-dashboard-header">
        <div className="adm-dashboard-header-left">
          <h1 className="adm-dashboard-greeting">
            {(() => {
              const h = new Date().getHours();
              return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
            })()}, <span className="adm-dashboard-greeting-name">Admin</span>
          </h1>
          <p className="adm-dashboard-subtitle">
            Here's your church overview for <strong>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>
          </p>
        </div>
        <div className="adm-dashboard-header-actions">
          <div className="adm-filter-group" style={{ margin: 0 }}>
            <select 
              value={attYear} 
              onChange={e => {
                setAttYear(parseInt(e.target.value)); 
                setGrowthYear(parseInt(e.target.value));
              }} 
              className="adm-filter-select adm-header-select"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="adm-header-export-btn" onClick={() => window.print()}>
            <Printer size={15} />
            Export
          </button>
        </div>
      </div>

      {/* ── Row 1: 4 Stat Cards ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card blue adm-clickable-card" onClick={() => navigate('/admin/members')}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Members</span>
            <div className="adm-stat-icon adm-icon-blue">
              <Users size={18} color="white" />
            </div>
          </div>
          <div className="adm-stat-value">{membersLoading ? '—' : memberStats.total.toLocaleString()}</div>
          <div className="adm-stat-sub"><span className="adm-stat-sub-highlight">+{membersLoading ? '—' : memberStats.newThisMonth} new</span> this month</div>
        </div>

        <div className="adm-stat-card green adm-clickable-card" onClick={() => navigate('/admin/branches')}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Communities</span>
            <div className="adm-stat-icon adm-icon-green">
              <MapPin size={18} color="white" />
            </div>
          </div>
          <div className="adm-stat-value">{membersLoading ? '—' : (membersByBranch.length > 0 ? membersByBranch.length : 68)}</div>
          <div className="adm-stat-sub"><span className="adm-stat-sub-highlight">Active</span> communities</div>
        </div>

        <div className="adm-stat-card orange adm-clickable-card" onClick={() => navigate('/admin/donations')}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Donations</span>
            <div className="adm-stat-icon adm-icon-orange">
              <Heart size={18} color="white" />
            </div>
          </div>
          <div className="adm-stat-value">{donationsLoading ? '—' : `₱${(donationStats.total || 0).toLocaleString()}`}</div>
          <div className="adm-stat-sub"><span className="adm-stat-sub-highlight">+₱{donationsLoading ? '—' : (donationStats.thisMonth || 0).toLocaleString()}</span> this month</div>
        </div>

        <div className="adm-stat-card adm-clickable-card" onClick={() => navigate('/admin/attendance')}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Attendance</span>
            <div className="adm-stat-icon adm-icon-blue">
              <Activity size={18} color="white" />
            </div>
          </div>
          <div className="adm-stat-value">{attendanceLoading ? '—' : totalAttendanceCount.toLocaleString()}</div>
          <div className="adm-stat-sub"><span className="adm-stat-sub-highlight">YTD</span> {new Date().getFullYear()}</div>
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
              <p className="adm-ai-empty">AI Service is waiting to connect. Click refresh to generate insights.</p>
            )}
          </div>
        )}
      </div>



      {/* ── Row 2: Analytics Row ── */}
      <div className="adm-analytics-row">
        {/* Donation Categories Custom List */}
        <div className="adm-card adm-card-bar">
          <div className="adm-card-header" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <h3 className="adm-card-title">Donation Categories</h3>
              <span className="adm-stat-chip" style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, margin: 0, padding: '4px 12px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '16px', fontSize: '13px' }}>
                ₱{(pieTotal || 0).toLocaleString()}
              </span>
            </div>
            <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('donations')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
          </div>
          <div className="adm-donation-list">
            {sortedDonationData.map((item, idx) => (
              <div key={idx} className="adm-donation-row">
                <span className="adm-donation-name">{item.shortName}</span>
                <div className="adm-donation-bar-bg">
                  <div className="adm-donation-bar-fill" style={{ width: `${item.percentage}%`, backgroundColor: item.fillColor }}></div>
                </div>
                <span className="adm-donation-value">{item.displayLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Members by Branch Bar */}
        <div className="adm-card adm-card-bar" >
          <div className="adm-card-header">
            <div>
              <h3 className="adm-card-title">Members by Community</h3>
              <span className="adm-card-sub"><strong className="adm-sub-bold" style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{memberStats.total}</strong> total across <strong className="adm-sub-bold" style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{membersByBranch.length}</strong> communities</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select 
                value={topCommunitiesLimit} 
                onChange={(e) => setTopCommunitiesLimit(Number(e.target.value))}
                className="adm-filter-select"
                style={{ padding: '4px 24px 4px 8px', fontSize: '11px', height: '26px' }}
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={40}>Top 40</option>
                <option value={70}>Top 70</option>
              </select>
              <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('branches')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
            </div>
          </div>
          <div className="adm-bar-chart-container" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={membersByBranch.length > 0 ? membersByBranch.slice(0, topCommunitiesLimit) : [{ branch: 'No data', count: 0 }]} 
                layout={isHorizontalMembers ? "vertical" : "horizontal"}
                margin={isHorizontalMembers ? { top: 0, right: 30, left: 10, bottom: 0 } : { top: 20, right: 8, left: -25, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={!isHorizontalMembers} vertical={isHorizontalMembers} />
                {isHorizontalMembers ? (
                  <>
                    <XAxis type="number" stroke="#9CA3AF" fontSize={11} domain={[0, maxMembersInBranch + 1]} allowDecimals={false} hide />
                    <YAxis dataKey="branch" type="category" stroke="#9CA3AF" fontSize={11} fontFamily="DM Sans, sans-serif" fontWeight={400} width={160} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} fontFamily="DM Sans, sans-serif" fontWeight={400} angle={-45} textAnchor="end" height={60} interval={0} tickMargin={5} />
                    <YAxis stroke="#9CA3AF" fontSize={11} fontFamily="DM Mono, monospace" fontWeight={500} domain={[0, maxMembersInBranch + 1]} allowDecimals={false} />
                  </>
                )}
                <Tooltip cursor={{ fill: '#F9FAFB' }} formatter={(value) => [value, 'Members']} />
                <Bar dataKey="count" fill="#0D1F45" radius={isHorizontalMembers ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={isHorizontalMembers ? 20 : 32} name="Members">
                  <LabelList dataKey="count" position={isHorizontalMembers ? "right" : "top"} fill="#6B7280" fontSize={11} fontFamily="DM Mono, monospace" fontWeight={500} />
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
              <span className="adm-card-sub" style={{ color: momGrowth >= 0 ? '#10B981' : '#EF4444', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                {momGrowth >= 0 ? '↑' : '↓'} {Math.abs(momGrowth)}% vs last month · {memberStats.total.toLocaleString()} members
              </span>
            </div>
            <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('growth')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
          </div>
          <div className="adm-bar-chart-container" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={enhancedGrowthData} margin={{ top: 20, right: 8, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#155DFC" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#155DFC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} fontFamily="DM Sans, sans-serif" fontWeight={400} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} fontFamily="DM Mono, monospace" fontWeight={500} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, memberStats.total > 0 ? memberStats.total + 2 : 'auto']} />
                <Tooltip formatter={(value, name) => [value, name === 'actualTotal' ? 'Total Members' : name === 'newMembers' ? 'New Members' : name]} />
                <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }} verticalAlign="bottom" />
                
                {enhancedGrowthData.length > 0 && enhancedGrowthData.findIndex(d => d.actualTotal !== null) > 0 && (
                  <ReferenceLine 
                    x={enhancedGrowthData[enhancedGrowthData.findIndex(d => d.actualTotal !== null)].label} 
                    stroke="#9CA3AF" 
                    strokeDasharray="3 3" 
                    label={{ position: 'insideTopLeft', value: 'Registration Opened', fill: '#9CA3AF', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} 
                  />
                )}
                
                <Bar dataKey="newMembers" barSize={16} fill="#F5B247" radius={[4, 4, 4, 4]} name="New Members" />
                <Area type="monotone" dataKey="actualTotal" stroke="#155DFC" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" name="Total Members" connectNulls dot={false} activeDot={{ r: 6 }} />
  
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="adm-card adm-chart-full">
          <div className="adm-card-header">
            <div>
              <h3 className="adm-card-title">Attendance Trends</h3>
              <span className="adm-card-sub"><span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>{totalAttendanceCount}</span> total attendees recorded — {new Date().getFullYear()}</span>
            </div>
            <button className="adm-chart-expand-btn" onClick={() => setExpandedChart('attendance')} title="Expand Chart"><Expand size={16} color="#4B5563" strokeWidth={2.5} /></button>
          </div>
          <div className="adm-bar-chart-container" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendVsDonData} margin={{ top: 20, right: 8, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} fontFamily="DM Sans, sans-serif" fontWeight={400} />
                <YAxis stroke="#9CA3AF" fontSize={11} fontFamily="DM Mono, monospace" fontWeight={500} allowDecimals={false} label={{ value: 'Attendees', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, offset: -5 }} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Legend iconType="square" wrapperStyle={{ paddingTop: '15px', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }} verticalAlign="bottom" />
                <Bar dataKey="present" fill="#155DFC" stackId="a" name="Present" />
                <Bar dataKey="late" fill="#F5B247" stackId="a" name="Late" />
                <Bar dataKey="absent" fill="#EF4444" stackId="a" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
              {expandedChart === 'donations' && (() => {
                const dStats = donationsData?.stats || {};
                const donorsByCat = dStats.donorsByCategory || {};
                const donorsByComm = dStats.donorsByCommunity || {};
                const topCatByComm = dStats.topCategoryByCommunity || {};
                const highestCat = sortedDonationData.length > 0 ? sortedDonationData[0] : null;
                const fmt = v => `₱${(v || 0).toLocaleString()}`;
                return (
                <>
                  <div className="adm-dv-scorecard">
                    {[
                      { label: 'Total Donations Collected', value: fmt(dStats.total || pieTotal), color: '#3B82F6' },
                      { label: 'Total Donors', value: dStats.totalDonors || 0, color: '#10B981' },
                      { label: 'Average Donation', value: fmt(dStats.avgDonation || 0), color: '#8B5CF6' },
                      { label: 'Highest Category', value: highestCat ? highestCat.name : '—', sub: highestCat ? fmt(highestCat.value) : '', color: '#F59E0B' },
                    ].map((s, i) => (
                      <div key={i} className="adm-dv-tile" style={{ borderLeft: `4px solid ${s.color}` }}>
                        <div className="adm-dv-tile-value">{s.value}</div>
                        {s.sub && <div className="adm-dv-tile-sub">{s.sub}</div>}
                        <div className="adm-dv-tile-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="adm-dv-section">
                    <h4 className="adm-dv-section-title">Category Breakdown</h4>
                    <div className="adm-dv-table-wrap">
                      <table className="adm-dv-table">
                        <thead>
                          <tr>
                            <th className="text-left">Category Name</th>
                            <th className="text-right">Total Amount</th>
                            <th className="text-center">Unique Donors</th>
                            <th className="text-right">Avg Donation</th>
                            <th className="text-right">% Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDonationData.map((cat, idx) => {
                            const donors = donorsByCat[cat.name] || 0;
                            const avg = donors > 0 ? Math.round(cat.value / donors) : 0;
                            return (
                              <tr key={idx}>
                                <td className="fw-500">
                                  <div className="adm-dv-cat-cell">
                                    <div className="adm-dv-color-dot" style={{ background: cat.color }} />
                                    {cat.name}
                                  </div>
                                </td>
                                <td className="text-right fw-600">{fmt(cat.value)}</td>
                                <td className="text-center">{donors || '—'}</td>
                                <td className="text-right">{avg > 0 ? fmt(avg) : '—'}</td>
                                <td className="text-right">{cat.percentage}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="adm-dv-section-last">
                    <h4 className="adm-dv-section-title">Donations by Community</h4>
                    <div className="adm-dv-table-scroll">
                      <table className="adm-dv-table">
                        <thead>
                          <tr>
                            <th className="text-left">Community</th>
                            <th className="text-right">Total Donated</th>
                            <th className="text-center">Unique Donors</th>
                            <th className="text-center">Top Category</th>
                            <th className="text-right">Avg / Donor</th>
                            <th className="text-right">% Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {donationsByBranch.map((b, idx) => {
                            const donors = donorsByComm[b.branch] || 0;
                            const topCat = topCatByComm[b.branch] || '—';
                            const avgPerDonor = donors > 0 ? Math.round(b.total / donors) : 0;
                            const share = pieTotal > 0 ? ((b.total / pieTotal) * 100).toFixed(1) : '0';
                            return (
                              <tr key={idx}>
                                <td className="fw-500">{b.branch}</td>
                                <td className="text-right fw-600">{fmt(b.total)}</td>
                                <td className="text-center">{donors || '—'}</td>
                                <td className="text-center"><span className="adm-dv-badge adm-dv-badge-blue">{topCat}</span></td>
                                <td className="text-right">{avgPerDonor > 0 ? fmt(avgPerDonor) : '—'}</td>
                                <td className="text-right">{share}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The scorecard shows overall donation health. The category table ranks each ministry fund by total amount and unique donor count — categories with high amounts but few donors indicate large individual gifts, while those with many donors but low totals reflect broad participation. The community table identifies the most generous communities and their preferred fund categories.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'branches' && (() => {
                const totalMem = rawMembers.length;
                const officers = rawMembers.filter(m => m.position && m.position.toLowerCase() !== 'member').length;
                const regularMem = totalMem - officers;
                const ratio = totalMem > 0 ? `${Math.round((officers / totalMem) * 100)}%` : '0%';
                // Build per-community data
                const commData = {};
                rawMembers.forEach(m => {
                  const b = m.branch || m.community;
                  if (!b || b === 'Unknown') return;
                  if (!commData[b]) commData[b] = { name: b, total: 0, officers: 0 };
                  commData[b].total++;
                  if (m.position && m.position.toLowerCase() !== 'member') commData[b].officers++;
                });
                let commArr = Object.values(commData).sort((a, b) => {
                  const ra = a.total > 0 ? (a.officers / a.total) * 100 : 0;
                  const rb = b.total > 0 ? (b.officers / b.total) * 100 : 0;
                  return rb - ra;
                });
                
                if (branchSearchQuery.trim()) {
                  commArr = commArr.filter(c => c.name.toLowerCase().includes(branchSearchQuery.toLowerCase()));
                }
                
                const highRatioCommunities = commArr.filter(c => c.total > 0 && (c.officers / c.total) * 100 > 30).length;
                return (
                <>
                  <div className="adm-dv-scorecard">
                    {[
                      { label: 'Total Members', value: totalMem, color: '#3B82F6' },
                      { label: 'Total Officers', value: officers, color: '#10B981' },
                      { label: 'Officer Ratio', value: ratio, color: '#8B5CF6' },
                      { label: 'High Officer Ratio Communities', value: highRatioCommunities, color: highRatioCommunities > 0 ? '#F59E0B' : '#10B981' },
                    ].map((s, i) => (
                      <div key={i} className="adm-dv-tile" style={{ borderLeft: `4px solid ${s.color}` }}>
                        <div className="adm-dv-tile-value">{s.value}</div>
                        <div className="adm-dv-tile-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="adm-dv-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 className="adm-dv-section-title" style={{ margin: 0 }}>Community Member Breakdown</h4>
                      <input 
                        type="text" 
                        placeholder="Search community..." 
                        value={branchSearchInput}
                        onChange={(e) => setBranchSearchInput(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', width: '250px' }}
                      />
                    </div>
                    <div className="adm-dv-table-scroll adm-dv-table-scroll-lg">
                      <table className="adm-dv-table">
                        <thead>
                          <tr>
                            <th className="text-left">Community</th>
                            <th className="text-center">Total Members</th>
                            <th className="text-center">Officers</th>
                            <th className="text-center">Regular</th>
                            <th className="text-center">Officer Ratio</th>
                            <th className="text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commArr.map((c, idx) => {
                            const ratioPct = c.total > 0 ? Math.round((c.officers / c.total) * 100) : 0;
                            const statusCls = ratioPct > 40 ? 'adm-dv-badge-red' : ratioPct > 30 ? 'adm-dv-badge-yellow' : 'adm-dv-badge-green';
                            const statusLabel = ratioPct > 40 ? 'Critical' : ratioPct > 30 ? 'Review' : 'Healthy';
                            return (
                              <tr key={idx}>
                                <td className="fw-500">{c.name}</td>
                                <td className="text-center fw-600">{c.total}</td>
                                <td className="text-center">{c.officers}</td>
                                <td className="text-center">{c.total - c.officers}</td>
                                <td className="text-center">{ratioPct}%</td>
                                <td className="text-center"><span className={`adm-dv-badge ${statusCls}`}>{statusLabel}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="adm-dv-donut-center">
                    <div className="adm-dv-donut-inner">
                      <h4 className="adm-dv-section-title">Members vs Officers</h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={[{ name: 'Regular Members', value: regularMem, fill: '#0D1F45' }, { name: 'Officers', value: officers, fill: '#155DFC' }]} cx="50%" cy="45%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" label={renderSliceLabel} labelLine={false}>
                            <Cell fill="#0D1F45" /><Cell fill="#155DFC" />
                            <Label 
                              position="center" 
                              content={({ viewBox: { cx, cy } }) => (
                                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                                  <tspan x={cx} y={cy - 5} fontSize="24" fontWeight="bold" fill="#0D1F45">{totalMem}</tspan>
                                  <tspan x={cx} y={cy + 15} fontSize="11" fill="#6B7280">Total Members</tspan>
                                </text>
                              )} 
                            />
                          </Pie>
                          <Tooltip formatter={(value) => [value, 'Members']} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(value, entry) => <span className="adm-dv-legend-label">{value}: {entry.payload.value} ({totalMem > 0 ? Math.round((entry.payload.value / totalMem) * 100) : 0}%)</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                      {highRatioCommunities > 0 && (
                        <div className="adm-dv-warning">
                          <AlertCircle size={14} /> {highRatioCommunities} communities have officer ratio above 30%
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The scorecard provides a high-level view of organizational capacity. The community table is sorted by officer ratio descending — communities marked "Critical" (red, &gt;40%) or "Review" (yellow, 30–40%) may need membership growth or officer role rebalancing. The donut chart visualizes the overall officer-to-member split.
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
                          <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} domain={[0, 'dataMax + 2']} tickFormatter={val => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                          <Tooltip />
                          <Legend iconType="circle" />
                          {(growthView === 'both' || growthView === 'total') && <Line type="monotone" dataKey="totalMembers" stroke="#155DFC" strokeWidth={2.5} dot={{ r: 3 }} name="Total Members" />}
                          {(growthView === 'both' || growthView === 'new') && <Line type="monotone" dataKey="newMembers" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} name="New Members" />}
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
                            <Bar dataKey="count" fill="#0D1F45" radius={[4, 4, 0, 0]} name="New Members" barSize={28}>
                              <LabelList dataKey="count" position="top" fill="#6B7280" fontSize={11} />
                            </Bar>
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
                              <ResponsiveContainer width="100%" height={280}>
                                <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                                  <Pie data={[
                                    { name: 'Active', value: memberStats.active, fill: '#0D1F45' },
                                    { name: 'Inactive', value: memberStats.inactive, fill: '#155DFC' }
                                  ]} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" label={renderSliceLabel} labelLine={false}>
                                    <Cell fill="#0D1F45" />
                                    <Cell fill="#155DFC" />
                                  </Pie>
                                  <Tooltip formatter={(value) => [value, 'Members']} />
                                  <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value, entry) => {
                                      const pct = value === 'Active' ? activePct : inactivePct;
                                      return <span className="adm-dv-legend-label">{value}: {entry.payload.value} ({pct.toFixed(1)}%)</span>;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="adm-dv-donut-total">
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

              {expandedChart === 'attendance' && (() => {
                const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const now = new Date();
                const ytdAtt = rawAttendance.filter(a => { const s = (a.status||'').toLowerCase(); const d = new Date(a.date||a.createdAt); return (s==='present'||s==='late') && d.getFullYear()===attYear; }).length;
                const monthlyAtt = MONTHS.map((m, i) => {
                  const count = rawAttendance.filter(a => { const s = (a.status||'').toLowerCase(); const d = new Date(a.date||a.createdAt); return (s==='present'||s==='late') && d.getFullYear()===attYear && d.getMonth()===i; }).length;
                  return { month: m, count, idx: i };
                });
                const activeMonthsAtt = monthlyAtt.filter(m => m.count > 0);
                const avgMonthly = activeMonthsAtt.length > 0 ? Math.round(ytdAtt / activeMonthsAtt.length) : 0;
                const highestMonth = activeMonthsAtt.length > 0 ? activeMonthsAtt.reduce((a, b) => b.count > a.count ? b : a) : null;
                // Community attendance
                const commAttMap = {};
                rawAttendance.forEach(a => {
                  const s = (a.status||'').toLowerCase();
                  const d = new Date(a.date||a.createdAt);
                  if ((s==='present'||s==='late') && d.getFullYear()===attYear) {
                    const b = a.branch || a.community || a.userBranch || 'Unknown';
                    if (b !== 'Unknown') {
                      if (!commAttMap[b]) commAttMap[b] = { name: b, total: 0, months: {} };
                      commAttMap[b].total++;
                      const mKey = d.getMonth();
                      commAttMap[b].months[mKey] = (commAttMap[b].months[mKey] || 0) + 1;
                    }
                  }
                });
                const commAttArr = Object.values(commAttMap).sort((a, b) => b.total - a.total);
                const topCommunity = commAttArr.length > 0 ? commAttArr[0].name : '—';
                return (
                <>
                  <div className="adm-dv-scorecard">
                    {[
                      { label: 'Total Attendance YTD', value: ytdAtt.toLocaleString(), color: '#3B82F6' },
                      { label: 'Avg Monthly Attendance', value: avgMonthly.toLocaleString(), color: '#10B981' },
                      { label: 'Highest Month', value: highestMonth ? highestMonth.month : '—', sub: highestMonth ? `${highestMonth.count.toLocaleString()} attendees` : '', color: '#8B5CF6' },
                      { label: 'Most Attended Community', value: topCommunity, color: '#F59E0B' },
                    ].map((s, i) => (
                      <div key={i} className="adm-dv-tile" style={{ borderLeft: `4px solid ${s.color}` }}>
                        <div className="adm-dv-tile-value">{s.value}</div>
                        {s.sub && <div className="adm-dv-tile-sub">{s.sub}</div>}
                        <div className="adm-dv-tile-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="adm-dv-section">
                    <h4 className="adm-dv-section-title">Monthly Attendance</h4>
                    <div className="adm-dv-table-wrap">
                      <table className="adm-dv-table">
                        <thead>
                          <tr>
                            <th className="text-left">Month</th>
                            <th className="text-right">Total Attendance</th>
                            <th className="text-right">MoM Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyAtt.map((m, i) => {
                            const isFuture = m.count === 0 && i > now.getMonth() && attYear >= now.getFullYear();
                            const prev = i > 0 ? monthlyAtt[i - 1].count : 0;
                            const momPct = i === 0 || isFuture || (prev === 0 && m.count === 0) ? null : prev === 0 ? null : Math.round(((m.count - prev) / prev) * 100);
                            const isBold = m.count > avgMonthly && m.count > 0;
                            return (
                              <tr key={i} className={`${isFuture ? 'future-row' : ''} ${isBold ? 'bold-row' : ''}`}>
                                <td>{m.month}</td>
                                <td className="text-right">{m.count > 0 ? m.count.toLocaleString() : '—'}</td>
                                <td className="text-right">
                                  {momPct === null ? '—' : momPct === 0 ? <span style={{ color: '#6B7280' }}>— 0%</span> : <span className={momPct > 0 ? 'adm-dv-mom-up' : 'adm-dv-mom-down'}>{momPct > 0 ? '↑' : '↓'} {Math.abs(momPct)}%</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="adm-dv-section-last">
                    <h4 className="adm-dv-section-title">Attendance by Community</h4>
                    <div className="adm-dv-table-scroll">
                      <table className="adm-dv-table">
                        <thead>
                          <tr>
                            <th className="text-left">Community</th>
                            <th className="text-right">Total Attendance</th>
                            <th className="text-right">Avg / Month</th>
                            <th className="text-center">Most Active Month</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commAttArr.map((c, idx) => {
                            const activeMs = Object.keys(c.months).length;
                            const avgPerMonth = activeMs > 0 ? Math.round(c.total / activeMs) : 0;
                            const bestMonthIdx = Object.entries(c.months).sort((a, b) => b[1] - a[1])[0];
                            const bestMonth = bestMonthIdx ? MONTHS[parseInt(bestMonthIdx[0])] : '—';
                            return (
                              <tr key={idx}>
                                <td className="fw-500">{c.name}</td>
                                <td className="text-right fw-600">{c.total.toLocaleString()}</td>
                                <td className="text-right">{avgPerMonth}</td>
                                <td className="text-center"><span className="adm-dv-badge adm-dv-badge-blue">{bestMonth}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The scorecard shows year-to-date attendance health. The monthly table highlights months exceeding the average in bold — consecutive MoM declines (red arrows) may signal engagement drops requiring outreach. The community table ranks communities by total attendance and identifies their peak months.
                  </div>
                </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}