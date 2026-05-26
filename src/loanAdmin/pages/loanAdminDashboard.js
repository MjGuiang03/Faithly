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
  if (num >= 1000000) return `₱${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `₱${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return num === 0 ? '₱0' : `₱${num}`;
};

const CHART_TICKS = [0, 100000, 200000, 300000, 400000, 500000];
const PIE_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];
const STATUS_COLORS = {
  Active: '#10B981', Completed: '#0D1F45', Pending: '#2563EB',
  Rejected: '#EF4444', Cancelled: '#F59E0B', Approved: '#60A5FA',
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
  const [disbursementByTypeDetail, setDisbursementByTypeDetail] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [savingsMonthly, setSavingsMonthly] = useState([]);
  const [communitySavings, setCommunitySavings] = useState([]);
  const [savingsSummary, setSavingsSummary] = useState({});
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [repaymentPerformance, setRepaymentPerformance] = useState([]);
  const [monthlyApplications, setMonthlyApplications] = useState([]);
  const [delinquencyRate, setDelinquencyRate] = useState([]);
  const [branchStatusData, setBranchStatusData] = useState([]);
  const [branchRepaymentData, setBranchRepaymentData] = useState([]);
  const [branchAppData, setBranchAppData] = useState([]);
  const [branchDelinquencyData, setBranchDelinquencyData] = useState([]);
  const [monthlyRepayment, setMonthlyRepayment] = useState([]);
  const [monthlyStatusTrend, setMonthlyStatusTrend] = useState([]);
  const [totalPenalties, setTotalPenalties] = useState(0);
  const [branchesAtRisk, setBranchesAtRisk] = useState(0);


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
      setDisbursementByTypeDetail(reportsData.byType || []);
      setStatusDistribution(reportsData.statusDistribution || []);
      setRepaymentPerformance(reportsData.repaymentPerformance || []);
      setMonthlyApplications(reportsData.monthlyApplications || []);
      setDelinquencyRate(reportsData.delinquencyRate || []);
      setBranchStatusData(reportsData.branchStatusData || []);
      setBranchRepaymentData(reportsData.branchRepaymentData || []);
      setBranchAppData(reportsData.branchAppData || []);
      setBranchDelinquencyData(reportsData.branchDelinquencyData || []);
      setMonthlyRepayment(reportsData.monthlyRepayment || []);
      setMonthlyStatusTrend(reportsData.monthlyStatusTrend || []);
      setTotalPenalties(reportsData.totalPenalties || 0);
      setBranchesAtRisk(reportsData.branchesAtRisk || 0);
    }
  }, [reportsData]);

  useEffect(() => {
    if (savingsData) {
      setTotalSavings(savingsData.totalSavings || 0);
      setCommunitySavings(savingsData.communitySavings || []);
      setSavingsSummary(savingsData.savingsSummary || {});
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

  // Monthly disbursement trend per loan type (for expanded view)
  const disbursementMonthlyTrend = useMemo(() => {
    const LOAN_TYPE_LABELS = { 'personal': 'Personal Loan', 'emergency': 'Emergency Loan', 'short-term': 'Short-Term Loan' };
    return MONTH_NAMES.map((month, idx) => {
      const monthLoans = allDisbursedLoans.filter(l => {
        const d = new Date(l.disbursementDate);
        return d.getMonth() === idx && d.getFullYear() === currentYear;
      });
      const row = { month };
      Object.keys(LOAN_TYPE_LABELS).forEach(key => {
        row[LOAN_TYPE_LABELS[key]] = monthLoans
          .filter(l => (l.loanType || 'personal') === key)
          .reduce((s, l) => s + (Number(l.amount) || 0), 0);
      });
      return row;
    });
  }, [allDisbursedLoans, currentYear]);

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
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: moneyInVsOutSummary.net >= 0 ? '#D1FAE5' : '#FEE2E2', color: moneyInVsOutSummary.net >= 0 ? '#065F46' : '#991B1B' }}>
                      Net: {moneyInVsOutSummary.net < 0 ? '-' : '+'}₱{(Math.abs(moneyInVsOutSummary.net)/1000).toFixed(1)}k
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
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={55} ticks={CHART_TICKS} domain={[0, 500000]} />
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
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <div style={{ background: '#F0F4FF', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0D1F45' }}>₱{disbursementSummary.total >= 1000000 ? (disbursementSummary.total/1000000).toFixed(1).replace(/\.0$/, '') + 'M' : disbursementSummary.total >= 1000 ? (disbursementSummary.total/1000).toFixed(1).replace(/\.0$/, '') + 'k' : disbursementSummary.total.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500 }}>Total Disbursed</div>
                  </div>
                  <div style={{ background: '#F0F4FF', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0D1F45' }}>{disbursementByTypeDetail.reduce((s, d) => s + (d.count || 0), 0)}</div>
                    <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500 }}>Total Loans</div>
                  </div>
                </div>
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('disbursements')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
              <div style={{ flex: '0 0 55%' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={disbursementSummary.activeDisbursements.map(d => ({ name: d.type, value: d.amount }))}
                      cx="55%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={78}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderSliceLabel}
                      labelLine={false}
                    >
                      {disbursementSummary.activeDisbursements.map((_, index) => {
                        const CHART_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA'];
                        return <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />;
                      })}
                      <Label
                        value={`₱${disbursementSummary.total >= 1000000 ? (disbursementSummary.total/1000000).toFixed(1).replace(/\.0$/, '') + 'M' : disbursementSummary.total >= 1000 ? (disbursementSummary.total/1000).toFixed(1).replace(/\.0$/, '') + 'k' : disbursementSummary.total}`}
                        position="center"
                        fill="#1e3a5f"
                        style={{ fontSize: '13px', fontWeight: 'bold' }}
                      />
                      <Label value="Total" position="center" dy={15} fill="#6B7280" style={{ fontSize: '9px' }} />
                    </Pie>
                    <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '16px' }}>
                {(() => {
                  const CHART_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA'];
                  return disbursementByTypeDetail.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0D1F45', lineHeight: 1.3 }}>{d.count} loans · ₱{d.amount >= 1000 ? (d.amount / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : d.amount.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 400 }}>{d.label}</div>
                      </div>
                    </div>
                  ));
                })()}
                {disbursementSummary.zeroDisbursements.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#9CA3AF', paddingLeft: '18px' }}>
                    {disbursementSummary.zeroDisbursements.map(d => d.type).join(', ')}: ₱0
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
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={50} ticks={CHART_TICKS} domain={[0, 500000]} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v, name) => [v != null ? '₱' + v.toLocaleString() : 'No data', name === 'zeroSavings' ? 'No Data' : 'Savings']} labelFormatter={(label) => label} />
              <Line type="monotone" dataKey="zeroSavings" stroke="#D1D5DB" strokeDasharray="5 5" strokeWidth={2} dot={false} name="No Data" connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="actualSavings" stroke="#0D1F45" strokeWidth={2} dot={({ cx, cy, payload }) => payload.actualSavings != null ? <circle cx={cx} cy={cy} r={3} fill="#0D1F45" /> : null} name="Savings" connectNulls />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
              <div style={{ flex: '0 0 50%' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusDistribution} cx="55%" cy="50%" innerRadius={38} outerRadius={78} paddingAngle={2} dataKey="value" label={renderSliceLabel} labelLine={false}>
                      {statusDistribution.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                      <Label value={statusDistributionSummary.total} position="center" fill="#1e3a5f" style={{ fontSize: '16px', fontWeight: 'bold' }} />
                      <Label value="Total" position="center" dy={15} fill="#6B7280" style={{ fontSize: '9px' }} />
                    </Pie>
                    <Tooltip formatter={(v, name) => [v + ' loans', name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '16px' }}>
                {statusDistribution.map((entry, i) => {
                  const pct = statusDistributionSummary.total > 0 ? ((entry.value / statusDistributionSummary.total) * 100).toFixed(0) : 0;
                  const color = STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0D1F45', lineHeight: 1.3 }}>{entry.value} {entry.value === 1 ? 'loan' : 'loans'} · {pct}%</div>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 400 }}>{entry.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
                <span className="adm-card-sub">YTD {new Date().getFullYear()} — Monthly applications with approval/rejection breakdown</span>
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
                <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#9CA3AF' } }} />
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
                <ReferenceLine y={15} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'Risk Threshold (15%)', position: 'insideTopRight', fill: '#EF4444', fontSize: 10, fontWeight: 600 }} />
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
                {expandedChart === 'disbursements' && 'Disbursements by Type — Detailed Analysis'}
                {expandedChart === 'savings' && 'Savings Trend — Detailed View'}
                {expandedChart === 'statusDist' && 'Loan Status Distribution — Detailed View'}
                {expandedChart === 'repayment' && 'Repayment Performance — Detailed View'}
                {expandedChart === 'appTrend' && 'Loan Applications Trend — Detailed View'}
                {expandedChart === 'delinquency' && 'Delinquency Rate — Detailed View'}
              </h2>
              <button className="adm-expand-close" onClick={() => setExpandedChart(null)}><X size={20} /></button>
            </div>
            <div className="adm-expand-body">
              {expandedChart === 'moneyIn' && (() => {
                const netData = monthlyData.map((d, idx) => {
                  const net = (d.received || 0) - (d.disbursed || 0);
                  const prevNet = idx > 0 ? (monthlyData[idx-1].received || 0) - (monthlyData[idx-1].disbursed || 0) : null;
                  const momChange = prevNet !== null && prevNet !== 0 ? (((net - prevNet) / Math.abs(prevNet)) * 100).toFixed(1) : null;
                  return { ...d, net, momChange };
                });
                // Cumulative cash flow
                let cumulative = 0;
                const cumulativeData = netData.map(d => {
                  cumulative += d.net;
                  return { month: d.month, cumulative };
                });
                const totalIn = netData.reduce((s, d) => s + (d.received || 0), 0);
                const totalOut = netData.reduce((s, d) => s + (d.disbursed || 0), 0);
                const totalNet = totalIn - totalOut;
                return (
                <>
                  {/* Monthly Breakdown Table */}
                  <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600 }}>Month</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>Money In</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>Money Out</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>Net</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>MoM Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {netData.map((d, i) => {
                          const hasData = (d.received || 0) > 0 || (d.disbursed || 0) > 0;
                          return (
                            <tr key={d.month} style={{ borderBottom: '1px solid #F3F4F6', opacity: hasData ? 1 : 0.45 }}>
                              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{d.month}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0D1F45', fontWeight: 600 }}>₱{(d.received || 0).toLocaleString()}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#60A5FA', fontWeight: 600 }}>₱{(d.disbursed || 0).toLocaleString()}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: d.net >= 0 ? '#10B981' : '#EF4444' }}>
                                {d.net >= 0 ? '+' : '-'}₱{Math.abs(d.net).toLocaleString()}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                {d.momChange !== null && hasData ? (
                                  <span style={{
                                    background: parseFloat(d.momChange) >= 0 ? '#D1FAE518' : '#FEE2E218',
                                    color: parseFloat(d.momChange) >= 0 ? '#10B981' : '#EF4444',
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600
                                  }}>
                                    {parseFloat(d.momChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(d.momChange))}%
                                  </span>
                                ) : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>—</span>}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ borderTop: '2px solid #E5E7EB', fontWeight: 700 }}>
                          <td style={{ padding: '10px 12px' }}>Total</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0D1F45' }}>₱{totalIn.toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#60A5FA' }}>₱{totalOut.toLocaleString()}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: totalNet >= 0 ? '#10B981' : '#EF4444' }}>
                            {totalNet >= 0 ? '+' : '-'}₱{Math.abs(totalNet).toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Cumulative Cash Flow Line */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Cumulative Cash Flow</h4>
                    <div style={{ height: '280px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                          <defs>
                            {(() => {
                              const maxVal = Math.max(...cumulativeData.map(d => d.cumulative));
                              const minVal = Math.min(...cumulativeData.map(d => d.cumulative));
                              const splitOff = maxVal <= 0 ? 0 : minVal >= 0 ? 1 : maxVal / (maxVal - minVal);
                              return (
                                <linearGradient id="cumSplitColor" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset={splitOff} stopColor="#10B981" stopOpacity={0.3} />
                                  <stop offset={splitOff} stopColor="#EF4444" stopOpacity={0.3} />
                                </linearGradient>
                              );
                            })()}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="month" type="category" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} />
                          <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                          <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} strokeDasharray="6 3" label={{ value: '₱0 Baseline', position: 'right', fill: '#6B7280', fontSize: 11 }} />
                          <Area type="monotone" dataKey="cumulative" stroke="#0D1F45" strokeWidth={2.5} fill="url(#cumSplitColor)" name="Cumulative Net">
                            <LabelList
                              dataKey="cumulative"
                              position="top"
                              fontSize={10}
                              fill="#374151"
                              formatter={(v) => v !== 0 ? (v >= 0 ? '+' : '') + formatYAxis(v) : ''}
                            />
                          </Area>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The table shows exact peso values for money received (repayments) and released (disbursements) each month, along with the net balance and month-over-month change direction. The cumulative cash flow chart below tracks the running net position over the year — if the line stays above ₱0, the lending portfolio is in surplus; below means more has been released than received.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'disbursements' && (
                <>
                  {/* Summary Table */}
                  <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600 }}>Loan Type</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'center' }}># Loans</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>Total Disbursed</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>Avg Loan Size</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>% Share</th>
                          <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'center' }}>Monthly Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disbursementByTypeDetail.map((d, i) => {
                          const CHART_COLORS = ['#0D1F45', '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA'];
                          const color = CHART_COLORS[i % CHART_COLORS.length];
                          const pct = disbursementSummary.total > 0 ? ((d.amount / disbursementSummary.total) * 100).toFixed(1) : '0.0';
                          // Build sparkline data for this type
                          const sparkData = disbursementMonthlyTrend.map(m => ({ v: m[d.label] || 0 }));
                          return (
                            <tr key={d.type} style={{ borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                                {d.label}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{d.count}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0D1F45' }}>₱{d.amount.toLocaleString()}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6B7280' }}>{d.count > 0 ? `₱${Math.round(d.average).toLocaleString()}` : '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <span style={{ background: `${color}18`, color, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{pct}%</span>
                              </td>
                              <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                                <ResponsiveContainer width={120} height={32}>
                                  <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                                    <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </td>
                            </tr>
                          );
                        })}
                        {disbursementByTypeDetail.length > 0 && (
                          <tr style={{ borderTop: '2px solid #E5E7EB', fontWeight: 700 }}>
                            <td style={{ padding: '10px 12px' }}>Total</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>{disbursementByTypeDetail.reduce((s, d) => s + d.count, 0)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0D1F45' }}>₱{disbursementSummary.total.toLocaleString()}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6B7280' }}>
                              {(() => { const total = disbursementByTypeDetail.reduce((s, d) => s + d.count, 0); return total > 0 ? `₱${Math.round(disbursementSummary.total / total).toLocaleString()}` : '—'; })()}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>100%</td>
                            <td></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Monthly Disbursement Trend by Type */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Monthly Disbursement Trend by Loan Type</h4>
                    <div style={{ height: '280px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={disbursementMonthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} />
                          <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                          <Legend iconType="circle" iconSize={8} />
                          <Bar dataKey="Personal Loan" fill="#0D1F45" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Emergency Loan" fill="#2563EB" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Short-Term Loan" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The summary table breaks down each loan type by volume (# of loans), total disbursed amount, average loan size, and portfolio share. The sparklines show monthly directional trends per type. The bar chart below visualizes month-over-month disbursement patterns across all loan types to identify seasonal demand and inform fund allocation planning.
                  </div>
                </>
              )}

              {expandedChart === 'savings' && (() => {
                // Cumulative data
                let runningTotal = 0;
                const cumulativeData = savingsMonthly.map(d => {
                  runningTotal += d.savings || 0;
                  return { ...d, cumulative: runningTotal };
                });
                // Community data for bar chart
                const topCommunities = communitySavings.filter(c => c.totalSavings > 0).slice(0, 10);
                const bottomCommunities = [...communitySavings].filter(c => c.community !== 'Unassigned').reverse().slice(0, 10).reverse();
                return (
                <>
                  {/* Section 1 — Summary Stats + Cumulative Chart */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>Total Savings</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#0D1F45' }}>₱{totalSavings.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>Total Members Saving</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#0D1F45' }}>{savingsSummary.totalSavers || 0}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>Avg per Member</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#0D1F45' }}>₱{(savingsSummary.avgPerSaver || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>Highest Month</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#0D1F45' }}>{savingsSummary.highestMonth || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>₱{(savingsSummary.highestMonthAmount || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Cumulative Savings Trend</h4>
                    <div style={{ height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                          <defs>
                            <linearGradient id="colorSavCum" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0D1F45" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#0D1F45" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} />
                          <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                          <Area type="monotone" dataKey="cumulative" stroke="#0D1F45" strokeWidth={2.5} fill="url(#colorSavCum)" name="Cumulative Savings">
                            <LabelList dataKey="cumulative" position="top" fontSize={10} fill="#374151" formatter={(v) => v > 0 ? formatYAxis(v) : ''} />
                          </Area>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Section 2 — Community Savings Table */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Savings by Community</h4>
                    <div style={{ maxHeight: '320px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                            <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600 }}>#</th>
                            <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600 }}>Community</th>
                            <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>Total Savings</th>
                            <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'center' }}>Members</th>
                            <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>Avg / Member</th>
                            <th style={{ padding: '10px 12px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>% Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {communitySavings.map((c, i) => {
                            const pct = totalSavings > 0 ? ((c.totalSavings / totalSavings) * 100).toFixed(1) : '0.0';
                            return (
                              <tr key={c.community} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '8px 12px', color: '#9CA3AF', fontSize: '12px' }}>{i + 1}</td>
                                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{c.community}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#0D1F45' }}>₱{c.totalSavings.toLocaleString()}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{c.memberCount}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280' }}>₱{c.avgPerMember.toLocaleString()}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  <span style={{ background: '#0D1F4518', color: '#0D1F45', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{pct}%</span>
                                </td>
                              </tr>
                            );
                          })}
                          {communitySavings.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>No community savings data available.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3 — Top Communities Bar Chart */}
                  {topCommunities.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Top Communities by Savings</h4>
                      <div style={{ height: Math.max(200, topCommunities.length * 36) + 'px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topCommunities} layout="vertical" margin={{ top: 5, right: 80, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                            <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} />
                            <YAxis dataKey="community" type="category" stroke="#9CA3AF" fontSize={11} width={140} />
                            <Tooltip formatter={(v) => '₱' + v.toLocaleString()} />
                            <Bar dataKey="totalSavings" radius={[0, 4, 4, 0]} barSize={22} name="Total Savings">
                              <LabelList dataKey="totalSavings" position="right" formatter={v => '₱' + v.toLocaleString()} fontSize={11} fill="#6B7280" />
                              {topCommunities.map((_, index) => {
                                const CHART_COLORS = ['#0D1F45', '#1E3A8A', '#1E3A8A', '#2563EB', '#2563EB', '#3B82F6', '#3B82F6', '#60A5FA', '#60A5FA', '#93C5FD'];
                                return <Cell key={`tc-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The summary stats show overall savings health across the platform. The cumulative chart tracks total deposit growth over the year. The community table breaks down savings by branch — showing total amounts, active member counts, and per-member averages. The bar chart highlights the top-performing communities to identify where savings programs are most successful.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'statusDist' && (() => {
                const STATUS_COLORS = { Active: '#10B981', Completed: '#0D1F45', Pending: '#2563EB', Rejected: '#EF4444', Cancelled: '#F59E0B', Approved: '#60A5FA' };
                const total = statusDistribution.reduce((s, d) => s + d.value, 0);
                return (
                <>
                  {/* Section 1 — Stacked Status Bar */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', height: '36px', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                      {statusDistribution.filter(d => d.value > 0).map((d, i) => (
                        <div key={i} style={{ width: `${(d.value / total) * 100}%`, background: STATUS_COLORS[d.name] || '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 600, minWidth: '30px' }}>
                          {d.value}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
                      {statusDistribution.map((d, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[d.name] || '#9CA3AF' }} />
                          {d.name}: {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Section 2 — Branch Status Table */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Status by Community</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>Community</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Total</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#0D1F45' }}>Completed</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#10B981' }}>Active</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#EF4444' }}>Rejected</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#F59E0B' }}>Cancelled</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Rejection Rate</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchStatusData.map((b, i) => {
                            const rColor = b.rejectionRate > 20 ? '#EF4444' : b.rejectionRate > 10 ? '#F59E0B' : '#10B981';
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{b.branch}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.total}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.completed}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.active}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.rejected}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.cancelled}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                  <span style={{ background: `${rColor}18`, color: rColor, padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{b.rejectionRate}%</span>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  {(() => { const sColor = b.rejectionRate > 20 ? '#EF4444' : b.rejectionRate > 10 ? '#F59E0B' : '#10B981'; const label = b.rejectionRate > 20 ? 'Critical' : b.rejectionRate > 10 ? 'At Risk' : 'Healthy'; return <span style={{ background: `${sColor}18`, color: sColor, padding: '2px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '11px' }}>{label}</span>; })()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3 — Monthly Status Trend */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Monthly Status Trend</h4>
                    <div style={{ height: '260px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyStatusTrend} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} />
                          <Area type="monotone" dataKey="completed" stackId="1" stroke="#0D1F45" fill="#0D1F45" fillOpacity={0.8} name="Completed" />
                          <Area type="monotone" dataKey="active" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.8} name="Active" />
                          <Area type="monotone" dataKey="rejected" stackId="1" stroke="#DC2626" fill="#DC2626" fillOpacity={0.8} name="Rejected" />
                          <Area type="monotone" dataKey="cancelled" stackId="1" stroke="#F97316" fill="#F97316" fillOpacity={0.8} name="Cancelled" />
                          <Area type="monotone" dataKey="pending" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.8} name="Pending" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The stacked bar shows overall portfolio composition. The community table surfaces branches with high rejection rates — red indicates above 20%, yellow 10–20%, green below 10%. The trend chart reveals how loan statuses evolve month by month, helping identify if rejections are increasing.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'repayment' && (() => {
                const onTime = repaymentPerformance.find(d => d.name === 'On-Time')?.value || 0;
                const late = repaymentPerformance.find(d => d.name === 'Late')?.value || 0;
                const totalPayments = onTime + late;
                const onTimeRate = totalPayments > 0 ? Math.round((onTime / totalPayments) * 100 * 10) / 10 : 100;
                const rateColor = onTimeRate >= 80 ? '#10B981' : onTimeRate >= 60 ? '#F59E0B' : '#EF4444';
                return (
                <>
                  {/* Section 1 — Scorecard */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total Payments', value: totalPayments, color: '#0D1F45' },
                      { label: 'On-Time', value: onTime, color: '#10B981' },
                      { label: 'Late', value: late, color: '#EF4444' },
                      { label: 'On-Time Rate', value: onTimeRate + '%', color: rateColor },
                      { label: 'Total Penalties', value: '₱' + totalPenalties.toLocaleString(), color: late > 0 ? '#EF4444' : '#10B981' },
                    ].map((k, i) => (
                      <div key={i} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>{k.label}</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: k.color }}>{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Section 2 — Branch Table */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Repayment by Community</h4>
                    <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Community</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Total</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#10B981' }}>On-Time</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#EF4444' }}>Late</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>On-Time Rate</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Penalties</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchRepaymentData.map((b, i) => {
                            const c = b.onTimeRate >= 80 ? '#10B981' : b.onTimeRate >= 60 ? '#F59E0B' : '#EF4444';
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{b.branch}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.total}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.onTime}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.late}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                  <span style={{ background: `${c}18`, color: c, padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{b.onTimeRate}%</span>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: b.penalties > 0 ? '#EF4444' : '#6B7280' }}>₱{b.penalties.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3 — Monthly Trend */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Monthly Repayment Trend</h4>
                    <div style={{ height: '250px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyRepayment} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} />
                          <Bar dataKey="onTime" fill="#10B981" name="On-Time" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="late" fill="#EF4444" name="Late" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The scorecard shows overall repayment health — green on-time rate (80%+) indicates strong discipline. The community table identifies branches with repayment problems. Late payments incur a 3% penalty; high penalty amounts signal systemic issues. The monthly trend shows whether repayment discipline is improving or deteriorating.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'appTrend' && (() => {
                const rateData = monthlyApplications.map(d => ({
                  month: d.month,
                  approvalRate: d.applications > 0 ? Math.round((d.approved / d.applications) * 100) : 0,
                  rejectionRate: d.applications > 0 ? Math.round((d.rejected / d.applications) * 100) : 0,
                  approved: d.approved, rejected: d.rejected,
                }));
                return (
                <>
                  {/* Section 1 — Monthly Table */}
                  <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', fontWeight: 600 }}>Month</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Applications</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#10B981' }}>Approved</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#EF4444' }}>Rejected</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#2563EB' }}>Pending</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Approval Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyApplications.map((d, i) => {
                          const pending = d.applications - d.approved - d.rejected;
                          const rate = d.applications > 0 ? Math.round((d.approved / d.applications) * 100) : 0;
                          const rejRate = d.applications > 0 ? Math.round((d.rejected / d.applications) * 100) : 0;
                          const isBold = rejRate > 20;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', fontWeight: isBold ? 700 : 400, opacity: d.applications > 0 ? 1 : 0.4, background: isBold ? '#FEF2F210' : 'transparent' }}>
                              <td style={{ padding: '8px 10px' }}>{d.month} {isBold && <span style={{ color: '#EF4444', fontSize: '10px' }}>⚠</span>}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>{d.applications}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>{d.approved}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: isBold ? '#EF4444' : 'inherit' }}>{d.rejected}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>{pending > 0 ? <span style={{ color: '#F59E0B' }}>⚠ {pending}</span> : '—'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                <span style={{ background: rate >= 80 ? '#10B98118' : rate >= 50 ? '#F59E0B18' : '#EF444418', color: rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{rate}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2 — Approval/Rejection Stacked Bar */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Approval vs Rejection Rate</h4>
                    <div style={{ height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rateData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={v => v + '%'} />
                          <Tooltip formatter={v => v + '%'} />
                          <Legend iconType="circle" iconSize={8} />
                          <Bar dataKey="approvalRate" fill="#10B981" name="Approval %" radius={[4, 4, 0, 0]} stackId="a">
                            <LabelList dataKey="approved" position="inside" fontSize={10} fill="#fff" formatter={v => v > 0 ? v : ''} />
                          </Bar>
                          <Bar dataKey="rejectionRate" fill="#EF4444" name="Rejection %" radius={[4, 4, 0, 0]} stackId="a">
                            <LabelList dataKey="rejected" position="inside" fontSize={10} fill="#fff" formatter={v => v > 0 ? v : ''} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Section 3 — Branch Table */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Applications by Community</h4>
                    <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Community</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Total</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#10B981' }}>Approved</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#EF4444' }}>Rejected</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Approval Rate</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Top Loan Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchAppData.map((b, i) => {
                            const safeRate = Math.min(b.approvalRate, 100);
                            const c = safeRate >= 80 ? '#10B981' : safeRate >= 50 ? '#F59E0B' : '#EF4444';
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{b.branch}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.total}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.approved}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.rejected}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                  <span style={{ background: `${c}18`, color: c, padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{safeRate}%</span>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#6B7280' }}>{b.topLoanType}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The monthly table shows exact application counts — bold rows have rejection rates above 20%. The stacked bar visualizes approval vs rejection proportions with actual counts inside each segment. The community table identifies where loan demand is coming from and which branches have low approval rates.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'delinquency' && (() => {
                const totalLate = delinquencyRate.reduce((s, d) => s + d.late, 0);
                const totalPaymentsAll = delinquencyRate.reduce((s, d) => s + d.total, 0);
                const currentRate = totalPaymentsAll > 0 ? Math.round((totalLate / totalPaymentsAll) * 100 * 10) / 10 : 0;
                const allZero = delinquencyRate.every(d => d.rate === 0);
                const rColor = currentRate > 15 ? '#EF4444' : currentRate > 10 ? '#F59E0B' : '#10B981';
                return (
                <>
                  {/* Section 1 — Scorecard */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { label: 'Current Delinquency Rate', value: currentRate + '%', color: rColor },
                      { label: 'Total Late Payments', value: totalLate, color: totalLate > 0 ? '#EF4444' : '#10B981' },
                      { label: 'Total Penalties Collected', value: '₱' + totalPenalties.toLocaleString(), color: totalPenalties > 0 ? '#EF4444' : '#10B981' },
                      { label: 'Communities At Risk', value: branchesAtRisk, color: branchesAtRisk > 0 ? '#EF4444' : '#10B981' },
                    ].map((k, i) => (
                      <div key={i} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>{k.label}</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: k.color }}>{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Section 2 — Branch Table */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Delinquency by Community</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Community</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Total Payments</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#10B981' }}>On-Time</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#EF4444' }}>Late</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Delinquency Rate</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchDelinquencyData.map((b, i) => {
                            const sColor = b.status === 'Critical' ? '#EF4444' : b.status === 'At Risk' ? '#F59E0B' : '#10B981';
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{b.branch}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.total}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.onTime}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{b.late}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{b.delinquencyRate}%</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <span style={{ background: `${sColor}18`, color: sColor, padding: '2px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '11px' }}>{b.status}</span>
                                </td>
                              </tr>
                            );
                          })}
                          {branchDelinquencyData.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>No payment data available.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3 — Trend with Threshold */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px' }}>Delinquency Rate Trend</h4>
                    <div style={{ height: '250px', position: 'relative' }}>
                      {allZero && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 2, background: 'rgba(255,255,255,0.9)', padding: '12px 20px', borderRadius: '8px', border: '1px solid #D1FAE5' }}>
                          <div style={{ color: '#10B981', fontWeight: 600, fontSize: '14px' }}>✓ No delinquencies recorded</div>
                          <div style={{ color: '#6B7280', fontSize: '12px' }}>Healthy portfolio — all payments are on time</div>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={delinquencyRate} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                          <defs>
                            <linearGradient id="colorDelq2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, allZero ? 20 : 'auto']} tickFormatter={v => v + '%'} />
                          <Tooltip formatter={v => v + '%'} />
                          <ReferenceLine y={15} stroke="#EF4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Risk Threshold (15%)', position: 'insideTopRight', fill: '#EF4444', fontSize: 11 }} />
                          <Area type="monotone" dataKey="rate" stroke="#0D1F45" strokeWidth={2.5} fill="url(#colorDelq2)" name="Delinquency %" dot={{ r: 4, fill: '#0D1F45' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The scorecard shows overall portfolio risk — green indicates healthy, red signals concern. The community table identifies which branches have delinquency issues using status badges: Healthy (below 10%), At Risk (10–15%), Critical (above 15%). The trend chart tracks whether the situation is improving or worsening over time.
                  </div>
                </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
