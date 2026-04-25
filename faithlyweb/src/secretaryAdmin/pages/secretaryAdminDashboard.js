/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

export default function SecretaryAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ awaiting: 0, today: 0, month: 0, disbursed: 0 });
  const [rawLoans, setRawLoans] = useState([]);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());

  const [reportStats, setReportStats] = useState({ totalReceived: 0, totalReleased: 0, totalProcessed: 0, processingRate: 0 });
  const [paymentMethodData, setPaymentMethodData] = useState([
    { name: 'GCash', value: 0, percentage: 0 },
    { name: 'Bank Transfer', value: 0, percentage: 0 },
    { name: 'Cash', value: 0, percentage: 0 }
  ]);
  const [moneyFlowData, setMoneyFlowData] = useState([]);

  // Modal states
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showDisbursedModal, setShowDisbursedModal] = useState(false);
  const [monthLoans, setMonthLoans] = useState([]);
  const [disbursedLoans, setDisbursedLoans] = useState([]);

  // Modal filter states
  const [monthModalMonth, setMonthModalMonth] = useState(new Date().getMonth().toString());
  const [monthModalYear, setMonthModalYear] = useState(new Date().getFullYear());
  const [disbModalMonth, setDisbModalMonth] = useState('all');
  const [disbModalYear, setDisbModalYear] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const res = await fetch(`${API}/api/admin/loans`, { headers });
        if (!res.ok) throw new Error('Failed to fetch loans');
        const data = await res.json();

        if (data.success && data.loans) {
          setRawLoans(data.loans);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Derived stats — always uses current month/year
  useEffect(() => {
    if (!rawLoans.length) return;
    const activeLoans = rawLoans.filter(l => l.status === 'active');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toLocaleDateString('en-US');

    let processedToday = 0;
    let processedMonth = 0;
    let totalDisbursedAmount = 0;
    const thisMonthLoans = [];
    const allDisbursedLoans = [];

    activeLoans.forEach(l => {
      if (l.disbursed && l.disbursementDate) {
        const disbDate = new Date(l.disbursementDate);
        if (disbDate.toLocaleDateString('en-US') === todayStr) processedToday++;

        if (disbDate.getFullYear() === currentYear && disbDate.getMonth() === currentMonth) {
          processedMonth++;
          thisMonthLoans.push(l);
        }

        totalDisbursedAmount += Number(l.amount) || 0;
        allDisbursedLoans.push(l);
      }
    });

    setStats({
      awaiting: activeLoans.filter(l => !l.disbursed).length,
      today: processedToday,
      month: processedMonth,
      disbursed: totalDisbursedAmount
    });
    setMonthLoans(thisMonthLoans);
    setDisbursedLoans(allDisbursedLoans);
  }, [rawLoans]);

  // Derived stats for Reports and Chart
  useEffect(() => {
    if (!rawLoans.length) return;
    const disbursedL = rawLoans.filter(l => l.disbursed);
    const approvedLoans = rawLoans.filter(l => l.status === 'active' || l.disbursed);

    const totalReleasedAmt = disbursedL.reduce((sum, l) => sum + Number(l.amount), 0);
    const processingRate = approvedLoans.length > 0 ? Math.round((disbursedL.length / approvedLoans.length) * 100) : 0;
    setReportStats({ totalReceived: 0, totalReleased: totalReleasedAmt, totalProcessed: totalReleasedAmt, processingRate });

    const gcashAmt = disbursedL.filter(l => l.paymentMethod === 'gcash').reduce((sum, l) => sum + Number(l.amount), 0);
    const bankAmt = disbursedL.filter(l => l.paymentMethod === 'bank').reduce((sum, l) => sum + Number(l.amount), 0);
    const cashAmt = disbursedL.filter(l => l.paymentMethod === 'cash').reduce((sum, l) => sum + Number(l.amount), 0);
    const totalAmt = gcashAmt + bankAmt + cashAmt;
    setPaymentMethodData([
      { name: 'GCash', value: gcashAmt, percentage: totalAmt > 0 ? Math.round((gcashAmt / totalAmt) * 100) : 0 },
      { name: 'Bank Transfer', value: bankAmt, percentage: totalAmt > 0 ? Math.round((bankAmt / totalAmt) * 100) : 0 },
      { name: 'Cash', value: cashAmt, percentage: totalAmt > 0 ? Math.round((cashAmt / totalAmt) * 100) : 0 }
    ]);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const flowData = months.map(m => ({ month: m, released: 0 }));
    disbursedL.forEach(l => {
      if (!l.disbursementDate) return;
      const d = new Date(l.disbursementDate);
      if (d.getFullYear() === chartYear) {
        flowData[d.getMonth()].released += Number(l.amount) || 0;
      }
    });
    setMoneyFlowData(flowData);
  }, [rawLoans, chartYear]);

  const dash = (v) => loading ? '—' : v;

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filtered loans for This Month modal
  const filteredMonthLoans = disbursedLoans.filter(l => {
    if (!l.disbursementDate) return false;
    const d = new Date(l.disbursementDate);
    return d.getMonth() === parseInt(monthModalMonth) && d.getFullYear() === monthModalYear;
  });

  // Filtered loans for All Disbursements modal
  const filteredDisbLoans = disbursedLoans.filter(l => {
    if (!l.disbursementDate) return false;
    const d = new Date(l.disbursementDate);
    if (disbModalYear !== 'all' && d.getFullYear() !== parseInt(disbModalYear)) return false;
    if (disbModalMonth !== 'all' && d.getMonth() !== parseInt(disbModalMonth)) return false;
    return true;
  });

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
            <div className="adm-stats-grid sec-adm-stats-grid-4">
              <div className="adm-stat-card">
                <div className="adm-stat-top">
                  <span className="adm-stat-label">Awaiting Processing</span>
                  <div className="adm-stat-icon adm-icon-yellow">
                    <Clock size={16} color="white" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(stats.awaiting)}</span>
              </div>

              <div className="adm-stat-card">
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

            {/* Row 2 — Charts */}
            <div className="adm-analytics-row adm-analytics-row-sec">
              {/* Monthly Disbursements */}
              <div className="adm-card">
                <div className="adm-card-header">
                  <div className="adm-card-header-row adm-chart-header-full">
                    <div>
                      <h3 className="adm-card-title">Monthly Disbursements</h3>
                      <span className="adm-card-sub">Funds released per month</span>
                    </div>
                    <select value={chartYear} onChange={e => setChartYear(parseInt(e.target.value))} className="adm-filter-select">
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={moneyFlowData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                    <Bar dataKey="released" fill="#155DFC" name="Disbursed" radius={[4, 4, 0, 0]} />
                  </BarChart>
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
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => '₱' + value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="adm-pie-legend adm-pie-legend-spaced">
                  {paymentMethodData.map((entry, i) => (
                    <div key={i} className="adm-pie-legend-item">
                      <div className="adm-pie-dot" style={{ background: COLORS[i] }} />
                      <span className="adm-pie-label">{entry.name}</span>
                      <span className="adm-pie-val">{entry.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3 — Processing Overview */}
            <div className="adm-card">
              <div className="adm-card-header">
                <div>
                  <h3 className="adm-card-title">Processing Overview</h3>
                  <span className="adm-card-sub">Key disbursement metrics</span>
                </div>
              </div>
              <div className="adm-stats-grid" style={{ gap: '10px', width: '100%', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Total Received</span>
                  <span className="adm-summary-value green">₱{reportStats.totalReceived.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Total Released</span>
                  <span className="adm-summary-value" style={{ color: '#EF4444' }}>₱{reportStats.totalReleased.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Processed</span>
                  <span className="adm-summary-value blue">₱{reportStats.totalProcessed.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card">
                  <span className="adm-summary-label">Processing Rate</span>
                  <span className="adm-summary-value" style={{ color: '#8B5CF6' }}>{reportStats.processingRate}%</span>
                </div>
              </div>
            </div>
          </>
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
