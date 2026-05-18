import { useState, useEffect } from 'react';
import useSWR from 'swr';
import LoanAdminSidebar from './loanAdminSidebar';
import '../styles/loanAdminLoanManagement.css';
import '../styles/loanAdminDelinquency.css';
import API from '../../utils/api';
import { Search } from 'lucide-react';


const fmt = (n) => n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

function getDaysLate(dueDate) {
  if (!dueDate) return 0;
  const diff = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getDelinquencyInfo(daysLate) {
  if (daysLate <= 7) return { status: 'Reminder', action: 'Notification sent', cls: 'reminder', flag: null };
  if (daysLate <= 30) return { status: 'Delinquent', action: 'Penalty applied', cls: 'delinquent', flag: 'Penalty Applied' };
  if (daysLate <= 60) return { status: 'High Risk', action: 'Loan privileges suspended', cls: 'high-risk', flag: 'Suspended' };
  return { status: 'Default', action: 'Account for collection', cls: 'default', flag: 'For Collection' };
}

const POLICY_TABLE = [
  { range: '1 – 7 days', status: 'Reminder', action: 'Notification sent' },
  { range: '8 – 30 days', status: 'Delinquent', action: 'Penalty applied' },
  { range: '31 – 60 days', status: 'High Risk', action: 'Loan privileges suspended' },
  { range: '60+ days', status: 'Default', action: 'Account for collection' },
];

export default function LoanAdminDelinquency() {
  const [loans, setLoans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('adminToken');
  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

  const { data: loansData, isValidating: loadingLoans } = useSWR(
    token ? `${API}/api/admin/loans` : null,
    fetcherSingle,
    { revalidateOnFocus: false, revalidateIfStale: true }
  );

  useEffect(() => {
    if (loansData && loansData.success) {
      setLoans((loansData.loans || []).filter(l => l.status === 'active'));
    }
  }, [loansData]);

  useEffect(() => {
    setLoading(loadingLoans && !loansData);
  }, [loadingLoans, loansData]);

  const flagged = loans.map(l => {
    const daysLate = getDaysLate(l.nextDueDate || l.approvedDate);
    if (daysLate < 1) return null;
    const info = getDelinquencyInfo(daysLate);
    return { ...l, daysLate, delinquency: info };
  }).filter(Boolean);

  const filtered = flagged.filter(l =>
    (l.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.loanId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const counts = {
    total: flagged.length,
    suspended: flagged.filter(l => l.delinquency.cls === 'high-risk').length,
    collection: flagged.filter(l => l.delinquency.cls === 'default').length,
    recovery: loans.length > 0 ? Math.round(((loans.length - flagged.length) / loans.length) * 100) : 100,
  };

  return (
    <div className="loan-admin-mgmt-page">
      <LoanAdminSidebar />
      <div className="loan-admin-mgmt-content">
        <div className="loan-admin-mgmt-header">
          <h1 className="loan-admin-mgmt-title">Delinquency Reports</h1>
        </div>

        <div className="loan-admin-mgmt-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">Total Flagged</p>
            <p className="loan-admin-mgmt-stat-value pending">{counts.total}</p>
          </div>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">Suspended</p>
            <p className="loan-admin-mgmt-stat-value" style={{ color: '#EA580C' }}>{counts.suspended}</p>
          </div>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">For Collection</p>
            <p className="loan-admin-mgmt-stat-value rejected">{counts.collection}</p>
          </div>
          <div className="loan-admin-mgmt-stat-card">
            <p className="loan-admin-mgmt-stat-label">Recovery Rate</p>
            <p className="loan-admin-mgmt-stat-value approved">{counts.recovery}%</p>
          </div>
        </div>

        {/* Delinquency Policy Reference */}
        <div className="dlq-policy-card">
          <h3 className="dlq-policy-title">Delinquency Policy</h3>
          <table className="dlq-policy-table">
            <thead>
              <tr><th>Days Late</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {POLICY_TABLE.map((row, i) => (
                <tr key={i}><td>{row.range}</td><td><span className={`ps-status-badge ${row.status.toLowerCase().replace(' ', '-')}`}>{row.status}</span></td><td>{row.action}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="dlq-policy-notes">
            <div className="dlq-note-item">
              <span className="dlq-note-icon">🔹</span>
              <div><strong>Member defaults?</strong> Account flagged, loan privileges suspended, subject to collection process.</div>
            </div>
            <div className="dlq-note-item">
              <span className="dlq-note-icon">🔹</span>
              <div><strong>Risky behavior detected?</strong> Account flagged as high risk, requires manual approval for future loans.</div>
            </div>
          </div>
        </div>

        {/* Flagged Accounts */}
        <h3 className="dlq-section-title">Flagged Accounts</h3>

        <div className="loan-admin-mgmt-search">
          <Search size={20} color="#9CA3AF" />
          <input type="text" placeholder="Search flagged accounts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="loan-admin-mgmt-table-container">
          <table className="loan-admin-mgmt-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Amount</th>
                <th>Days Late</th>
                <th>Status</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No flagged accounts</td></tr>
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
                    <td style={{ fontWeight: 600, color: '#DC2626' }}>{loan.daysLate} days</td>
                    <td><span className={`ps-status-badge ${loan.delinquency.cls}`}>{loan.delinquency.status}</span></td>
                    <td>{loan.delinquency.flag && <span className={`dlq-flag-badge ${loan.delinquency.cls}`}>{loan.delinquency.flag}</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="loan-admin-mgmt-pagination">
          <p className="loan-admin-mgmt-pagination-info">Showing {filtered.length} flagged accounts</p>
        </div>
      </div>
    </div>
  );
}
