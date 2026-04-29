import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import SavingsModals from '../components/SavingsModal';
import '../styles/Savings.css';
import API from '../../utils/api';
import { Circle, PiggyBank, ArrowDownLeft, ArrowUpRight, TrendingUp, Target, Banknote } from 'lucide-react';
import { isOfficerPosition } from '../../utils/officerPositions';


const fmt = (n) =>
    n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const GOAL_COLORS = {
    blue: { bg: '#e6f1fb', bar: '#1E3A8A', text: '#0c447c', pct: '#185fa5' },
    green: { bg: '#eaf3de', bar: '#639922', text: '#27500a', pct: '#3b6d11' },
    amber: { bg: '#faeeda', bar: '#ba7517', text: '#633806', pct: '#854f0b' },
    teal: { bg: '#e1f5ee', bar: '#1d9e75', text: '#085041', pct: '#0f6e56' },
    purple: { bg: '#eeedfe', bar: '#7f77dd', text: '#26215c', pct: '#534ab7' },
    pink: { bg: '#fbeaf0', bar: '#d4537e', text: '#4b1528', pct: '#993556' },
};


const TxnArrowIn = () => (
    <ArrowDownLeft size={14} color="#0D1F45" />
);

const TxnArrowOut = () => (
    <ArrowUpRight size={14} color="#0D1F45" />
);

