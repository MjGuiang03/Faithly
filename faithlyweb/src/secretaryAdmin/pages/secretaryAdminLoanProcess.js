import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import SecApprovedLoanDetailsModal from '../components/secApprovedLoanDetailsModal';
import SecProcessLoanModal from '../components/secProcessLoanModal';
import '../styles/secretaryAdminLoanProcess.css';

import API from '../../utils/api';

export default function SecretaryLoanProcess() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [loading, setLoading] = useState(false);

    const [loans, setLoans] = useState([]);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            
            const res = await fetch(`${API}/api/admin/loans`, { headers });
            if (!res.ok) throw new Error('Failed to fetch loans');
            const data = await res.json();
            
            if (data.success && data.loans) {
                // Show only active loans for processing
                const activeLoans = data.loans.filter(l => l.status === 'active');
                setLoans(activeLoans);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch loans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    const awaitingCount = loans.filter(l => !l.disbursed).length;
    const processedCount = loans.filter(l => l.disbursed).length;

    const handleViewDetails = (loan) => {
        // Synthesize data for the modal if not present in the DB document
        const loanWithDetails = {
            id: loan.loanId,
            member: loan.memberName,
            email: loan.email,
            amount: loan.amount,
            purpose: loan.purpose,
            approvedDate: new Date(loan.approvedDate || loan.appliedDate).toLocaleDateString('en-US'),
            status: loan.disbursed ? 'Processed' : 'Awaiting Processing',
            churchId: loan.churchId || 'N/A',
            position: loan.position || 'Member',
            occupation: loan.occupation || 'N/A',
            monthlyIncome: loan.monthlyIncome || 0,
            gcashNumber: loan.gcashNumber || 'N/A',
            churchActive: 'Active',
            loanHistory: loan.loanHistory || 0,
            totalDonations: loan.totalDonations || 0,
            _id: loan._id
        };
        setSelectedLoan(loanWithDetails);
        setShowDetailsModal(true);
    };

    const handleOpenProcessModal = (loan) => {
        setSelectedLoan(loan);
        setShowProcessModal(true);
    };

    const handleProcessLoan = async (paymentMethod) => {
        if (!selectedLoan || !selectedLoan._id) return;

        try {
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

            const res = await fetch(`${API}/api/admin/loans/${selectedLoan._id}/process`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ paymentMethod })
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Loan disbursed successfully');
                setShowProcessModal(false);
                setSelectedLoan(null);
                fetchLoans(); // Refresh the list
            } else {
                toast.error(data.message || 'Failed to process loan');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to process loan');
        }
    };

    const filteredLoans = loans.filter(loan =>
        (loan.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loan.loanId || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="sec-loan-process-page">
            <SecretaryAdminSidebar />

            <div className="sec-loan-process-content">
                {/* Header */}
                <div className="sec-loan-process-header">
                    <h1 className="sec-loan-process-title">Loan Processing</h1>
                    <p className="sec-loan-process-subtitle">Process approved loans and handle disbursements</p>
                </div>

                {/* Stats Cards */}
                <div className="sec-loan-process-stats">
                    <div className="sec-loan-process-stat-card">
                        <p className="sec-loan-process-stat-label">Awaiting Processing</p>
                        <p className="sec-loan-process-stat-value orange">{awaitingCount}</p>
                    </div>
                    <div className="sec-loan-process-stat-card">
                        <p className="sec-loan-process-stat-label">Processed</p>
                        <p className="sec-loan-process-stat-value blue">{processedCount}</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="sec-loan-process-search">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M17.5 17.5L13.875 13.875" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by member name or loan ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Loans Table */}
                <div className="sec-loan-process-table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading loans...</div>
                    ) : (
                        <table className="sec-loan-process-table">
                            <thead>
                                <tr>
                                    <th>Loan ID</th>
                                    <th>Member Name</th>
                                    <th>Amount</th>
                                    <th>Purpose</th>
                                    <th>Approved Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLoans.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                                            No loans found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLoans.map(loan => (
                                        <tr key={loan._id}>
                                            <td className="sec-loan-process-table-id">{loan.loanId}</td>
                                            <td>
                                                <div className="sec-loan-process-table-member">
                                                    <p className="sec-loan-process-table-member-name">{loan.memberName}</p>
                                                    <p className="sec-loan-process-table-member-email">{loan.email}</p>
                                                </div>
                                            </td>
                                            <td className="sec-loan-process-table-amount">₱{Number(loan.amount).toLocaleString()}</td>
                                            <td>{loan.purpose}</td>
                                            <td>{new Date(loan.approvedDate || loan.appliedDate).toLocaleDateString('en-US')}</td>
                                            <td>
                                                {!loan.disbursed && (
                                                    <span className="sec-loan-process-status-badge awaiting">Awaiting Processing</span>
                                                )}
                                                {loan.disbursed && (
                                                    <div className="sec-loan-process-status-processed">
                                                        <span className="sec-loan-process-status-badge processed">Processed</span>
                                                        <p className="sec-loan-process-processed-info">
                                                            {loan.paymentMethod === 'gcash' ? 'GCash' : loan.paymentMethod === 'bank' ? 'Bank Transfer' : loan.paymentMethod} • {new Date(loan.disbursementDate).toLocaleDateString('en-US')}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="sec-loan-process-actions">
                                                    {!loan.disbursed ? (
                                                        <button
                                                            className="sec-loan-process-btn-details"
                                                            onClick={() => handleViewDetails(loan)}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                                <path d="M8 3.33333C4.66667 3.33333 1.81333 5.40667 0.666664 8C1.81333 10.5933 4.66667 12.6667 8 12.6667C11.3333 12.6667 14.1867 10.5933 15.3333 8C14.1867 5.40667 11.3333 3.33333 8 3.33333ZM8 10.6667C6.52666 10.6667 5.33333 9.47333 5.33333 8C5.33333 6.52667 6.52666 5.33333 8 5.33333C9.47333 5.33333 10.6667 6.52667 10.6667 8C10.6667 9.47333 9.47333 10.6667 8 10.6667ZM8 6.66667C7.26666 6.66667 6.66666 7.26667 6.66666 8C6.66666 8.73333 7.26666 9.33333 8 9.33333C8.73333 9.33333 9.33333 8.73333 9.33333 8C9.33333 7.26667 8.73333 6.66667 8 6.66667Z" fill="white" />
                                                            </svg>
                                                            View Data
                                                        </button>
                                                    ) : (
                                                        <div className="sec-loan-process-completed">
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#00A63E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                            <span>Completed</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showDetailsModal && selectedLoan && (
                <SecApprovedLoanDetailsModal
                    loan={selectedLoan}
                    onClose={() => setShowDetailsModal(false)}
                    onProcess={() => {
                        setShowDetailsModal(false);
                        setShowProcessModal(true);
                    }}
                />
            )}

            {showProcessModal && selectedLoan && (
                <SecProcessLoanModal
                    loan={selectedLoan}
                    onClose={() => setShowProcessModal(false)}
                    onProcess={handleProcessLoan}
                />
            )}
        </div>
    );
}
