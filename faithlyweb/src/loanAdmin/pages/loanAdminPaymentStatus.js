import { useState, useEffect, useCallback } from 'react';
import LoanAdminSidebar from './loanAdminSidebar';
import '../styles/loanAdminLoanManagement.css';
import '../styles/loanAdminPaymentStatus.css';
import API from '../../utils/api';

const fmt = (n) => n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';
const fmtDate = (d) => { if (!d) return 'N/A'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

function getDaysLate(dueDate) {
  if (!dueDate) return 0;
  const now = new Date(); const due = new Date(dueDate);
  const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getPaymentStatus(daysLate) {
  if (daysLate === 0) return { label: 'On Track', cls: 'on-track' };
  if (daysLate <= 7) return { label: 'Reminder', cls: 'reminder' };
  if (daysLate <= 30) return { label: 'Delinquent', cls: 'delinquent' };
  if (daysLate <= 60) return { label: 'High Risk', cls: 'high-risk' };
  return { label: 'Default', cls: 'default' };
}

export default function LoanAdminPaymentStatus() {
  const [loans, setLoans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/loans`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setLoans((data.loans || []).filter(l => l.status === 'active'));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const enriched = loans.map(l => {
    const daysLate = getDaysLate(l.nextDueDate || l.approvedDate);
    const status = getPaymentStatus(daysLate);
    return { ...l, daysLate, paymentStatus: status };
  });

  const filtered = enriched.filter(l =>
    (l.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.loanId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const counts = {
    onTrack: enriched.filter(l => l.paymentStatus.cls === 'on-track').length,
    overdue: enriched.filter(l => ['reminder', 'delinquent'].includes(l.paymentStatus.cls)).length,
    highRisk: enriched.filter(l => l.paymentStatus.cls === 'high-risk').length,
    defaulted: enriched.filter(l => l.paymentStatus.cls === 'default').length,
  };

  return (
    <div className="loan-admin-mgmt-page">
      <LoanAdminSidebar />
      <div className="loan-admin-mgmt-content">
        <div className="loan-admin-mgmt-header">
          <h1 className="loan-admin-mgmt-title">Payment Status</h1>
        </div>

        <div className="loan-admin-mgmt-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">On Track</p>
            <p className="loan-admin-mgmt-stat-value approved">{counts.onTrack}</p>
          </div>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">Overdue (1-30d)</p>
            <p className="loan-admin-mgmt-stat-value pending">{counts.overdue}</p>
          </div>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">High Risk (31-60d)</p>
            <p className="loan-admin-mgmt-stat-value" style={{ color: '#EA580C' }}>{counts.highRisk}</p>
          </div>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">Default (60+d)</p>
            <p className="loan-admin-mgmt-stat-value rejected">{counts.defaulted}</p>
          </div>
        </div>

        <div className="loan-admin-mgmt-search">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17.5 17.5L13.875 13.875" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input type="text" placeholder="Search by member name or loan ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="loan-admin-mgmt-table-container">
          <table className="loan-admin-mgmt-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Days Late</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No active loans found</td></tr>
              ) : (
                filtered.map(loan => (
                  <tr key={loan._id}>
                    <td className="loan-admin-mgmt-table-id">{loan.loanId}</td>
                    <td>
                      <div className="loan-admin-mgmt-table-member">
                        <p className="loan-admin-mgmt-table-member-name">{loan.memberName}</p>
                        <p className="loan-admin-mgmt-table-member-email">{loan.email}</p>
                      </div>
                    </td>
                    <td className="loan-admin-mgmt-table-amount">{fmt(loan.amount)}</td>
                    <td>{fmtDate(loan.nextDueDate || loan.approvedDate)}</td>
                    <td style={{ fontWeight: 600, color: loan.daysLate > 0 ? '#DC2626' : '#16A34A' }}>
                      {loan.daysLate > 0 ? `${loan.daysLate} days` : '—'}
                    </td>
                    <td>
                      <span className={`ps-status-badge ${loan.paymentStatus.cls}`}>{loan.paymentStatus.label}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="loan-admin-mgmt-pagination">
          <p className="loan-admin-mgmt-pagination-info">Showing {filtered.length} active loans</p>
        </div>
      </div>
    </div>
  );
}
