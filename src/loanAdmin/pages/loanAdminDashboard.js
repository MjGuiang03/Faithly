import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, LabelList, AreaChart, Area, Label
} from 'recharts';
import LoanAdminSidebar from './loanAdminSidebar';
import '../../admin/styles/AdminDashboard.css';
import '../styles/loanAdminDashboard.css';
import API from '../../utils/api';
import { Banknote, CheckCircle, LayoutDashboard, PiggyBank, X, Filter, Expand } from 'lucide-react';


const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const formatYAxis = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return num;
};

const CHART_TICKS = [0, 100000, 200000, 300000, 400000, 500000];
const PIE_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];
const STATUS_COLORS = {
  Active: '#0D1F45', Completed: '#1E3A8A', Pending: '#2563EB',
  Rejected: '#3B82F6', Cancelled: '#93C5FD', Approved: '#60A5FA',
  'Awaiting Approval': '#BFDBFE'
};

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

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

export default function LoanAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, active: 0, totalThisMonth: 0, totalDisbursed: 0 });
  const [recentLoans, setRecentLoans] = useState([]);
  const [allLoans, setAllLoans] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [disbursementByType, setDisbursementByType] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [savingsMonthly, setSavingsMonthly] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [repaymentPerformance, setRepaymentPerformance] = useState([]);
  const [monthlyApplications, setMonthlyApplications] = useState([]);
  const [delinquencyRate, setDelinquencyRate] = useState([]);


  // Modal states
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showDisbursedModal, setShowDisbursedModal] = useState(false);
  const [monthModalMonth, setMonthModalMonth] = useState(new Date().getMonth().toString());
  const [monthModalYear, setMonthModalYear] = useState(new Date().getFullYear());
  const [disbModalMonth, setDisbModalMonth] = useState('all');
  const [disbModalYear, setDisbModalYear] = useState('all');
  const [expandedChart, setExpandedChart] = useState(null);

  const token = localStorage.getItem('adminToken');
  const currentYear = new Date().getFullYear();

  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => {
    if (res.status === 401 || res.status === 403) { navigate('/'); return { success: false }; }
    return res.json();
  });

  const { data: loansData, isValidating: loadingLoans } = useSWR(
    token ? `${API}/api/admin/loans` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const { data: reportsData, isValidating: loadingReports } = useSWR(
    token ? `${API}/api/admin/loan-reports?year=${currentYear}` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const { data: savingsData, isValidating: loadingSavings } = useSWR(
    token ? `${API}/api/admin/member-savings` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  useEffect(() => {
    if (!token) { navigate('/'); return; }
  }, [token, navigate]);

  useEffect(() => {
    if (loansData) {
      if (loansData.message && !loansData.success && !loansData.loans) {
        toast.error(loansData.message || 'Failed to fetch dashboard data');
      } else {
        setStats(prev => ({
          ...prev,
          pending: loansData.stats?.pending || 0,
          active: (loansData.stats?.active || 0) + (loansData.stats?.completed || 0),
          totalThisMonth: loansData.stats?.totalThisMonth || 0,
          totalDisbursed: loansData.stats?.totalDisbursed || 0,
        }));
        setAllLoans(loansData.loans || []);
        const upcoming = (loansData.loans || []).filter(l => l.status === 'active' || l.status === 'pending').slice(0, 5);
        setRecentLoans(upcoming);
      }
    }
  }, [loansData]);

  useEffect(() => {
    if (reportsData && reportsData.success) {
      setMonthlyData(reportsData.monthlyData || []);
      setDisbursementByType(reportsData.disbursementByType || []);
      setStatusDistribution(reportsData.statusDistribution || []);
      setRepaymentPerformance(reportsData.repaymentPerformance || []);
      setMonthlyApplications(reportsData.monthlyApplications || []);
      setDelinquencyRate(reportsData.delinquencyRate || []);
    }
  }, [reportsData]);

  useEffect(() => {
    if (savingsData) {
      setTotalSavings(savingsData.totalSavings || 0);
      // Use pre-aggregated monthlyTrend from server if available
      if (savingsData.monthlyTrend && savingsData.monthlyTrend.length > 0) {
        setSavingsMonthly(savingsData.monthlyTrend);
      } else {
        // Fallback: process raw transactions (backward compatibility)
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthlyTrend = months.map(m => ({ month: m, savings: 0 }));
        if (savingsData.transactions) {
          savingsData.transactions.forEach(t => {
            const d = new Date(t.date || t.createdAt);
            if (d.getFullYear() === currentYear) {
              monthlyTrend[d.getMonth()].savings += Number(t.amount) || 0;
            }
          });
        }
        setSavingsMonthly(monthlyTrend);
      }
    }
  }, [savingsData, currentYear]);

  // For UI rendering, loading is active only when data is missing and it's fetching
  const isLoading = (!loansData && loadingLoans) || (!reportsData && loadingReports) || (!savingsData && loadingSavings);

  const dash = useCallback((v) => isLoading ? '—' : v, [isLoading]);

  // Derived: all disbursed loans
  const allDisbursedLoans = useMemo(() => {
    return allLoans.filter(l => l.disbursed && l.disbursementDate);
  }, [allLoans]);

  // Filtered loans for This Month modal
  const filteredMonthLoans = useMemo(() => {
    return allDisbursedLoans.filter(l => {
      const d = new Date(l.disbursementDate);
      return d.getMonth() === parseInt(monthModalMonth) && d.getFullYear() === monthModalYear;
    });
  }, [allDisbursedLoans, monthModalMonth, monthModalYear]);

  // Filtered loans for All Disbursements modal
  const filteredDisbLoans = useMemo(() => {
    return allDisbursedLoans.filter(l => {
      const d = new Date(l.disbursementDate);
      if (disbModalYear !== 'all' && d.getFullYear() !== parseInt(disbModalYear)) return false;
      if (disbModalMonth !== 'all' && d.getMonth() !== parseInt(disbModalMonth)) return false;
      return true;
    });
  }, [allDisbursedLoans, disbModalMonth, disbModalYear]);

  const getMonthModalLabel = useCallback(() => `${MONTH_NAMES[parseInt(monthModalMonth)]} ${monthModalYear}`, [monthModalMonth, monthModalYear]);
  const getDisbModalLabel = useCallback(() => {
    if (disbModalYear === 'all' && disbModalMonth === 'all') return 'All Time';
    if (disbModalYear !== 'all' && disbModalMonth === 'all') return `Year ${disbModalYear}`;
    if (disbModalYear === 'all' && disbModalMonth !== 'all') return `${MONTH_NAMES[parseInt(disbModalMonth)]} (All Years)`;
    return `${MONTH_NAMES[parseInt(disbModalMonth)]} ${disbModalYear}`;
  }, [disbModalMonth, disbModalYear]);

  const openMonthModal = useCallback(() => {
    setMonthModalMonth(new Date().getMonth().toString());
    setMonthModalYear(new Date().getFullYear());
    setShowMonthModal(true);
  }, []);
  const openDisbModal = useCallback(() => {
    setDisbModalMonth('all');
    setDisbModalYear('all');
    setShowDisbursedModal(true);
  }, []);

  const moneyInVsOutSummary = useMemo(() => {
    const totalIn = monthlyData.reduce((sum, d) => sum + (d.received || 0), 0);
    const totalOut = monthlyData.reduce((sum, d) => sum + (d.disbursed || 0), 0);
    const net = totalIn - totalOut;
    return { totalIn, totalOut, net };
  }, [monthlyData]);

  const disbursementSummary = useMemo(() => {
    const total = disbursementByType.reduce((s, d) => s + (d.amount || 0), 0);
    const activeDisbursements = disbursementByType.filter(d => d.amount > 0);
    const zeroDisbursements = disbursementByType.filter(d => d.amount === 0);
    return { total, activeDisbursements, zeroDisbursements };
  }, [disbursementByType]);

  const enhancedSavingsData = useMemo(() => {
    const enhancedSavings = savingsMonthly.map(d => ({
      ...d,
      actualSavings: d.savings > 0 ? d.savings : null,
      zeroSavings: d.savings === 0 ? 0 : null
    }));
    let firstDataIdx = enhancedSavings.findIndex(d => d.actualSavings !== null);
    if (firstDataIdx > 0) enhancedSavings[firstDataIdx].zeroSavings = enhancedSavings[firstDataIdx].actualSavings;
    return enhancedSavings;
  }, [savingsMonthly]);

  const statusDistributionSummary = useMemo(() => {
    const total = statusDistribution.reduce((s, d) => s + (d.value || 0), 0);
    return { total };
  }, [statusDistribution]);

  const repaymentPerformanceSummary = useMemo(() => {
    const total = repaymentPerformance.reduce((s, d) => s + (d.value || 0), 0);
    const onTime = repaymentPerformance.find(d => d.name === 'On-Time')?.value || 0;
    const pct = total > 0 ? ((onTime / total) * 100).toFixed(1) : 0;
    return { total, onTime, pct };
  }, [repaymentPerformance]);

  const delinquencyRateSummary = useMemo(() => {
    const totalPayments = delinquencyRate.reduce((s, d) => s + (d.total || 0), 0);
    const totalLate = delinquencyRate.reduce((s, d) => s + (d.late || 0), 0);
    const avgRate = totalPayments > 0 ? ((totalLate / totalPayments) * 100).toFixed(1) : 0;
    return { totalPayments, totalLate, avgRate };
  }, [delinquencyRate]);

  const monthModalTotal = useMemo(() => {
    return filteredMonthLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  }, [filteredMonthLoans]);

  const disbModalTotal = useMemo(() => {
    return filteredDisbLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  }, [filteredDisbLoans]);

  return (
    <div className="loan-admin-dashboard-page">
      <LoanAdminSidebar />
      <div className="loan-admin-dashboard-content">
        {!expandedChart && (<>
        {/* Header */}
        <h1 className="admin-dashboard-title">Loan Dashboard</h1>
        {/* Row 1 — 5 Stat Cards */}
        <div className="adm-stats-grid">
          <div className="adm-stat-card adm-clickable-card" onClick={() => navigate('/loan-admin/loan-management')}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Pending Review</span>
              <div className="adm-stat-icon adm-icon-yellow">
                <LayoutDashboard size={16} color="white" />
              </div>
            </div>
            <span className="adm-stat-value">{dash(stats.pending)}</span>
          </div>

          <div className="adm-stat-card adm-clickable-card" onClick={() => navigate('/loan-admin/loan-management')}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Approved Loans</span>
              <div className="adm-stat-icon adm-icon-green">
                <CheckCircle size={16} color="white" />
              </div>
            </div>
            <span className="adm-stat-value">{dash(stats.active)}</span>
          </div>

          <div className="adm-stat-card la-clickable-card" onClick={openMonthModal}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total This Month</span>
              <div className="adm-stat-icon adm-icon-blue">
                <LayoutDashboard size={16} color="white" />
              </div>
            </div>
            <span className="adm-stat-value">{dash(stats.totalThisMonth)}</span>
          </div>

          <div className="adm-stat-card la-clickable-card" onClick={openDisbModal}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total Disbursed</span>
              <div className="adm-stat-icon adm-icon-navy">
                <Banknote size={16} color="white" />
              </div>
            </div>
            <span className="adm-stat-value">{dash(fmt(stats.totalDisbursed))}</span>
          </div>

          <div className="adm-stat-card adm-clickable-card" onClick={() => navigate('/loan-admin/payments/savings')}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total Savings</span>
              <div className="adm-stat-icon adm-icon-purple">
                <PiggyBank size={16} color="white" />
              </div>
            </div>
            <span className="adm-stat-value">{dash(fmt(totalSavings))}</span>
          </div>
        </div>

        {/* Row 2 — Charts */}
        <div className="adm-analytics-row adm-analytics-row-loan">
          {/* Money In vs Money Out */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Money In vs Money Out</h3>
                <span className="adm-card-sub">Monthly comparison of received funds and loan disbursements</span>
                <div className="la-cashflow-header">
                  <div className="la-cashflow-badges">
                    <span className="la-cashflow-badge-in">Total In: ₱{(moneyInVsOutSummary.totalIn/1000).toFixed(1)}k</span>
                    <span className="la-cashflow-badge-out">Total Out: ₱{(moneyInVsOutSummary.totalOut/1000).toFixed(1)}k</span>
                    <span className={`la-cashflow-badge-net ${moneyInVsOutSummary.net >= 0 ? 'net-pos' : 'net-neg'}`}>
                      Net Balance: {moneyInVsOutSummary.net < 0 ? '-' : ''}₱{(Math.abs(moneyInVsOutSummary.net)/1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('moneyIn')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={45} ticks={CHART_TICKS} domain={[0, 500000]} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px' }} />
                <Bar dataKey="received" fill="#0D1F45" name="Money Received" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disbursed" fill="#60A5FA" name="Money Released" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Disbursements by Type */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Disbursements by Type</h3>
                <span className="adm-card-sub">Funds allocated by loan type</span>
                <div className="la-card-total">Total: ₱{disbursementSummary.total.toLocaleString()}</div>
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('disbursements')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <div style={{ width: '100%', height: '240px' }}>
              <div className="la-chart-wrapper" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="la-chart-inner" style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={disbursementSummary.activeDisbursements} layout="vertical" margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} domain={[0, 'dataMax']} hide />
                      <YAxis dataKey="type" type="category" stroke="#9CA3AF" fontSize={11} width={100} />
                      <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                        <LabelList dataKey="amount" position="right" formatter={val => val > 0 ? `${Math.round((val/disbursementSummary.total)*100)}%` : ''} fontSize={11} fill="#6B7280" />
                        {disbursementSummary.activeDisbursements.map((entry, index) => {
                          const CHART_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA'];
                          return <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {disbursementSummary.zeroDisbursements.length > 0 && (
                  <div className="la-chart-footer" style={{ fontSize: '12px', color: '#6B7280', paddingTop: '8px' }}>
                    ({disbursementSummary.zeroDisbursements.map(d => d.type).join(', ')}: ₱0)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Savings Trend */}
        <div className="adm-card">
          <div className="adm-card-header">
            <div>
              <h3 className="adm-card-title">Savings Trend</h3>
              <span className="adm-card-sub">Monthly member savings deposits this year</span>
            </div>
            <button className="la-chart-expand-btn" onClick={() => setExpandedChart('savings')} title="Expand Chart">
              <Expand size={18} color="#4B5563" strokeWidth={2.5} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={enhancedSavingsData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={45} ticks={CHART_TICKS} domain={[0, 500000]} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
              <Line type="monotone" dataKey="zeroSavings" stroke="#D1D5DB" strokeDasharray="5 5" strokeWidth={2} dot={false} name="No Data" connectNulls />
              <Line type="monotone" dataKey="actualSavings" stroke="#0D1F45" strokeWidth={2} dot={{ r: 3, fill: '#0D1F45' }} name="Savings" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3 — New Analytics Charts */}
        <div className="adm-analytics-row adm-analytics-row-loan">
          {/* Loan Status Distribution (Donut) */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Loan Status Distribution</h3>
                <span className="adm-card-sub">Portfolio breakdown by current loan status</span>
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('statusDist')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="42%" innerRadius={35} outerRadius={75} paddingAngle={2} dataKey="value" label={renderSliceLabel} labelLine={false}>
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                  <Label value={statusDistributionSummary.total} position="center" fill="#1e3a5f" style={{ fontSize: '18px', fontWeight: 'bold' }} />
                  <Label value="Total" position="center" dy={16} fill="#6B7280" style={{ fontSize: '10px' }} />
                </Pie>
                <Tooltip formatter={(v, name) => [v + ' loans', name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Repayment Performance */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Repayment Performance</h3>
                <span className="adm-card-sub">On-time vs late payment ratio this year</span>
                <div className={`la-card-total ${repaymentPerformanceSummary.pct >= 80 ? 'la-rate-good' : 'la-rate-warn'}`}>{repaymentPerformanceSummary.pct}% On-Time Rate</div>
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('repayment')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={repaymentPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={13} />
                <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                <Tooltip formatter={(v) => v + ' payments'} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                  <LabelList dataKey="value" position="top" fontSize={13} fontWeight={600} fill="#374151" />
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 4 — Applications Trend + Delinquency */}
        <div className="adm-analytics-row adm-analytics-row-loan">
          {/* Monthly Loan Applications Trend */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Loan Applications Trend</h3>
                <span className="adm-card-sub">Monthly applications with approval/rejection breakdown</span>
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('appTrend')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyApplications} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px' }} />
                <Area type="monotone" dataKey="applications" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" name="Applications" />
                <Line type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Approved" />
                <Line type="monotone" dataKey="rejected" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Rejected" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Delinquency Rate */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Delinquency Rate</h3>
                <span className="adm-card-sub">Percentage of late payments per month</span>
                <div className={`la-card-total ${delinquencyRateSummary.avgRate <= 10 ? 'la-rate-good' : delinquencyRateSummary.avgRate <= 25 ? 'la-rate-warn' : 'la-rate-bad'}`}>Avg: {delinquencyRateSummary.avgRate}%</div>
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('delinquency')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={delinquencyRate} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={v => v + '%'} />
                <Tooltip formatter={(v) => v + '%'} />
                <ReferenceLine y={15} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'Threshold (15%)', position: 'right', fill: '#EF4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="rate" stroke="#0D1F45" strokeWidth={2.5} dot={{ r: 4, fill: '#0D1F45' }} name="Delinquency %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 5 — Recent Loan Applications */}
        <div className="adm-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Recent Loan Applications</h3>
            <button className="loan-admin-dashboard-view-all" onClick={() => navigate('/loan-admin/loan-management')}>View All</button>
          </div>
          <div className="loan-admin-dashboard-payments-list">
            {recentLoans.length === 0 ? (
              <p className="la-empty-text">No recent loan applications.</p>
            ) : (
              recentLoans.map(loan => (
                <div className="loan-admin-dashboard-payment-card" key={loan._id}>
                  <div className="loan-admin-dashboard-payment-left">
                    <div className="loan-admin-dashboard-payment-icon" style={{ background: loan.status === 'pending' ? '#FEF3C7' : '#EFF6FF' }}>
                      <Banknote size={18} />
                    </div>
                    <div className="loan-admin-dashboard-payment-info">
                      <p className="loan-admin-dashboard-payment-name">{loan.memberName}</p>
                      <p className="loan-admin-dashboard-payment-number">{loan.loanId}</p>
                      <p className="loan-admin-dashboard-payment-due">Applied: {fmtDate(loan.appliedDate)}</p>
                    </div>
                  </div>
                  <div className="loan-admin-dashboard-payment-right">
                    <p className="loan-admin-dashboard-payment-amount">{fmt(loan.amount)}</p>
                    <p className="loan-admin-dashboard-payment-days" style={{ color: loan.status === 'pending' ? '#F59E0B' : '#155DFC', fontWeight: 600 }}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </>)}

      {/* ── This Month Modal ── */}
      {showMonthModal && (
        <div className="la-modal-overlay" onClick={() => setShowMonthModal(false)}>
          <div className="la-modal" onClick={e => e.stopPropagation()}>
            <div className="la-modal-header">
              <div>
                <h2 className="la-modal-title">Monthly Disbursements</h2>
                <p className="la-modal-subtitle">{getMonthModalLabel()} — {filteredMonthLoans.length} loan(s) processed</p>
              </div>
              <button className="la-modal-close" onClick={() => setShowMonthModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="la-modal-filters">
              <Filter size={14} color="#6B7280" />
              <select value={monthModalMonth} onChange={e => setMonthModalMonth(e.target.value)} className="la-modal-filter-select">
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={monthModalYear} onChange={e => setMonthModalYear(parseInt(e.target.value))} className="la-modal-filter-select">
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="la-modal-body">
              {filteredMonthLoans.length === 0 ? (
                <div className="la-modal-empty">No disbursements for {getMonthModalLabel()}.</div>
              ) : (
                <div className="la-modal-table-wrapper">
                  <table className="la-modal-table">
                    <thead>
                      <tr>
                        <th>Loan ID</th>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMonthLoans.map(l => (
                        <tr key={l._id}>
                          <td className="la-modal-loan-id">{l.loanId}</td>
                          <td>{l.memberName || 'N/A'}</td>
                          <td className="la-modal-amount">{fmt(l.amount)}</td>
                          <td><span className={`la-method-badge la-method-${(l.paymentMethod || 'cash').toLowerCase()}`}>{l.paymentMethod || 'Cash'}</span></td>
                          <td>{fmtDate(l.disbursementDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="la-modal-summary">
                <span>Total for {getMonthModalLabel()}</span>
                <span className="la-modal-summary-value">{fmt(monthModalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Total Disbursed Modal ── */}
      {showDisbursedModal && (
        <div className="la-modal-overlay" onClick={() => setShowDisbursedModal(false)}>
          <div className="la-modal" onClick={e => e.stopPropagation()}>
            <div className="la-modal-header">
              <div>
                <h2 className="la-modal-title">All Disbursements</h2>
                <p className="la-modal-subtitle">{getDisbModalLabel()} — {filteredDisbLoans.length} loan(s) — {fmt(disbModalTotal)}</p>
              </div>
              <button className="la-modal-close" onClick={() => setShowDisbursedModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="la-modal-filters">
              <Filter size={14} color="#6B7280" />
              <select value={disbModalMonth} onChange={e => setDisbModalMonth(e.target.value)} className="la-modal-filter-select">
                <option value="all">All Months</option>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={disbModalYear} onChange={e => setDisbModalYear(e.target.value)} className="la-modal-filter-select">
                <option value="all">All Years</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="la-modal-body">
              {filteredDisbLoans.length === 0 ? (
                <div className="la-modal-empty">No disbursements for {getDisbModalLabel()}.</div>
              ) : (
                <div className="la-modal-table-wrapper">
                  <table className="la-modal-table">
                    <thead>
                      <tr>
                        <th>Loan ID</th>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDisbLoans.map(l => (
                        <tr key={l._id}>
                          <td className="la-modal-loan-id">{l.loanId}</td>
                          <td>{l.memberName || 'N/A'}</td>
                          <td className="la-modal-amount">{fmt(l.amount)}</td>
                          <td><span className={`la-method-badge la-method-${(l.paymentMethod || 'cash').toLowerCase()}`}>{l.paymentMethod || 'Cash'}</span></td>
                          <td>{fmtDate(l.disbursementDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="la-modal-summary">
                <span>Total ({getDisbModalLabel()})</span>
                <span className="la-modal-summary-value">{fmt(disbModalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded Chart View ── */}
      {expandedChart && (
        <div className="adm-expand-overlay">
          <div className="adm-expand-modal">
            <div className="adm-expand-header">
              <h2 className="adm-expand-title">
                {expandedChart === 'moneyIn' && 'Money In vs Money Out — Detailed View'}
                {expandedChart === 'disbursements' && 'Disbursements by Type — Detailed View'}
                {expandedChart === 'savings' && 'Savings Trend — Detailed View'}
                {expandedChart === 'statusDist' && 'Loan Status Distribution — Detailed View'}
                {expandedChart === 'repayment' && 'Repayment Performance — Detailed View'}
                {expandedChart === 'appTrend' && 'Loan Applications Trend — Detailed View'}
                {expandedChart === 'delinquency' && 'Delinquency Rate — Detailed View'}
              </h2>
              <button className="adm-expand-close" onClick={() => setExpandedChart(null)}><X size={20} /></button>
            </div>
            <div className="adm-expand-body">
              {expandedChart === 'moneyIn' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Monthly Comparison (Bar)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} ticks={CHART_TICKS} domain={[0, 500000]} />
                            <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                            <Legend iconType="circle" />
                            <Bar dataKey="received" fill="#0D1F45" name="Money Received" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="disbursed" fill="#60A5FA" name="Money Released" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="la-expand-cashflow-side">
                      <h4 className="la-expand-panel-title">Net Cash Flow (Area)</h4>
                      <div className="adm-expand-panel-chart">
                        {(() => {
                          const netData = monthlyData.map(d => ({ ...d, net: (d.received || 0) - (d.disbursed || 0) }));
                          const dataMax = Math.max(...netData.map(d => d.net));
                          const dataMin = Math.min(...netData.map(d => d.net));
                          const off = dataMax <= 0 ? 0 : dataMin >= 0 ? 1 : dataMax / (dataMax - dataMin);
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={netData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                                <defs>
                                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={off} stopColor="#10B981" stopOpacity={0.8} />
                                    <stop offset={off} stopColor="#EF4444" stopOpacity={0.8} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} />
                                <Tooltip cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '3 3' }} formatter={(v) => '₱' + v.toLocaleString()} />
                                <ReferenceLine y={0} stroke="#4B5563" strokeDasharray="3 3" />
                                <Area type="monotone" dataKey="net" stroke="#000" strokeWidth={1} fill="url(#splitColor)" name="Net Flow" />
                              </AreaChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel compares money received (repayments) vs money released (disbursements) per month. The right panel shows the net cash flow trend using a threshold area chart — green indicates surplus, red indicates more was released than received. This dual view helps assess the lending portfolio's financial health.
                  </div>
                </>
              )}

              {expandedChart === 'disbursements' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Amount by Type (Bar)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={disbursementByType} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} ticks={CHART_TICKS} domain={[0, 500000]} />
                            <YAxis dataKey="type" type="category" stroke="#9CA3AF" fontSize={12} width={110} />
                            <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                              {disbursementByType.map((_, index) => {
                                const CHART_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA'];
                                return <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Distribution (%)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const total = disbursementByType.reduce((s,d) => s + d.amount, 0);
                            return (
                              <PieChart>
                                <Pie data={disbursementByType.map(d => ({ name: d.type, value: d.amount }))} cx="50%" cy="45%" innerRadius={40} outerRadius={90} paddingAngle={2} dataKey="value" label={renderSliceLabel} labelLine={false}>
                                  {disbursementByType.map((_, index) => {
                                    const CHART_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA'];
                                    return <Cell key={`pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />;
                                  })}
                                  <Label value={`₱${total >= 1000 ? (total/1000).toFixed(1).replace(/\.0$/, '') + 'k' : total}`} position="center" fill="#1e3a5f" style={{ fontSize: '16px', fontWeight: 'bold' }} />
                                  <Label value="Total" position="center" dy={16} fill="#6B7280" style={{ fontSize: '11px' }} />
                                </Pie>
                                <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                              </PieChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel shows absolute disbursement amounts per loan type as a horizontal bar chart. The right panel presents the same data as a pie chart to visualize percentage share. This helps identify the most in-demand loan products for data-driven fund allocation decisions.
                  </div>
                </>
              )}

              {expandedChart === 'savings' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Cumulative Savings Trend</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            let runningTotal = 0;
                            const cumulativeData = savingsMonthly.map(d => {
                              runningTotal += d.savings || 0;
                              return { ...d, cumulative: runningTotal };
                            });
                            return (
                              <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                                <defs>
                                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} />
                                <Tooltip cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '3 3' }} formatter={(v) => '₱' + v.toLocaleString()} />
                                <Area type="monotone" dataKey="cumulative" stroke="#1E3A8A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCumulative)" name="Cumulative Savings" />
                              </AreaChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Monthly Deposits (Bar)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={savingsMonthly} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} ticks={CHART_TICKS} domain={[0, 500000]} />
                            <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                            <Bar dataKey="savings" fill="#0D1F45" radius={[4, 4, 0, 0]} name="Savings" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel shows the savings deposit trend over time as a line chart. The right panel visualizes the same monthly data as a bar chart for easier period-to-period comparison. An upward trend indicates growing participation in the savings program.
                  </div>
                </>
              )}

              {expandedChart === 'statusDist' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Status Distribution (Donut)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const STATUS_COLORS = {
                              Active: '#0D1F45', Completed: '#1E3A8A', Pending: '#2563EB',
                              Rejected: '#3B82F6', Cancelled: '#93C5FD', Approved: '#60A5FA',
                              'Awaiting Approval': '#BFDBFE'
                            };
                            const total = statusDistribution.reduce((s, d) => s + d.value, 0);
                            return (
                              <PieChart>
                                <Pie data={statusDistribution} cx="50%" cy="45%" innerRadius={45} outerRadius={100} paddingAngle={2} dataKey="value" label={renderSliceLabel} labelLine={false}>
                                  {statusDistribution.map((entry, i) => (
                                    <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                                  ))}
                                  <Label value={total} position="center" fill="#1e3a5f" style={{ fontSize: '22px', fontWeight: 'bold' }} />
                                  <Label value="Total Loans" position="center" dy={20} fill="#6B7280" style={{ fontSize: '11px' }} />
                                </Pie>
                                <Tooltip formatter={(v) => v + ' loans'} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                              </PieChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Status Breakdown (Table)</h4>
                      <div className="adm-expand-panel-chart la-status-table-wrap">
                        {(() => {
                          const STATUS_COLORS = {
                            Active: '#0D1F45', Completed: '#1E3A8A', Pending: '#2563EB',
                            Rejected: '#3B82F6', Cancelled: '#93C5FD', Approved: '#60A5FA',
                            'Awaiting Approval': '#BFDBFE'
                          };
                          const total = statusDistribution.reduce((s, d) => s + d.value, 0);
                          return statusDistribution.map((item, i) => (
                            <div key={i} className="la-status-row">
                              <div className="la-status-row-left">
                                <span className="la-status-dot" style={{ background: STATUS_COLORS[item.name] || PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="la-status-name">{item.name}</span>
                              </div>
                              <div className="la-status-row-right">
                                <span className="la-status-count">{item.value}</span>
                                <span className="la-status-pct">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%</span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The donut chart shows the portfolio health at a glance. A healthy portfolio should have more Active/Completed loans than Pending/Rejected. High rejection rates may indicate stricter approval criteria or poor applicant eligibility.
                  </div>
                </>
              )}

              {expandedChart === 'repayment' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">On-Time vs Late Payments</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={repaymentPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={14} />
                            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                            <Tooltip formatter={(v) => v + ' payments'} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={80}>
                              <LabelList dataKey="value" position="top" fontSize={16} fontWeight={700} fill="#374151" />
                              <Cell fill="#10B981" />
                              <Cell fill="#EF4444" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Performance Ratio</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const total = repaymentPerformance.reduce((s, d) => s + d.value, 0);
                            return (
                              <PieChart>
                                <Pie data={repaymentPerformance} cx="50%" cy="45%" innerRadius={40} outerRadius={90} paddingAngle={3} dataKey="value" label={renderSliceLabel} labelLine={false}>
                                  <Cell fill="#10B981" />
                                  <Cell fill="#EF4444" />
                                  <Label value={total} position="center" fill="#1e3a5f" style={{ fontSize: '18px', fontWeight: 'bold' }} />
                                  <Label value="Total" position="center" dy={18} fill="#6B7280" style={{ fontSize: '11px' }} />
                                </Pie>
                                <Tooltip formatter={(v) => v + ' payments'} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                              </PieChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left bar chart shows absolute counts of on-time vs late payments. The right pie chart visualizes the ratio. An on-time rate above 80% indicates strong repayment discipline. Late payments incur a 3% penalty, so a high late rate impacts both borrowers and the organization's risk exposure.
                  </div>
                </>
              )}

              {expandedChart === 'appTrend' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Applications Volume (Area)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monthlyApplications} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                            <defs>
                              <linearGradient id="colorAppsExpand" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                            <Tooltip />
                            <Legend iconType="circle" />
                            <Area type="monotone" dataKey="applications" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAppsExpand)" name="Total Applications" />
                            <Line type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Approved" />
                            <Line type="monotone" dataKey="rejected" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Rejected" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Approval Rate per Month (%)</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyApplications.map(d => ({
                            month: d.month,
                            approvalRate: d.applications > 0 ? Math.round((d.approved / d.applications) * 100) : 0,
                            rejectionRate: d.applications > 0 ? Math.round((d.rejected / d.applications) * 100) : 0,
                          }))} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={v => v + '%'} />
                            <Tooltip formatter={v => v + '%'} />
                            <Legend iconType="circle" />
                            <Bar dataKey="approvalRate" fill="#10B981" name="Approval %" radius={[4, 4, 0, 0]} stackId="a" />
                            <Bar dataKey="rejectionRate" fill="#EF4444" name="Rejection %" radius={[4, 4, 0, 0]} stackId="a" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel shows total loan applications over time with overlay lines for approved and rejected counts. The right panel shows the approval and rejection rates as stacked bars. Rising applications indicate growing demand; declining approval rates may suggest stricter policies or declining applicant quality.
                  </div>
                </>
              )}

              {expandedChart === 'delinquency' && (
                <>
                  <div className="adm-expand-grid">
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Delinquency % Trend</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={delinquencyRate} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                            <defs>
                              <linearGradient id="colorDelinquency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={v => v + '%'} />
                            <Tooltip formatter={v => v + '%'} />
                            <ReferenceLine y={15} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'Risk Threshold (15%)', position: 'insideTopRight', fill: '#EF4444', fontSize: 11 }} />
                            <Area type="monotone" dataKey="rate" stroke="#0D1F45" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDelinquency)" name="Delinquency %" dot={{ r: 4, fill: '#0D1F45' }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="adm-expand-panel">
                      <h4 className="adm-expand-panel-title">Late vs Total Payments</h4>
                      <div className="adm-expand-panel-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={delinquencyRate} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                            <Tooltip />
                            <Legend iconType="circle" />
                            <Bar dataKey="total" fill="#1E3A8A" name="Total Payments" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="late" fill="#EF4444" name="Late Payments" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The left panel shows the delinquency rate trend as an area chart with a 15% risk threshold line. Rates consistently above the threshold indicate systemic repayment issues. The right panel shows absolute numbers of total vs late payments per month, helping identify if delinquency spikes are due to more late payments or fewer total payments.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
