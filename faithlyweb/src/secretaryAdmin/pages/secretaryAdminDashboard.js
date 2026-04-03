import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../../admin/styles/AdminDashboard.css';
import '../styles/secretaryAdminDashboard.css';
import API from '../../utils/api';
import { ArrowLeft, Banknote, Circle } from 'lucide-react';


const fmt = (n) => n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';
const COLORS = ['#155DFC', '#00A63E', '#F59E0B'];

export default function SecretaryAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ awaiting: 0, today: 0, month: 0, disbursed: 0 });
  const [reportStats, setReportStats] = useState({ totalReceived: 0, totalReleased: 0, totalProcessed: 0, processingRate: 0 });
  const [paymentMethodData, setPaymentMethodData] = useState([
    { name: 'GCash', value: 0, percentage: 0 },
    { name: 'Bank Transfer', value: 0, percentage: 0 },
    { name: 'Cash', value: 0, percentage: 0 }
  ]);
  const [moneyFlowData, setMoneyFlowData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const res = await fetch(`${API}/api/admin/loans`, { headers });
        if (!res.ok) throw new Error('Failed to fetch loans');
        const data = await res.json();

        if (data.success && data.loans) {
          const loans = data.loans;
          const activeLoans = loans.filter(l => l.status === 'active');
          const disbursedLoans = loans.filter(l => l.disbursed);
          const approvedLoans = loans.filter(l => l.status === 'active' || l.disbursed);

          const now = new Date();
          const todayStr = now.toLocaleDateString('en-US');
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          let processedToday = 0;
          let processedMonth = 0;
          let totalDisbursedAmount = 0;

          activeLoans.forEach(l => {
            if (l.disbursed && l.disbursementDate) {
              totalDisbursedAmount += Number(l.amount) || 0;
              const disbDate = new Date(l.disbursementDate);
              if (disbDate.toLocaleDateString('en-US') === todayStr) processedToday++;
              if (disbDate >= monthStart) processedMonth++;
            }
          });

          setStats({ awaiting: activeLoans.filter(l => !l.disbursed).length, today: processedToday, month: processedMonth, disbursed: totalDisbursedAmount });

          const totalReleasedAmt = disbursedLoans.reduce((sum, l) => sum + Number(l.amount), 0);
          const processingRate = approvedLoans.length > 0 ? Math.round((disbursedLoans.length / approvedLoans.length) * 100) : 0;
          setReportStats({ totalReceived: 0, totalReleased: totalReleasedAmt, totalProcessed: totalReleasedAmt, processingRate });

          const gcashAmt = disbursedLoans.filter(l => l.paymentMethod === 'gcash').reduce((sum, l) => sum + Number(l.amount), 0);
          const bankAmt = disbursedLoans.filter(l => l.paymentMethod === 'bank').reduce((sum, l) => sum + Number(l.amount), 0);
          const cashAmt = disbursedLoans.filter(l => l.paymentMethod === 'cash').reduce((sum, l) => sum + Number(l.amount), 0);
          const totalAmt = gcashAmt + bankAmt + cashAmt;
          setPaymentMethodData([
            { name: 'GCash', value: gcashAmt, percentage: totalAmt > 0 ? Math.round((gcashAmt / totalAmt) * 100) : 0 },
            { name: 'Bank Transfer', value: bankAmt, percentage: totalAmt > 0 ? Math.round((bankAmt / totalAmt) * 100) : 0 },
            { name: 'Cash', value: cashAmt, percentage: totalAmt > 0 ? Math.round((cashAmt / totalAmt) * 100) : 0 }
          ]);

          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const currentYear = now.getFullYear();
          const flowData = months.map(m => ({ month: m, released: 0 }));
          disbursedLoans.forEach(l => {
            if (!l.disbursementDate) return;
            const d = new Date(l.disbursementDate);
            if (d.getFullYear() !== currentYear) return;
            flowData[d.getMonth()].released += Number(l.amount) || 0;
          });
          setMoneyFlowData(flowData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dash = (v) => loading ? '—' : v;

  return (
    <div className="sec-admin-dashboard-page">
      <SecretaryAdminSidebar />
      <div className="sec-admin-dashboard-content">

        {/* Header */}
        <h1 className="admin-dashboard-title">Secretary Dashboard</h1>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading dashboard data...</div>
        ) : (
          <>
            {/* Row 1 — 4 Stat Cards */}
            <div className="adm-stats-grid" style={{ width: '100%', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="adm-stat-card" style={{ borderTop: '3px solid #F59E0B' }}>
                <div className="adm-stat-top">
                  <span className="adm-stat-label">Awaiting Processing</span>
                  <div className="adm-stat-icon" style={{ background: '#FEF3C7' }}>
                    <ArrowLeft size={16} color="#F59E0B" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(stats.awaiting)}</span>
              </div>

              <div className="adm-stat-card" style={{ borderTop: '3px solid #155DFC' }}>
                <div className="adm-stat-top">
                  <span className="adm-stat-label">Processed Today</span>
                  <div className="adm-stat-icon adm-icon-blue">
                    <Circle size={16} color="white" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(stats.today)}</span>
              </div>

              <div className="adm-stat-card" style={{ borderTop: '3px solid #155DFC' }}>
                <div className="adm-stat-top">
                  <span className="adm-stat-label">This Month</span>
                  <div className="adm-stat-icon adm-icon-blue">
                    <Circle size={16} color="white" />
                  </div>
                </div>
                <span className="adm-stat-value">{dash(stats.month)}</span>
              </div>

              <div className="adm-stat-card" style={{ borderTop: '3px solid #00A63E' }}>
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
            <div className="adm-analytics-row" style={{ gridTemplateColumns: '1fr 280px' }}>
              {/* Monthly Disbursements */}
              <div className="adm-card">
                <div className="adm-card-header">
                  <div>
                    <h3 className="adm-card-title">Monthly Disbursements</h3>
                    <span className="adm-card-sub">Funds released per month this year</span>
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
                <div className="adm-pie-legend" style={{ marginTop: '8px' }}>
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
                <div className="adm-summary-card" style={{ borderLeft: '3px solid #00A63E' }}>
                  <span className="adm-summary-label">Total Received</span>
                  <span className="adm-summary-value green">₱{reportStats.totalReceived.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card" style={{ borderLeft: '3px solid #EF4444' }}>
                  <span className="adm-summary-label">Total Released</span>
                  <span className="adm-summary-value" style={{ color: '#EF4444' }}>₱{reportStats.totalReleased.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card" style={{ borderLeft: '3px solid #155DFC' }}>
                  <span className="adm-summary-label">Processed</span>
                  <span className="adm-summary-value blue">₱{reportStats.totalProcessed.toLocaleString()}</span>
                </div>
                <div className="adm-summary-card" style={{ borderLeft: '3px solid #8B5CF6' }}>
                  <span className="adm-summary-label">Processing Rate</span>
                  <span className="adm-summary-value" style={{ color: '#8B5CF6' }}>{reportStats.processingRate}%</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