export default function Savings() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Redirect non-officers away from Savings
    const isOfficer = isOfficerPosition(user?.position);
    useEffect(() => {
      if (user && !isOfficer) {
        navigate('/home', { replace: true });
      }
    }, [user, isOfficer, navigate]);

    /* ── modal state ── */
    const [modal, setModal] = useState(null); // 'deposit' | 'newGoal' | 'quickDeposit' | 'editGoal' | 'transfer'
    const [modalData, setModalData] = useState(null);

    /* ── page data ── */
    const [goals, setGoals] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({
        totalSavings: 0,
        thisMonth: 0,
        activeGoals: 0,
        completedGoals: 0,
        maxLoanable: 0,
    });
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState('');
    const [txnPage, setTxnPage] = useState(1);
    const [txnTotal, setTxnTotal] = useState(0);
    const TXN_LIMIT = 4;
    const [showInstruction, setShowInstruction] = useState(false);
    const [hasClosedInstruction, setHasClosedInstruction] = useState(false);

    const fetchAll = useCallback(async (showLoader = true) => {
        if (showLoader) setDataLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) { if (showLoader) setDataLoading(false); return; }
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        try {
            if (txnPage === 1) {
                const res = await fetch(`${API}/api/savings/overview?txnLimit=${TXN_LIMIT}`, { headers });
                
                // Safety guard
                const contentType = res.headers.get("content-type");
                if (!res.ok || !contentType || !contentType.includes("application/json")) {
                    setError('Connection issue or backend update pending. Please try again in 1 minute.');
                    setDataLoading(false);
                    return;
                }

                if (res.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                    return;
                }
                const data = await res.json();
                if (data.success) {
                    setGoals(data.goals || []);
                    setTransactions(data.transactions || []);
                    setTxnTotal(data.txnTotal || 0);
                    setStats(data.stats || {});
                    
                    if ((data.stats?.totalSavings || 0) <= 0 && !hasClosedInstruction) {
                        setShowInstruction(true);
                    }
                }
            } else {
                const res = await fetch(`${API}/api/savings/transactions?page=${txnPage}&limit=${TXN_LIMIT}`, { headers });
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                    return;
                }
                const data = await res.json();
                if (data.success) {
                    setTransactions(data.transactions || []);
                    setTxnTotal(data.totalCount || 0);
                }
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setDataLoading(false);
        }
    }, [txnPage, hasClosedInstruction]);

    // Initial data fetch
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);


    const openDeposit = () => setModal('deposit');
    const openWithdraw = () => setModal('withdraw');
    const openNewGoal = () => setModal('newGoal');
    const closeModal = () => { setModal(null); setModalData(null); fetchAll(false); };

    const hasGoals = goals.length > 0;

    /* ── skeleton ── */
    const renderSkeleton = () => (
        <>
            <div className="sv-page-header">
                <div>
                    <div className="sv-skeleton" style={{ height: '26px', width: '130px', marginBottom: '8px' }} />
                    <div className="sv-skeleton" style={{ height: '14px', width: '220px' }} />
                </div>
                <div className="sv-skeleton" style={{ height: '38px', width: '120px', borderRadius: '10px' }} />
            </div>
            <div className="sv-skeleton" style={{ height: '42px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }} />
            <div className="sv-stats">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="sv-stat-card">
                        <div className="sv-skeleton" style={{ height: '11px', width: '60%', marginBottom: '6px' }} />
                        <div className="sv-skeleton" style={{ height: '28px', width: '80%', marginBottom: '4px' }} />
                        <div className="sv-skeleton" style={{ height: '11px', width: '50%' }} />
                    </div>
                ))}
            </div>
            <div className="sv-section" style={{ marginBottom: '16px' }}>
                <div className="sv-section-head">
                    <div className="sv-skeleton" style={{ height: '15px', width: '110px' }} />
                    <div className="sv-skeleton" style={{ height: '15px', width: '80px' }} />
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="sv-goal-row">
                        <div className="sv-skeleton" style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="sv-skeleton" style={{ height: '13px', width: '140px' }} />
                            <div className="sv-skeleton" style={{ height: '11px', width: '200px' }} />
                            <div className="sv-skeleton" style={{ height: '5px', width: '100%', borderRadius: '4px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                            <div className="sv-skeleton" style={{ height: '13px', width: '70px' }} />
                            <div className="sv-skeleton" style={{ height: '11px', width: '55px' }} />
                            <div className="sv-skeleton" style={{ height: '11px', width: '35px' }} />
                        </div>
                    </div>
                ))}
                <div className="sv-skeleton" style={{ height: '52px', margin: 0, borderRadius: 0 }} />
            </div>
            <div className="sv-section">
                <div className="sv-section-head">
                    <div className="sv-skeleton" style={{ height: '15px', width: '140px' }} />
                </div>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < 4 ? '0.8px solid var(--border)' : 'none' }}>
                        <div className="sv-skeleton" style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div className="sv-skeleton" style={{ height: '13px', width: '180px' }} />
                            <div className="sv-skeleton" style={{ height: '11px', width: '120px' }} />
                        </div>
                        <div className="sv-skeleton" style={{ height: '13px', width: '80px' }} />
                    </div>
                ))}
            </div>
        </>
    );

    /* ── loanable banner ── */
    const renderLoanableBanner = () => {
        const bal = stats.totalSavings || 0;
        if (bal <= 0) return (
            <div className="sv-loanable-banner sv-loanable-banner--empty">
                <div className="sv-loanable-text">
                    <strong>Your current loanable amounts</strong>
                    <span>Start saving to unlock loan eligibility</span>
                </div>
                <div className="sv-loanable-pills">
                    <span className="sv-loanable-pill sv-loanable-pill--muted">Personal — ₱0</span>
                    <span className="sv-loanable-pill sv-loanable-pill--muted">Emergency — ₱0</span>
                    <span className="sv-loanable-pill sv-loanable-pill--muted">Short-Term — ₱0</span>
                </div>
            </div>
        );
        return (
            <div className="sv-loanable-banner">
                <div className="sv-loanable-text">
                    <strong>Your current loanable amounts</strong>
                    <span>Based on {fmt(bal)} savings balance</span>
                </div>
                <div className="sv-loanable-pills">
                    <span className="sv-loanable-pill sv-loanable-pill--blue">Personal — up to {fmt(bal * 2)}</span>
                    <span className="sv-loanable-pill sv-loanable-pill--amber">Emergency — up to {fmt(bal * 1.5)}</span>
                    <span className="sv-loanable-pill sv-loanable-pill--teal">Short-Term — up to {fmt(bal)}</span>
                </div>
            </div>
        );
    };

    /* ── goals list ── */
    const renderGoals = () => {
        if (!hasGoals) return (
            <div className="sv-goals-empty">
                <div className="sv-goals-empty-icon">
                    <PiggyBank size={26} />
                </div>
                <div className="sv-goals-empty-title">No savings goals yet</div>
                <p className="sv-goals-empty-sub">Set a goal to start saving — whether it's an emergency fund, a big purchase, or anything in between.</p>
                <button className="sv-goals-empty-btn" onClick={openNewGoal}>+ Create your first goal</button>
            </div>
        );

        return (
            <div className="sv-goals-list sv-fade-in">
                {goals.map((goal) => {
                    const colorKey = goal.color || 'blue';
                    const colors = GOAL_COLORS[colorKey] || GOAL_COLORS.blue;
                    const pct = goal.targetAmount > 0
                        ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
                        : 0;
                    const isDone = goal.status === 'completed' || pct >= 100;
                    return (
                        <div key={goal._id} className="sv-goal-row">
                            <div className="sv-goal-clickable-data" onClick={() => { setModal('goalInfo'); setModalData(goal); }}>
                                <div className="sv-goal-info">
                                    <div className="sv-goal-name">{goal.name}</div>
                                    <div className="sv-goal-detail">
                                        Target {fmt(goal.targetAmount)}
                                        {goal.monthlyContribution > 0 && ` · Monthly ${fmt(goal.monthlyContribution)}`}
                                        {isDone && ' · Completed'}
                                        {goal.targetDate && !isDone && ` · Due ${fmtDate(goal.targetDate)}`}
                                    </div>
                                    <div className="sv-goal-bar-wrap">
                                        <div className="sv-goal-bar-track">
                                            <div
                                                className="sv-goal-bar-fill"
                                                style={{ width: `${Math.max(isDone ? 100 : 2, pct)}%`, background: colors.bar }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="sv-goal-right">
                                    <div className="sv-goal-saved">{fmt(goal.savedAmount)}</div>
                                    <div className="sv-goal-target">of {fmt(goal.targetAmount)}</div>
                                    {isDone
                                        ? <div className="sv-goal-pct sv-goal-pct--done">Completed</div>
                                        : <div className="sv-goal-pct" style={{ color: colors.pct }}>{pct}%</div>
                                    }
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };


    /* ── transactions ── */
    const renderTransactions = () => {
        if (transactions.length === 0) return (
            <div className="sv-txn-empty">
                <div className="sv-txn-empty-icon">
                    <Circle size={20} />
                </div>
                <div className="sv-txn-empty-title">No transactions yet</div>
                <div className="sv-txn-empty-sub">Your deposits and withdrawals will appear here.</div>
            </div>
        );

        return (
            <div className="sv-txn-list sv-fade-in">
                {transactions.map((txn) => {
                    const isIn = txn.type === 'deposit';
                    return (
                        <div key={txn._id} className="sv-txn-row" onClick={() => { setModal('transactionInfo'); setModalData(txn); }}>
                            <div className={`sv-txn-dot-wrap ${isIn ? 'sv-txn-dot-wrap--in' : 'sv-txn-dot-wrap--out'}`}>
                                {isIn ? <TxnArrowIn /> : <TxnArrowOut />}
                            </div>
                            <div className="sv-txn-info">
                                <div className="sv-txn-label">{txn.description || (isIn ? 'Deposit' : 'Withdrawal')}{txn.goalName ? ` — ${txn.goalName}` : ''}</div>
                                <div className="sv-txn-date-row">
                                    <span className="sv-txn-date">{fmtDate(txn.date)}{txn.source ? ` · ${txn.source}` : ''}</span>
                                    <span className={`sv-txn-status-badge sv-txn-status--${txn.status || 'pending'}`}>
                                        {txn.status === 'confirmed' ? 'Successful' : txn.status === 'rejected' ? 'Failed' : 'Incomplete'}
                                    </span>
                                </div>
                            </div>
                            <div className={`sv-txn-amt ${isIn ? 'sv-txn-amt--in' : 'sv-txn-amt--out'}`}>
                                {isIn ? '+' : '-'}{fmt(txn.amount)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <div className="user-savings-container">

                {dataLoading && renderSkeleton()}

                {!dataLoading && (
                    <>
                        {/* Header */}
                        <div className="sv-page-header">
                            <div>
                                <h1 className="sv-page-title">My Savings</h1>
                                <p className="sv-page-subtitle">Build your goals and grow your funds</p>
                            </div>
                            <div className="sv-header-actions">
                                {stats.totalSavings <= 0 && (
                                    <button className="sv-instruction-header-btn" onClick={() => setShowInstruction(true)}>
                                        See Instructions
                                    </button>
                                )}
                                <button className="sv-withdraw-header-btn" onClick={openWithdraw}>
                                    <ArrowUpRight size={16} />
                                    Withdraw
                                </button>
                                <button className="sv-deposit-header-btn" onClick={openDeposit}>
                                    + Deposit
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="sv-error-banner">
                                <span>{error}</span>
                                <button onClick={fetchAll} className="sv-retry-btn">Retry</button>
                            </div>
                        )}

                        {!error && (
                            <>
                                {/* Nudge bar */}
                                <div className="sv-nudge-bar">
                                    <div className="sv-nudge-text">
                                        <strong>Your savings determine your loanable amount.</strong> Grow your savings to unlock higher loan limits — Personal (2x), Emergency (1.5x), and Short-Term (1x) loans are based on your total balance.
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="sv-stats">
                                    <div className="sv-stat-card sv-stat-card--primary">
                                        <div className="sv-stat-header">
                                            <label className="sv-stat-label">Total savings</label>
                                            <PiggyBank size={20} color="white" />
                                        </div>
                                        <div className={`sv-stat-value ${stats.totalSavings <= 0 ? 'sv-stat-value--muted' : ''}`}>
                                            {fmt(stats.totalSavings)}
                                        </div>
                                        <div className="sv-stat-sub">{stats.totalSavings > 0 ? 'Current balance' : 'No balance yet'}</div>
                                    </div>
                                    <div className="sv-stat-card sv-stat-card--blue-text">
                                        <div className="sv-stat-header">
                                            <label className="sv-stat-label">This month</label>
                                            <TrendingUp size={20} color="#0D1F45" />
                                        </div>
                                        <div className={`sv-stat-value ${!stats.thisMonth ? 'sv-stat-value--muted' : ''}`}>
                                            {stats.thisMonth > 0 ? fmt(stats.thisMonth) : '₱0.00'}
                                        </div>
                                        <div className="sv-stat-sub">
                                            {stats.thisMonth > 0
                                                ? `Deposited in ${new Date().toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}`
                                                : `No deposits in ${new Date().toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}`}
                                        </div>
                                    </div>
                                    <div className="sv-stat-card sv-stat-card--blue-text">
                                        <div className="sv-stat-header">
                                            <label className="sv-stat-label">Active goals</label>
                                            <Target size={20} color="#0D1F45" />
                                        </div>
                                        <div className={`sv-stat-value ${goals.length <= 0 ? 'sv-stat-value--muted' : ''}`}>
                                            {goals.length > 0 
                                                ? goals.filter(g => g.status !== 'completed' && (!g.targetAmount || (g.savedAmount || 0) < g.targetAmount)).length 
                                                : '—'}
                                        </div>
                                        <div className="sv-stat-sub">
                                            {goals.length > 0
                                                ? `${goals.filter(g => g.status !== 'completed' && (!g.targetAmount || (g.savedAmount || 0) < g.targetAmount)).length} in progress · ${goals.filter(g => g.status === 'completed' || (g.targetAmount && (g.savedAmount || 0) >= g.targetAmount)).length} done`
                                                : 'No goals set'}
                                        </div>
                                    </div>
                                    <div className="sv-stat-card sv-stat-card--blue-text sv-tooltip-container">
                                        <div className="sv-stat-header">
                                            <label className="sv-stat-label">Max loanable</label>
                                            <Banknote size={20} color="#0D1F45" />
                                        </div>
                                        <div className={`sv-stat-value ${stats.totalSavings <= 0 ? 'sv-stat-value--muted' : ''}`}>
                                            {stats.totalSavings > 0 ? fmt(stats.totalSavings * 2) : '—'}
                                        </div>
                                        <div className="sv-stat-sub">
                                            {stats.totalSavings > 0 ? 'Hover or click for details' : 'Deposit to unlock'}
                                        </div>
                                        {stats.totalSavings > 0 && (
                                            <div className="sv-tooltip-content">
                                                <div className="sv-tooltip-title">Max Loanable Amounts</div>
                                                <div className="sv-tooltip-row">
                                                    <span>Personal (2x)</span>
                                                    <strong>{fmt(stats.totalSavings * 2)}</strong>
                                                </div>
                                                <div className="sv-tooltip-row">
                                                    <span>Emergency (1.5x)</span>
                                                    <strong>{fmt(stats.totalSavings * 1.5)}</strong>
                                                </div>
                                                <div className="sv-tooltip-row">
                                                    <span>Short-Term (1x)</span>
                                                    <strong>{fmt(stats.totalSavings)}</strong>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Goals section */}
                                <div className="sv-section">
                                    <div className="sv-section-head">
                                        <div className="sv-section-title">Savings goals</div>
                                        <button className="sv-section-link" onClick={openNewGoal}>+ New goal</button>
                                    </div>

                                    {renderGoals()}
                                    {renderLoanableBanner()}
                                </div>

                                {/* Transaction history */}
                                <div className="sv-section">
                                    <div className="sv-section-head">
                                        <div className="sv-section-title">Transaction history</div>
                                        {txnTotal > TXN_LIMIT && (
                                            <div className="sv-pagination-info">
                                                Showing {((txnPage - 1) * TXN_LIMIT) + 1}–{Math.min(txnPage * TXN_LIMIT, txnTotal)} of {txnTotal}
                                            </div>
                                        )}
                                    </div>

                                    {renderTransactions()}

                                    {txnTotal > TXN_LIMIT && (
                                        <div className="sv-pagination">
                                            <button
                                                className="sv-page-btn"
                                                onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                                                disabled={txnPage === 1}
                                            >
                                                Previous
                                            </button>
                                            {Array.from({ length: Math.ceil(txnTotal / TXN_LIMIT) }, (_, i) => (
                                                <button
                                                    key={i + 1}
                                                    className={`sv-page-btn ${txnPage === i + 1 ? 'sv-page-btn--active' : ''}`}
                                                    onClick={() => setTxnPage(i + 1)}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            <SavingsModals
                modal={modal}
                modalData={modalData}
                goals={goals}
                onClose={closeModal}
                onEdit={(goal) => {
                    setModal('editGoal');
                    setModalData(goal);
                }}
                onTransfer={(goal) => {
                    setModal('transfer');
                    setModalData(goal);
                }}
                onQuickDeposit={(goal) => {
                    setModal('quickDeposit');
                    setModalData(goal);
                }}
            />

            <SavingsInstructionModal 
                isOpen={showInstruction} 
                onClose={() => {
                    setShowInstruction(false);
                    setHasClosedInstruction(true);
                }}
                onDeposit={openDeposit}
                onGoal={openNewGoal}
            />
        </>
    );
}

function SavingsInstructionModal({ isOpen, onClose, onDeposit, onGoal }) {
    if (!isOpen) return null;

    return (
        <div className="user-savings-modal-overlay">
            <div className="user-savings-modal-content sv-instruction-modal user-fade-in" style={{ maxWidth: '700px', padding: 0, overflow: 'hidden' }}>
                <div className="sv-inst-header">
                    <h2>Welcome to Savings</h2>
                    <p>Start building your financial future with FaithLy. Follow these simple steps to begin growing your funds.</p>
                </div>
                
                <div className="sv-inst-body" style={{ padding: '32px 24px' }}>
                    <div className="sv-timeline">
                        <div className="sv-timeline-item sv-timeline-item--left">
                            <div className="sv-timeline-dot"></div>
                            <div className="sv-timeline-content">
                                <h3>Set a Savings Goal</h3>
                                <p>Give your savings a purpose. Whether it's an emergency fund or a new laptop, tracking a specific goal keeps you motivated.</p>
                                <button className="sv-inst-action-link" onClick={() => { onClose(); onGoal(); }}>Create your first goal →</button>
                            </div>
                        </div>
                        
                        <div className="sv-timeline-item sv-timeline-item--right">
                            <div className="sv-timeline-dot"></div>
                            <div className="sv-timeline-content">
                                <h3>Deposit Funds</h3>
                                <p>Click the "+ Deposit" button, enter your amount, and upload your proof of payment. Our admins will verify and confirm your deposit quickly.</p>
                                <button className="sv-inst-action-link" onClick={() => { onClose(); onDeposit(); }}>Make a deposit now →</button>
                            </div>
                        </div>
                        
                        <div className="sv-timeline-item sv-timeline-item--left">
                            <div className="sv-timeline-dot"></div>
                            <div className="sv-timeline-content">
                                <h3>Unlock Loan Privileges</h3>
                                <p>Once you reach <strong>₱1,000</strong> in confirmed savings, you automatically unlock access to personal, emergency, and short-term loans!</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="sv-inst-footer">
                    <button className="sv-inst-close-btn" onClick={onClose}>I understand, let's start!</button>
                </div>
            </div>
        </div>
    );
}