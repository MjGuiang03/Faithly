/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../../admin/styles/AdminDashboard.css';
import '../styles/secretaryAdminDashboard.css';
import API from '../../utils/api';
import { Banknote, Clock, CheckCircle, CalendarDays, X, Filter } from 'lucide-react';


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
    token ? `${API}/api/admin/loans` : null,
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
                  <div className="adm-card-header-row adm-chart-header-full">
                    <div>
                      <h3 className="adm-card-title">Monthly Disbursements</h3>
                      <span className="adm-card-sub">Funds released per month</span>
                      {(() => {
                        const ytd = moneyFlowData.reduce((s, d) => s + d.released, 0);
                        return <div className="sec-adm-ytd-text">YTD: ₱{ytd.toLocaleString()}</div>;
                      })()}
                    </div>
                    <select value={chartYear} onChange={e => setChartYear(parseInt(e.target.value))} className="adm-filter-select">
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
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
      </div>

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
