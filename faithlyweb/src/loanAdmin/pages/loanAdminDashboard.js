import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoanAdminSidebar from './loanAdminSidebar';
import svgPaths from "../../imports/svg-icons";
import '../styles/loanAdminDashboard.css';
import '../styles/loanAdminReports.css';
import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
};

export default function LoanAdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        pending: 0,
        active: 0,
        totalThisMonth: 0,
        totalDisbursed: 0,
    });
    const [recentLoans, setRecentLoans] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [disbursementByType, setDisbursementByType] = useState([]);
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
                    if (loansRes.status === 401 || loansRes.status === 403) {
                        navigate('/');
                        return;
                    }
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

            } catch (err) {
                toast.error('Network error. Could not load dashboard.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [navigate]);

    const statCards = [
        { label: 'Pending Review', value: loading ? '—' : String(stats.pending), icon: 'clock', color: '#F59E0B' },
        { label: 'Approved Loans', value: loading ? '—' : String(stats.active), icon: 'check', color: '#00A63E' },
        { label: 'Total This Month', value: loading ? '—' : String(stats.totalThisMonth), icon: 'trending', color: '#155DFC' },
        { label: 'Total Disbursed', value: loading ? '—' : fmt(stats.totalDisbursed), icon: 'file', color: '#0A0A0A' }
    ];

    const renderStatIcon = (type, color) => {
        if (type === 'clock') return (
            <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d={svgPaths.p14d24500} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M10 5V10L13.3333 11.6667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
        );
        if (type === 'check') return (
            <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d={svgPaths.p17cc7980} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p3fe63d80} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
        );
        if (type === 'trending') return (
            <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d={svgPaths.p3c797180} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p3ac0b600} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
        );
        if (type === 'file') return (
            <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d={svgPaths.p3713e00} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.pd2076c0} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M8.33333 7.5H6.66667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M13.3333 10.8333H6.66667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M13.3333 14.1667H6.66667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
        );
    };

    return (
        <div className="loan-admin-dashboard-page">
            <LoanAdminSidebar />

            <div className="loan-admin-dashboard-content">
                {/* Header */}
                <div className="loan-admin-dashboard-header">
                    <h1 className="loan-admin-dashboard-title">Loan Admin Dashboard</h1>
                    <p className="loan-admin-dashboard-subtitle">Review and approve loan applications</p>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: '14px' }}>Loading dashboard…</div>
                ) : (
                    <div className="loan-admin-bento-grid">
                        {/* Row 1: Stats */}
                        {statCards.map((stat, index) => (
                            <div key={index} className="loan-admin-bento-card stat-card">
                                <div className="loan-admin-dashboard-stat-header">
                                    <p className="loan-admin-dashboard-stat-label">{stat.label}</p>
                                    {renderStatIcon(stat.icon, stat.color)}
                                </div>
                                <p className="loan-admin-dashboard-stat-value" style={{ color: stat.color }}>{stat.value}</p>
                            </div>
                        ))}

                        {/* Row 2: Charts */}
                        <div className="loan-admin-bento-card bento-bar-chart">
                            <div className="loan-admin-reports-chart-header">
                                <div>
                                    <h3 className="loan-admin-reports-chart-title">Money In vs Money Out</h3>
                                    <p className="loan-admin-reports-chart-subtitle">Monthly comparison of received funds and loan disbursements</p>
                                </div>
                            </div>
                            <div className="loan-admin-reports-chart-container" style={{ marginTop: '16px' }}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                                        <YAxis stroke="#6B7280" fontSize={12} />
                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px' }} formatter={(value) => '₱' + value.toLocaleString()} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                        <Bar dataKey="received" fill="#00A63E" name="Money Received" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="disbursed" fill="#FF6467" name="Money Released" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="loan-admin-bento-card bento-side-chart">
                            <div className="loan-admin-reports-chart-header">
                                <div>
                                    <h3 className="loan-admin-reports-chart-title">Disbursements by Type</h3>
                                    <p className="loan-admin-reports-chart-subtitle">Funds allocated by loan type</p>
                                </div>
                            </div>
                            <div className="loan-admin-reports-chart-container" style={{ marginTop: '16px' }}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={disbursementByType} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis type="number" stroke="#6B7280" fontSize={12} />
                                        <YAxis dataKey="type" type="category" stroke="#6B7280" fontSize={12} width={90} />
                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px' }} formatter={(value) => '₱' + value.toLocaleString()} />
                                        <Bar dataKey="amount" fill="#155DFC" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Row 3: Recent Loans */}
                        <div className="loan-admin-bento-card bento-recent-loans">
                            <div className="loan-admin-dashboard-payments-header" style={{ marginBottom: '16px' }}>
                                <h3 className="loan-admin-dashboard-payments-title">Recent Loan Applications</h3>
                                <button className="loan-admin-dashboard-view-all" onClick={() => navigate('/loan-admin/loan-management')}>View All</button>
                            </div>
                            <div className="loan-admin-dashboard-payments-list">
                                {recentLoans.length === 0 ? (
                                    <p style={{ color: '#9CA3AF', fontSize: 14, padding: '20px 0' }}>No recent loan applications.</p>
                                ) : (
                                    recentLoans.map(loan => (
                                        <div className="loan-admin-dashboard-payment-card" key={loan._id}>
                                            <div className="loan-admin-dashboard-payment-left">
                                                <div className="loan-admin-dashboard-payment-icon">
                                                    <svg fill="none" viewBox="0 0 20 20">
                                                        <path d={svgPaths.p14d24500} stroke={loan.status === 'pending' ? '#FF6900' : '#155DFC'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                                                        <path d="M10 5V10L13.3333 11.6667" stroke={loan.status === 'pending' ? '#FF6900' : '#155DFC'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
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
                                                <p className="loan-admin-dashboard-payment-days" style={{ color: loan.status === 'pending' ? '#FF6900' : '#155DFC', fontWeight: 500 }}>
                                                    {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
