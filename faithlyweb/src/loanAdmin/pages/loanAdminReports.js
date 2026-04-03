import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoanAdminSidebar from './loanAdminSidebar';
import API from '../../utils/api';
import '../styles/loanAdminReports.css';
import { Banknote } from 'lucide-react';

const fmt = (n) =>
    n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtShort = (n) => {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
    return `₱${n.toLocaleString()}`;
};

export default function LoanAdminReports() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
    const [summary, setSummary] = useState({ totalReceived: 0, totalReleased: 0, totalInterest: 0 });
    const [monthlyData, setMonthlyData] = useState([]);
    const [byType, setByType] = useState([]);
    const [disbursementByType, setDisbursementByType] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/api/admin/loan-reports?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setSummary(data.summary || { totalReceived: 0, totalReleased: 0, totalInterest: 0 });
                setMonthlyData(data.monthlyData || []);
                setByType(data.byType || []);
                setDisbursementByType(data.disbursementByType || []);
                if (data.availableYears?.length) setAvailableYears(data.availableYears);
            }
        } catch (err) {
            console.error('Failed to fetch loan reports:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    return (
        <div className="loan-admin-reports-page">
            <LoanAdminSidebar />

            <div className="loan-admin-reports-content">
                {/* Header */}
                <div className="loan-admin-reports-header">
                    <h1 className="loan-admin-reports-title">Financial Reports & Analytics</h1>
                    <div className="loan-admin-reports-year-selector">
                        <label htmlFor="year-select">Year:</label>
                        <select
                            id="year-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: '14px' }}>
                        Loading reports…
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="loan-admin-reports-summary">
                            <div className="loan-admin-reports-summary-card green">
                                <div className="loan-admin-reports-summary-header">
                                    <p className="loan-admin-reports-summary-label">Total Money Received</p>
                                    <Banknote size={20} />
                                </div>
                                <p className="loan-admin-reports-summary-value">{fmtShort(summary.totalReceived)}</p>
                                <p className="loan-admin-reports-summary-period">{selectedYear}</p>
                            </div>

                            <div className="loan-admin-reports-summary-card red">
                                <div className="loan-admin-reports-summary-header">
                                    <p className="loan-admin-reports-summary-label">Total Money Released</p>
                                    <Banknote size={20} />
                                </div>
                                <p className="loan-admin-reports-summary-value">{fmtShort(summary.totalReleased)}</p>
                                <p className="loan-admin-reports-summary-period">Loan disbursements</p>
                            </div>

                            <div className="loan-admin-reports-summary-card blue">
                                <div className="loan-admin-reports-summary-header">
                                    <p className="loan-admin-reports-summary-label">Total Interest</p>
                                    <Banknote size={20} />
                                </div>
                                <p className="loan-admin-reports-summary-value">{fmtShort(summary.totalInterest)}</p>
                                <p className="loan-admin-reports-summary-period">Interest earned</p>
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
                                    <BarChart data={monthlyData}>
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

                        {/* Loan Disbursements by Type */}
                        <div className="loan-admin-reports-chart-section">
                            <div className="loan-admin-reports-chart-header">
                                <div>
                                    <h3 className="loan-admin-reports-chart-title">Loan Disbursements by Type</h3>
                                    <p className="loan-admin-reports-chart-subtitle">Breakdown of loan funds allocated by loan type</p>
                                </div>
                            </div>
                            <div className="loan-admin-reports-chart-container">
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={disbursementByType} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis type="number" stroke="#6B7280" fontSize={12} />
                                        <YAxis dataKey="type" type="category" stroke="#6B7280" fontSize={12} width={120} />
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
                                            <th>Loan Type</th>
                                            <th>Number of Loans</th>
                                            <th>Total Amount</th>
                                            <th>Average</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byType.map((row, index) => (
                                            <tr key={index}>
                                                <td className="loan-admin-reports-table-purpose">{row.label}</td>
                                                <td>{row.count} loans</td>
                                                <td className="loan-admin-reports-table-amount">{fmt(row.amount)}</td>
                                                <td>{fmt(row.average)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
