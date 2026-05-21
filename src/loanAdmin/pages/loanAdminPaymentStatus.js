import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import useDebounce from '../../hooks/useDebounce';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import LoanAdminSidebar from './loanAdminSidebar';
import '../styles/loanAdminLoanManagement.css';
import '../styles/loanAdminPaymentStatus.css';
import API from '../../utils/api';
import { PiggyBank, Search, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Label } from 'recharts';

const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

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

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isSavingsRoute ? 'savings' : 'loans');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoanPayments, setSelectedLoanPayments] = useState([]);
  const [selectedLoanPaymentsLoading, setSelectedLoanPaymentsLoading] = useState(false);

  const [savingsFilter, setSavingsFilter] = useState('all');
  const [savingsTypeFilter, setSavingsTypeFilter] = useState('all'); // 'all', 'deposit', 'withdrawal'
  const [selectedSavings, setSelectedSavings] = useState(null);
  const [savingsPage, setSavingsPage] = useState(1);
  const SAVINGS_PER_PAGE = 10;
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 10;
  useEffect(() => {
    setSavingsPage(1);
    setHistoryPage(1);
  }, [searchQuery, savingsTypeFilter]);

  // Manual Approval State
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingDetail, setPendingDetail] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json());

  // Public Settings (to check approval method)
  const { data: settingsData } = useSWR(
    `${API}/api/settings/public`,
    fetcherSingle,
    { 
      revalidateOnFocus: false, 
      dedupingInterval: 60000 
    }
  );

  const approvalMethod = useMemo(() => settingsData?.paymentApprovalMethod || 'gateway', [settingsData]);

  // Loans
  const { data: loansData, isValidating: loadingLoans, mutate: fetchLoans } = useSWR(
    token ? `${API}/api/admin/loans` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false, 
      revalidateIfStale: true,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const allLoans = useMemo(() => loansData?.loans || [], [loansData]);
  const loans = useMemo(() => allLoans.filter(l => l.status === 'active'), [allLoans]);

  // Savings
  const { data: savingsData, mutate: fetchSavings } = useSWR(
    token ? `${API}/api/admin/savings/deposits` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const allSavings = useMemo(() => savingsData?.deposits || [], [savingsData]);

  // Pending Approvals
  const pendingSavUrl = (token && isSavingsRoute) ? `${API}/api/admin/savings/deposits?status=pending&limit=100` : null;
  const pendingLoanUrl = (token && !isSavingsRoute) ? `${API}/api/admin/loan-payments?status=pending&limit=100` : null;

  const { data: pendingSavData, isValidating: pendingLoadingSav, mutate: mutateSavPending } = useSWR(pendingSavUrl, fetcherSingle, { revalidateOnFocus: false });
  const { data: pendingLoanData, isValidating: pendingLoadingLoan, mutate: mutateLoanPending } = useSWR(pendingLoanUrl, fetcherSingle, { revalidateOnFocus: false });

  const pendingSavings = useMemo(() => pendingSavData?.deposits || [], [pendingSavData]);
  const pendingLoanPayments = useMemo(() => pendingLoanData?.payments || [], [pendingLoanData]);

  // Payment History
  const { data: loanHistoryData } = useSWR(
    (token && activeTab === 'history') ? `${API}/api/admin/loan-payments?status=confirmed&page=${historyPage}&limit=${HISTORY_PER_PAGE}` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const loanHistory = useMemo(() => loanHistoryData?.payments || [], [loanHistoryData]);
  const historyTotalCount = useMemo(() => loanHistoryData?.totalCount || 0, [loanHistoryData]);

  const fetchPendingApprovals = useCallback(() => {
    if (isSavingsRoute) mutateSavPending();
    else mutateLoanPending();
  }, [isSavingsRoute, mutateSavPending, mutateLoanPending]);

  useEffect(() => {
    setPendingLoading(pendingLoadingSav || pendingLoadingLoan);
  }, [pendingLoadingSav, pendingLoadingLoan]);

  useEffect(() => {
    setLoading(loadingLoans && !loansData);
  }, [loadingLoans, loansData]);

  useEffect(() => {
    setActiveTab(isSavingsRoute ? 'savings' : 'loans');
    setSearchQuery('');
  }, [isSavingsRoute]);


  const handleApprovePending = async () => {
    if (!pendingDetail) return;
    setActionLoading(true);
    try {
      const endpoint = isSavingsRoute ? `/api/admin/savings/deposits/${pendingDetail._id}/approve` : `/api/admin/loans/payments/${pendingDetail._id}/approve`;
      const res = await fetch(`${API}${endpoint}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        toast.success('Approved successfully');
        setPendingDetail(null);
        fetchPendingApprovals();
        if (isSavingsRoute) fetchSavings(); else fetchLoans();
      } else toast.error(data.message || 'Failed to approve');
    } catch { toast.error('Error approving'); }
    finally { setActionLoading(false); }
  };

  const handleRejectPending = async () => {
    if (!pendingDetail || !rejectReason.trim()) return toast.error('Please provide a reason');
    setActionLoading(true);
    try {
      const endpoint = isSavingsRoute ? `/api/admin/savings/deposits/${pendingDetail._id}/reject` : `/api/admin/loans/payments/${pendingDetail._id}/reject`;
      const res = await fetch(`${API}${endpoint}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Rejected successfully');
        setPendingDetail(null);
        setRejectReason('');
        setShowRejectInput(false);
        fetchPendingApprovals();
      } else toast.error(data.message || 'Failed to reject');
    } catch { toast.error('Error rejecting'); }
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
          fetchLoans();
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

  const enriched = useMemo(() => {
    return loans.map(l => {
      const effectiveDueDate = l.nextPaymentDate || l.nextDueDate || l.approvedDate;
      const daysLate = getDaysLate(effectiveDueDate);
      const status = getPaymentStatus(daysLate);
      return { ...l, daysLate, paymentStatus: status, effectiveDueDate };
    });
  }, [loans]);

  const filtered = useMemo(() => {
    return enriched.filter(l =>
      (l.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.loanId || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [enriched, searchQuery]);

  const counts = useMemo(() => {
    return {
      onTrack: enriched.filter(l => l.paymentStatus.cls === 'on-track').length,
      overdue: enriched.filter(l => ['reminder', 'delinquent'].includes(l.paymentStatus.cls)).length,
      highRisk: enriched.filter(l => l.paymentStatus.cls === 'high-risk').length,
      defaulted: enriched.filter(l => l.paymentStatus.cls === 'default').length,
    };
  }, [enriched]);

  const confirmedSavings = useMemo(() => {
    return allSavings.filter(s => {
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
    });
  }, [allSavings, savingsFilter]);

  const totalSavingsFiltered = useMemo(() => {
    return confirmedSavings.reduce((sum, s) => {
      const amt = Number(s.amount) || 0;
      return s.type === 'withdrawal' ? sum - amt : sum + amt;
    }, 0);
  }, [confirmedSavings]);

  const totalWithdrawalsFiltered = useMemo(() => {
    return confirmedSavings
      .filter(s => s.type === 'withdrawal')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [confirmedSavings]);

  const savingsChartData = useMemo(() => {
    const memberVal = confirmedSavings
      .filter(s => s.type === 'deposit' && ((s.position || '').toLowerCase() === 'member' || !s.position))
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const officerVal = confirmedSavings
      .filter(s => s.type === 'deposit' && ((s.position || '').toLowerCase() !== 'member' && s.position))
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const pieTotal = memberVal + officerVal;
    const pieData = [
      { name: 'Members', value: memberVal, color: '#0D1F45' },
      { name: 'Officers', value: officerVal, color: '#60A5FA' }
    ];
    return { pieTotal, pieData };
  }, [confirmedSavings]);



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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', minHeight: '24px' }}>
                <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>On Track</p>
              </div>
              <p className="loan-admin-mgmt-stat-value approved">{counts.onTrack}</p>
            </div>
            <div className="loan-admin-mgmt-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', minHeight: '24px' }}>
                <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Overdue (1-30d)</p>
              </div>
              <p className="loan-admin-mgmt-stat-value pending">{counts.overdue}</p>
            </div>
            <div className="loan-admin-mgmt-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', minHeight: '24px' }}>
                <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>High Risk (31-60d)</p>
              </div>
              <p className="loan-admin-mgmt-stat-value" style={{ color: '#F97316' }}>{counts.highRisk}</p>
            </div>
            <div className="loan-admin-mgmt-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', minHeight: '24px' }}>
                <p className="loan-admin-mgmt-stat-label" style={{ margin: 0 }}>Default (60+d)</p>
              </div>
              <p className="loan-admin-mgmt-stat-value rejected">{counts.defaulted}</p>
            </div>
          </div>
        )}

        {isSavingsRoute && (
          <div className="la-savings-overview-grid">
            {/* Left Column: Chart */}
            <div className="loan-admin-mgmt-table-container la-savings-chart-card">
              <h3 className="la-savings-chart-title">Savings by Role</h3>
              <div className="la-savings-chart-content">
                {savingsChartData.pieTotal === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No savings deposits available yet.</p>
                ) : (
                  <div className="la-savings-chart-wrapper">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={savingsChartData.pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={50}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={renderSliceLabel}
                          labelLine={false}
                        >
                          {savingsChartData.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                          <Label 
                            value={`₱${savingsChartData.pieTotal >= 1000 ? (savingsChartData.pieTotal/1000).toFixed(1).replace(/\.0$/, '') + 'k' : savingsChartData.pieTotal}`} 
                            position="center" 
                            fill="#1e3a5f" 
                            style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Inter' }} 
                          />
                          <Label 
                            value="Total" 
                            position="center" 
                            dy={16} 
                            fill="#6B7280" 
                            style={{ fontSize: '12px', fontFamily: 'Inter' }} 
                          />
                        </Pie>
                        <RechartsTooltip formatter={(value, name, props) => [`₱${(value || 0).toLocaleString()} (${Math.round((value/savingsChartData.pieTotal)*100)}%)`, props.payload.name]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="la-savings-pie-legend">
                      {savingsChartData.pieData.map((cat, i) => (
                        <div key={i} className="la-savings-pie-legend-item">
                          <div className="la-savings-pie-legend-label">
                            <div className="la-savings-pie-legend-dot" style={{ background: cat.color }} />
                            <span className="la-savings-pie-legend-name">{cat.name}</span>
                          </div>
                          <span className="la-savings-pie-legend-val">₱{cat.value.toLocaleString()} — {Math.round((cat.value/savingsChartData.pieTotal)*100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: 3 Stat Cards */}
            <div className="la-savings-cards-col">
              <div className="loan-admin-mgmt-stat-card la-savings-stat-card">
                <div className="la-savings-stat-header">
                  <p className="loan-admin-mgmt-stat-label la-savings-stat-label-text">Total Savings</p>
                  <select value={savingsFilter} onChange={e => setSavingsFilter(e.target.value)} className="la-savings-filter-select">
                    <option value="all">All Time</option>
                    <option value="this_month">This Month</option>
                    <option value="this_year">This Year</option>
                  </select>
                </div>
                <p className="loan-admin-mgmt-stat-value approved">{fmt(totalSavingsFiltered)}</p>
              </div>

              <div className="loan-admin-mgmt-stat-card la-savings-stat-card">
                <div className="la-savings-stat-header">
                  <p className="loan-admin-mgmt-stat-label la-savings-stat-label-text">Total Withdrawals</p>
                </div>
                <p className="loan-admin-mgmt-stat-value" style={{ color: '#DC2626' }}>{fmt(totalWithdrawalsFiltered)}</p>
              </div>

              <div 
                className="loan-admin-mgmt-stat-card la-savings-stat-card" 
                onClick={() => setActiveTab('pending')}
              >
                <div className="la-savings-stat-header">
                  <p className="loan-admin-mgmt-stat-label la-savings-stat-label-text">Pending Review</p>
                </div>
                <p className="loan-admin-mgmt-stat-value" style={{ color: '#EA580C' }}>{pendingSavings.length}</p>
              </div>
            </div>
          </div>
        )}

        {(!isSavingsRoute || approvalMethod === 'manual') && (
          <div className="la-tabs-container">
            <button 
              onClick={() => setActiveTab(isSavingsRoute ? 'savings' : 'loans')}
              className={`la-tab-btn ${activeTab === (isSavingsRoute ? 'savings' : 'loans') ? 'active' : ''}`}
            >
              {isSavingsRoute ? 'Savings Records' : 'Active Loans'}
            </button>
            {!isSavingsRoute && (
              <button 
                onClick={() => setActiveTab('history')}
                className={`la-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              >
                Payment History
              </button>
            )}
            {approvalMethod === 'manual' && (
              <button 
                onClick={() => setActiveTab('pending')}
                className={`la-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              >
                Pending Approvals
                {(isSavingsRoute ? pendingSavings.length : pendingLoanPayments.length) > 0 && (
                  <span className="la-tab-badge">
                    {isSavingsRoute ? pendingSavings.length : pendingLoanPayments.length}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        <div className="la-search-container">
          <div className="la-search-wrapper">
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder={isSavingsRoute ? "Search by member name or goal..." : "Search by member name or loan ID..."} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="la-search-input"
            />
          </div>
          {isSavingsRoute && activeTab === 'savings' && (
            <select 
              value={savingsTypeFilter} 
              onChange={(e) => setSavingsTypeFilter(e.target.value)}
              className="la-search-select"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits Only</option>
              <option value="withdrawal">Withdrawals Only</option>
            </select>
          )}
        </div>

        {activeTab === 'savings' && isSavingsRoute && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
            {/* Table */}
            <div className="loan-admin-mgmt-table-container" style={{ margin: 0 }}>
              <table className="loan-admin-mgmt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Goal</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
                ) : (() => {
                  const filteredSavingsList = confirmedSavings.filter(s => {
                    const matchesSearch = (s.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.goalName || s.goalId || '').toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesType = savingsTypeFilter === 'all' || s.type === savingsTypeFilter;
                    return matchesSearch && matchesType;
                  });
                  
                  if (filteredSavingsList.length === 0) {
                    return <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No records found</td></tr>;
                  }
                  
                  const paginatedSavings = filteredSavingsList.slice((savingsPage - 1) * SAVINGS_PER_PAGE, savingsPage * SAVINGS_PER_PAGE);
                  
                  return (
                    <>
                      {paginatedSavings.map(txn => (
                        <tr key={txn._id} className="loan-admin-mgmt-table-row-hover" onClick={() => setSelectedSavings(txn)} style={{ cursor: 'pointer' }}>
                          <td>{fmtDate(txn.confirmedAt || txn.date)}</td>
                          <td>
                            <div className="loan-admin-mgmt-table-member">
                              <p className="loan-admin-mgmt-table-member-name">{txn.memberName || txn.email}</p>
                              <p className="loan-admin-mgmt-table-member-email">{txn.email}</p>
                            </div>
                          </td>
                          <td>
                            <span className={`savings-type-badge savings-type-${txn.type}`}>
                              {txn.type}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', color: '#4B5563' }}>{txn.goalName || 'General Savings'}</td>
                          <td className={`savings-amount-${txn.type}`}>
                            {txn.type === 'withdrawal' ? '-' : '+'}{fmt(txn.amount)}
                          </td>
                          <td>
                            <span className="ps-status-badge on-track">Confirmed</span>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })()}
              </tbody>
            </table>
            </div>

            {(() => {
              const filteredSavingsList = confirmedSavings.filter(s => {
                const matchesSearch = (s.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.goalName || s.goalId || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesType = savingsTypeFilter === 'all' || s.type === savingsTypeFilter;
                return matchesSearch && matchesType;
              });
              const totalSavingsPages = Math.ceil(filteredSavingsList.length / SAVINGS_PER_PAGE);
              if (totalSavingsPages > 1) {
                return (
                  <div className="la-pagination">
                    <button disabled={savingsPage === 1} onClick={() => setSavingsPage(p => p - 1)} className="la-pagination-btn">Prev</button>
                    <span className="la-pagination-text">Page {savingsPage} of {totalSavingsPages}</span>
                    <button disabled={savingsPage === totalSavingsPages} onClick={() => setSavingsPage(p => p + 1)} className="la-pagination-btn">Next</button>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {activeTab === 'loans' && !isSavingsRoute && (
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

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && (
          <div className="loan-admin-mgmt-table-container">
            <table className="loan-admin-mgmt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
                ) : (isSavingsRoute ? pendingSavings : pendingLoanPayments).length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No pending approvals</td></tr>
                ) : (
                  (isSavingsRoute ? pendingSavings : pendingLoanPayments).map(txn => (
                    <tr key={txn._id} className="loan-admin-mgmt-table-row-hover">
                      <td>{fmtDate(txn.submittedAt || txn.createdAt || txn.date)}</td>
                      <td>
                        <div className="loan-admin-mgmt-table-member">
                          <p className="loan-admin-mgmt-table-member-name">{txn.memberName || txn.email}</p>
                          <p className="loan-admin-mgmt-table-member-email">{isSavingsRoute ? `Goal: ${txn.goalId}` : `Loan: ${txn.loanId}`}</p>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter', textTransform: 'capitalize', background: txn.paymentType === 'full' ? '#DCFCE7' : txn.paymentType === 'advance' ? '#DBEAFE' : '#F3F4F6', color: txn.paymentType === 'full' ? '#166534' : txn.paymentType === 'advance' ? '#1E3A8A' : '#374151' }}>
                          {txn.paymentType || 'regular'}
                          {txn.monthsCovered > 1 && ` (${txn.monthsCovered}mo)`}
                        </span>
                      </td>
                      <td className="loan-admin-mgmt-table-amount" style={{ color: '#EA580C' }}>{fmt(txn.amount)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{txn.paymentMethod || 'cash'}</td>
                      <td>{txn.referenceNumber || '—'}</td>
                      <td>
                        {(txn.proofData || txn.proofOfPayment) ? (
                          <img 
                            src={txn.proofData || txn.proofOfPayment} 
                            alt="Proof" 
                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #E5E7EB' }} 
                            onClick={(e) => { e.stopPropagation(); const win = window.open(); win.document.write(`<img src="${txn.proofData || txn.proofOfPayment}" style="max-width:100%;" />`); }}
                          />
                        ) : (
                          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>No Proof</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => { setPendingDetail(txn); setShowRejectInput(false); }} style={{ padding: '6px 12px', background: '#DBEAFE', color: '#1E3A8A', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Review</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment History Tab (Loans Only) */}
        {activeTab === 'history' && !isSavingsRoute && (
          <div className="loan-admin-mgmt-table-container">
            <table className="loan-admin-mgmt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading...</td></tr>
                ) : loanHistory.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No payment history found</td></tr>
                ) : (
                  loanHistory.map(txn => (
                    <tr key={txn._id} className="loan-admin-mgmt-table-row-hover" onClick={() => setPendingDetail(txn)} style={{ cursor: 'pointer' }}>
                      <td>{fmtDate(txn.submittedAt || txn.createdAt || txn.date)}</td>
                      <td>
                        <div className="loan-admin-mgmt-table-member">
                          <p className="loan-admin-mgmt-table-member-name">{txn.memberName || txn.email}</p>
                          <p className="loan-admin-mgmt-table-member-email">{`Loan: ${txn.loanId}`}</p>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter', textTransform: 'capitalize', background: txn.paymentType === 'full' ? '#DCFCE7' : txn.paymentType === 'advance' ? '#DBEAFE' : '#F3F4F6', color: txn.paymentType === 'full' ? '#166534' : txn.paymentType === 'advance' ? '#1E3A8A' : '#374151' }}>
                          {txn.paymentType || 'regular'}
                          {txn.monthsCovered > 1 && ` (${txn.monthsCovered}mo)`}
                        </span>
                      </td>
                      <td className="loan-admin-mgmt-table-amount" style={{ color: '#EA580C' }}>{fmt(txn.amount)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{txn.paymentMethod || 'cash'}</td>
                      <td>{txn.referenceNumber || '—'}</td>
                      <td>
                        <span className={`ps-status-badge ${txn.status === 'confirmed' ? 'on-track' : 'default'}`}>
                          {txn.status === 'confirmed' ? 'Confirmed' : 'Rejected'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {historyTotalCount > HISTORY_PER_PAGE && (
              <div className="la-pagination" style={{ margin: '20px 0 0 0' }}>
                <button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)} className="la-pagination-btn">Prev</button>
                <span className="la-pagination-text">Page {historyPage} of {Math.ceil(historyTotalCount / HISTORY_PER_PAGE)}</span>
                <button disabled={historyPage === Math.ceil(historyTotalCount / HISTORY_PER_PAGE)} onClick={() => setHistoryPage(p => p + 1)} className="la-pagination-btn">Next</button>
              </div>
            )}
          </div>
        )}


        <div className="loan-admin-mgmt-pagination">
          <p className="loan-admin-mgmt-pagination-info">
            {activeTab === 'loans' ? `Showing ${filtered.length} active loans` : ''}
          </p>
        </div>
      </div>

      {/* ── Loan Detail Modal ── */}
      {selectedLoan && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => { setSelectedLoan(null); setSelectedLoanPayments([]); }}>
          <div className="loan-admin-mgmt-modal-container" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="loan-admin-mgmt-modal-header">
              <h2 className="loan-admin-mgmt-modal-title">Loan Payment Progress</h2>
              <button className="loan-admin-mgmt-modal-close" onClick={() => { setSelectedLoan(null); setSelectedLoanPayments([]); }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px 24px 8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, marginBottom: '2px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Loan ID</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'Inter', color: '#111827' }}>{selectedLoan.loanId}</p>
                </div>
                <div style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, marginBottom: '2px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Member</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'Inter', color: '#111827' }}>{selectedLoan.memberName}</p>
                </div>
                <div style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, marginBottom: '2px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Loan Amount</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'Inter', color: '#111827' }}>{fmt(selectedLoan.amount)}</p>
                </div>
                <div style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, marginBottom: '2px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Monthly Payment</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'Inter', color: '#155DFC' }}>{fmt(selectedLoan.monthlyPayment)}</p>
                </div>
                <div style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, marginBottom: '2px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Term</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'Inter', color: '#111827' }}>{selectedLoan.termMonths} months</p>
                </div>
                <div style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, marginBottom: '2px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Interest Rate</p>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'Inter', color: '#111827' }}>{(selectedLoan.interestRate < 1 ? (selectedLoan.interestRate * 100).toFixed(1) : selectedLoan.interestRate)}%</p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#EEF2FF', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', border: '1px solid #E0E7FF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Inter', color: '#1E3A8A' }}>Repayment Progress</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Inter', color: '#155DFC', background: '#DBEAFE', padding: '4px 10px', borderRadius: '20px' }}>
                    {selectedLoan.paidMonths || 0} / {selectedLoan.termMonths || 0} months
                  </span>
                </div>
                <div style={{ background: '#BFDBFE', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
                  <div style={{
                    background: '#2563EB', borderRadius: '8px', height: '100%',
                    width: `${Math.max(2, ((selectedLoan.paidMonths || 0) / (selectedLoan.termMonths || 1)) * 100)}%`,
                    transition: 'width 0.4s ease-out',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', fontFamily: 'Inter' }}>Balance: <span style={{ color: '#111827' }}>{fmt(selectedLoan.remainingBalance)}</span></span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', fontFamily: 'Inter' }}>Total: <span style={{ color: '#111827' }}>{fmt(selectedLoan.totalRepayment)}</span></span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ padding: '4px' }}>
                  <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', fontWeight: 600 }}>Status</p>
                  <span className={`ps-status-badge ${selectedLoan.paymentStatus.cls}`} style={{ fontSize: '14px', padding: '4px 10px', display: 'inline-block', fontWeight: 600 }}>{selectedLoan.paymentStatus.label}</span>
                </div>
                <div style={{ padding: '4px' }}>
                  <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', fontWeight: 600 }}>Days Late</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'Inter', color: selectedLoan.daysLate > 0 ? '#DC2626' : '#16A34A' }}>{selectedLoan.daysLate > 0 ? `${selectedLoan.daysLate} days` : 'Current'}</p>
                </div>
                <div style={{ padding: '4px' }}>
                  <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', fontWeight: 600 }}>Approved Date</p>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, fontFamily: 'Inter', color: '#374151' }}>{fmtDate(selectedLoan.approvedDate)}</p>
                </div>
                <div style={{ padding: '4px' }}>
                  <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280', fontFamily: 'Inter', fontWeight: 600 }}>Next Due Date</p>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, fontFamily: 'Inter', color: '#374151' }}>{fmtDate(selectedLoan.effectiveDueDate)}</p>
                </div>
              </div>

              {/* Payment History */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, fontFamily: 'Inter', color: '#1E3A8A' }}>Payment History</p>
                  {selectedLoanPayments.length === 0 && !selectedLoanPaymentsLoading && (
                    <button
                      onClick={async () => {
                        setSelectedLoanPaymentsLoading(true);
                        try {
                          const res = await fetch(`${API}/api/admin/loan-payments?status=all&limit=50&search=${encodeURIComponent(selectedLoan.loanId)}`, { headers: { Authorization: `Bearer ${token}` } });
                          const data = await res.json();
                          if (data.success) setSelectedLoanPayments((data.payments || []).filter(p => p.status === 'confirmed'));
                        } catch { /* silent */ }
                        finally { setSelectedLoanPaymentsLoading(false); }
                      }}
                      style={{ background: '#EEF2FF', color: '#1E3A8A', border: '1px solid #C7D2FE', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}
                    >Load History</button>
                  )}
                </div>
                {selectedLoanPaymentsLoading && (
                  <p style={{ fontSize: '13px', color: '#9CA3AF', fontFamily: 'Inter', textAlign: 'center', padding: '12px 0' }}>Loading...</p>
                )}
                {selectedLoanPayments.length > 0 && (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Inter' }}>
                      <thead>
                        <tr style={{ background: '#F9FAFB' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Date</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Amount</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Method</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLoanPayments.map((p, i) => (
                          <tr key={p._id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '7px 10px', color: '#374151' }}>{fmtDate(p.confirmedAt || p.submittedAt)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>{fmt(p.amount)}</td>
                            <td style={{ padding: '7px 10px', color: '#374151', textTransform: 'capitalize' }}>{p.paymentMethod || 'cash'}</td>
                            <td style={{ padding: '7px 10px' }}>
                              <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize', background: p.paymentType === 'full' ? '#DCFCE7' : p.paymentType === 'advance' ? '#DBEAFE' : '#F3F4F6', color: p.paymentType === 'full' ? '#166534' : p.paymentType === 'advance' ? '#1E3A8A' : '#374151' }}>
                                {p.paymentType || 'regular'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!selectedLoanPaymentsLoading && selectedLoanPayments.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'Inter', textAlign: 'center', padding: '8px 0', margin: 0 }}>Click "Load History" to view payment records</p>
                )}
              </div>
            </div>
            <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setSelectedLoan(null); setSelectedLoanPayments([]); }} style={{ background: '#155DFC', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending Detail Modal ── */}
      {pendingDetail && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => !actionLoading && setPendingDetail(null)} style={{ zIndex: 2000 }}>
          <div className="loan-admin-mgmt-modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="loan-admin-mgmt-modal-header">
              <h2 className="loan-admin-mgmt-modal-title">
                {pendingDetail.status === 'pending' ? 'Review Transaction' : 'Transaction Detail'}
              </h2>
              <button className="loan-admin-mgmt-modal-close" onClick={() => setPendingDetail(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '16px', columnGap: '12px', marginBottom: '16px' }}>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Member</p><p style={{ margin: 0, fontWeight: 600 }}>{pendingDetail.memberName || pendingDetail.email}</p></div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Amount</p><p style={{ margin: 0, fontWeight: 700, color: '#EA580C', fontSize: '16px' }}>{fmt(pendingDetail.amount)}</p></div>
                <div>
                  <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Payment Type</p>
                  <p style={{ margin: 0, fontWeight: 700, textTransform: 'capitalize' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', background: pendingDetail.paymentType === 'full' ? '#DCFCE7' : pendingDetail.paymentType === 'advance' ? '#DBEAFE' : '#F3F4F6', color: pendingDetail.paymentType === 'full' ? '#166534' : pendingDetail.paymentType === 'advance' ? '#1E3A8A' : '#374151' }}>
                      {pendingDetail.paymentType || 'regular'}
                    </span>
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Months Covered</p>
                  <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>{pendingDetail.monthsCovered > 0 ? `${pendingDetail.monthsCovered} month${pendingDetail.monthsCovered > 1 ? 's' : ''}` : 'Partial'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Method</p>
                  <p style={{ margin: 0, fontWeight: 600, textTransform: 'capitalize' }}>
                    {pendingDetail.paymentMethod || 'cash'}
                    {pendingDetail.subMethod ? ` (${pendingDetail.subMethod})` : ''}
                  </p>
                </div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Reference #</p><p style={{ margin: 0, fontWeight: 600 }}>{pendingDetail.referenceNumber || '—'}</p></div>
                
                {pendingDetail.accountName && (
                  <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Sender Account Name</p><p style={{ margin: 0, fontWeight: 600 }}>{pendingDetail.accountName}</p></div>
                )}
                {pendingDetail.accountNumber && (
                  <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Sender Account No.</p><p style={{ margin: 0, fontWeight: 600 }}>{pendingDetail.accountNumber}</p></div>
                )}
              </div>

              {(pendingDetail.proofData || pendingDetail.proofOfPayment) && (() => {
                const proof = pendingDetail.proofData || pendingDetail.proofOfPayment;
                const isPdf = proof.startsWith('data:application/pdf');
                return (
                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Proof of Payment</p>
                    {isPdf ? (
                      <div style={{ background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>📄 {pendingDetail.proofFileName || 'proof.pdf'}</span>
                        <button
                          onClick={() => { const win = window.open(); win.document.write(`<iframe src="${proof}" style="width:100%;height:100%;border:none;" />`); }}
                          style={{ background: '#155DFC', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >View PDF</button>
                      </div>
                    ) : (
                      <img
                        src={proof}
                        alt="Proof"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer' }}
                        onClick={() => { const win = window.open(); win.document.write(`<img src="${proof}" style="max-width:100%;" />`); }}
                      />
                    )}
                  </div>
                );
              })()}

              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                {pendingDetail.status !== 'pending' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setPendingDetail(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#155DFC', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                  </div>
                ) : !showRejectInput ? (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowRejectInput(true)} disabled={actionLoading} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                    <button onClick={handleApprovePending} disabled={actionLoading} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#16A34A', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{actionLoading ? 'Approving...' : 'Approve'}</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter reason for rejection..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', width: '100%', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px' }} />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setShowRejectInput(false); setRejectReason(''); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleRejectPending} disabled={actionLoading || !rejectReason.trim()} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: 'white', fontWeight: 600, cursor: 'pointer' }}>{actionLoading ? 'Rejecting...' : 'Confirm Rejection'}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ── Savings Detail Modal ── */}
      {selectedSavings && (
        <div className="loan-admin-mgmt-modal-overlay" onClick={() => setSelectedSavings(null)} style={{ zIndex: 2000 }}>
          <div className="loan-admin-mgmt-modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="loan-admin-mgmt-modal-header">
              <h2 className="loan-admin-mgmt-modal-title">Savings Transaction Detail</h2>
              <button className="loan-admin-mgmt-modal-close" onClick={() => setSelectedSavings(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '16px', columnGap: '12px', marginBottom: '16px' }}>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Member Name</p><p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{selectedSavings.memberName || selectedSavings.email}</p></div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Email</p><p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{selectedSavings.email}</p></div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Goal</p><p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{selectedSavings.goalName || 'General Savings'}</p></div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Type</p>
                  <p style={{ margin: 0, fontWeight: 700, textTransform: 'capitalize' }}>
                    <span className={`savings-type-badge savings-type-${selectedSavings.type}`}>{selectedSavings.type}</span>
                  </p>
                </div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Amount</p><p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: selectedSavings.type === 'withdrawal' ? '#DC2626' : '#16A34A' }}>{fmt(selectedSavings.amount)}</p></div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Date Confirmed</p><p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{fmtDate(selectedSavings.confirmedAt || selectedSavings.date)}</p></div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Method</p><p style={{ margin: 0, fontSize: '15px', fontWeight: 600, textTransform: 'capitalize' }}>{selectedSavings.paymentMethod || 'cash'}</p></div>
                <div><p style={{ margin: 0, marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>Reference #</p><p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{selectedSavings.referenceNumber || '—'}</p></div>
              </div>

              {(selectedSavings.proofData || selectedSavings.proofOfPayment) && (
                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Proof of Payment</p>
                  <img src={selectedSavings.proofData || selectedSavings.proofOfPayment} alt="Proof" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                </div>
              )}

              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedSavings(null)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#155DFC', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              </div>
            </div>
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
                  <div className="walkin-form-group">
                    <label className="walkin-label">Select Savings Goal</label>
                    <select className="walkin-select" value={walkinSelectedGoal} onChange={(e) => setWalkinSelectedGoal(e.target.value)} disabled={!walkinSelectedMember || walkinGoals.length === 0}>
                      {!walkinSelectedMember ? (
                        <option value="">-- Search and Select a Member First --</option>
                      ) : walkinGoals.length === 0 ? (
                        <option value="">No Active Goals Found</option>
                      ) : (
                        <option value="">-- Choose Goal --</option>
                      )}
                      {walkinGoals.map(g => (
                        <option key={g._id} value={g._id}>
                          {g.name} — Progress: {fmt(g.savedAmount)} / {fmt(g.targetAmount)}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    <option value="e-wallet">E-Wallet</option>
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
