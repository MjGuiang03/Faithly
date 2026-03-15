import { useState, useEffect, useCallback } from 'react';
import useDebounce from '../../hooks/useDebounce';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import '../styles/secretaryAdminRecords.css';

import API from '../../utils/api';

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
                    processedDate: new Date(l.disbursementDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    processedTime: new Date(l.disbursementDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    paymentMethod: l.paymentMethod === 'gcash' ? 'GCash' : l.paymentMethod === 'bank' ? 'Bank Transfer' : l.paymentMethod,
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
    const gcashCount = records.filter(r => r.paymentMethod === 'GCash').length; 
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
                <div className="sec-admin-records-stats">
                    <div className="sec-admin-records-stat-card">
                        <p className="sec-admin-records-stat-label">Total Processed</p>
                        <p className="sec-admin-records-stat-value blue">{totalProcessed}</p>
                    </div>
                    <div className="sec-admin-records-stat-card">
                        <p className="sec-admin-records-stat-label">GCash Transfers</p>
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
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17.5 17.5L13.875 13.875" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                            className={`sec-admin-records-filter-btn ${activeFilter === 'gcash' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('gcash')}
                        >
                            GCash
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
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                            <path d="M11.0833 2.33333H2.91667C2.27233 2.33333 1.75 2.85566 1.75 3.5V11.6667C1.75 12.311 2.27233 12.8333 2.91667 12.8333H11.0833C11.7277 12.8333 12.25 12.311 12.25 11.6667V3.5C12.25 2.85566 11.7277 2.33333 11.0833 2.33333Z" stroke="#6B7280" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M9.33333 1.16667V3.5" stroke="#6B7280" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M4.66667 1.16667V3.5" stroke="#6B7280" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M1.75 5.83333H12.25" stroke="#6B7280" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        {record.processedDate}
                                                    </div>
                                                    <div className="sec-admin-records-time">
                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                            <path d="M7 12.8333C10.2217 12.8333 12.8333 10.2217 12.8333 7C12.8333 3.77834 10.2217 1.16667 7 1.16667C3.77834 1.16667 1.16667 3.77834 1.16667 7C1.16667 10.2217 3.77834 12.8333 7 12.8333Z" stroke="#6B7280" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M7 3.5V7L9.33333 8.16667" stroke="#6B7280" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        {record.processedTime}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {record.paymentMethod === 'GCash' && (
                                                    <div className="sec-admin-records-payment gcash">
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                            <rect x="2" y="3" width="12" height="10" rx="2" stroke="#155DFC" strokeWidth="1.5" />
                                                            <path d="M2 6H14" stroke="#155DFC" strokeWidth="1.5" />
                                                        </svg>
                                                        <span>GCash</span>
                                                        {record.reference && <span className="sec-admin-records-reference">{record.reference}</span>}
                                                    </div>
                                                )}
                                                {record.paymentMethod === 'Bank Transfer' && (
                                                    <div className="sec-admin-records-payment bank">
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                            <path d="M2.66667 6L8 2L13.3333 6V13.3333C13.3333 13.687 13.1929 14.0261 12.9428 14.2761C12.6928 14.5262 12.3536 14.6667 12 14.6667H4C3.64638 14.6667 3.30724 14.5262 3.05719 14.2761C2.80714 14.0261 2.66667 13.687 2.66667 13.3333V6Z" stroke="#00A63E" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M6 14.6667V8H10V14.6667" stroke="#00A63E" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
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
