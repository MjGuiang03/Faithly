import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminLoanManagement.css';
import svgPaths from "../../imports/svg-icons";

const API = process.env.REACT_APP_API_URL;

export default function AdminLoanManagement() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    completed: 0,
    totalDisbursed: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/admin/login');
      return;
    }
    fetchLoans();
  }, [navigate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchLoans();
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      setLoans([
        {
          _id: '1',
          loanId: 'LN-2026-001',
          memberName: 'Juan Dela Cruz',
          email: 'juan@example.com',
          amount: 10000,
          purpose: 'Medical Emergency',
          status: 'pending',
          appliedDate: '2026-02-20'
        },
        {
          _id: '2',
          loanId: 'LN-2026-002',
          memberName: 'Maria Santos',
          email: 'maria@example.com',
          amount: 15000,
          purpose: 'Education',
          status: 'active',
          appliedDate: '2026-02-18'
        },
        {
          _id: '3',
          loanId: 'LN-2026-003',
          memberName: 'Pedro Garcia',
          email: 'pedro@example.com',
          amount: 8000,
          purpose: 'Business Capital',
          status: 'completed',
          appliedDate: '2026-02-15'
        },
        {
          _id: '4',
          loanId: 'LN-2026-004',
          memberName: 'Ana Reyes',
          email: 'ana@example.com',
          amount: 12000,
          purpose: 'Home Repair',
          status: 'pending',
          appliedDate: '2026-02-22'
        },
        {
          _id: '5',
          loanId: 'LN-2026-005',
          memberName: 'Carlos Torres',
          email: 'carlos@example.com',
          amount: 20000,
          purpose: 'Medical Emergency',
          status: 'active',
          appliedDate: '2026-02-10'
        }
      ]);

      setStats({
        pending: 2,
        active: 2,
        completed: 1,
        totalDisbursed: 50000
      });
    } catch (err) {
      toast.error('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (loanId) => {
    try {
      toast.success('Loan approved successfully');
      fetchLoans();
    } catch (err) {
      toast.error('Failed to approve loan');
    }
  };

  const handleReject = async (loanId) => {
    try {
      toast.success('Loan rejected');
      fetchLoans();
    } catch (err) {
      toast.error('Failed to reject loan');
    }
  };

  const formatCurrency = (amount) => `₱${Number(amount).toLocaleString()}`;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric', day: 'numeric', year: 'numeric'
    });
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          loan.loanId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-loan-main">
      {/* Header */}
      <div className="admin-loan-header">
        <h1 className="admin-loan-title">Loan Management</h1>
        <p className="admin-loan-subtitle">Review and manage loan applications</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-loan-stats-grid">
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Pending Review</p>
          <p className="admin-loan-stat-value">{stats.pending}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Active Loans</p>
          <p className="admin-loan-stat-value">{stats.active}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Completed</p>
          <p className="admin-loan-stat-value">{stats.completed}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Total Disbursed</p>
          <p className="admin-loan-stat-value">{formatCurrency(stats.totalDisbursed)}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="admin-loan-search-section">
        <div className="admin-loan-search-container">
          <div className="admin-loan-search-wrapper">
            <div className="admin-loan-search-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.5 17.5L13.875 13.875" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by member name or loan ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-loan-search-input"
            />
          </div>
          <div className="admin-loan-filter">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-loan-filter-button"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="admin-loan-table-section">
        <table className="admin-loan-table">
          <thead>
            <tr className="admin-loan-table-header">
              <th className="admin-loan-table-header-cell">Loan ID</th>
              <th className="admin-loan-table-header-cell">Member</th>
              <th className="admin-loan-table-header-cell">Amount</th>
              <th className="admin-loan-table-header-cell">Purpose</th>
              <th className="admin-loan-table-header-cell">Status</th>
              <th className="admin-loan-table-header-cell">Applied Date</th>
              <th className="admin-loan-table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-loan-table-cell" style={{ textAlign: 'center', color: '#6a7282' }}>
                  Loading loans...
                </td>
              </tr>
            ) : filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-loan-table-cell" style={{ textAlign: 'center', color: '#6a7282' }}>
                  No loans found
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => (
                <tr key={loan._id} className="admin-loan-table-row">
                  <td className="admin-loan-table-cell">{loan.loanId}</td>
                  <td className="admin-loan-table-cell">
                    <div className="admin-loan-member-info">
                      <span className="admin-loan-member-name">{loan.memberName}</span>
                      <span className="admin-loan-member-email">{loan.email}</span>
                    </div>
                  </td>
                  <td className="admin-loan-table-cell">
                    <span className="admin-loan-amount">{formatCurrency(loan.amount)}</span>
                  </td>
                  <td className="admin-loan-table-cell">
                    <span className="admin-loan-purpose">{loan.purpose}</span>
                  </td>
                  <td className="admin-loan-table-cell">
                    <span className={`admin-loan-status-badge admin-loan-status-${loan.status}`}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </td>
                  <td className="admin-loan-table-cell">
                    <span className="admin-loan-date">{formatDate(loan.appliedDate)}</span>
                  </td>
                  <td className="admin-loan-table-cell">
                    <div className="admin-loan-actions">
                      <button className="admin-loan-action-btn" title="View details">
                        <div className="admin-loan-action-icon">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M0.666667 8C0.666667 8 3.33333 2.66667 8 2.66667C12.6667 2.66667 15.3333 8 15.3333 8C15.3333 8 12.6667 13.3333 8 13.3333C3.33333 13.3333 0.666667 8 0.666667 8Z" stroke="#4A5565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="#4A5565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>
                      {loan.status === 'pending' && (
                        <>
                          <button
                            className="admin-loan-action-btn"
                            title="Approve"
                            onClick={() => handleApprove(loan._id)}
                          >
                            <div className="admin-loan-action-icon">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#00A63E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </button>
                          <button
                            className="admin-loan-action-btn"
                            title="Reject"
                            onClick={() => handleReject(loan._id)}
                          >
                            <div className="admin-loan-action-icon">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M12 4L4 12" stroke="#E7000B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M4 4L12 12" stroke="#E7000B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}