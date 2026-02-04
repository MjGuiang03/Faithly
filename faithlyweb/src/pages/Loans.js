import { useNavigate } from 'react-router';
import Sidebar from '../components/Sidebar';
import '../styles/Loans.css';

export default function Loans() {
  const navigate = useNavigate();

  const loans = [
    {
      id: 'LN-2026-001',
      status: 'Active',
      purpose: 'Education',
      appliedDate: '6/15/2025',
      amount: '₱10,000',
      monthlyPayment: '₱450',
      remainingBalance: '₱5,400',
      nextPayment: '2/1/2026'
    },
    {
      id: 'LN-2025-089',
      status: 'Active',
      purpose: 'Medical',
      appliedDate: '12/10/2024',
      amount: '₱5,000',
      monthlyPayment: '₱325',
      remainingBalance: '₱1,625',
      nextPayment: '2/15/2026'
    }
  ];

  return (
    <div className="home-layout">
      {/* Reusable Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="loans-header">
          <div className="loans-header-content">
            <div>
              <h1 className="page-title">My Loans</h1>
              <p className="page-subtitle">
                Manage your loan applications and payments
              </p>
            </div>

            <button
              className="apply-loan-btn"
              onClick={() => navigate('/loans/apply')}
            >
              + Apply for Loan
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="loans-stats">
          <div className="loan-stat-card">
            <p className="loan-stat-label">Total Borrowed</p>
            <p className="loan-stat-value">₱0</p>
          </div>

          <div className="loan-stat-card">
            <p className="loan-stat-label">Remaining Balance</p>
            <p className="loan-stat-value">₱0</p>
          </div>

          <div className="loan-stat-card loan-stat-card-active">
            <p className="loan-stat-label">Active Loans</p>
            <p className="loan-stat-value">{loans.length}</p>
          </div>
        </div>

        {/* All Loans */}
        <div className="all-loans-section">
          <div className="all-loans-header">
            <h2 className="section-title">All Loans</h2>
          </div>

          <div className="loans-list">
            {loans.map((loan) => (
              <div key={loan.id} className="loan-item">
                {/* Loan Header */}
                <div className="loan-item-header">
                  <div className="loan-item-main">
                    <div className="loan-item-info">
                      <div className="loan-item-title-row">
                        <h3 className="loan-id">{loan.id}</h3>
                        <span className="loan-status-badge">
                          {loan.status}
                        </span>
                      </div>
                      <p className="loan-purpose">{loan.purpose}</p>
                      <p className="loan-applied">
                        Applied: {loan.appliedDate}
                      </p>
                    </div>
                  </div>

                  <div className="loan-item-amount">
                    <p className="loan-amount">{loan.amount}</p>
                    <button
                      className="view-details-btn"
                      onClick={() => navigate(`/loans/${loan.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* Loan Details */}
                <div className="loan-item-details">
                  <div className="loan-detail">
                    <p className="loan-detail-label">Monthly Payment</p>
                    <p className="loan-detail-value">
                      {loan.monthlyPayment}
                    </p>
                  </div>

                  <div className="loan-detail">
                    <p className="loan-detail-label">Remaining Balance</p>
                    <p className="loan-detail-value">
                      {loan.remainingBalance}
                    </p>
                  </div>

                  <div className="loan-detail">
                    <p className="loan-detail-label">Next Payment</p>
                    <p className="loan-detail-value">{loan.nextPayment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
