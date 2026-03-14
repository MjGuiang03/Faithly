import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminDashboard.css';

import API from '../../utils/api';

const fmt = (n) => n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';

export default function SecretaryAdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ awaiting: 0, today: 0, month: 0, disbursed: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLoans = async () => {
            try {
                const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
                
                // Use the existing admin loans endpoint for simplicity. In production there'd be logic limiting what Secretary sees vs main admin.
                const res = await fetch(`${API}/api/admin/loans`, { headers });
                if (!res.ok) throw new Error('Failed to fetch loans');
                const data = await res.json();
                
                if (data.success && data.loans) {
                    const activeLoans = data.loans.filter(l => l.status === 'active');
                    
                    const awaitingCount = activeLoans.filter(l => !l.disbursed).length;
                    
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
                            
                            if (disbDate.toLocaleDateString('en-US') === todayStr) {
                                processedToday++;
                            }
                            if (disbDate >= monthStart) {
                                processedMonth++;
                            }
                        }
                    });

                    setStats({
                        awaiting: awaitingCount,
                        today: processedToday,
                        month: processedMonth,
                        disbursed: totalDisbursedAmount
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLoans();
    }, []);

    const statsCards = [
        {
            id: 'awaiting',
            label: 'Awaiting Processing',
            value: stats.awaiting.toString(),
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 5V10L13.3333 11.6667" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            color: 'orange'
        },
        {
            id: 'today',
            label: 'Processed Today',
            value: stats.today.toString(),
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6.66667 10L8.88889 12.2222L13.3333 7.77778" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            color: 'blue'
        },
        {
            id: 'month',
            label: 'This Month',
            value: stats.month.toString(),
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3333L3.33333 11.6667L10 5L16.6667 11.6667L10 18.3333Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 7.5V11.6667" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7.5 10L10 7.5L12.5 10" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            color: 'blue'
        },
        {
            id: 'disbursed',
            label: 'Total Disbursed',
            value: fmt(stats.disbursed),
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#00A63E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 5V10" stroke="#00A63E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 13.3333H10.0083" stroke="#00A63E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            color: 'green'
        }
    ];

    const quickActions = [
        {
            id: 'process',
            title: 'Process Pending Loans',
            description: '3 loans awaiting processing',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 6V12L16 14" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            color: 'orange',
            link: '/secretary-admin/loan-processing'
        },
        {
            id: 'notifications',
            title: 'View Notifications',
            description: 'Check approved loans',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 12L10.6667 14.6667L16 9.33333" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            color: 'blue',
            link: '/secretary-admin/notifications'
        }
    ];

    return (
        <div className="sec-admin-dashboard-page">
            <SecretaryAdminSidebar />

            <div className="sec-admin-dashboard-content">
                {/* Header */}
                <div className="sec-admin-dashboard-header">
                    <h1 className="sec-admin-dashboard-title">Secretary Dashboard</h1>
                    <p className="sec-admin-dashboard-subtitle">Process approved loans and handle disbursements</p>
                </div>

                {/* Stats Cards */}
                {loading ? (
                    <div className="sec-admin-dashboard-loading" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        Loading dashboard metrics...
                    </div>
                ) : (
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
                )}

                {/* Quick Actions */}
                <div className="sec-admin-dashboard-quick-actions">
                    <h2 className="sec-admin-dashboard-section-title">Quick Actions</h2>

                    <div className="sec-admin-dashboard-actions-grid">
                        {quickActions.map(action => (
                            <div key={action.id} className={`sec-admin-dashboard-action-card ${action.color}`} onClick={() => navigate(action.link)} style={{cursor: 'pointer'}}>
                                <div className="sec-admin-dashboard-action-icon">{action.icon}</div>
                                <div className="sec-admin-dashboard-action-content">
                                    <h3 className="sec-admin-dashboard-action-title">{action.title}</h3>
                                    <p className="sec-admin-dashboard-action-desc">{action.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
