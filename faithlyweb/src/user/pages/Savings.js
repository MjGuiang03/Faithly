import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import SavingsModals from '../components/SavingsModal';
import '../styles/Savings.css';
import API from '../../utils/api';

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

const GoalIcon = ({ color = 'blue', type = 'default' }) => {
    const stroke = GOAL_COLORS[color]?.pct || '#185fa5';
    if (type === 'house') return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 14V8l6-5 6 5v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M7 14v-4h4v4" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
    );
    if (type === 'bag') return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="5" width="14" height="9" rx="2" stroke={stroke} strokeWidth="1.3" />
            <path d="M6 5V4a3 3 0 0 1 6 0v1" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M6 10h6" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
    if (type === 'star') return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2l1.5 4.5H15l-3.75 2.75L12.75 14 9 11.25 5.25 14l1.5-4.75L3 6.5h4.5L9 2z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
    );
    if (type === 'car') return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 10l2-4h10l2 4v3H2v-3z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
            <circle cx="5" cy="13" r="1.2" stroke={stroke} strokeWidth="1.1" />
            <circle cx="13" cy="13" r="1.2" stroke={stroke} strokeWidth="1.1" />
        </svg>
    );
    // default: person/emergency
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5 5 0 0 1 0 10A5 5 0 0 1 9 2zm0 7V6" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M4 15s1-2 5-2 5 2 5 2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
};

