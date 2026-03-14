import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoanAdminSidebar from './loanAdminSidebar';
import svgPaths from "../../imports/svg-icons";
import '../styles/loanAdminReports.css';

export default function LoanAdminReports() {
    const [selectedPeriod, setSelectedPeriod] = useState('monthly');

    const moneyFlowData = [
        { month: 'Jan', received: 950000, disbursed: 850000 },
        { month: 'Feb', received: 1100000, disbursed: 1050000 },
        { month: 'Mar', received: 1350000, disbursed: 1250000 },
        { month: 'Apr', received: 1200000, disbursed: 1100000 },
        { month: 'May', received: 1400000, disbursed: 1300000 },
        { month: 'Jun', received: 1550000, disbursed: 1450000 }
    ];

    const fundFlowTrendData = [
        { month: 'Jan', received: 950000, disbursed: 900000 },
        { month: 'Feb', received: 1100000, disbursed: 1050000 },
        { month: 'Mar', received: 1350000, disbursed: 1300000 },
        { month: 'Apr', received: 1200000, disbursed: 1150000 },
        { month: 'May', received: 1400000, disbursed: 1350000 },
        { month: 'Jun', received: 1550000, disbursed: 1500000 }
    ];

    const loansByPurposeData = [
        { purpose: 'Education', count: 15, amount: 450000, average: 30000 },
        { purpose: 'Medical', count: 12, amount: 380000, average: 31666.67 },
        { purpose: 'Business', count: 8, amount: 720000, average: 90000 },
        { purpose: 'Home', count: 10, amount: 290000, average: 29000 }
    ];

    const disbursementData = [
        { purpose: 'Education', amount: 450000 },
        { purpose: 'Medical', amount: 380000 },
        { purpose: 'Business', amount: 720000 },
        { purpose: 'Home', amount: 290000 }
    ];

    return (
        <div className="loan-admin-reports-page">
            <LoanAdminSidebar />

            <div className="loan-admin-reports-content">
                {/* Header */}
                <div className="loan-admin-reports-header">
                    <h1 className="loan-admin-reports-title">Financial Reports & Analytics</h1>
                    <p className="loan-admin-reports-subtitle">Track church funds, donations, and loan disbursements</p>
                </div>

                {/* Summary Cards */}
                <div className="loan-admin-reports-summary">
                    <div className="loan-admin-reports-summary-card green">
                        <div className="loan-admin-reports-summary-header">
                            <p className="loan-admin-reports-summary-label">Total Money Received</p>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 14.6667V1.33334" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M11.3333 3.99999L8 1.33333L4.66667 3.99999" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </svg>
                        </div>
                        <p className="loan-admin-reports-summary-value">₱3930.0M</p>
                        <p className="loan-admin-reports-summary-period">Jan - Jun 2026</p>
                    </div>

                    <div className="loan-admin-reports-summary-card red">
                        <div className="loan-admin-reports-summary-header">
                            <p className="loan-admin-reports-summary-label">Total Money Released</p>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 1.33334V14.6667" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M4.66667 12L8 14.6667L11.3333 12" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </svg>
                        </div>
                        <p className="loan-admin-reports-summary-value">₱1335.0M</p>
                        <p className="loan-admin-reports-summary-period">Loan disbursements</p>
                    </div>

                    <div className="loan-admin-reports-summary-card blue">
                        <div className="loan-admin-reports-summary-header">
                            <p className="loan-admin-reports-summary-label">Net Balance</p>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 14.6667V1.33334" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                                <path d="M11.3333 3.99999L8 1.33333L4.66667 3.99999" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                            </svg>
                        </div>
                        <p className="loan-admin-reports-summary-value">₱2595.0M</p>
                        <p className="loan-admin-reports-summary-period">Current period</p>
                    </div>
                </div>

                {/* Money In vs Money Out Chart */}
                <div className="loan-admin-reports-chart-section">
                    <div className="loan-admin-reports-chart-header">
                        <div>
                            <h3 className="loan-admin-reports-chart-title">Money In vs Money Out</h3>
                            <p className="loan-admin-reports-chart-subtitle">Monthly comparison of received funds and loan disbursements</p>
                        </div>
                    </div>
                    <div className="loan-admin-reports-chart-container">
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
                                <Bar dataKey="disbursed" fill="#FF6467" name="Money Released" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fund Flow Trends Chart */}
                <div className="loan-admin-reports-chart-section">
                    <div className="loan-admin-reports-chart-header">
                        <div>
                            <h3 className="loan-admin-reports-chart-title">Fund Flow Trends</h3>
                            <p className="loan-admin-reports-chart-subtitle">Track trends in church funds over time</p>
                        </div>
                    </div>
                    <div className="loan-admin-reports-chart-container">
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
                                    dataKey="disbursed"
                                    stroke="#FF6467"
                                    strokeWidth={2}
                                    name="Money Released"
                                    dot={{ fill: '#FF6467', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Loan Disbursements by Purpose */}
                <div className="loan-admin-reports-chart-section">
                    <div className="loan-admin-reports-chart-header">
                        <div>
                            <h3 className="loan-admin-reports-chart-title">Loan Disbursements by Purpose</h3>
                            <p className="loan-admin-reports-chart-subtitle">Breakdown of where loan funds are allocated</p>
                        </div>
                    </div>
                    <div className="loan-admin-reports-chart-container">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={disbursementData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis type="number" stroke="#6B7280" fontSize={12} />
                                <YAxis dataKey="purpose" type="category" stroke="#6B7280" fontSize={12} width={80} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}
                                    formatter={(value) => '₱' + value.toLocaleString()}
                                />
                                <Bar dataKey="amount" fill="#155DFC" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Data Table */}
                    <div className="loan-admin-reports-table-container">
                        <table className="loan-admin-reports-table">
                            <thead>
                                <tr>
                                    <th>Purpose</th>
                                    <th>Number of Loans</th>
                                    <th>Total Amount</th>
                                    <th>Average</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loansByPurposeData.map((row, index) => (
                                    <tr key={index}>
                                        <td className="loan-admin-reports-table-purpose">{row.purpose}</td>
                                        <td>{row.count} loans</td>
                                        <td className="loan-admin-reports-table-amount">₱{row.amount.toLocaleString()}</td>
                                        <td>₱{row.average.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
