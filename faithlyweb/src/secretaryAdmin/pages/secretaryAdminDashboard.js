import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminDashboard.css';
import '../styles/secretaryAdminReports.css';
import API from '../../utils/api';

const fmt = (n) => n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';
const COLORS = ['#155DFC', '#00A63E'];

export default function SecretaryAdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Dashboard stat cards
    const [stats, setStats] = useState({ awaiting: 0, today: 0, month: 0, disbursed: 0 });

    // Reports stats
    const [reportStats, setReportStats] = useState({
        totalReceived: 0,
        totalReleased: 0,
        totalProcessed: 0,
        processingRate: 0
    });
    const [paymentMethodData, setPaymentMethodData] = useState([
        { name: 'GCash', value: 0, percentage: 0 },
        { name: 'Bank Transfer', value: 0, percentage: 0 }
    ]);

    // Chart data (monthly money flow — populated from real data grouped by month)
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

                    setStats({
                        awaiting: activeLoans.filter(l => !l.disbursed).length,
                        today: processedToday,
                        month: processedMonth,
                        disbursed: totalDisbursedAmount
                    });

                    // Reports stats
                    const totalReleasedAmt = disbursedLoans.reduce((sum, l) => sum + Number(l.amount), 0);
                    const processingRate = approvedLoans.length > 0
                        ? Math.round((disbursedLoans.length / approvedLoans.length) * 100)
                        : 0;

                    setReportStats({
                        totalReceived: 0,
                        totalReleased: totalReleasedAmt,
                        totalProcessed: totalReleasedAmt,
                        processingRate
                    });

                    // Payment method distribution
                    const gcashAmt = disbursedLoans.filter(l => l.paymentMethod === 'gcash').reduce((sum, l) => sum + Number(l.amount), 0);
                    const bankAmt = disbursedLoans.filter(l => l.paymentMethod === 'bank').reduce((sum, l) => sum + Number(l.amount), 0);
                    const totalAmt = gcashAmt + bankAmt;
                    setPaymentMethodData([
                        { name: 'GCash', value: gcashAmt, percentage: totalAmt > 0 ? Math.round((gcashAmt / totalAmt) * 100) : 0 },
                        { name: 'Bank Transfer', value: bankAmt, percentage: totalAmt > 0 ? Math.round((bankAmt / totalAmt) * 100) : 0 }
                    ]);

                    // Build monthly flow from real disbursed loans
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    const currentYear = now.getFullYear();
                    const flowMap = {};
                    disbursedLoans.forEach(l => {
                        if (!l.disbursementDate) return;
                        const d = new Date(l.disbursementDate);
                        if (d.getFullYear() !== currentYear) return;
                        const key = months[d.getMonth()];
                        if (!flowMap[key]) flowMap[key] = { month: key, released: 0 };
                        flowMap[key].released += Number(l.amount) || 0;
                    });
                    const flowData = months
                        .filter(m => flowMap[m])
                        .map(m => flowMap[m]);
                    setMoneyFlowData(flowData.length > 0 ? flowData : [
                        { month: 'Jan', released: 0 },
                        { month: 'Feb', released: 0 },
                        { month: 'Mar', released: 0 },
                    ]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const statsCards = [
        { id: 'awaiting', label: 'Awaiting Processing', value: stats.awaiting.toString(), color: 'orange',
            icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 5V10L13.3333 11.6667" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: 'today', label: 'Processed Today', value: stats.today.toString(), color: 'blue',
            icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.66667 10L8.88889 12.2222L13.3333 7.77778" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: 'month', label: 'This Month', value: stats.month.toString(), color: 'blue',
            icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="15" rx="2" stroke="#155DFC" strokeWidth="2"/><path d="M14 1V5M6 1V5M2 9H18" stroke="#155DFC" strokeWidth="2" strokeLinecap="round"/></svg> },
        { id: 'disbursed', label: 'Total Disbursed', value: fmt(stats.disbursed), color: 'green',
            icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1.66667V18.3333M14.1667 4.16667H7.91667C7.03261 4.16667 6.18476 4.51786 5.55964 5.14298C4.93452 5.7681 4.58333 6.61594 4.58333 7.5C4.58333 8.38406 4.93452 9.2319 5.55964 9.85702C6.18476 10.4821 7.03261 10.8333 7.91667 10.8333H12.0833C12.9674 10.8333 13.8152 11.1845 14.4404 11.8096C15.0655 12.4348 15.4167 13.2826 15.4167 14.1667C15.4167 15.0507 15.0655 15.8986 14.4404 16.5237C13.8152 17.1488 12.9674 17.5 12.0833 17.5H4.58333" stroke="#00A63E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    ];

    const quickActions = [
        { id: 'process', title: 'Process Pending Loans', description: `${stats.awaiting} loan${stats.awaiting !== 1 ? 's' : ''} awaiting processing`, color: 'orange', link: '/secretary-admin/loan-process',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 6V12L16 14" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: 'notifications', title: 'View Notifications', description: 'Check approved loans', color: 'blue', link: '/secretary-admin/notifications',
            icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    ];

    return (
        <div className="sec-admin-dashboard-page">
            <SecretaryAdminSidebar />
            <div className="sec-admin-dashboard-content">

                {/* Header */}
                <div className="sec-admin-dashboard-header">
                    <h1 className="sec-admin-dashboard-title">Secretary Dashboard</h1>
                    <p className="sec-admin-dashboard-subtitle">Process approved loans and track disbursements at a glance</p>
                </div>

                {loading ? (
                    <div className="sec-admin-dashboard-loading" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading dashboard data...</div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="sec-admin-dashboard-stats">
                            {statsCards.map(stat => (
                                <div key={stat.id} className={`sec-admin-dashboard-stat-card ${stat.color}`}>
                                    <div className="sec-admin-dashboard-stat-header">
                                        <p className="sec-admin-dashboard-stat-label">{stat.label}</p>
                                        <div className="sec-admin-dashboard-stat-icon">{stat.icon}</div>
                                    </div>
                                    <p className="sec-admin-dashboard-stat-value">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Report Summary Cards */}
                        <div className="sec-admin-dashboard-section-header">
                            <h2 className="sec-admin-dashboard-section-title">Processing Overview</h2>
                        </div>
                        <div className="sec-admin-reports-summary">
                            <div className="sec-admin-reports-summary-card green">
                                <div className="sec-admin-reports-summary-header">
                                    <p className="sec-admin-reports-summary-label">Total Received</p>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14.6667V1.33334" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/><path d="M11.3333 3.99999L8 1.33333L4.66667 3.99999" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/></svg>
                                </div>
                                <p className="sec-admin-reports-summary-value">₱{reportStats.totalReceived.toLocaleString()}</p>
                                <p className="sec-admin-reports-summary-period">Total fund inflows</p>
                            </div>
                            <div className="sec-admin-reports-summary-card red">
                                <div className="sec-admin-reports-summary-header">
                                    <p className="sec-admin-reports-summary-label">Total Released</p>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.33334V14.6667" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/><path d="M4.66667 12L8 14.6667L11.3333 12" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/></svg>
                                </div>
                                <p className="sec-admin-reports-summary-value">₱{reportStats.totalReleased.toLocaleString()}</p>
                                <p className="sec-admin-reports-summary-period">Loan disbursements</p>
                            </div>
                            <div className="sec-admin-reports-summary-card blue">
                                <div className="sec-admin-reports-summary-header">
                                    <p className="sec-admin-reports-summary-label">Total Processed</p>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/><path d="M5.33333 8L7.33333 10L10.6667 6" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/></svg>
                                </div>
                                <p className="sec-admin-reports-summary-value">₱{reportStats.totalProcessed.toLocaleString()}</p>
                                <p className="sec-admin-reports-summary-period">By secretary</p>
                            </div>
                            <div className="sec-admin-reports-summary-card purple">
                                <div className="sec-admin-reports-summary-header">
                                    <p className="sec-admin-reports-summary-label">Processing Rate</p>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.66667" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/><path d="M8 5.33333V8L10 9.33333" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333"/></svg>
                                </div>
                                <p className="sec-admin-reports-summary-value">{reportStats.processingRate}%</p>
                                <p className="sec-admin-reports-summary-period">All approved processed</p>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="sec-admin-reports-chart-row" style={{ marginTop: '16px' }}>
                            {/* Money Flow Bar Chart */}
                            <div className="sec-admin-reports-chart-section half">
                                <div className="sec-admin-reports-chart-header">
                                    <h3 className="sec-admin-reports-chart-title">Monthly Disbursements</h3>
                                    <p className="sec-admin-reports-chart-subtitle">Funds released per month this year</p>
                                </div>
                                <div className="sec-admin-reports-chart-container">
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={moneyFlowData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                                            <YAxis stroke="#6B7280" fontSize={12} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px' }} formatter={(v) => '₱' + v.toLocaleString()} />
                                            <Bar dataKey="released" fill="#155DFC" name="Disbursed" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Payment Method Distribution */}
                            <div className="sec-admin-reports-chart-section half">
                                <div className="sec-admin-reports-chart-header">
                                    <h3 className="sec-admin-reports-chart-title">Payment Method Distribution</h3>
                                    <p className="sec-admin-reports-chart-subtitle">Breakdown by disbursement method</p>
                                </div>
                                <div className="sec-admin-reports-chart-container">
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={paymentMethodData} cx="50%" cy="50%" labelLine={false} label={({ name, percentage }) => `${name} ${percentage}%`} outerRadius={75} dataKey="value">
                                                {paymentMethodData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => '₱' + value.toLocaleString()} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="sec-admin-reports-legend">
                                        <div className="sec-admin-reports-legend-item">
                                            <div className="sec-admin-reports-legend-color blue"></div>
                                            <span className="sec-admin-reports-legend-label">GCash</span>
                                            <span className="sec-admin-reports-legend-value">₱{paymentMethodData[0]?.value.toLocaleString() || '0'}</span>
                                        </div>
                                        <div className="sec-admin-reports-legend-item">
                                            <div className="sec-admin-reports-legend-color green"></div>
                                            <span className="sec-admin-reports-legend-label">Bank Transfer</span>
                                            <span className="sec-admin-reports-legend-value">₱{paymentMethodData[1]?.value.toLocaleString() || '0'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="sec-admin-dashboard-quick-actions" style={{ marginTop: '16px' }}>
                            <h2 className="sec-admin-dashboard-section-title">Quick Actions</h2>
                            <div className="sec-admin-dashboard-actions-grid">
                                {quickActions.map(action => (
                                    <div key={action.id} className={`sec-admin-dashboard-action-card ${action.color}`} onClick={() => navigate(action.link)} style={{ cursor: 'pointer' }}>
                                        <div className="sec-admin-dashboard-action-icon">{action.icon}</div>
                                        <div className="sec-admin-dashboard-action-content">
                                            <h3 className="sec-admin-dashboard-action-title">{action.title}</h3>
                                            <p className="sec-admin-dashboard-action-desc">{action.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
