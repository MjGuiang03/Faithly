import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
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
  const location = useLocation();
  const isSavingsRoute = location.pathname.includes('/savings');

  const [loans, setLoans] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingSavings, setPendingSavings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isSavingsRoute ? 'savings' : 'loans');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedSavings, setSelectedSavings] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  const token = localStorage.getItem('adminToken');

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/loans`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setLoans((data.loans || []).filter(l => l.status === 'active'));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/loan-payments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setPendingPayments(data.payments || []);
    } catch { /* silent */ }
  }, [token]);

  const fetchSavings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/savings/deposits?status=pending`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setPendingSavings(data.deposits || []);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { fetchLoans(); fetchPayments(); fetchSavings(); }, [fetchLoans, fetchPayments, fetchSavings]);

  useEffect(() => {
    setActiveTab(isSavingsRoute ? 'savings' : 'loans');
    setPaymentMethodFilter('all');
    setSearchQuery('');
  }, [isSavingsRoute]);

  const handleConfirmPayment = async (paymentId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/loan-payments/${paymentId}/confirm`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment confirmed! Balance updated.');
        setSelectedPayment(null);
        fetchLoans(); fetchPayments();
      } else { toast.error(data.message); }
    } catch { toast.error('Failed to confirm payment'); }
    finally { setActionLoading(false); }
  };

  const handleRejectPayment = async (paymentId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/loan-payments/${paymentId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason || '' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment rejected.');
        setSelectedPayment(null);
        fetchPayments();
      } else { toast.error(data.message); }
    } catch { toast.error('Failed to reject payment'); }
    finally { setActionLoading(false); }
  };

  const handleConfirmSavings = async (savingsId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/savings/deposits/${savingsId}/confirm`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Savings deposit confirmed!');
        setSelectedSavings(null);
        fetchSavings();
      } else { toast.error(data.message); }
    } catch { toast.error('Failed to confirm savings deposit'); }
    finally { setActionLoading(false); }
  };

  const handleRejectSavings = async (savingsId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/savings/deposits/${savingsId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason || '' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Savings deposit rejected.');
        setSelectedSavings(null);
        fetchSavings();
      } else { toast.error(data.message); }
    } catch { toast.error('Failed to reject savings deposit'); }
    finally { setActionLoading(false); }
  };

  const enriched = loans.map(l => {
    const effectiveDueDate = l.nextPaymentDate || l.nextDueDate || l.approvedDate;
    const daysLate = getDaysLate(effectiveDueDate);
    const status = getPaymentStatus(daysLate);
    return { ...l, daysLate, paymentStatus: status, effectiveDueDate };
  });

  const filtered = enriched.filter(l =>
    (l.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.loanId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingFiltered = pendingPayments.filter(p =>
    ((p.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.loanId || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (paymentMethodFilter === 'all' || (p.paymentMethod || '').toLowerCase() === paymentMethodFilter)
  );

  const pendingSavingsFiltered = pendingSavings.filter(s =>
    ((s.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (paymentMethodFilter === 'all' || (s.paymentMethod || '').toLowerCase() === paymentMethodFilter)
  );

  const counts = {
    onTrack: enriched.filter(l => l.paymentStatus.cls === 'on-track').length,
    overdue: enriched.filter(l => ['reminder', 'delinquent'].includes(l.paymentStatus.cls)).length,
    highRisk: enriched.filter(l => l.paymentStatus.cls === 'high-risk').length,
    defaulted: enriched.filter(l => l.paymentStatus.cls === 'default').length,
  };

  const pendingCount = pendingPayments.filter(p => p.status === 'pending').length;
  const pendingSavingsCount = pendingSavings.length;

  return (
    <div className="loan-admin-mgmt-page">
      <LoanAdminSidebar />
      <div className="loan-admin-mgmt-content">
        <div className="loan-admin-mgmt-header">
          <h1 className="loan-admin-mgmt-title">
            {isSavingsRoute ? 'Pending Savings Deposits' : 'Loan Payments'}
          </h1>
        </div>

        {!isSavingsRoute && (
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
        )}

        {/* Tabs */}
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {!isSavingsRoute ? (
            <>
              <button
                onClick={() => setActiveTab('loans')}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none', fontFamily: 'Inter',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: activeTab === 'loans' ? '#155DFC' : '#F3F4F6',
                  color: activeTab === 'loans' ? '#fff' : '#6B7280',
                }}
              >Active Loans</button>
              <button
                onClick={() => setActiveTab('payments')}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none', fontFamily: 'Inter',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', position: 'relative',
                  background: activeTab === 'payments' ? '#155DFC' : '#F3F4F6',
                  color: activeTab === 'payments' ? '#fff' : '#6B7280',
                }}
              >
                Pending Payments
                {pendingCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6, background: '#DC2626', color: '#fff',
                    borderRadius: '50%', width: 20, height: 20, fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{pendingCount}</span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveTab('savings')}
              style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none', fontFamily: 'Inter',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', position: 'relative',
                background: activeTab === 'savings' ? '#155DFC' : '#F3F4F6',
                color: activeTab === 'savings' ? '#fff' : '#6B7280',
              }}
            >
              Pending Savings
              {pendingSavingsCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6, background: '#DC2626', color: '#fff',
                  borderRadius: '50%', width: 20, height: 20, fontSize: '11px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{pendingSavingsCount}</span>
              )}
            </button>
          )}
        </div>

        <div className="loan-admin-mgmt-search">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17.5 17.5L13.875 13.875" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input type="text" placeholder="Search by member name or loan ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Active Loans Tab */}
        {activeTab === 'loans' && (
          <div className="loan-admin-mgmt-table-container">
            <table className="loan-admin-mgmt-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Days Late</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No active loans found</td></tr>
                ) : (
                  filtered.map(loan => (
                    <tr key={loan._id} onClick={() => setSelectedLoan(loan)} style={{ cursor: 'pointer' }} className="loan-admin-mgmt-table-row-hover">
                      <td className="loan-admin-mgmt-table-id">{loan.loanId}</td>
                      <td>
                        <div className="loan-admin-mgmt-table-member">
                          <p className="loan-admin-mgmt-table-member-name">{loan.memberName}</p>
                          <p className="loan-admin-mgmt-table-member-email">{loan.email}</p>
                        </div>
                      </td>
                      <td className="loan-admin-mgmt-table-amount">{fmt(loan.amount)}</td>
                      <td style={{ fontSize: '13px' }}>{loan.paidMonths || 0}/{loan.termMonths || 0}</td>
                      <td className="loan-admin-mgmt-table-amount">{fmt(loan.remainingBalance)}</td>
                      <td>{fmtDate(loan.effectiveDueDate)}</td>
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
        )}

        {/* Pending Payments Tab */}
        {activeTab === 'payments' && (
          <div>
            {/* Payment Method Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {['all', 'cash', 'gcash', 'bank'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethodFilter(method)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '6px',
                    border: paymentMethodFilter === method ? 'none' : '1px solid #E5E7EB',
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: paymentMethodFilter === method ? '#1E3A8A' : '#fff',
                    color: paymentMethodFilter === method ? '#fff' : '#6B7280',
                    transition: 'all 0.15s',
                    textTransform: method === 'all' ? 'none' : 'capitalize',
                  }}
                >
                  {method === 'all' ? 'All Methods' : method === 'gcash' ? 'GCash' : method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          <div className="loan-admin-mgmt-table-container">
            <table className="loan-admin-mgmt-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Month #</th>
                  <th>Submitted</th>
                  <th>Proof</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingFiltered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No payment submissions</td></tr>
                ) : (
                  pendingFiltered.map(p => (
                    <tr key={p._id} onClick={() => setSelectedPayment(p)} style={{ cursor: 'pointer' }} className="loan-admin-mgmt-table-row-hover">
                      <td className="loan-admin-mgmt-table-id">{p.loanId}</td>
                      <td>
                        <div className="loan-admin-mgmt-table-member">
                          <p className="loan-admin-mgmt-table-member-name">{p.memberName}</p>
                          <p className="loan-admin-mgmt-table-member-email">{p.email}</p>
                        </div>
                      </td>
                      <td className="loan-admin-mgmt-table-amount">{fmt(p.amount)}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: '13px' }}>{p.paymentMethod}</td>
                      <td style={{ fontSize: '13px', textAlign: 'center' }}>{p.monthNumber || '—'}</td>
                      <td style={{ fontSize: '13px' }}>{fmtDate(p.submittedAt)}</td>
                      <td>
                        {p.proofData ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingImage(p.proofData); }}
                            style={{ background: '#EEF2FF', color: '#155DFC', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
                          >View</button>
                        ) : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>None</span>}
                      </td>
                      <td>
                        <span className={`ps-status-badge ${p.status === 'pending' ? 'reminder' : p.status === 'confirmed' ? 'on-track' : 'default'}`}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {p.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleConfirmPayment(p._id)}
                              disabled={actionLoading}
                              style={{ background: '#16A34A', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
                            >Confirm</button>
                            <button
                              onClick={() => handleRejectPayment(p._id)}
                              disabled={actionLoading}
                              style={{ background: '#fff', color: '#DC2626', border: '1px solid #FCA5A5', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
                            >Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {/* Pending Savings Tab */}
        {activeTab === 'savings' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {['all', 'cash', 'gcash', 'bank'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethodFilter(method)}
                  style={{ padding: '5px 14px', borderRadius: '6px', border: paymentMethodFilter === method ? 'none' : '1px solid #E5E7EB', fontFamily: 'Inter', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: paymentMethodFilter === method ? '#1E3A8A' : '#fff', color: paymentMethodFilter === method ? '#fff' : '#6B7280', transition: 'all 0.15s', textTransform: method === 'all' ? 'none' : 'capitalize' }}
                >
                  {method === 'all' ? 'All Methods' : method === 'gcash' ? 'GCash' : method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
            <div className="loan-admin-mgmt-table-container">
              <table className="loan-admin-mgmt-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Goal Name</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Source</th>
                    <th>Submitted</th>
                    <th>Proof</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSavingsFiltered.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No pending savings deposits</td></tr>
                  ) : (
                    pendingSavingsFiltered.map(s => (
                      <tr key={s._id} onClick={() => setSelectedSavings(s)} style={{ cursor: 'pointer' }} className="loan-admin-mgmt-table-row-hover">
                        <td>
                          <div className="loan-admin-mgmt-table-member">
                            <p className="loan-admin-mgmt-table-member-name">{s.memberName}</p>
                            <p className="loan-admin-mgmt-table-member-email">{s.email}</p>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{s.goalName}</td>
                        <td className="loan-admin-mgmt-table-amount">{fmt(s.amount)}</td>
                        <td style={{ textTransform: 'capitalize', fontSize: '13px' }}>{s.paymentMethod}</td>
                        <td style={{ textTransform: 'capitalize', fontSize: '13px' }}>{s.source}</td>
                        <td style={{ fontSize: '13px' }}>{fmtDate(s.date)}</td>
                        <td>
                          {s.proofOfPayment ? (
                            <button onClick={(e) => { e.stopPropagation(); setViewingImage(s.proofOfPayment); }} style={{ background: '#EEF2FF', color: '#155DFC', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>View</button>
                          ) : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>None</span>}
                        </td>
                        <td>
                          <span className={`ps-status-badge ${s.status === 'pending' ? 'reminder' : s.status === 'confirmed' ? 'on-track' : 'default'}`}>
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {s.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleConfirmSavings(s._id)} disabled={actionLoading} style={{ background: '#16A34A', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Confirm</button>
                              <button onClick={() => handleRejectSavings(s._id)} disabled={actionLoading} style={{ background: '#fff', color: '#DC2626', border: '1px solid #FCA5A5', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="loan-admin-mgmt-pagination">
          <p className="loan-admin-mgmt-pagination-info">
            {activeTab === 'loans' ? `Showing ${filtered.length} active loans` : activeTab === 'payments' ? `Showing ${pendingFiltered.length} payment submissions` : `Showing ${pendingSavingsFiltered.length} savings deposits`}
          </p>
        </div>
      </div>

      {/* ── Loan Detail Modal ── */}
      {selectedLoan && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => setSelectedLoan(null)}>
          <div className="loan-admin-mgmt-modal-container" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="loan-admin-mgmt-modal-header">
              <h2 className="loan-admin-mgmt-modal-title">Loan Payment Progress</h2>
              <button className="loan-admin-mgmt-modal-close" onClick={() => setSelectedLoan(null)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Loan ID</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedLoan.loanId}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Member</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedLoan.memberName}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Loan Amount</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{fmt(selectedLoan.amount)}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Monthly Payment</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{fmt(selectedLoan.monthlyPayment)}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Term</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedLoan.termMonths} months</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Interest Rate</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{(selectedLoan.interestRate < 1 ? (selectedLoan.interestRate * 100).toFixed(1) : selectedLoan.interestRate)}%</p></div>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#F3F4F6', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Inter', color: '#374151' }}>Repayment Progress</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Inter', color: '#155DFC' }}>
                    {selectedLoan.paidMonths || 0}/{selectedLoan.termMonths || 0} months
                  </span>
                </div>
                <div style={{ background: '#E5E7EB', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                  <div style={{
                    background: '#155DFC', borderRadius: '6px', height: '100%',
                    width: `${Math.max(2, ((selectedLoan.paidMonths || 0) / (selectedLoan.termMonths || 1)) * 100)}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'Inter' }}>Balance: {fmt(selectedLoan.remainingBalance)}</span>
                  <span style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'Inter' }}>Total: {fmt(selectedLoan.totalRepayment)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Status</p><span className={`ps-status-badge ${selectedLoan.paymentStatus.cls}`}>{selectedLoan.paymentStatus.label}</span></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Days Late</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: selectedLoan.daysLate > 0 ? '#DC2626' : '#16A34A' }}>{selectedLoan.daysLate > 0 ? `${selectedLoan.daysLate} days` : 'Current'}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Approved Date</p><p style={{ fontSize: '13px', fontFamily: 'Inter', color: '#374151' }}>{fmtDate(selectedLoan.approvedDate)}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Next Due Date</p><p style={{ fontSize: '13px', fontFamily: 'Inter', color: '#374151' }}>{fmtDate(selectedLoan.effectiveDueDate)}</p></div>
              </div>
            </div>
            <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedLoan(null)} style={{ background: '#155DFC', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Detail Modal ── */}
      {selectedPayment && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="loan-admin-mgmt-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="loan-admin-mgmt-modal-header">
              <h2 className="loan-admin-mgmt-modal-title">Payment Details</h2>
              <button className="loan-admin-mgmt-modal-close" onClick={() => setSelectedPayment(null)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Loan ID</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedPayment.loanId}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Member</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedPayment.memberName}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Amount</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{fmt(selectedPayment.amount)}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Method</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827', textTransform: 'capitalize' }}>{selectedPayment.paymentMethod}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Month #</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedPayment.monthNumber || '—'}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Submitted</p><p style={{ fontSize: '13px', fontFamily: 'Inter', color: '#374151' }}>{fmtDate(selectedPayment.submittedAt)}</p></div>
              </div>
              {selectedPayment.proofData && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter', marginBottom: '6px' }}>Proof of Payment</p>
                  <img
                    src={selectedPayment.proofData}
                    alt="Payment proof"
                    onClick={() => setViewingImage(selectedPayment.proofData)}
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer' }}
                  />
                </div>
              )}
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {selectedPayment.status === 'pending' ? (
                <>
                  <button onClick={() => handleRejectPayment(selectedPayment._id)} disabled={actionLoading}
                    style={{ background: '#fff', color: '#DC2626', border: '1px solid #FCA5A5', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Reject</button>
                  <button onClick={() => handleConfirmPayment(selectedPayment._id)} disabled={actionLoading}
                    style={{ background: '#16A34A', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>
                    {actionLoading ? 'Processing…' : 'Confirm Payment'}
                  </button>
                </>
              ) : (
                <button onClick={() => setSelectedPayment(null)} style={{ background: '#155DFC', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Savings Detail Modal ── */}
      {selectedSavings && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => setSelectedSavings(null)}>
          <div className="loan-admin-mgmt-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="loan-admin-mgmt-modal-header">
              <h2 className="loan-admin-mgmt-modal-title">Savings Deposit Details</h2>
              <button className="loan-admin-mgmt-modal-close" onClick={() => setSelectedSavings(null)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Member</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedSavings.memberName}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Goal Name</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedSavings.goalName}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Amount</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{fmt(selectedSavings.amount)}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Method</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827', textTransform: 'capitalize' }}>{selectedSavings.paymentMethod}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Source</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827', textTransform: 'capitalize' }}>{selectedSavings.source}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Submitted</p><p style={{ fontSize: '13px', fontFamily: 'Inter', color: '#374151' }}>{fmtDate(selectedSavings.date)}</p></div>
              </div>
              {selectedSavings.proofOfPayment && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter', marginBottom: '6px' }}>Proof of Payment</p>
                  <img src={selectedSavings.proofOfPayment} alt="Deposit proof" onClick={() => setViewingImage(selectedSavings.proofOfPayment)} style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer' }} />
                </div>
              )}
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {selectedSavings.status === 'pending' ? (
                <>
                  <button onClick={() => handleRejectSavings(selectedSavings._id)} disabled={actionLoading} style={{ background: '#fff', color: '#DC2626', border: '1px solid #FCA5A5', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Reject</button>
                  <button onClick={() => handleConfirmSavings(selectedSavings._id)} disabled={actionLoading} style={{ background: '#16A34A', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>
                    {actionLoading ? 'Processing…' : 'Confirm Deposit'}
                  </button>
                </>
              ) : (
                <button onClick={() => setSelectedSavings(null)} style={{ background: '#155DFC', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {viewingImage && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 1100 }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewingImage(null)} style={{
              position: 'absolute', top: -12, right: -12, width: 32, height: 32,
              borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1101, boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <img src={viewingImage} alt="Proof" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
