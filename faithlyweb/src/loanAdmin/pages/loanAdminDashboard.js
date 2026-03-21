import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import svgPaths from "../../imports/svg-icons";
import '../styles/loanAdminDashboard.css';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) { navigate('/'); return; }

        const fetchDashboard = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API}/api/admin/loans`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
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

                // Show recent active/pending loans as "upcoming"
                const upcoming = (data.loans || [])
                    .filter(l => l.status === 'active' || l.status === 'pending')
                    .slice(0, 5);
                setRecentLoans(upcoming);
            } catch (err) {
                toast.error('Network error. Could not load dashboard.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [navigate]);

    const statCards = [
        {
            label: 'Pending Review',
            value: loading ? '—' : String(stats.pending),
            icon: 'clock',
            color: '#F59E0B'
        },
        {
            label: 'Approved Loans',
            value: loading ? '—' : String(stats.active),
            icon: 'check',
            color: '#00A63E'
        },
        {
            label: 'Total This Month',
            value: loading ? '—' : String(stats.totalThisMonth),
            icon: 'trending',
            color: '#155DFC'
        },
        {
            label: 'Total Disbursed',
            value: loading ? '—' : fmt(stats.totalDisbursed),
            icon: 'file',
            color: '#0A0A0A'
        }
    ];

    const renderStatIcon = (type, color) => {
        if (type === 'clock') {
            return (
                <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p14d24500} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M10 5V10L13.3333 11.6667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
            );
        }
        if (type === 'check') {
            return (
                <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p17cc7980} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p3fe63d80} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
            );
        }
        if (type === 'trending') {
            return (
                <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p3c797180} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p3ac0b600} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
            );
        }
        if (type === 'file') {
            return (
                <svg className="loan-admin-dashboard-stat-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p3713e00} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.pd2076c0} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M8.33333 7.5H6.66667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M13.3333 10.8333H6.66667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M13.3333 14.1667H6.66667" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
            );
        }
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

                {/* Stats Grid */}
                <div className="loan-admin-dashboard-stats">
                    {statCards.map((stat, index) => (
                        <div key={index} className="loan-admin-dashboard-stat-card">
                            <div className="loan-admin-dashboard-stat-header">
                                <p className="loan-admin-dashboard-stat-label">{stat.label}</p>
                                {renderStatIcon(stat.icon, stat.color)}
                            </div>
                            <p
                                className="loan-admin-dashboard-stat-value"
                                style={{ color: stat.color }}
                            >
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Recent Loans Section */}
                <div className="loan-admin-dashboard-payments-section">
                    <div className="loan-admin-dashboard-payments-header">
                        <h3 className="loan-admin-dashboard-payments-title">Recent Loan Applications</h3>
                        <button className="loan-admin-dashboard-view-all" onClick={() => navigate('/loan-admin/loan-management')}>View All</button>
                    </div>

                    <div className="loan-admin-dashboard-payments-list">
                        {loading ? (
                            <p style={{ color: '#9CA3AF', fontSize: 14, padding: '20px 0' }}>Loading…</p>
                        ) : recentLoans.length === 0 ? (
                            <p style={{ color: '#9CA3AF', fontSize: 14, padding: '20px 0' }}>No recent loan applications.</p>
                        ) : (
                            recentLoans.map(loan => (
                                <div key={loan._id} className="loan-admin-dashboard-payment-card">
                                    <div className="loan-admin-dashboard-payment-left">
                                        <div className={`loan-admin-dashboard-payment-icon ${loan.status === 'pending' ? '' : ''}`}>
                                            <svg fill="none" viewBox="0 0 20 20">
                                                <path
                                                    d={svgPaths.p14d24500}
                                                    stroke={loan.status === 'pending' ? '#FF6900' : '#155DFC'}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="1.66667"
                                                />
                                                <path
                                                    d="M10 5V10L13.3333 11.6667"
                                                    stroke={loan.status === 'pending' ? '#FF6900' : '#155DFC'}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="1.66667"
                                                />
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
                                        <p className={`loan-admin-dashboard-payment-days ${loan.status === 'pending' ? '' : ''}`}>
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
