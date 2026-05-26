/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Legend, AreaChart, Area, LineChart, Line } from 'recharts';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../../admin/styles/AdminDashboard.css';
import '../styles/secretaryAdminDashboard.css';
import API from '../../utils/api';
import { Banknote, Clock, CheckCircle, CalendarDays, X, Filter, Expand } from 'lucide-react';


const fmt = (n) => n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';
const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const COLORS = ['#155DFC', '#00A63E', '#F59E0B'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

export default function SecretaryAdminDashboard() {
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [expandedChart, setExpandedChart] = useState(null);

  // Modal states
  const [showAwaitingModal, setShowAwaitingModal] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showDisbursedModal, setShowDisbursedModal] = useState(false);

  // Modal filter states
  const [monthModalMonth, setMonthModalMonth] = useState(new Date().getMonth().toString());
  const [monthModalYear, setMonthModalYear] = useState(new Date().getFullYear());
  const [disbModalMonth, setDisbModalMonth] = useState('all');
  const [disbModalYear, setDisbModalYear] = useState('all');

  const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');

  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => {
    if (!res.ok) throw new Error('Failed to fetch loans');
    return res.json();
  });

  const { data, isValidating } = useSWR(
    token ? `${API}/api/admin/loans?limit=10000` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const rawLoans = useMemo(() => data?.loans || [], [data]);
  const loading = isValidating && !data;

  // Derived stats — always uses current month/year
  const derivedStats = useMemo(() => {
    const activeLoans = rawLoans.filter(l => ['active', 'approved', 'completed'].includes((l.status || '').toLowerCase()) || l.disbursed);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toLocaleDateString('en-US');

    let processedToday = 0;
    let processedMonth = 0;
    let totalDisbursedAmount = 0;
    const awaitingLoans = [];
    const todayLoans = [];
    const monthLoans = [];
    const disbursedLoans = [];
    let thisMonthAmount = 0;

    activeLoans.forEach(l => {
      if (!l.disbursed) {
        awaitingLoans.push(l);
      } else if (l.disbursementDate) {
        const disbDate = new Date(l.disbursementDate);
        if (disbDate.toLocaleDateString('en-US') === todayStr) {
          processedToday++;
          todayLoans.push(l);
        }

        if (disbDate.getFullYear() === currentYear && disbDate.getMonth() === currentMonth) {
          processedMonth++;
          monthLoans.push(l);
          thisMonthAmount += Number(l.amount) || 0;
        }

        totalDisbursedAmount += Number(l.amount) || 0;
        disbursedLoans.push(l);
      }
    });

    let prevMonthDisbursed = 0;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    disbursedLoans.forEach(l => {
      if (!l.disbursementDate) return;
      const d = new Date(l.disbursementDate);
      if (d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear) {
        prevMonthDisbursed += Number(l.amount) || 0;
      }
    });

    return {
      stats: {
        awaiting: awaitingLoans.length,
        today: processedToday,
        month: processedMonth,
        disbursed: totalDisbursedAmount,
        thisMonthAmount,
        prevMonthDisbursed
      },
      awaitingLoans,
      todayLoans,
      monthLoans,
      disbursedLoans
    };
  }, [rawLoans]);

  const { stats, awaitingLoans, todayLoans, monthLoans, disbursedLoans } = derivedStats;

  // Derived stats for Reports and Chart
  const reportsAndCharts = useMemo(() => {
    const disbursedL = rawLoans.filter(l => l.disbursed);
    const approvedLoans = rawLoans.filter(l => ['active', 'approved', 'completed'].includes((l.status || '').toLowerCase()) || l.disbursed);

    const totalReceivedAmt = rawLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalProcessedAmt = approvedLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalReleasedAmt = disbursedL.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const processingRate = approvedLoans.length > 0 ? Math.round((disbursedL.length / approvedLoans.length) * 100) : 0;
    const reportStats = { totalReceived: totalReceivedAmt, totalReleased: totalReleasedAmt, totalProcessed: totalProcessedAmt, processingRate };

    // Filter payment method pie chart based on selected chart year too, or keep all time? Let's use chartYear for pie chart as well
    const yearlyDisbursed = disbursedL.filter(l => l.disbursementDate && new Date(l.disbursementDate).getFullYear() === chartYear);
    const pieDataSrc = yearlyDisbursed.length > 0 ? yearlyDisbursed : disbursedL; // Fallback to all if empty for the year

    const gcashAmt = pieDataSrc.filter(l => l.paymentMethod && (l.paymentMethod.toLowerCase() === 'e-wallet' || l.paymentMethod.toLowerCase() === 'gcash')).reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const bankAmt = pieDataSrc.filter(l => l.paymentMethod && l.paymentMethod.toLowerCase().includes('bank')).reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const cashAmt = pieDataSrc.filter(l => !l.paymentMethod || l.paymentMethod.toLowerCase() === 'cash').reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalAmt = gcashAmt + bankAmt + cashAmt;
    const paymentMethodData = [
      { name: 'E-Wallet', value: gcashAmt, percentage: totalAmt > 0 ? Math.round((gcashAmt / totalAmt) * 100) : 0 },
      { name: 'Bank Transfer', value: bankAmt, percentage: totalAmt > 0 ? Math.round((bankAmt / totalAmt) * 100) : 0 },
      { name: 'Cash', value: cashAmt, percentage: totalAmt > 0 ? Math.round((cashAmt / totalAmt) * 100) : 0 }
    ];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const moneyFlowData = months.map(m => ({ month: m, released: 0 }));
    disbursedL.forEach(l => {
      if (!l.disbursementDate) return;
      const d = new Date(l.disbursementDate);
      if (d.getFullYear() === chartYear) {
        moneyFlowData[d.getMonth()].released += Number(l.amount) || 0;
      }
    });

    return { reportStats, paymentMethodData, moneyFlowData };
  }, [rawLoans, chartYear]);

  const { reportStats, paymentMethodData, moneyFlowData } = reportsAndCharts;

  const dash = (v) => loading ? '—' : v;

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filtered loans for This Month modal
  const filteredMonthLoans = useMemo(() => {
    return disbursedLoans.filter(l => {
      if (!l.disbursementDate) return false;
      const d = new Date(l.disbursementDate);
      return d.getMonth() === parseInt(monthModalMonth) && d.getFullYear() === monthModalYear;
    });
  }, [disbursedLoans, monthModalMonth, monthModalYear]);

  // Filtered loans for All Disbursements modal
  const filteredDisbLoans = useMemo(() => {
    return disbursedLoans.filter(l => {
      if (!l.disbursementDate) return false;
      const d = new Date(l.disbursementDate);
      if (disbModalYear !== 'all' && d.getFullYear() !== parseInt(disbModalYear)) return false;
      if (disbModalMonth !== 'all' && d.getMonth() !== parseInt(disbModalMonth)) return false;
      return true;
    });
  }, [disbursedLoans, disbModalYear, disbModalMonth]);

  const getMonthModalLabel = () => `${MONTH_NAMES[parseInt(monthModalMonth)]} ${monthModalYear}`;
  const getDisbModalLabel = () => {
    if (disbModalYear === 'all' && disbModalMonth === 'all') return 'All Time';
    if (disbModalYear !== 'all' && disbModalMonth === 'all') return `Year ${disbModalYear}`;
    if (disbModalYear === 'all' && disbModalMonth !== 'all') return `${MONTH_NAMES[parseInt(disbModalMonth)]} (All Years)`;
    return `${MONTH_NAMES[parseInt(disbModalMonth)]} ${disbModalYear}`;
  };

  const openMonthModal = () => {
    setMonthModalMonth(new Date().getMonth().toString());
    setMonthModalYear(new Date().getFullYear());
    setShowMonthModal(true);
  };
  const openDisbModal = () => {
    setDisbModalMonth('all');
    setDisbModalYear('all');
    setShowDisbursedModal(true);
  };

  return (
    <div className="sec-admin-dashboard-page">
      <SecretaryAdminSidebar />
      <div className="sec-admin-dashboard-content">
        {!expandedChart && (
          <>
            {/* Header */}
        <h1 className="admin-dashboard-title">Secretary Dashboard</h1>

        {loading ? (
          <div className="adm-loading-msg">Loading dashboard data...</div>
        ) : (
          <>
            {/* Row 1 — 4 Stat Cards */}
            <div className="adm-stats-grid sec-adm-stats-grid-4 sec-adm-mb-6">
              <div className="adm-stat-card sec-adm-clickable-card" onClick={() => setShowAwaitingModal(true)}>
                <div className="adm-stat-top">
                  <span className="adm-stat-label">Awaiting Processing</span>
                  <div className="adm-stat-icon adm-icon-yellow">
                    <Clock size={16} color="white" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(stats.awaiting)}</span>
              </div>

              <div className="adm-stat-card sec-adm-clickable-card" onClick={() => setShowTodayModal(true)}>
                <div className="adm-stat-top">
                  <span className="adm-stat-label">Processed Today</span>
                  <div className="adm-stat-icon adm-icon-blue">
                    <CheckCircle size={16} color="white" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(stats.today)}</span>
              </div>

              <div className="adm-stat-card sec-adm-clickable-card" onClick={openMonthModal}>
                <div className="adm-stat-top">
                  <span className="adm-stat-label">This Month</span>
                  <div className="adm-stat-icon adm-icon-blue">
                    <CalendarDays size={16} color="white" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(stats.month)}</span>
              </div>

              <div className="adm-stat-card sec-adm-clickable-card" onClick={openDisbModal}>
                <div className="adm-stat-top">
                  <span className="adm-stat-label">Total Disbursed</span>
                  <div className="adm-stat-icon adm-icon-green">
                    <Banknote size={16} color="white" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(fmt(stats.disbursed))}</span>
              </div>
            </div>

            {/* MoM Comparison */}
            <div className="adm-stats-grid sec-adm-stats-grid-mom">
              <div className="adm-stat-card">
                <div className="adm-stat-top">
                  <span className="adm-stat-label">This Month ({MONTH_NAMES[now.getMonth()]})</span>
                </div>
                <div className="sec-adm-mom-val-wrap">
                  <span className="adm-stat-value">{dash(fmt(stats.thisMonthAmount))}</span>
                  {(() => {
                    if (stats.prevMonthDisbursed === 0) return null;
                    const diff = stats.thisMonthAmount - stats.prevMonthDisbursed;
                    const pct = Math.round((diff / stats.prevMonthDisbursed) * 100);
                    const isUp = pct >= 0;
                    return (
                      <span className={`sec-adm-mom-delta ${isUp ? 'sec-adm-mom-delta-up' : 'sec-adm-mom-delta-down'}`}>
                        {isUp ? '↑' : '↓'} {Math.abs(pct)}%
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="adm-stat-card">
                <div className="adm-stat-top">
                  <span className="adm-stat-label">Last Month ({MONTH_NAMES[now.getMonth() === 0 ? 11 : now.getMonth() - 1]})</span>
                </div>
                <span className="adm-stat-value">{dash(fmt(stats.prevMonthDisbursed))}</span>
              </div>
            </div>

            {/* Row 2 — Charts */}
            <div className="adm-analytics-row adm-analytics-row-sec sec-adm-mt-16">
              {/* Monthly Disbursements */}
              <div className="adm-card">
                <div className="adm-card-header">
                  <div>
                    <h3 className="adm-card-title">Monthly Disbursements</h3>
                    <span className="adm-card-sub">Funds released per month</span>
                    {(() => {
                      const ytd = moneyFlowData.reduce((s, d) => s + d.released, 0);
                      return <div className="sec-adm-ytd-text">YTD: ₱{ytd.toLocaleString()}</div>;
                    })()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select value={chartYear} onChange={e => setChartYear(parseInt(e.target.value))} className="adm-filter-select">
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button className="la-chart-expand-btn" onClick={() => setExpandedChart('disbursements')} title="Expand Chart">
                      <Expand size={18} color="#4B5563" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  {(() => {
                    const maxReleased = Math.max(...moneyFlowData.map(d => d.released));
                    const chartData = moneyFlowData.map(d => ({
                      ...d,
                      released: d.released > 0 ? d.released : maxReleased * 0.01 // ghost bar
                    }));
                    return (
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                        <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v, n, props) => props.payload.released === maxReleased * 0.01 ? '₱0' : '₱' + Math.round(v).toLocaleString()} />
                        <Bar dataKey="released" name="Disbursed" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.released === maxReleased * 0.01 ? '#F3F4F6' : '#1e3a5f'} />
                          ))}
                        </Bar>
                      </BarChart>
                    );
                  })()}
                </ResponsiveContainer>
              </div>

              {/* Payment Method Pie */}
              <div className="adm-card">
                <div className="adm-card-header">
                  <div>
                    <h3 className="adm-card-title">Payment Method</h3>
                    <span className="adm-card-sub">Disbursement distribution</span>
                  </div>
                  <button className="la-chart-expand-btn" onClick={() => setExpandedChart('paymentMethod')} title="Expand Chart">
                    <Expand size={18} color="#4B5563" strokeWidth={2.5} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  {(() => {
                    const activeMethods = paymentMethodData.filter(d => d.percentage > 0);
                    const zeroMethods = paymentMethodData.filter(d => d.percentage === 0);
                    const totalVal = activeMethods.reduce((s, d) => s + d.value, 0);
                    const PIE_COLORS = ['#1e3a5f', '#4a90d9', '#9CA3AF'];
                    return (
                      <div className="sec-adm-pie-wrapper">
                        <div className="sec-adm-pie-inner">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={activeMethods} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                {activeMethods.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                                {/* Centered label for recharts Pie */}
                                <Label value={`₱${totalVal >= 1000 ? (totalVal / 1000).toFixed(1).replace(/\\.0$/, '') + 'k' : totalVal}`} position="center" fill="#1e3a5f" style={{ fontSize: '14px', fontWeight: 'bold' }} />
                                <Label value="Total" position="center" dy={16} fill="#6B7280" style={{ fontSize: '10px' }} />
                              </Pie>
                              <Tooltip formatter={(value) => '₱' + value.toLocaleString()} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="adm-pie-legend adm-pie-legend-spaced">
                          {activeMethods.map((entry, i) => (
                            <div key={i} className="adm-pie-legend-item">
                              <div className="adm-pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="adm-pie-label">{entry.name}</span>
                              <span className="adm-pie-val">₱{entry.value >= 1000 ? (entry.value / 1000).toFixed(0) + 'k' : entry.value} ({entry.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                        {zeroMethods.length > 0 && (
                          <div className="sec-adm-zero-methods">
                            ({zeroMethods.map(m => m.name).join(', ')}: 0%)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 3 — Processing Overview */}
            <div className="adm-card sec-adm-mt-16">
              <div className="adm-card-header">
                <div>
                  <h3 className="adm-card-title">Processing Overview</h3>
                  <span className="adm-card-sub">Key disbursement metrics</span>
                </div>
              </div>
              <div className="adm-stats-grid sec-adm-stats-overview-grid">
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Total Amount Requested</span>
                  <span className="adm-summary-value green">₱{reportStats.totalReceived.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Total Approved</span>
                  <span className="adm-summary-value blue">₱{reportStats.totalProcessed.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Total Released</span>
                  <span className="adm-summary-value sec-adm-color-red">₱{reportStats.totalReleased.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Processing Rate</span>
                  <span className="adm-summary-value sec-adm-color-purple">{reportStats.processingRate}%</span>
                </div>
              </div>
            </div>

            {/* Row 4 — Recent Transactions */}
            <div className="adm-card sec-adm-mt-16">
              <div className="adm-card-header">
                <h3 className="adm-card-title">Recent Transactions</h3>
              </div>
              <div className="sec-adm-table-container">
                <table className="sec-adm-table">
                  <thead>
                    <tr className="sec-adm-table-thead-tr">
                      <th className="sec-adm-table-th">Date</th>
                      <th className="sec-adm-table-th">Member</th>
                      <th className="sec-adm-table-th">Amount</th>
                      <th className="sec-adm-table-th">Method</th>
                      <th className="sec-adm-table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disbursedLoans.slice(0, 5).map(l => (
                      <tr key={l._id} className="sec-adm-table-tbody-tr">
                        <td className="sec-adm-table-td-date">{fmtDate(l.disbursementDate)}</td>
                        <td className="sec-adm-table-td-member">{l.memberName || 'N/A'}</td>
                        <td className="sec-adm-table-td-amount">{fmt(l.amount)}</td>
                        <td className="sec-adm-table-td">
                          <span className="sec-adm-table-badge-method">
                            {l.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td className="sec-adm-table-td">
                          <span className="sec-adm-table-badge-status">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                    {disbursedLoans.length === 0 && (
                      <tr><td colSpan="5" className="sec-adm-table-empty">No recent transactions.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </>
      )}

        {/* ── Expanded Chart Overlay ── */}
        {expandedChart && (
          <div className="adm-expand-overlay">
          <div className="adm-expand-modal">
            <div className="adm-expand-header">
              <h2 className="adm-expand-title">
                {expandedChart === 'disbursements' ? 'Monthly Disbursements — Detailed View' : 'Payment Method — Detailed View'}
              </h2>
              <button className="adm-expand-close" onClick={() => setExpandedChart(null)}><X size={22} /></button>
            </div>
            <div className="adm-expand-body">

              {expandedChart === 'disbursements' && (() => {
                const ytd = moneyFlowData.reduce((s, d) => s + d.released, 0);
                const activeMonths = moneyFlowData.filter(d => d.released > 0);
                const highestMonth = activeMonths.length > 0 ? activeMonths.reduce((a, b) => b.released > a.released ? b : a) : null;
                const avgMonthly = activeMonths.length > 0 ? Math.round(ytd / activeMonths.length) : 0;
                const totalCount = disbursedLoans.filter(l => l.disbursementDate && new Date(l.disbursementDate).getFullYear() === chartYear).length;
                return (
                <>
                  {/* Section 1 — Scorecard */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'YTD Total Disbursed', value: fmt(ytd), color: '#3B82F6' },
                      { label: 'Highest Month', value: highestMonth ? `${highestMonth.month} · ${fmt(highestMonth.released)}` : '—', color: '#10B981' },
                      { label: 'Avg Monthly', value: fmt(avgMonthly), color: '#8B5CF6' },
                      { label: 'Total Transactions', value: totalCount, color: '#F59E0B' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: '#0D1F45', borderRadius: '10px', padding: '16px', borderLeft: `4px solid ${s.color}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Section 2 — Monthly Breakdown Table */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MONTHLY BREAKDOWN</h4>
                    <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#F8FAFC' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Month</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total Disbursed</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Transactions</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Avg / Txn</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>MoM Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moneyFlowData.map((d, i) => {
                            const monthLoansCount = disbursedLoans.filter(l => { if (!l.disbursementDate) return false; const dd = new Date(l.disbursementDate); return dd.getMonth() === i && dd.getFullYear() === chartYear; }).length;
                            const avgPerTxn = monthLoansCount > 0 ? Math.round(d.released / monthLoansCount) : 0;
                            const prev = i > 0 ? moneyFlowData[i - 1].released : 0;
                            const isFuture = d.released === 0 && i > new Date().getMonth();
                            const momPct = i === 0 || isFuture || (prev === 0 && d.released === 0) ? null : prev === 0 ? null : Math.round(((d.released - prev) / prev) * 100);
                            const isBold = d.released > avgMonthly && d.released > 0;
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', opacity: isFuture ? 0.35 : 1, fontWeight: isBold ? 700 : 400, background: i % 2 !== 0 ? '#F9FAFB' : '#ffffff' }}>
                                <td style={{ padding: '10px 12px' }}>{d.month}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{d.released > 0 ? fmt(d.released) : '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{monthLoansCount || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{avgPerTxn > 0 ? fmt(avgPerTxn) : '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  {momPct === null ? '—' : <span style={{ color: momPct >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>{momPct >= 0 ? '↑' : '↓'} {Math.abs(momPct)}%</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3 — Branch Table */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DISBURSEMENTS BY BRANCH</h4>
                    <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#F8FAFC' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Branch</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total Disbursed</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Transactions</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Top Method</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>% Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const yearLoans = disbursedLoans.filter(l => l.disbursementDate && new Date(l.disbursementDate).getFullYear() === chartYear);
                            const branchMap = {};
                            yearLoans.forEach(l => {
                              const b = l.branchName || l.community || 'Unassigned';
                              if (!branchMap[b]) branchMap[b] = { branch: b, total: 0, count: 0, methods: {} };
                              branchMap[b].total += Number(l.amount) || 0;
                              branchMap[b].count++;
                              const m = (l.paymentMethod || 'Cash').toLowerCase();
                              const normalized = m === 'e-wallet' || m === 'gcash' ? 'E-Wallet' : m.includes('bank') ? 'Bank Transfer' : 'Cash';
                              branchMap[b].methods[normalized] = (branchMap[b].methods[normalized] || 0) + 1;
                            });
                            const totalAll = yearLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0);
                            const METHOD_BADGE = { 'E-Wallet': { bg: '#EFF6FF', color: '#2563EB' }, 'Bank Transfer': { bg: '#F0F4FF', color: '#1e3a5f' }, 'Cash': { bg: '#F3F4F6', color: '#6B7280' } };
                            return Object.values(branchMap).sort((a, b) => b.total - a.total).map((b, idx) => {
                              const topMethod = Object.entries(b.methods).sort((x, y) => y[1] - x[1])[0];
                              const topName = topMethod ? topMethod[0] : '—';
                              const badge = METHOD_BADGE[topName] || { bg: '#EFF6FF', color: '#1D4ED8' };
                              const share = totalAll > 0 ? ((b.total / totalAll) * 100).toFixed(1) : 0;
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 !== 0 ? '#F9FAFB' : '#ffffff' }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{b.branch}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(b.total)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{b.count}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}><span style={{ background: badge.bg, color: badge.color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{topName}</span></td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{share}%</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The scorecard shows year-to-date totals. Bold rows in the monthly table exceed the average monthly disbursement. MoM change shows directional momentum — consecutive red arrows may signal declining demand. The branch table identifies where the most funds are flowing.
                  </div>
                </>
                );
              })()}

              {expandedChart === 'paymentMethod' && (() => {
                const PIE_COLORS_EX = ['#1e3a5f', '#4a90d9', '#9CA3AF'];
                const METHOD_BORDERS = { 'E-Wallet': '#4a90d9', 'Bank Transfer': '#1e3a5f', 'Cash': '#9CA3AF' };
                const totalVal = paymentMethodData.reduce((s, d) => s + d.value, 0);
                const yearLoans = disbursedLoans.filter(l => l.disbursementDate && new Date(l.disbursementDate).getFullYear() === chartYear);
                return (
                <>
                  {/* Section 1 — Method Scorecard */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    {paymentMethodData.map((m, i) => {
                      const count = yearLoans.filter(l => {
                        const pm = (l.paymentMethod || 'Cash').toLowerCase();
                        if (m.name === 'E-Wallet') return pm === 'e-wallet' || pm === 'gcash';
                        if (m.name === 'Bank Transfer') return pm.includes('bank');
                        return pm === 'cash' || !l.paymentMethod;
                      }).length;
                      return (
                        <div key={i} style={{ background: '#0D1F45', borderRadius: '10px', padding: '16px', borderLeft: `4px solid ${METHOD_BORDERS[m.name] || PIE_COLORS_EX[i]}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>{fmt(m.value)}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>{m.name}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>{count} txn · {m.percentage}%</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Section 2 — Branch Table */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PAYMENT METHOD BY BRANCH</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                          <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#F8FAFC' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Branch</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#4a90d9' }}>E-Wallet</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>Bank</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#6B7280' }}>Cash</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Dominant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const branchMap = {};
                            yearLoans.forEach(l => {
                              const b = l.branchName || l.community || 'Unassigned';
                              if (!branchMap[b]) branchMap[b] = { branch: b, ewallet: 0, bank: 0, cash: 0, total: 0 };
                              const pm = (l.paymentMethod || 'Cash').toLowerCase();
                              const amt = Number(l.amount) || 0;
                              if (pm === 'e-wallet' || pm === 'gcash') branchMap[b].ewallet += amt;
                              else if (pm.includes('bank')) branchMap[b].bank += amt;
                              else branchMap[b].cash += amt;
                              branchMap[b].total += amt;
                            });
                            return Object.values(branchMap).sort((a, b) => b.total - a.total).map((b, idx) => {
                              const dominant = b.ewallet >= b.bank && b.ewallet >= b.cash ? 'E-Wallet' : b.bank >= b.cash ? 'Bank' : 'Cash';
                              const dColor = dominant === 'E-Wallet' ? '#4a90d9' : dominant === 'Bank' ? '#1e3a5f' : '#6B7280';
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 !== 0 ? '#F9FAFB' : '#ffffff' }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{b.branch}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{b.ewallet > 0 ? fmt(b.ewallet) : '—'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{b.bank > 0 ? fmt(b.bank) : '—'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{b.cash > 0 ? fmt(b.cash) : '—'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(b.total)}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ background: `${dColor}15`, color: dColor, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{dominant}</span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3 — Monthly Trend */}
                  <div style={{ marginBottom: '16px' }}>
                    <h4 className="adm-expand-panel-title" style={{ marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MONTHLY TREND BY PAYMENT METHOD</h4>
                    <div style={{ height: '260px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={(() => {
                          return MONTH_NAMES.map((month, idx) => {
                            const mLoans = yearLoans.filter(l => new Date(l.disbursementDate).getMonth() === idx);
                            let ew = 0, bk = 0, ca = 0;
                            mLoans.forEach(l => {
                              const pm = (l.paymentMethod || 'Cash').toLowerCase();
                              const amt = Number(l.amount) || 0;
                              if (pm === 'e-wallet' || pm === 'gcash') ew += amt;
                              else if (pm.includes('bank')) bk += amt;
                              else ca += amt;
                            });
                            return { month, 'E-Wallet': ew, 'Bank Transfer': bk, Cash: ca };
                          });
                        })()} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={v => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`} />
                          <Tooltip formatter={v => fmt(v)} />
                          <Legend iconType="circle" iconSize={8} />
                          <Line type="monotone" dataKey="Bank Transfer" stroke="#1e3a5f" strokeWidth={3} dot={{ r: 5, fill: '#1e3a5f' }} activeDot={{ r: 7 }} />
                          <Line type="monotone" dataKey="E-Wallet" stroke="#10B981" strokeWidth={3} dot={{ r: 5, fill: '#10B981' }} activeDot={{ r: 7 }} />
                          <Line type="monotone" dataKey="Cash" stroke="#F59E0B" strokeWidth={3} dot={{ r: 5, fill: '#F59E0B' }} activeDot={{ r: 7 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="adm-expand-interpretation">
                    <strong>Interpretation:</strong> The scorecards show each method's total and share. The branch table reveals which branches are cash-heavy vs digital — cash-dominant branches may benefit from e-wallet adoption campaigns. The trend chart shows whether digital payment usage is growing month-over-month.
                  </div>
                </>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* ── Awaiting Processing Modal ── */}
      {showAwaitingModal && (
        <div className="sec-adm-modal-overlay" onClick={() => setShowAwaitingModal(false)}>
          <div className="sec-adm-modal" onClick={e => e.stopPropagation()}>
            <div className="sec-adm-modal-header">
              <div>
                <h2 className="sec-adm-modal-title">Awaiting Processing</h2>
                <p className="sec-adm-modal-subtitle">{awaitingLoans.length} loan(s) pending disbursement</p>
              </div>
              <button className="sec-adm-modal-close" onClick={() => setShowAwaitingModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sec-adm-modal-body">
              {awaitingLoans.length === 0 ? (
                <div className="sec-adm-modal-empty">No loans currently awaiting processing.</div>
              ) : (
                <div className="sec-adm-modal-table-wrapper">
                  <table className="sec-adm-modal-table">
                    <thead>
                      <tr>
                        <th>Loan ID</th>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Approved Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awaitingLoans.map(l => (
                        <tr key={l._id}>
                          <td className="sec-adm-modal-loan-id">{l.loanId}</td>
                          <td>{l.memberName || 'N/A'}</td>
                          <td className="sec-adm-modal-amount">{fmt(l.amount)}</td>
                          <td>{fmtDate(l.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Processed Today Modal ── */}
      {showTodayModal && (
        <div className="sec-adm-modal-overlay" onClick={() => setShowTodayModal(false)}>
          <div className="sec-adm-modal" onClick={e => e.stopPropagation()}>
            <div className="sec-adm-modal-header">
              <div>
                <h2 className="sec-adm-modal-title">Processed Today</h2>
                <p className="sec-adm-modal-subtitle">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — {todayLoans.length} loan(s)</p>
              </div>
              <button className="sec-adm-modal-close" onClick={() => setShowTodayModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sec-adm-modal-body">
              {todayLoans.length === 0 ? (
                <div className="sec-adm-modal-empty">No loans processed today.</div>
              ) : (
                <div className="sec-adm-modal-table-wrapper">
                  <table className="sec-adm-modal-table">
                    <thead>
                      <tr>
                        <th>Loan ID</th>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayLoans.map(l => (
                        <tr key={l._id}>
                          <td className="sec-adm-modal-loan-id">{l.loanId}</td>
                          <td>{l.memberName || 'N/A'}</td>
                          <td className="sec-adm-modal-amount">{fmt(l.amount)}</td>
                          <td><span className={`sec-adm-method-badge sec-adm-method-${(l.paymentMethod || 'cash').toLowerCase()}`}>{l.paymentMethod || 'Cash'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ── This Month Modal ── */}
      {showMonthModal && (
        <div className="sec-adm-modal-overlay" onClick={() => setShowMonthModal(false)}>
          <div className="sec-adm-modal" onClick={e => e.stopPropagation()}>
            <div className="sec-adm-modal-header">
              <div>
                <h2 className="sec-adm-modal-title">Monthly Disbursements</h2>
                <p className="sec-adm-modal-subtitle">{getMonthModalLabel()} — {filteredMonthLoans.length} loan(s) processed</p>
              </div>
              <button className="sec-adm-modal-close" onClick={() => setShowMonthModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sec-adm-modal-filters">
              <Filter size={14} color="#6B7280" />
              <select value={monthModalMonth} onChange={e => setMonthModalMonth(e.target.value)} className="sec-adm-modal-filter-select">
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={monthModalYear} onChange={e => setMonthModalYear(parseInt(e.target.value))} className="sec-adm-modal-filter-select">
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="sec-adm-modal-body">
              {filteredMonthLoans.length === 0 ? (
                <div className="sec-adm-modal-empty">No disbursements for {getMonthModalLabel()}.</div>
              ) : (
                <div className="sec-adm-modal-table-wrapper">
                  <table className="sec-adm-modal-table">
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
                          <td className="sec-adm-modal-loan-id">{l.loanId}</td>
                          <td>{l.memberName || 'N/A'}</td>
                          <td className="sec-adm-modal-amount">{fmt(l.amount)}</td>
                          <td><span className={`sec-adm-method-badge sec-adm-method-${(l.paymentMethod || 'cash').toLowerCase()}`}>{l.paymentMethod || 'Cash'}</span></td>
                          <td>{fmtDate(l.disbursementDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="sec-adm-modal-summary">
                <span>Total for {getMonthModalLabel()}</span>
                <span className="sec-adm-modal-summary-value">{fmt(filteredMonthLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Total Disbursed Modal ── */}
      {showDisbursedModal && (
        <div className="sec-adm-modal-overlay" onClick={() => setShowDisbursedModal(false)}>
          <div className="sec-adm-modal" onClick={e => e.stopPropagation()}>
            <div className="sec-adm-modal-header">
              <div>
                <h2 className="sec-adm-modal-title">All Disbursements</h2>
                <p className="sec-adm-modal-subtitle">{getDisbModalLabel()} — {filteredDisbLoans.length} loan(s) — {fmt(filteredDisbLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</p>
              </div>
              <button className="sec-adm-modal-close" onClick={() => setShowDisbursedModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sec-adm-modal-filters">
              <Filter size={14} color="#6B7280" />
              <select value={disbModalMonth} onChange={e => setDisbModalMonth(e.target.value)} className="sec-adm-modal-filter-select">
                <option value="all">All Months</option>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={disbModalYear} onChange={e => setDisbModalYear(e.target.value)} className="sec-adm-modal-filter-select">
                <option value="all">All Years</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="sec-adm-modal-body">
              {filteredDisbLoans.length === 0 ? (
                <div className="sec-adm-modal-empty">No disbursements for {getDisbModalLabel()}.</div>
              ) : (
                <div className="sec-adm-modal-table-wrapper">
                  <table className="sec-adm-modal-table">
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
                          <td className="sec-adm-modal-loan-id">{l.loanId}</td>
                          <td>{l.memberName || 'N/A'}</td>
                          <td className="sec-adm-modal-amount">{fmt(l.amount)}</td>
                          <td><span className={`sec-adm-method-badge sec-adm-method-${(l.paymentMethod || 'cash').toLowerCase()}`}>{l.paymentMethod || 'Cash'}</span></td>
                          <td>{fmtDate(l.disbursementDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="sec-adm-modal-summary">
                <span>Total ({getDisbModalLabel()})</span>
                <span className="sec-adm-modal-summary-value">{fmt(filteredDisbLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
