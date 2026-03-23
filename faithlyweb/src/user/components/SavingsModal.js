import { useState, useEffect } from 'react';
import '../styles/SavingsModal.css';
import API from '../../utils/api';

const fmt = (n) =>
    n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00';

const GOAL_COLORS = [
    { key: 'blue', hex: '#1E3A8A', label: 'Blue' },
    { key: 'green', hex: '#639922', label: 'Green' },
    { key: 'amber', hex: '#ba7517', label: 'Amber' },
    { key: 'teal', hex: '#1d9e75', label: 'Teal' },
    { key: 'purple', hex: '#7f77dd', label: 'Purple' },
    { key: 'pink', hex: '#d4537e', label: 'Pink' },
];

const GOAL_ICONS = [
    { key: 'default', label: 'Person' },
    { key: 'house', label: 'House' },
    { key: 'bag', label: 'Briefcase' },
    { key: 'star', label: 'Star' },
    { key: 'car', label: 'Car' },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

/* ─────────────────────────────────────────────────────────────
   1.  DEPOSIT MODAL  (full — opened from top "+ Deposit" btn)
───────────────────────────────────────────────────────────── */
function DepositModal({ goals, onClose }) {
    const [selectedGoal, setSelectedGoal] = useState(goals[0]?._id || '');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const goal = goals.find(g => g._id === selectedGoal);
    const numAmt = parseFloat(amount.replace(/,/g, '')) || 0;
    const newSaved = (goal?.savedAmount || 0) + numAmt;
    const newPct = goal?.targetAmount > 0
        ? Math.min(100, Math.round((newSaved / goal.targetAmount) * 100))
        : 0;

    const handleAmountChange = (e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(raw);
    };

    const handleQuick = (val) => setAmount(String(val));

    const handleSubmit = async () => {
        if (!numAmt || numAmt <= 0) { setError('Please enter a valid amount.'); return; }
        if (!selectedGoal) { setError('Please select a goal.'); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ goalId: selectedGoal, amount: numAmt, note }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Deposit failed.');
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="svm-overlay" onClick={onClose}>
            <div className="svm-modal" onClick={e => e.stopPropagation()}>
                <div className="svm-modal-head">
                    <div className="svm-modal-title">Deposit to savings</div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    <p className="svm-modal-sub">Choose a goal and enter the amount you'd like to add.</p>

                    {error && <div className="svm-error">{error}</div>}

                    <div className="svm-field">
                        <label className="svm-label">Goal</label>
                        <select
                            className="svm-select"
                            value={selectedGoal}
                            onChange={e => setSelectedGoal(e.target.value)}
                        >
                            {goals.map(g => (
                                <option key={g._id} value={g._id}>
                                    {g.name} — {fmt(g.savedAmount)} saved
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="svm-field">
                        <label className="svm-label">Amount</label>
                        <div className="svm-amount-wrap">
                            <span className="svm-peso">₱</span>
                            <input
                                className="svm-input svm-input--amount"
                                type="text"
                                placeholder="0.00"
                                value={amount}
                                onChange={handleAmountChange}
                            />
                        </div>
                        <div className="svm-quick-pills">
                            {QUICK_AMOUNTS.map(v => (
                                <button key={v} className="svm-quick-pill" onClick={() => handleQuick(v)}>
                                    ₱{v.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="svm-field">
                        <label className="svm-label">
                            Note <span className="svm-label-opt">(optional)</span>
                        </label>
                        <input
                            className="svm-input"
                            type="text"
                            placeholder="e.g. March paycheck"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>

                    {goal && numAmt > 0 && (
                        <div className="svm-progress-hint">
                            <div style={{ flex: 1 }}>
                                <div className="svm-progress-hint-text">
                                    After this deposit, <strong>{goal.name}</strong> will be at
                                </div>
                                <div className="svm-progress-bar-wrap">
                                    <div
                                        className="svm-progress-bar-fill"
                                        style={{ width: `${newPct}%` }}
                                    />
                                </div>
                            </div>
                            <div className="svm-progress-pct">{newPct}%</div>
                        </div>
                    )}
                </div>

                <div className="svm-modal-footer">
                    <button className="svm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="svm-btn-submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Depositing…' : 'Confirm deposit'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   2.  NEW GOAL MODAL
───────────────────────────────────────────────────────────── */
function NewGoalModal({ onClose }) {
    const [name, setName] = useState('');
    const [targetAmount, setTarget] = useState('');
    const [targetDate, setDate] = useState('');
    const [monthly, setMonthly] = useState('');
    const [color, setColor] = useState('blue');
    const [iconType, setIcon] = useState('default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!name.trim()) { setError('Goal name is required.'); return; }
        if (!targetAmount || parseFloat(targetAmount) <= 0) { setError('Enter a valid target amount.'); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: name.trim(),
                    targetAmount: parseFloat(targetAmount),
                    targetDate: targetDate || undefined,
                    monthlyContribution: parseFloat(monthly) || 0,
                    color,
                    iconType,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Could not create goal.');
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="svm-overlay" onClick={onClose}>
            <div className="svm-modal" onClick={e => e.stopPropagation()}>
                <div className="svm-modal-head">
                    <div className="svm-modal-title">Create a savings goal</div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    {error && <div className="svm-error">{error}</div>}

                    <div className="svm-field">
                        <label className="svm-label">Goal name</label>
                        <input
                            className="svm-input"
                            type="text"
                            placeholder="e.g. Vacation Fund"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="svm-field-row">
                        <div className="svm-field">
                            <label className="svm-label">Target amount</label>
                            <div className="svm-amount-wrap">
                                <span className="svm-peso">₱</span>
                                <input
                                    className="svm-input svm-input--amount"
                                    type="text"
                                    placeholder="0.00"
                                    value={targetAmount}
                                    onChange={e => setTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                                />
                            </div>
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Target date <span className="svm-label-opt">(optional)</span></label>
                            <input
                                className="svm-input"
                                type="month"
                                value={targetDate}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="svm-field">
                        <label className="svm-label">Monthly contribution <span className="svm-label-opt">(optional)</span></label>
                        <div className="svm-amount-wrap">
                            <span className="svm-peso">₱</span>
                            <input
                                className="svm-input svm-input--amount"
                                type="text"
                                placeholder="0.00"
                                value={monthly}
                                onChange={e => setMonthly(e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                        </div>
                    </div>

                    <div className="svm-field-row">
                        <div className="svm-field">
                            <label className="svm-label">Color</label>
                            <div className="svm-color-row">
                                {GOAL_COLORS.map(c => (
                                    <button
                                        key={c.key}
                                        className={`svm-color-dot ${color === c.key ? 'svm-color-dot--selected' : ''}`}
                                        style={{ background: c.hex }}
                                        title={c.label}
                                        onClick={() => setColor(c.key)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Icon</label>
                            <select
                                className="svm-select"
                                value={iconType}
                                onChange={e => setIcon(e.target.value)}
                            >
                                {GOAL_ICONS.map(i => (
                                    <option key={i.key} value={i.key}>{i.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="svm-modal-footer">
                    <button className="svm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="svm-btn-submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating…' : 'Create goal'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   3.  QUICK DEPOSIT MODAL  (opened from + icon on goal row)
───────────────────────────────────────────────────────────── */
function QuickDepositModal({ goal, goals, onClose }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const numAmt = parseFloat(amount.replace(/,/g, '')) || 0;
    const newSaved = (goal?.savedAmount || 0) + numAmt;
    const newPct = goal?.targetAmount > 0
        ? Math.min(100, Math.round((newSaved / goal.targetAmount) * 100))
        : 0;

    const handleSubmit = async () => {
        if (!numAmt || numAmt <= 0) { setError('Enter a valid amount.'); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ goalId: goal._id, amount: numAmt, note }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Deposit failed.');
            setSuccess(true);
            setTimeout(onClose, 1200);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="svm-overlay" onClick={onClose}>
            <div className="svm-modal svm-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="svm-modal-head">
                    <div>
                        <div className="svm-modal-title">Quick deposit</div>
                        <div className="svm-modal-goal-tag">{goal?.name}</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    {error && <div className="svm-error">{error}</div>}

                    {success ? (
                        <div className="svm-success">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <circle cx="10" cy="10" r="8" fill="#639922" />
                                <path d="M6.5 10.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            ₱{numAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })} deposited!
                        </div>
                    ) : (
                        <>
                            <div className="svm-field">
                                <label className="svm-label">Amount</label>
                                <div className="svm-amount-wrap">
                                    <span className="svm-peso">₱</span>
                                    <input
                                        className="svm-input svm-input--amount"
                                        type="text"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                        autoFocus
                                    />
                                </div>
                                <div className="svm-quick-pills">
                                    {QUICK_AMOUNTS.map(v => (
                                        <button key={v} className="svm-quick-pill" onClick={() => setAmount(String(v))}>
                                            ₱{v.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {goal && numAmt > 0 && (
                                <div className="svm-progress-hint">
                                    <div style={{ flex: 1 }}>
                                        <div className="svm-progress-hint-text">Will bring {goal.name} to</div>
                                        <div className="svm-progress-bar-wrap">
                                            <div className="svm-progress-bar-fill" style={{ width: `${newPct}%` }} />
                                        </div>
                                    </div>
                                    <div className="svm-progress-pct">{newPct}%</div>
                                </div>
                            )}

                            <div className="svm-field">
                                <label className="svm-label">Note <span className="svm-label-opt">(optional)</span></label>
                                <input
                                    className="svm-input"
                                    type="text"
                                    placeholder="e.g. bonus pay"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {!success && (
                    <div className="svm-modal-footer">
                        <button className="svm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                        <button className="svm-btn-submit" onClick={handleSubmit} disabled={loading || !numAmt}>
                            {loading ? 'Depositing…' : `Deposit ${numAmt > 0 ? fmt(numAmt) : ''}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   4.  EDIT GOAL MODAL
───────────────────────────────────────────────────────────── */
function EditGoalModal({ goal, onClose }) {
    const [name, setName] = useState(goal?.name || '');
    const [target, setTarget] = useState(String(goal?.targetAmount || ''));
    const [monthly, setMonthly] = useState(String(goal?.monthlyContribution || ''));
    const [targetDate, setDate] = useState(goal?.targetDate ? goal.targetDate.slice(0, 7) : '');
    const [color, setColor] = useState(goal?.color || 'blue');
    const [iconType, setIcon] = useState(goal?.iconType || 'default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { setError('Goal name is required.'); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/goals/${goal._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: name.trim(),
                    targetAmount: parseFloat(target) || goal.targetAmount,
                    targetDate: targetDate || undefined,
                    monthlyContribution: parseFloat(monthly) || 0,
                    color,
                    iconType,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Could not update goal.');
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/goals/${goal._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Could not delete goal.');
            onClose();
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="svm-overlay" onClick={onClose}>
            <div className="svm-modal" onClick={e => e.stopPropagation()}>
                <div className="svm-modal-head">
                    <div className="svm-modal-title">Edit goal</div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    {error && <div className="svm-error">{error}</div>}

                    <div className="svm-field">
                        <label className="svm-label">Goal name</label>
                        <input
                            className="svm-input"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="svm-field-row">
                        <div className="svm-field">
                            <label className="svm-label">Target amount</label>
                            <div className="svm-amount-wrap">
                                <span className="svm-peso">₱</span>
                                <input
                                    className="svm-input svm-input--amount"
                                    type="text"
                                    value={target}
                                    onChange={e => setTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                                />
                            </div>
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Target date <span className="svm-label-opt">(optional)</span></label>
                            <input
                                className="svm-input"
                                type="month"
                                value={targetDate}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="svm-field">
                        <label className="svm-label">Monthly contribution <span className="svm-label-opt">(optional)</span></label>
                        <div className="svm-amount-wrap">
                            <span className="svm-peso">₱</span>
                            <input
                                className="svm-input svm-input--amount"
                                type="text"
                                value={monthly}
                                onChange={e => setMonthly(e.target.value.replace(/[^0-9.]/g, ''))}
                            />
                        </div>
                    </div>

                    <div className="svm-field-row">
                        <div className="svm-field">
                            <label className="svm-label">Color</label>
                            <div className="svm-color-row">
                                {GOAL_COLORS.map(c => (
                                    <button
                                        key={c.key}
                                        className={`svm-color-dot ${color === c.key ? 'svm-color-dot--selected' : ''}`}
                                        style={{ background: c.hex }}
                                        title={c.label}
                                        onClick={() => setColor(c.key)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Icon</label>
                            <select
                                className="svm-select"
                                value={iconType}
                                onChange={e => setIcon(e.target.value)}
                            >
                                {GOAL_ICONS.map(i => (
                                    <option key={i.key} value={i.key}>{i.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Delete zone */}
                    <div className="svm-delete-zone">
                        {!confirmDelete ? (
                            <button className="svm-delete-link" onClick={() => setConfirmDelete(true)}>
                                Delete this goal
                            </button>
                        ) : (
                            <div className="svm-delete-confirm">
                                <span>Are you sure? This cannot be undone.</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="svm-btn-cancel svm-btn-cancel--sm" onClick={() => setConfirmDelete(false)}>
                                        No, keep it
                                    </button>
                                    <button className="svm-btn-danger" onClick={handleDelete} disabled={loading}>
                                        {loading ? 'Deleting…' : 'Yes, delete'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="svm-modal-footer">
                    <button className="svm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="svm-btn-submit" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   ROOT EXPORT  — renders whichever modal is active
───────────────────────────────────────────────────────────── */
export default function SavingsModals({ modal, modalData, goals, onClose }) {
    /* lock body scroll when a modal is open */
    useEffect(() => {
        if (modal) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [modal]);

    if (!modal) return null;

    if (modal === 'deposit')
        return <DepositModal goals={goals} onClose={onClose} />;

    if (modal === 'newGoal')
        return <NewGoalModal onClose={onClose} />;

    if (modal === 'quickDeposit')
        return <QuickDepositModal goal={modalData} goals={goals} onClose={onClose} />;

    if (modal === 'editGoal')
        return <EditGoalModal goal={modalData} onClose={onClose} />;

    return null;
}