const TxnArrowIn = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2v8M3 7l4 4 4-4" stroke="#27500a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const TxnArrowOut = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 12V4M3 7l4-4 4 4" stroke="#991b1b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Savings() {
    useNavigate();
    useAuth();

    /* ── modal state ── */
    const [modal, setModal] = useState(null); // 'deposit' | 'newGoal' | 'quickDeposit' | 'editGoal'
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
    const TXN_LIMIT = 5;

    const fetchAll = useCallback(async () => {
        setDataLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) { setDataLoading(false); return; }
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        try {
            const [goalsRes, txnRes, statsRes] = await Promise.all([
                fetch(`${API}/api/savings/goals`, { headers }),
                fetch(`${API}/api/savings/transactions?page=${txnPage}&limit=${TXN_LIMIT}`, { headers }),
                fetch(`${API}/api/savings/stats`, { headers }),
            ]);
            if ([goalsRes, txnRes, statsRes].some(r => r.status === 401)) {
                localStorage.removeItem('token');
                window.location.href = '/';
                return;
            }
            const [goalsData, txnData, statsData] = await Promise.all([
                goalsRes.json(), txnRes.json(), statsRes.json(),
            ]);
            if (goalsData.success) setGoals(goalsData.goals || []);
            if (txnData.success) {
                setTransactions(txnData.transactions || []);
                setTxnTotal(txnData.totalCount || 0);
            }
            if (statsData.success) setStats(statsData.stats || {});
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setDataLoading(false);
        }
    }, [txnPage]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openDeposit = () => setModal('deposit');
    const openNewGoal = () => setModal('newGoal');
    const openQuickDep = (goal) => { setModalData(goal); setModal('quickDeposit'); };
    // eslint-disable-next-line no-unused-vars
    const openEditGoal = (goal) => { setModalData(goal); setModal('editGoal'); };
    const closeModal = () => { setModal(null); setModalData(null); fetchAll(); };

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
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < 5 ? '0.8px solid var(--border)' : 'none' }}>
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
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                        <circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M13 9v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 21s1.5-2 6-2 6 2 6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
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
                            <div className="sv-goal-icon" style={{ background: colors.bg }}>
                                <GoalIcon color={colorKey} type={goal.iconType || 'default'} />
                            </div>
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
                            <button
                                className="sv-goal-more-btn"
                                title="Quick deposit"
                                onClick={() => openQuickDep(goal)}
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    /* ── deposit strip (inline, bottom of goals section) ── */
    const renderDepositStrip = () => {
        if (!hasGoals) return null;
        return (
            <div className="sv-deposit-strip">
                <input
                    className="sv-deposit-input"
                    type="text"
                    placeholder="₱ Amount to deposit"
                    readOnly
                    onClick={openDeposit}
                />
                <select className="sv-deposit-select" onClick={openDeposit} onChange={() => { }}>
                    {goals.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
                <button className="sv-deposit-btn" onClick={openDeposit}>Deposit</button>
            </div>
        );
    };

    /* ── transactions ── */
    const renderTransactions = () => {
        if (transactions.length === 0) return (
            <div className="sv-txn-empty">
                <div className="sv-txn-empty-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
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
                        <div key={txn._id} className="sv-txn-row">
                            <div className={`sv-txn-dot-wrap ${isIn ? 'sv-txn-dot-wrap--in' : 'sv-txn-dot-wrap--out'}`}>
                                {isIn ? <TxnArrowIn /> : <TxnArrowOut />}
                            </div>
                            <div className="sv-txn-info">
                                <div className="sv-txn-label">{txn.description || (isIn ? 'Deposit' : 'Withdrawal')}{txn.goalName ? ` — ${txn.goalName}` : ''}</div>
                                <div className="sv-txn-date">{fmtDate(txn.date)}{txn.source ? ` · ${txn.source}` : ''}</div>
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
        <div className="home-layout">
            <Sidebar />

            <div className="user-main-content">

                {dataLoading && renderSkeleton()}

                {!dataLoading && (
                    <>
                        {/* Header */}
                        <div className="sv-page-header">
                            <div>
                                <h1 className="sv-page-title">My Savings</h1>
                                <p className="sv-page-subtitle">Build your goals and grow your funds</p>
                            </div>
                            <button className="sv-deposit-header-btn" onClick={openDeposit}>
                                + Deposit
                            </button>
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
                                    <div className={`sv-stat-card ${stats.totalSavings > 0 ? 'sv-stat-card--green' : ''}`}>
                                        <label className="sv-stat-label">Total savings</label>
                                        <div className={`sv-stat-value ${stats.totalSavings <= 0 ? 'sv-stat-value--muted' : ''}`}>
                                            {fmt(stats.totalSavings)}
                                        </div>
                                        <div className="sv-stat-sub">{stats.totalSavings > 0 ? 'Current balance' : 'No balance yet'}</div>
                                    </div>
                                    <div className="sv-stat-card">
                                        <label className="sv-stat-label">This month</label>
                                        <div className={`sv-stat-value ${!stats.thisMonth ? 'sv-stat-value--muted' : ''}`}>
                                            {stats.thisMonth > 0 ? fmt(stats.thisMonth) : '₱0.00'}
                                        </div>
                                        <div className="sv-stat-sub">
                                            {stats.thisMonth > 0
                                                ? `Deposited in ${new Date().toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}`
                                                : `No deposits in ${new Date().toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}`}
                                        </div>
                                    </div>
                                    <div className="sv-stat-card">
                                        <label className="sv-stat-label">Active goals</label>
                                        <div className={`sv-stat-value ${goals.length <= 0 ? 'sv-stat-value--muted' : ''}`}>
                                            {goals.length > 0 ? stats.activeGoals || goals.filter(g => g.status !== 'completed').length : '—'}
                                        </div>
                                        <div className="sv-stat-sub">
                                            {goals.length > 0
                                                ? `${goals.filter(g => g.status !== 'completed').length} in progress · ${goals.filter(g => g.status === 'completed').length} done`
                                                : 'No goals set'}
                                        </div>
                                    </div>
                                    <div className="sv-stat-card">
                                        <label className="sv-stat-label">Max loanable</label>
                                        <div className={`sv-stat-value ${stats.totalSavings <= 0 ? 'sv-stat-value--muted' : ''}`}>
                                            {stats.totalSavings > 0 ? fmt(stats.totalSavings * 2) : '—'}
                                        </div>
                                        <div className="sv-stat-sub">
                                            {stats.totalSavings > 0 ? 'Personal loan (2x)' : 'Deposit to unlock'}
                                        </div>
                                    </div>
                                </div>

                                {/* Goals section */}
                                <div className="sv-section">
                                    <div className="sv-section-head">
                                        <div className="sv-section-title">Savings goals</div>
                                        <button className="sv-section-link" onClick={openNewGoal}>+ New goal</button>
                                    </div>

                                    {renderGoals()}
                                    {renderDepositStrip()}
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
                                            <button
                                                className="sv-page-btn"
                                                onClick={() => setTxnPage(p => Math.min(Math.ceil(txnTotal / TXN_LIMIT), p + 1))}
                                                disabled={txnPage === Math.ceil(txnTotal / TXN_LIMIT)}
                                            >
                                                Next
                                            </button>
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
            />
        </div>
    );
}