import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminReports.css';

import API from '../../utils/api';

export default function SecretaryLoanReports() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalReceived: 0,
        totalReleased: 0,
        totalProcessed: 0,
        processingRate: 0
    });
    
    // Using mock data for these detailed charts for now as they require complex aggregation
    // that might need a dedicated backend analytics endpoint
    const moneyFlowData = [
        { month: 'Jan', received: 950000, released: 900000 },
        { month: 'Feb', received: 800000, released: 750000 },
        { month: 'Mar', received: 1100000, released: 1050000 },
        { month: 'Apr', received: 850000, released: 800000 },
        { month: 'May', received: 1000000, released: 950000 },
        { month: 'Jun', received: 1230000, released: 1180000 }
    ];

    const [paymentMethodData, setPaymentMethodData] = useState([
        { name: 'GCash', value: 0, percentage: 0 },
        { name: 'Bank Transfer', value: 0, percentage: 0 }
    ]);

    const weeklyProcessingData = [
        { week: 'Week 1', loans: 8 },
        { week: 'Week 2', loans: 10 },
        { week: 'Week 3', loans: 13 },
        { week: 'Week 4', loans: 9 }
    ];

    const fundFlowTrendData = [
        { month: 'Jan', received: 950000, released: 900000 },
        { month: 'Feb', received: 750000, released: 720000 },
        { month: 'Mar', received: 900000, released: 850000 },
        { month: 'Apr', received: 800000, released: 750000 },
        { month: 'May', received: 950000, released: 900000 },
        { month: 'Jun', received: 1050000, released: 1000000 }
    ];

    const COLORS = ['#155DFC', '#00A63E'];

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            
            const res = await fetch(`${API}/api/admin/loans`, { headers });
            const data = await res.json();
            
            if (data.success && data.loans) {
                const disbursedLoans = data.loans.filter(l => l.disbursed);
                const approvedLoans = data.loans.filter(l => l.status === 'active' || l.disbursed);
                
                const totalReleasedAmt = disbursedLoans.reduce((sum, loan) => sum + Number(loan.amount), 0);
                
                // Processing rate = processed / total approved
                const processingRate = approvedLoans.length > 0 
                    ? Math.round((disbursedLoans.length / approvedLoans.length) * 100) 
                    : 0;

                setStats({
                    totalReceived: 0, // Mock for now until we have income data
                    totalReleased: totalReleasedAmt,
                    totalProcessed: totalReleasedAmt, // Align with released for now
                    processingRate: processingRate
                });

                // Calculate payment distribution
                const gcashAmt = disbursedLoans.filter(l => l.paymentMethod === 'gcash').reduce((sum, l) => sum + Number(l.amount), 0);
                const bankAmt = disbursedLoans.filter(l => l.paymentMethod === 'bank').reduce((sum, l) => sum + Number(l.amount), 0);
                const totalAmt = gcashAmt + bankAmt;

                setPaymentMethodData([
                    { 
                        name: 'GCash', 
                        value: gcashAmt, 
                        percentage: totalAmt > 0 ? Math.round((gcashAmt / totalAmt) * 100) : 0 
                    },
                    { 
                        name: 'Bank Transfer', 
                        value: bankAmt, 
                        percentage: totalAmt > 0 ? Math.round((bankAmt / totalAmt) * 100) : 0 
                    }
                ]);
            }
        } catch (err) {
            console.error('Failed to fetch report data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="sec-admin-reports-page">
            <SecretaryAdminSidebar />

            <div className="sec-admin-reports-content">
                {/* Header */}
                <div className="sec-admin-reports-header">
                    <h1 className="sec-admin-reports-title">Processing Reports & Analytics</h1>
                    <p className="sec-admin-reports-subtitle">Track loan disbursements and payment processing</p>
                </div>

                {/* Summary Cards */}
                <div className="sec-admin-reports-summary">
                    <div className="sec-admin-reports-summary-card green">
                        <div className="sec-admin-reports-summary-header">
                            <p className="sec-admin-reports-summary-label">Total Received</p>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 14.6667V1.33334" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M11.3333 3.99999L8 1.33333L4.66667 3.99999" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </svg>
                        </div>
                        <p className="sec-admin-reports-summary-value">₱{stats.totalReceived.toLocaleString()}</p>
                        <p className="sec-admin-reports-summary-period">Total fund inflows</p>
                    </div>

                    <div className="sec-admin-reports-summary-card red">
                        <div className="sec-admin-reports-summary-header">
                            <p className="sec-admin-reports-summary-label">Total Released</p>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 1.33334V14.6667" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M4.66667 12L8 14.6667L11.3333 12" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </svg>
                        </div>
                        <p className="sec-admin-reports-summary-value">₱{stats.totalReleased.toLocaleString()}</p>
                        <p className="sec-admin-reports-summary-period">Loan disbursements</p>
                    </div>

                    <div className="sec-admin-reports-summary-card blue">
                        <div className="sec-admin-reports-summary-header">
                            <p className="sec-admin-reports-summary-label">Total Processed</p>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M5.33333 8L7.33333 10L10.6667 6" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </svg>
                        </div>
                        <p className="sec-admin-reports-summary-value">₱{stats.totalProcessed.toLocaleString()}</p>
                        <p className="sec-admin-reports-summary-period">By secretary</p>
                    </div>

                    <div className="sec-admin-reports-summary-card purple">
                        <div className="sec-admin-reports-summary-header">
                            <p className="sec-admin-reports-summary-label">Processing Rate</p>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="6.66667" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M8 5.33333V8L10 9.33333" stroke="#7C3AED" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </svg>
                        </div>
                        <p className="sec-admin-reports-summary-value">{stats.processingRate}%</p>
                        <p className="sec-admin-reports-summary-period">All approved processed</p>
                    </div>
                </div>

                {/* Money Flow Analysis */}
                <div className="sec-admin-reports-chart-section">
                    <div className="sec-admin-reports-chart-header">
                        <h3 className="sec-admin-reports-chart-title">Money Flow Analysis</h3>
                        <p className="sec-admin-reports-chart-subtitle">Monthly breakdown of funds received and disbursed</p>
                    </div>
                    <div className="sec-admin-reports-chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={moneyFlowData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                                <YAxis stroke="#6B7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}
                                    formatter={(value) => '₱' + value.toLocaleString()}
                                />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    iconType="circle"
                                />
                                <Bar dataKey="received" fill="#00A63E" name="Money Received" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="released" fill="#FF6467" name="Money Released" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Method Distribution and Weekly Processing */}
                <div className="sec-admin-reports-chart-row">
                    {/* Payment Method Distribution */}
                    <div className="sec-admin-reports-chart-section half">
                        <div className="sec-admin-reports-chart-header">
                            <h3 className="sec-admin-reports-chart-title">Payment Method Distribution</h3>
                            <p className="sec-admin-reports-chart-subtitle">Breakdown by disbursement method</p>
                        </div>
                        <div className="sec-admin-reports-chart-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={paymentMethodData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percentage }) => `${name} ${percentage}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
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

                    {/* Weekly Processing Volume */}
                    <div className="sec-admin-reports-chart-section half">
                        <div className="sec-admin-reports-chart-header">
                            <h3 className="sec-admin-reports-chart-title">Weekly Processing Volume</h3>
                            <p className="sec-admin-reports-chart-subtitle">Number of loans processed per week</p>
                        </div>
                        <div className="sec-admin-reports-chart-container">
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={weeklyProcessingData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="week" stroke="#6B7280" fontSize={12} />
                                    <YAxis stroke="#6B7280" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px',
                                            padding: '12px'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="loans"
                                        stroke="#155DFC"
                                        strokeWidth={2}
                                        name="Loans Processed"
                                        dot={{ fill: '#155DFC', r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                            <div className="sec-admin-reports-stats-row">
                                <div className="sec-admin-reports-stat-item">
                                    <p className="sec-admin-reports-stat-item-label">Average per Week</p>
                                    <p className="sec-admin-reports-stat-item-value">11.25</p>
                                </div>
                                <div className="sec-admin-reports-stat-item">
                                    <p className="sec-admin-reports-stat-item-label">Peak Week</p>
                                    <p className="sec-admin-reports-stat-item-value blue">Week 3</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fund Flow Trends */}
                <div className="sec-admin-reports-chart-section">
                    <div className="sec-admin-reports-chart-header">
                        <h3 className="sec-admin-reports-chart-title">Fund Flow Trends</h3>
                        <p className="sec-admin-reports-chart-subtitle">Track incoming and outgoing funds over time</p>
                    </div>
                    <div className="sec-admin-reports-chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={fundFlowTrendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                                <YAxis stroke="#6B7280" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}
                                    formatter={(value) => '₱' + value.toLocaleString()}
                                />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    iconType="circle"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="received"
                                    stroke="#00A63E"
                                    strokeWidth={2}
                                    name="Money Received"
                                    dot={{ fill: '#00A63E', r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="released"
                                    stroke="#FF6467"
                                    strokeWidth={2}
                                    name="Money Released"
                                    dot={{ fill: '#FF6467', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
