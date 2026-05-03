import { useState, useEffect, useCallback } from 'react';
import useDebounce from '../../hooks/useDebounce';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminRecords.css';

import API from '../../utils/api';
import { Banknote, CalendarDays, Search } from 'lucide-react';


export default function SecretaryLoanRecords() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 400);
    const [activeFilter, setActiveFilter] = useState('all');

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const LIMIT = 10;

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            
            const params = new URLSearchParams();
            params.set('page', page);
            params.set('limit', LIMIT);
            params.set('disbursed', 'true');
            if (activeFilter !== 'all') params.set('method', activeFilter);
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

            const res = await fetch(`${API}/api/admin/loans?${params}`, { headers });
            const data = await res.json();
            
            if (data.success && data.loans) {
                const results = data.loans.map(l => ({
                    id: l.loanId,
                    member: l.memberName,
                    amount: `₱${Number(l.amount).toLocaleString()}`,
                    purpose: l.purpose,
                    processedDate: l.disbursementDate ? new Date(l.disbursementDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A',
                    processedTime: l.disbursementDate ? new Date(l.disbursementDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                    paymentMethod: l.paymentMethod ? (l.paymentMethod.toLowerCase() === 'e-wallet' ? 'E-Wallet' : l.paymentMethod.toLowerCase() === 'bank' ? 'Bank Transfer' : 'Cash') : 'Cash',
                    reference: l.reference || ''
                }));

                setRecords(results);
                setTotalCount(data.totalCount || 0);
            }
        } catch (err) {
            console.error('Failed to fetch records:', err);
        } finally {
            setLoading(false);
        }
    }, [page, activeFilter, debouncedSearch]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, activeFilter]);

    const totalProcessed = totalCount;
    // These need to be fetched from backend for accuracy if we want filtered counts
    // For now keep them as totalCount or similar
    const cashCount = records.filter(r => r.paymentMethod === 'Cash').length;
    const gcashCount = records.filter(r => r.paymentMethod === 'E-Wallet').length; 
    const bankTransferCount = records.filter(r => r.paymentMethod === 'Bank Transfer').length;

    const filteredRecords = records;

    return (
        <div className="sec-admin-records-page">
            <SecretaryAdminSidebar />

            <div className="sec-admin-records-content">
                {/* Header */}
                <div className="sec-admin-records-header">
                    <h1 className="sec-admin-records-title">Processing Records</h1>
                    <p className="sec-admin-records-subtitle">View all processed loan disbursements with date and time stamps</p>
                </div>

                {/* Status Cards */}
                <div className="sec-admin-records-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="sec-admin-records-stat-card">
                        <p className="sec-admin-records-stat-label">Total Processed</p>
                        <p className="sec-admin-records-stat-value blue">{totalProcessed}</p>
                    </div>
                    <div className="sec-admin-records-stat-card">
                        <p className="sec-admin-records-stat-label">Cash Payments</p>
                        <p className="sec-admin-records-stat-value" style={{ color: '#F59E0B' }}>{cashCount}</p>
                    </div>
                    <div className="sec-admin-records-stat-card">
                        <p className="sec-admin-records-stat-label">E-Wallet Transfers</p>
                        <p className="sec-admin-records-stat-value blue">{gcashCount}</p>
                    </div>
                    <div className="sec-admin-records-stat-card">
                        <p className="sec-admin-records-stat-label">Bank Transfers</p>
                        <p className="sec-admin-records-stat-value green">{bankTransferCount}</p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="sec-admin-records-toolbar">
                    <div className="sec-admin-records-search">
                        <Search size={20} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder="Search by loan ID or member name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="sec-admin-records-filters">
                        <button
                            className={`sec-admin-records-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`sec-admin-records-filter-btn ${activeFilter === 'cash' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('cash')}
                        >
                            Cash
                        </button>
                        <button
                            className={`sec-admin-records-filter-btn ${activeFilter === 'e-wallet' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('e-wallet')}
                        >
                            E-Wallet
                        </button>
                        <button
                            className={`sec-admin-records-filter-btn ${activeFilter === 'bank' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('bank')}
                        >
                            Bank Transfer
                        </button>
                    </div>
                </div>

                {/* Records Table */}
                <div className="sec-admin-records-table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading records...</div>
                    ) : (
                        <table className="sec-admin-records-table">
                            <thead>
                                <tr>
                                    <th>Loan ID</th>
                                    <th>Member</th>
                                    <th>Amount</th>
                                    <th>Purpose</th>
                                    <th>Processed Date & Time</th>
                                    <th>Payment Method</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                                            No records found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map(record => (
                                        <tr key={record.id}>
                                            <td className="sec-admin-records-table-id">{record.id}</td>
                                            <td className="sec-admin-records-table-member">{record.member}</td>
                                            <td className="sec-admin-records-table-amount">{record.amount}</td>
                                            <td>{record.purpose}</td>
                                            <td>
                                                <div className="sec-admin-records-table-datetime">
                                                    <div className="sec-admin-records-date">
                                                        <CalendarDays size={14} color="#6B7280" />
                                                        {record.processedDate}
                                                    </div>
                                                    <div className="sec-admin-records-time">
                                                        <CalendarDays size={14} color="#6B7280" />
                                                        {record.processedTime}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {record.paymentMethod === 'Cash' && (
                                                    <div className="sec-admin-records-payment cash" style={{ color: '#F59E0B' }}>
                                                        <Banknote size={16} color="#F59E0B" />
                                                        <span>Cash</span>
                                                    </div>
                                                )}
                                                {record.paymentMethod === 'E-Wallet' && (
                                                    <div className="sec-admin-records-payment gcash">
                                                        <Banknote size={16} color="#155DFC" />
                                                        <span>E-Wallet</span>
                                                        {record.reference && <span className="sec-admin-records-reference">{record.reference}</span>}
                                                    </div>
                                                )}
                                                {record.paymentMethod === 'Bank Transfer' && (
                                                    <div className="sec-admin-records-payment bank">
                                                        <Banknote size={16} color="#00A63E" />
                                                        <span>Bank Transfer</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalCount > LIMIT && (
                    <div className="sec-admin-records-pagination">
                        <p className="sec-admin-records-pagination-info">
                            Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, totalCount)} of {totalCount} results
                        </p>
                        <div className="sec-admin-records-pagination-controls">
                            <button 
                                className="sec-admin-records-pagination-btn" 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </button>
                            {Array.from({ length: Math.ceil(totalCount / LIMIT) }, (_, i) => (
                                <button
                                    key={i + 1}
                                    className={`sec-admin-records-pagination-btn ${page === i + 1 ? 'active' : ''}`}
                                    onClick={() => setPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button 
                                className="sec-admin-records-pagination-btn" 
                                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / LIMIT), p + 1))}
                                disabled={page === Math.ceil(totalCount / LIMIT)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
