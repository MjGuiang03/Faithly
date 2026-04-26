import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import '../styles/loanAdminLoanManagement.css';
import '../styles/loanAdminPaymentStatus.css';
import API from '../../utils/api';
import { PiggyBank, Search, X } from 'lucide-react';


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

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isSavingsRoute ? 'savings' : 'loans');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [viewingImage, setViewingImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  
  const [allLoans, setAllLoans] = useState([]);
  const [allSavings, setAllSavings] = useState([]);
  const [savingsFilter, setSavingsFilter] = useState('all'); // 'all', 'this_month', 'this_year'
  const [interestFilter, setInterestFilter] = useState('all'); // 'all', '2x', '1.5x', '1x'

  // Walk-in Feature State
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinType, setWalkinType] = useState('loan'); // 'loan' or 'savings'
  const [walkinSearch, setWalkinSearch] = useState('');
  const [walkinUsers, setWalkinUsers] = useState([]);
  const [showWalkinUsers, setShowWalkinUsers] = useState(false);
  const [walkinSelectedMember, setWalkinSelectedMember] = useState(null);
  const [walkinSelectedLoan, setWalkinSelectedLoan] = useState('');
  const [walkinGoals, setWalkinGoals] = useState([]);
  const [walkinSelectedGoal, setWalkinSelectedGoal] = useState('');
  const [walkinAmount, setWalkinAmount] = useState('');
  const [walkinMethod, setWalkinMethod] = useState('cash');
  const [walkinRef, setWalkinRef] = useState('');
  const [walkinLoading, setWalkinLoading] = useState(false);

  const token = localStorage.getItem('adminToken');

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/loans`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setAllLoans(data.loans || []);
        setLoans((data.loans || []).filter(l => l.status === 'active'));
      }
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
      const res = await fetch(`${API}/api/admin/savings/deposits`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        const deposits = data.deposits || [];
        setAllSavings(deposits);
      } else {
        // Fallback if backend doesn't support fetching all without status=pending
        // Fallback: just set allSavings from pending fetch
        const resPending = await fetch(`${API}/api/admin/savings/deposits?status=pending`, { headers: { Authorization: `Bearer ${token}` } });
        const dataPending = await resPending.json();
        if (dataPending.success) setAllSavings(dataPending.deposits || []);
      }
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





  /* ── WALKIN FUNCTIONS ── */
  const handleWalkinSearchChange = async (query) => {
    setWalkinSearch(query);
    if (query.trim().length < 2) {
      setWalkinUsers([]);
      setShowWalkinUsers(false);
      return;
    }
    try {
      const res = await fetch(`${API}/api/admin/members?search=${query}&limit=5`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setWalkinUsers(data.members || []);
        setShowWalkinUsers(true);
      }
    } catch { /* silent */ }
  };

  const selectWalkinMember = async (member) => {
    setWalkinSelectedMember(member);
    setWalkinSearch(member.fullName || member.email);
    setShowWalkinUsers(false);
    setWalkinGoals([]);
    setWalkinSelectedGoal('');
    
    // fetch goals
    try {
      const res = await fetch(`${API}/api/admin/user-savings-goals/${member.email}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setWalkinGoals(data.goals || []);
        if (data.goals?.length > 0) setWalkinSelectedGoal(data.goals[0]._id);
      }
    } catch { /* silent */ }
  };

  const handleWalkinLoanSelected = (e) => {
    const lId = e.target.value;
    setWalkinSelectedLoan(lId);
    const ln = allLoans.find(x => x._id === lId);
    if (ln) setWalkinAmount(ln.upcomingPaymentAmount || ln.monthlyPayment || '');
    else setWalkinAmount('');
  };

  const handleWalkinSubmit = async () => {
    if (walkinType === 'loan') {
      if (!walkinSelectedLoan || !walkinAmount || Number(walkinAmount) <= 0) return toast.error('Select a loan and enter a valid amount');
      setWalkinLoading(true);
      try {
        const res = await fetch(`${API}/api/admin/process-loan-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ loanId: walkinSelectedLoan, amount: Number(walkinAmount), paymentMethod: walkinMethod, referenceNumber: walkinRef })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message);
          setShowWalkinModal(false);
          fetchLoans(); fetchPayments();
        } else toast.error(data.message);
      } catch { toast.error('Failed to process payment'); }
      finally { setWalkinLoading(false); }
    } else {
      if (!walkinSelectedMember || !walkinSelectedGoal || !walkinAmount || Number(walkinAmount) <= 0) return toast.error('Select member, goal, and enter a valid amount');
      setWalkinLoading(true);
      try {
        const res = await fetch(`${API}/api/admin/process-savings-deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: walkinSelectedMember.email, goalId: walkinSelectedGoal, amount: Number(walkinAmount), paymentMethod: walkinMethod, referenceNumber: walkinRef })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message);
          setShowWalkinModal(false);
          fetchSavings();
        } else toast.error(data.message);
      } catch { toast.error('Failed to process deposit'); }
      finally { setWalkinLoading(false); }
    }
  };

  const resetWalkin = () => {
    setWalkinType('loan');
    setWalkinSearch('');
    setWalkinUsers([]);
    setShowWalkinUsers(false);
    setWalkinSelectedMember(null);
    setWalkinSelectedLoan('');
    setWalkinGoals([]);
    setWalkinSelectedGoal('');
    setWalkinAmount('');
    setWalkinMethod('cash');
    setWalkinRef('');
    setWalkinLoading(false);
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

  const counts = {
    onTrack: enriched.filter(l => l.paymentStatus.cls === 'on-track').length,
    overdue: enriched.filter(l => ['reminder', 'delinquent'].includes(l.paymentStatus.cls)).length,
    highRisk: enriched.filter(l => l.paymentStatus.cls === 'high-risk').length,
    defaulted: enriched.filter(l => l.paymentStatus.cls === 'default').length,
  };

  const pendingCount = pendingPayments.filter(p => p.status === 'pending').length;

  const totalSavingsFiltered = allSavings.filter(s => {
    if (s.status !== 'confirmed') return false;
    const sDate = new Date(s.confirmedAt || s.date);
    const now = new Date();
    if (savingsFilter === 'this_month') {
      return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
    }
    if (savingsFilter === 'this_year') {
      return sDate.getFullYear() === now.getFullYear();
    }
    return true; // 'all'
  }).reduce((sum, s) => {
    const amt = Number(s.amount) || 0;
    return s.type === 'withdrawal' ? sum - amt : sum + amt;
  }, 0);

  const totalInterestFiltered = allLoans.filter(l => {
    if (l.status === 'rejected' || l.status === 'pending') return false;
    const lType = (l.loanType || '').toLowerCase();
    
    // Map loan types to multipliers because multiplier isn't always directly saved in DB. 
    // Usually: Personal = 2x, Emergency = 1.5x, Short-term = 1x.
    let mult = '2x';
    if (lType.includes('emergency')) mult = '1.5x';
    if (lType.includes('short')) mult = '1x';
    if (l.multiplier) mult = `${l.multiplier}x`;

    if (interestFilter === '2x' && mult !== '2x') return false;
    if (interestFilter === '1.5x' && mult !== '1.5x') return false;
    if (interestFilter === '1x' && mult !== '1x') return false;
    return true;
  }).reduce((sum, l) => {
    const totalRepay = Number(l.totalRepayment || (l.monthlyPayment * l.term)) || 0;
    const principal = Number(l.amount) || 0;
    const interest = totalRepay - principal;
    return sum + (interest > 0 ? interest : 0);
  }, 0);

  return (
    <div className="loan-admin-mgmt-page">
      <LoanAdminSidebar />
      <div className="loan-admin-mgmt-content">
        <div className="loan-admin-mgmt-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="loan-admin-mgmt-title">
            {isSavingsRoute ? 'Savings Overview' : 'Loan Payments'}
          </h1>
          <button 
            onClick={() => { resetWalkin(); setShowWalkinModal(true); setWalkinType(isSavingsRoute ? 'savings' : 'loan'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#155DFC', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 4px rgba(21, 93, 252, 0.2)' }}
          >
            <PiggyBank size={16} />
            Process Walk-in
          </button>
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

        {isSavingsRoute && (
          <div className="loan-admin-mgmt-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div className="loan-admin-mgmt-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Total Savings</p>
                <select value={savingsFilter} onChange={e => setSavingsFilter(e.target.value)} style={{ fontSize: '12px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                  <option value="all">All Time</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                </select>
              </div>
              <p className="loan-admin-mgmt-stat-value approved">{fmt(totalSavingsFiltered)}</p>
            </div>
            <div className="loan-admin-mgmt-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Total Income from Interest</p>
                <select value={interestFilter} onChange={e => setInterestFilter(e.target.value)} style={{ fontSize: '12px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #D1D5DB' }}>
                  <option value="all">All Multipliers</option>
                  <option value="2x">2x Savings (Personal)</option>
                  <option value="1.5x">1.5x Savings (Emergency)</option>
                  <option value="1x">1x Savings (Short-term)</option>
                </select>
              </div>
              <p className="loan-admin-mgmt-stat-value" style={{ color: '#155DFC' }}>{fmt(totalInterestFiltered)}</p>
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
          ) : null}
        </div>

        <div className="loan-admin-mgmt-search">
          <Search size={20} color="#9CA3AF" />
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
                      <td className="loan-admin-mgmt-table-amount">
                        {fmt(p.amount)}
                        {p.isLate && <span style={{ fontSize: '10px', color: '#DC2626', background: '#FEE2E2', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600 }}>3% Penalty</span>}
                      </td>
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





        <div className="loan-admin-mgmt-pagination">
          <p className="loan-admin-mgmt-pagination-info">
            {activeTab === 'loans' ? `Showing ${filtered.length} active loans` : `Showing ${pendingFiltered.length} payment submissions`}
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
                <X size={16} />
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
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Loan ID</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedPayment.loanId}</p></div>
                <div><p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Member</p><p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>{selectedPayment.memberName}</p></div>
                <div>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'Inter' }}>Expected Amount</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Inter', color: '#111827' }}>
                    {fmt(selectedPayment.amount)}
                    {selectedPayment.isLate && <span style={{ fontSize: '11px', color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle' }}>Late 3% Penalty Included</span>}
                  </p>
                </div>
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
                    {actionLoading ? <span className="btn-spinner" /> : 'Confirm Payment'}
                  </button>
                </>
              ) : (
                <button onClick={() => setSelectedPayment(null)} style={{ background: '#155DFC', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Close</button>
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
              <X size={16} color="#374151" />
            </button>
            <img src={viewingImage} alt="Proof" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
      )}

      {/* ── Walk-in Transaction Modal ── */}
      {showWalkinModal && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => setShowWalkinModal(false)} style={{ zIndex: 2000 }}>
          <div className="loan-admin-mgmt-modal-container" style={{ maxWidth: '440px', overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
            <div className="loan-admin-mgmt-modal-header" style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
              <div>
                <h2 className="loan-admin-mgmt-modal-title" style={{ fontSize: '18px' }}>Process Walk-in Transaction</h2>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0', fontFamily: 'Inter' }}>Process payments or deposits directly on behalf of a user.</p>
              </div>
              <button className="loan-admin-mgmt-modal-close" onClick={() => setShowWalkinModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="walkin-form-group">
                <label className="walkin-label">Transaction Type</label>
                <select className="walkin-select" value={walkinType} onChange={(e) => { setWalkinType(e.target.value); setWalkinSelectedLoan(''); setWalkinSelectedMember(null); setWalkinAmount(''); }}>
                  <option value="loan">Loan Repayment</option>
                  <option value="savings">Savings Deposit</option>
                </select>
              </div>

              {walkinType === 'loan' ? (
                <div className="walkin-form-group">
                  <label className="walkin-label">Select Active Loan</label>
                  <select className="walkin-select" value={walkinSelectedLoan} onChange={handleWalkinLoanSelected}>
                    <option value="">-- Choose Loan --</option>
                    {allLoans.filter(l => l.status === 'active').map(l => (
                      <option key={l._id} value={l._id}>
                        [{l.loanId}] {l.memberName} — Bal: {fmt(l.remainingBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="walkin-form-group" style={{ position: 'relative' }}>
                    <label className="walkin-label">Search Member</label>
                    <input 
                      type="text" 
                      className="walkin-input" 
                      placeholder="Type name or email..." 
                      value={walkinSearch}
                      onChange={(e) => handleWalkinSearchChange(e.target.value)}
                    />
                    {showWalkinUsers && walkinUsers.length > 0 && (
                      <div className="walkin-search-results">
                        {walkinUsers.map(u => (
                          <div key={u._id} className="walkin-search-item" onClick={() => selectWalkinMember(u)}>
                            <span className="walkin-search-item-title">{u.fullName || 'Unknown'}</span>
                            <span className="walkin-search-item-sub">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {walkinSelectedMember && (
                    <div className="walkin-form-group">
                      <label className="walkin-label">Select Savings Goal</label>
                      <select className="walkin-select" value={walkinSelectedGoal} onChange={(e) => setWalkinSelectedGoal(e.target.value)} disabled={walkinGoals.length === 0}>
                        {walkinGoals.length === 0 ? <option value="">No Active Goals Found</option> : <option value="">-- Choose Goal --</option>}
                        {walkinGoals.map(g => (
                          <option key={g._id} value={g._id}>
                            {g.name} — Progress: {fmt(g.savedAmount)} / {fmt(g.targetAmount)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="walkin-form-group">
                <label className="walkin-label">{walkinType === 'loan' ? 'Payment Amount' : 'Deposit Amount'}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 10, color: '#6B7280', fontFamily: 'Inter', fontSize: '14px', pointerEvents: 'none' }}>₱</span>
                  <input type="number" className="walkin-input" style={{ paddingLeft: '28px' }} placeholder="0.00" value={walkinAmount} onChange={(e) => setWalkinAmount(e.target.value)} />
                </div>
              </div>

              <div className="walkin-form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="walkin-label">Payment Method</label>
                  <select className="walkin-select" value={walkinMethod} onChange={(e) => setWalkinMethod(e.target.value)}>
                    <option value="cash">Walk-in Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="walkin-label">Reference # (Optional)</label>
                  <input type="text" className="walkin-input" placeholder="e.g. 12345678" value={walkinRef} onChange={(e) => setWalkinRef(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F9FAFB', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
               <button onClick={() => setShowWalkinModal(false)} disabled={walkinLoading} style={{ background: '#fff', color: '#374151', border: '1px solid #D1D5DB', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Cancel</button>
               <button onClick={handleWalkinSubmit} disabled={walkinLoading} style={{ background: '#155DFC', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 {walkinLoading ? <span className="btn-spinner" style={{ width: 14, height: 14 }} /> : null}
                 Submit & Confirm
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
