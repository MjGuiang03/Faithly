import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import SecretaryAdminSidebar from '../components/secretaryAdminSidebar';
import SecApprovedLoanDetailsModal from '../components/secApprovedLoanDetailsModal';
import SecProcessLoanModal from '../components/secProcessLoanModal';
import SecLoanReceiptModal from '../components/SecLoanReceiptModal';
import '../styles/secretaryAdminLoanProcess.css';

import API from '../../utils/api';
import { Banknote, Search } from 'lucide-react';


export default function SecretaryLoanProcess() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
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
                // Show approved loans awaiting disbursement
                const awaitingDisbursement = data.loans.filter(l => l.status === 'approved' || (l.status === 'active' && !l.disbursed));
                setLoans(awaitingDisbursement);
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

    const handleViewDetails = async (loan) => {
        // Calculate Loan History from current loans list
        const memberLoans = loans.filter(l => l.email === loan.email);
        const loanHistoryCount = memberLoans.length;

        let totalDonations = 0;
        let userChurchId = 'N/A';
        let userPosition = 'Member';
        const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            // Fetch donations for this specific member
            const donRes = await fetch(`${API}/api/admin/donations?search=${encodeURIComponent(loan.email)}`, { headers });
            if (donRes.ok) {
                const donData = await donRes.json();
                if (donData.success && donData.donations) {
                    totalDonations = donData.donations.reduce((sum, d) => sum + Number(d.amount), 0);
                }
            }
        } catch (err) {
            console.error('Failed to fetch user donations:', err);
        }

        try {
            // Fetch verification data for this member's real churchId and position
            const verRes = await fetch(`${API}/api/admin/verifications`, { headers });
            if (verRes.ok) {
                const verData = await verRes.json();
                if (verData.success && verData.verifications) {
                    const userVer = verData.verifications.find(v => v.email === loan.email && v.status === 'approved');
                    if (userVer) {
                        userChurchId = userVer.churchId || 'N/A';
                        userPosition = userVer.position || 'Member';
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch user verification:', err);
        }

        // Synthesize data for the modal
        const loanWithDetails = {
            id: loan.loanId,
            member: loan.memberName,
            email: loan.email,
            amount: loan.amount,
            purpose: loan.purpose,
            approvedDate: new Date(loan.approvedDate || loan.appliedDate).toLocaleDateString('en-US'),
            status: loan.disbursed ? 'Processed' : 'Awaiting Processing',
            churchId: userChurchId,
            position: userPosition,
            disbursementMethod: loan.disbursementMethod || 'cash',
            disbursementAccount: loan.disbursementAccount || '',
            churchActive: 'Active',
            loanHistory: loanHistoryCount,
            totalDonations: totalDonations,
            _id: loan._id
        };
        setSelectedLoan(loanWithDetails);
        setShowDetailsModal(true);
    };

    const handleViewReceipt = (loan) => {
        const loanWithReceiptInfo = {
            ...loan,
            id: loan.loanId,
            member: loan.memberName,
            // Fields fetched from backend
            paymentMethod: loan.paymentMethod,
            disbursementDate: loan.disbursementDate,
            referenceNumber: loan.referenceNumber
        };
        setSelectedLoan(loanWithReceiptInfo);
        setShowReceiptModal(true);
    };

    const handleProcessLoan = async (paymentMethod, processReason, proofData, proofFileName) => {
        if (!selectedLoan || !selectedLoan._id) return;

        try {
            const token = localStorage.getItem('secretaryToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

            const payload = { paymentMethod };
            if (paymentMethod !== selectedLoan.disbursementMethod && processReason) {
                payload.processReason = processReason;
            }
            if (proofData) {
                payload.proofData = proofData;
                payload.proofFileName = proofFileName || null;
            }

            const res = await fetch(`${API}/api/admin/loans/${selectedLoan._id}/process`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Loan disbursed successfully');
                setShowProcessModal(false);
                // Keep selectedLoan but update it with disbursement info for the receipt
                const updatedLoan = {
                    ...selectedLoan,
                    paymentMethod,
                    disbursementDate: new Date().toISOString(),
                    referenceNumber: data.referenceNumber // Assuming backend returns this
                };
                setSelectedLoan(updatedLoan);
                setShowReceiptModal(true);
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
                    <Search size={20} color="#9CA3AF" />
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
                                                    {loan.disbursed ? (
                                                        <button
                                                            className="sec-loan-process-btn-receipt"
                                                            onClick={() => handleViewReceipt(loan)}
                                                        >
                                                            <Banknote size={16} />
                                                            View Receipt
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="sec-loan-process-btn-details"
                                                            onClick={() => handleViewDetails(loan)}
                                                        >
                                                            <Banknote size={16} />
                                                            View Data
                                                        </button>
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

            {showReceiptModal && selectedLoan && (
                <SecLoanReceiptModal
                    loan={selectedLoan}
                    onClose={() => {
                        setShowReceiptModal(false);
                        setSelectedLoan(null);
                    }}
                />
            )}
        </div>
    );
}
