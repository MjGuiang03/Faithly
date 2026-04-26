import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showDisbursedModal, setShowDisbursedModal] = useState(false);
  const [monthModalMonth, setMonthModalMonth] = useState(new Date().getMonth().toString());
  const [monthModalYear, setMonthModalYear] = useState(new Date().getFullYear());
  const [disbModalMonth, setDisbModalMonth] = useState('all');
  const [disbModalYear, setDisbModalYear] = useState('all');
  const [expandedChart, setExpandedChart] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/'); return; }

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const currentYear = new Date().getFullYear();
        const [loansRes, reportsRes] = await Promise.all([
          fetch(`${API}/api/admin/loans`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/admin/loan-reports?year=${currentYear}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const data = await loansRes.json();
        const reportsData = await reportsRes.json();

        if (!loansRes.ok) {
          if (loansRes.status === 401 || loansRes.status === 403) { navigate('/'); return; }
          toast.error(data.message || 'Failed to fetch dashboard data');
          return;
        }

        setStats({
          pending:        data.stats?.pending        || 0,
          active:         (data.stats?.active || 0) + (data.stats?.completed || 0),
          totalThisMonth: data.stats?.totalThisMonth || 0,
          totalDisbursed: data.stats?.totalDisbursed || 0,
        });

        setAllLoans(data.loans || []);

        const upcoming = (data.loans || [])
          .filter(l => l.status === 'active' || l.status === 'pending')
          .slice(0, 5);
        setRecentLoans(upcoming);

        if (reportsData.success) {
          setMonthlyData(reportsData.monthlyData || []);
          setDisbursementByType(reportsData.disbursementByType || []);
        }

        // Fetch savings data
        try {
          const savRes = await fetch(`${API}/api/admin/member-savings`, { headers: { Authorization: `Bearer ${token}` } });
          const savData = await savRes.json();
          if (savRes.ok) {
            setTotalSavings(savData.totalSavings || 0);
            // Build monthly savings trend (Jan-Dec)
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const monthlyTrend = months.map(m => ({ month: m, savings: 0 }));
            if (savData.transactions) {
              savData.transactions.forEach(t => {
                const d = new Date(t.date || t.createdAt);
                if (d.getFullYear() === currentYear) {
                  monthlyTrend[d.getMonth()].savings += Number(t.amount) || 0;
                }
              });
            }
            setSavingsMonthly(monthlyTrend);
          }
        } catch { /* silent */ }
      } catch {
        toast.error('Network error. Could not load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const dash = (v) => loading ? '—' : v;

  // Derived: all disbursed loans
  const allDisbursedLoans = allLoans.filter(l => l.disbursed && l.disbursementDate);

  // Filtered loans for This Month modal
  const filteredMonthLoans = allDisbursedLoans.filter(l => {
    const d = new Date(l.disbursementDate);
    return d.getMonth() === parseInt(monthModalMonth) && d.getFullYear() === monthModalYear;
  });

  // Filtered loans for All Disbursements modal
  const filteredDisbLoans = allDisbursedLoans.filter(l => {
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
    <div className="loan-admin-dashboard-page">
      <LoanAdminSidebar />
      <div className="loan-admin-dashboard-content">
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
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('moneyIn')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={45} ticks={CHART_TICKS} domain={[0, 500000]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
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
              </div>
              <button className="la-chart-expand-btn" onClick={() => setExpandedChart('disbursements')} title="Expand Chart">
                <Expand size={18} color="#4B5563" strokeWidth={2.5} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={disbursementByType} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} ticks={CHART_TICKS} domain={[0, 500000]} />
                <YAxis dataKey="type" type="category" stroke="#9CA3AF" fontSize={12} width={90} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {disbursementByType.map((entry, index) => {
                    const MONOCHROMATIC_BLUES = ['#0D1F45', '#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD'];
                    return <Cell key={`cell-${index}`} fill={MONOCHROMATIC_BLUES[index % MONOCHROMATIC_BLUES.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            <LineChart data={savingsMonthly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={45} ticks={CHART_TICKS} domain={[0, 500000]} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
              <Line type="monotone" dataKey="savings" stroke="#0D1F45" strokeWidth={2} dot={{ r: 3, fill: '#0D1F45' }} name="Savings" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3 — Recent Loan Applications */}
        <div className="adm-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Recent Loan Applications</h3>
            <button className="loan-admin-dashboard-view-all" onClick={() => navigate('/loan-admin/loan-management')}>View All</button>
          </div>
          <div className="loan-admin-dashboard-payments-list">
            {recentLoans.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: 13, padding: '16px 0' }}>No recent loan applications.</p>
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

      </div>

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
                <span className="la-modal-summary-value">{fmt(filteredMonthLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span>
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
                <p className="la-modal-subtitle">{getDisbModalLabel()} — {filteredDisbLoans.length} loan(s) — {fmt(filteredDisbLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</p>
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
                <span className="la-modal-summary-value">{fmt(filteredDisbLoans.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded Chart Modal ── */}
      {expandedChart && (
        <div className="la-modal-overlay" onClick={() => setExpandedChart(null)}>
          <div className="la-modal la-chart-modal" onClick={e => e.stopPropagation()}>
            <div className="la-modal-header">
              <div>
                <h2 className="la-modal-title">
                  {expandedChart === 'moneyIn' && 'Money In vs Money Out'}
                  {expandedChart === 'disbursements' && 'Disbursements by Type'}
                  {expandedChart === 'savings' && 'Savings Trend'}
                </h2>
              </div>
              <button className="la-modal-close" onClick={() => setExpandedChart(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="la-modal-body" style={{ height: '60vh', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <ResponsiveContainer width="100%" height="100%">
                {expandedChart === 'moneyIn' && (
                  <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={55} ticks={CHART_TICKS} domain={[0, 500000]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="received" fill="#0D1F45" name="Money Received" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="disbursed" fill="#60A5FA" name="Money Released" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
                {expandedChart === 'disbursements' && (
                  <BarChart data={disbursementByType} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} ticks={CHART_TICKS} domain={[0, 500000]} />
                    <YAxis dataKey="type" type="category" stroke="#9CA3AF" fontSize={12} width={110} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {disbursementByType.map((entry, index) => {
                        const MONOCHROMATIC_BLUES = ['#0D1F45', '#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD'];
                        return <Cell key={`cell-${index}`} fill={MONOCHROMATIC_BLUES[index % MONOCHROMATIC_BLUES.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                )}
                {expandedChart === 'savings' && (
                  <LineChart data={savingsMonthly} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxis} width={55} ticks={CHART_TICKS} domain={[0, 500000]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                    <Line type="monotone" dataKey="savings" stroke="#0D1F45" strokeWidth={3} dot={{ r: 4, fill: '#0D1F45' }} name="Savings" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
