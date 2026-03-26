import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoanAdminSidebar from './loanAdminSidebar';
import '../../admin/styles/AdminDashboard.css';
import '../styles/loanAdminDashboard.css';
import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

export default function LoanAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, active: 0, totalThisMonth: 0, totalDisbursed: 0 });
  const [recentLoans, setRecentLoans] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [disbursementByType, setDisbursementByType] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [savingsMonthly, setSavingsMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="loan-admin-dashboard-page">
      <LoanAdminSidebar />
      <div className="loan-admin-dashboard-content">
        {/* Header */}
        <h1 className="admin-dashboard-title">Loan Dashboard</h1>

        {/* Row 1 — 4 Stat Cards */}
        <div className="adm-stats-grid">
          <div className="adm-stat-card" style={{ borderTop: '3px solid #F59E0B' }}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Pending Review</span>
              <div className="adm-stat-icon" style={{ background: '#FEF3C7' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.33" stroke="#F59E0B" strokeWidth="1.67"/><path d="M10 5V10L13.33 11.67" stroke="#F59E0B" strokeWidth="1.67" strokeLinecap="round"/></svg>
              </div>
            </div>
            <span className="adm-stat-value">{dash(stats.pending)}</span>
          </div>

          <div className="adm-stat-card" style={{ borderTop: '3px solid #00A63E' }}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Approved Loans</span>
              <div className="adm-stat-icon" style={{ background: '#DCFCE7' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.33" stroke="#00A63E" strokeWidth="1.67"/><path d="M6.67 10L8.89 12.22L13.33 7.78" stroke="#00A63E" strokeWidth="1.67" strokeLinecap="round"/></svg>
              </div>
            </div>
            <span className="adm-stat-value">{dash(stats.active)}</span>
          </div>

          <div className="adm-stat-card" style={{ borderTop: '3px solid #155DFC' }}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total This Month</span>
              <div className="adm-stat-icon adm-icon-blue">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="15" rx="2" stroke="white" strokeWidth="1.67"/><path d="M14 1V5M6 1V5M2 9H18" stroke="white" strokeWidth="1.67" strokeLinecap="round"/></svg>
              </div>
            </div>
            <span className="adm-stat-value">{dash(stats.totalThisMonth)}</span>
          </div>

          <div className="adm-stat-card" style={{ borderTop: '3px solid #1E293B' }}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total Disbursed</span>
              <div className="adm-stat-icon adm-icon-navy">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 1.67V18.33M14.17 4.17H7.92C7.03 4.17 6.18 4.52 5.56 5.14C4.93 5.77 4.58 6.62 4.58 7.5C4.58 8.38 4.93 9.23 5.56 9.86C6.18 10.48 7.03 10.83 7.92 10.83H12.08C12.97 10.83 13.82 11.18 14.44 11.81C15.07 12.43 15.42 13.28 15.42 14.17C15.42 15.05 15.07 15.9 14.44 16.52C13.82 17.15 12.97 17.5 12.08 17.5H4.58" stroke="white" strokeWidth="1.67" strokeLinecap="round"/></svg>
              </div>
            </div>
            <span className="adm-stat-value">{dash(fmt(stats.totalDisbursed))}</span>
          </div>

          <div className="adm-stat-card" style={{ borderTop: '3px solid #8B5CF6' }}>
            <div className="adm-stat-top">
              <span className="adm-stat-label">Total Savings</span>
              <div className="adm-stat-icon" style={{ background: '#EDE9FE' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M17.5 11.67V8.33C17.5 7.41 16.76 6.67 15.83 6.67H4.17C3.24 6.67 2.5 7.41 2.5 8.33V15.83C2.5 16.76 3.24 17.5 4.17 17.5H15.83C16.76 17.5 17.5 16.76 17.5 15.83V12.5" stroke="#8B5CF6" strokeWidth="1.67" strokeLinecap="round"/><path d="M14.17 12.08C14.17 12.54 13.79 12.92 13.33 12.92C12.87 12.92 12.5 12.54 12.5 12.08C12.5 11.62 12.87 11.25 13.33 11.25C13.79 11.25 14.17 11.62 14.17 12.08Z" fill="#8B5CF6"/><path d="M5 6.67V5C5 3.62 6.12 2.5 7.5 2.5H12.5C13.88 2.5 15 3.62 15 5V6.67" stroke="#8B5CF6" strokeWidth="1.67" strokeLinecap="round"/></svg>
              </div>
            </div>
            <span className="adm-stat-value">{dash(fmt(totalSavings))}</span>
          </div>
        </div>

        {/* Row 2 — Charts */}
        <div className="adm-analytics-row" style={{ gridTemplateColumns: '1fr 320px' }}>
          {/* Money In vs Money Out */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <h3 className="adm-card-title">Money In vs Money Out</h3>
                <span className="adm-card-sub">Monthly comparison of received funds and loan disbursements</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px' }} />
                <Bar dataKey="received" fill="#00A63E" name="Money Received" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disbursed" fill="#FF6467" name="Money Released" radius={[4, 4, 0, 0]} />
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
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={disbursementByType} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="type" type="category" stroke="#9CA3AF" fontSize={12} width={90} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
                <Bar dataKey="amount" fill="#155DFC" radius={[0, 4, 4, 0]} />
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
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={savingsMonthly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + v.toLocaleString()} />
              <Line type="monotone" dataKey="savings" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="Savings" />
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
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8.33" stroke={loan.status === 'pending' ? '#F59E0B' : '#155DFC'} strokeWidth="1.67"/>
                        <path d="M10 5V10L13.33 11.67" stroke={loan.status === 'pending' ? '#F59E0B' : '#155DFC'} strokeWidth="1.67" strokeLinecap="round"/>
                      </svg>
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
    </div>
  );
}
