import { useState, useEffect } from 'react';
import '../styles/SavingsModal.css';
import API from '../../utils/api';
import { CheckCircle, FileText, X, ArrowDownRight, ArrowUpLeft, Repeat, History, CreditCard, Smartphone, Building2, Calendar, Info, Coins, ShieldCheck, AlertCircle } from 'lucide-react';


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


const GOAL_NAME_OPTIONS = [
    { value: 'Vacation Fund', label: '  Vacation Fund' },
    { value: 'Emergency Fund', label: '  Emergency Fund' },
    { value: 'House / Down Payment', label: '  House / Down Payment' },
    { value: 'Car Purchase', label: '  Car Purchase' },
    { value: 'Education Fund', label: '  Education Fund' },
    { value: 'Retirement', label: '  Retirement' },
    { value: 'Gadget / Tech', label: '  Gadget / Tech' },
    { value: 'Wedding Fund', label: '  Wedding Fund' },
    { value: 'others', label: '  Others (Specify)' },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const CloseIcon = () => (
    <X size={14} />
);

/* ─────────────────────────────────────────────────────────────
   1.  DEPOSIT MODAL  (full — opened from top "+ Deposit" btn)
───────────────────────────────────────────────────────────── */
function DepositModal({ goals, onClose }) {
    const [selectedGoal, setSelectedGoal] = useState(goals[0]?._id || '');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [receipt, setReceipt] = useState(null);
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
        if (paymentMethod !== 'cash' && !referenceNumber) { setError('Please provide a reference number.'); return; }
        if (!receipt) { setError('Please upload proof of payment.'); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Convert file to base64
            let proofOfPayment = null;
            if (receipt) {
                const reader = new FileReader();
                proofOfPayment = await new Promise((resolve) => {
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(receipt);
                });
            }
            const res = await fetch(`${API}/api/savings/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ goalId: selectedGoal, amount: numAmt, note, paymentMethod, referenceNumber, proofOfPayment }),
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
                    <div>
                        <div className="svm-modal-title">Deposit to savings</div>
                        <div className="svm-modal-sub">Choose a goal and enter the amount you'd like to add.</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
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
                        <label className="svm-label">Payment Method</label>
                        <div className="svm-payment-options">
                            {[
                                { id: 'cash', label: 'Cash (Pay at Office)' },
                                { id: 'gcash', label: 'GCash' },
                                { id: 'bank', label: 'Bank Transfer' },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className={`svm-payment-btn ${paymentMethod === opt.id ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod(opt.id)}
                                >
                                    <div className={`svm-radio ${paymentMethod === opt.id ? 'active' : ''}`} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(paymentMethod === 'gcash' || paymentMethod === 'bank') && (
                        <div className="svm-field">
                            <label className="svm-label">Reference Number</label>
                            <input
                                className="svm-input"
                                type="text"
                                placeholder={`Enter ${paymentMethod === 'gcash' ? 'GCash' : 'Bank'} reference no.`}
                                value={referenceNumber}
                                onChange={e => setReferenceNumber(e.target.value)}
                            />
                            <div className="svm-info-text">
                                Please transfer to Faithly Inc. ({paymentMethod === 'gcash' ? 'GCash: 0917-XXX-XXXX' : 'BDO Acc: 1234-5678'}) and provide the reference number.
                            </div>
                        </div>
                    )}

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

                    <div className="svm-field">
                        <label className="svm-label">Proof of payment</label>
                        <label className={`svm-upload-box ${receipt ? 'svm-upload-box--done' : ''}`}>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => { setReceipt(e.target.files[0]); setError(''); }}
                            />
                            {receipt ? (
                                <span className="svm-upload-done-text">✓ {receipt.name}</span>
                            ) : (
                                <>
                                    <FileText size={20} />
                                    <span>Click to upload screenshot or receipt</span>
                                </>
                            )}
                        </label>
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
                        {loading ? <span className="btn-spinner" /> : 'Confirm deposit'}
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
    const [nameOption, setNameOption] = useState('');
    const [customName, setCustomName] = useState('');
    const [targetAmount, setTarget] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetDate, setDate] = useState('');
    const [dateError, setDateError] = useState('');
    const [monthly, setMonthly] = useState('');
    const [color, setColor] = useState('blue');
    const [iconType, setIcon] = useState('default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isOthers = nameOption === 'others';
    const resolvedName = isOthers ? customName.trim() : nameOption;
    const today = new Date().toISOString().split('T')[0];

    const handleDates = (start, end) => {
        if (start && end) {
            const s = new Date(start);
            const e = new Date(end);
            const minTarget = new Date(s);
            // Must be at least 1 month forward
            minTarget.setMonth(s.getMonth() + 1);
            if (e < minTarget) {
                setDateError('Target date must be at least 1 month from start date.');
            } else {
                setDateError('');
            }
        } else {
            setDateError('');
        }
    };

    const handleNameChange = (val) => {
        setNameOption(val);
        setCustomName('');
        
        // Auto-match icon
        const mapping = {
            'Vacation Fund': 'star',
            'Emergency Fund': 'emergency',
            'House / Down Payment': 'house',
            'Car Purchase': 'car',
            'Education Fund': 'bag'
        };
        setIcon(mapping[val] || 'default');
    };

    const handleSubmit = async () => {
        if (!resolvedName) { setError('Goal name is required.'); return; }
        if (!targetAmount || parseFloat(targetAmount) <= 0) { setError('Enter a valid target amount.'); return; }
        if (dateError) { setError(dateError); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: resolvedName,
                    targetAmount: parseFloat(targetAmount),
                    startDate: startDate || undefined,
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
                    <div>
                        <div className="svm-modal-title">Create a savings goal</div>
                        <div className="svm-modal-sub">Set a target and track your progress</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    {error && <div className="svm-error">{error}</div>}

                    {/* GOAL NAME — dropdown + optional manual input */}
                    <div className="svm-field">
                        <label className="svm-label">Goal name</label>
                        <select
                            className="svm-select"
                            value={nameOption}
                            onChange={e => handleNameChange(e.target.value)}
                        >
                            <option value="" disabled>Select a goal…</option>
                            {GOAL_NAME_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        {isOthers && (
                            <input
                                className="svm-input svm-input--others"
                                type="text"
                                placeholder="e.g. Dream Concert Fund"
                                value={customName}
                                onChange={e => setCustomName(e.target.value)}
                                autoFocus
                            />
                        )}
                    </div>

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

                    {/* START DATE + TARGET DATE side by side */}
                    <div className="svm-field-row">
                        <div className="svm-field">
                            <label className="svm-label">Start date</label>
                            <input
                                className="svm-input"
                                type="date"
                                value={startDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => { setStartDate(e.target.value); handleDates(e.target.value, targetDate); }}
                            />
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Target date <span className="svm-label-opt">(optional)</span></label>
                            <input
                                className={`svm-input${dateError ? ' svm-input--error' : ''}`}
                                type="date"
                                value={targetDate}
                                min={(() => {
                                    if (!startDate) return today;
                                    const d = new Date(startDate);
                                    d.setMonth(d.getMonth() + 1);
                                    return d.toISOString().split('T')[0];
                                })()}
                                onChange={e => { setDate(e.target.value); handleDates(startDate, e.target.value); }}
                            />
                        </div>
                    </div>
                    {dateError && <div className="svm-date-error">{dateError}</div>}
                    <div className="svm-helper-text">When to begin saving</div>

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
                </div>

                <div className="svm-modal-footer">
                    <button className="svm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="svm-btn-submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? <span className="btn-spinner" /> : 'Create goal'}
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
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [receipt, setReceipt] = useState(null);
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
        if (paymentMethod !== 'cash' && !referenceNumber) { setError('Please provide a reference number.'); return; }
        if (!receipt) { setError('Please upload proof of payment.'); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let proofOfPayment = null;
            if (receipt) {
                const reader = new FileReader();
                proofOfPayment = await new Promise((resolve) => {
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(receipt);
                });
            }
            const res = await fetch(`${API}/api/savings/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ goalId: goal._id, amount: numAmt, note, paymentMethod, referenceNumber, proofOfPayment }),
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
                        <div className="svm-modal-sub">Add funds to your goal instantly</div>
                        <div className="svm-modal-goal-tag">{goal?.name}</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    {error && <div className="svm-error">{error}</div>}

                    {success ? (
                        <div className="svm-success">
                            <CheckCircle size={20} color="#fff" />
                            ₱{numAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })} submitted for admin confirmation!
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
                                        <div className="svm-progress-hint-text">This deposit will bring your {goal.name} Fund to</div>
                                        <div className="svm-progress-bar-wrap">
                                            <div className="svm-progress-bar-fill" style={{ width: `${newPct}%` }} />
                                        </div>
                                    </div>
                                    <div className="svm-progress-pct">{newPct}%</div>
                                </div>
                            )}

                            <div className="svm-field">
                                <label className="svm-label">Payment Method</label>
                                <div className="svm-payment-options">
                                    {[
                                        { id: 'cash', label: 'Cash (Office)' },
                                        { id: 'gcash', label: 'GCash' },
                                        { id: 'bank', label: 'Bank' },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            className={`svm-payment-btn ${paymentMethod === opt.id ? 'active' : ''}`}
                                            onClick={() => setPaymentMethod(opt.id)}
                                            style={{ padding: '8px', fontSize: '11px' }}
                                        >
                                            <div className={`svm-radio ${paymentMethod === opt.id ? 'active' : ''}`} style={{ width: '12px', height: '12px' }} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(paymentMethod === 'gcash' || paymentMethod === 'bank') && (
                                <div className="svm-field">
                                    <label className="svm-label">Reference Number</label>
                                    <input
                                        className="svm-input"
                                        type="text"
                                        placeholder={`Enter ${paymentMethod === 'gcash' ? 'GCash' : 'Bank'} ref. no.`}
                                        value={referenceNumber}
                                        onChange={e => setReferenceNumber(e.target.value)}
                                    />
                                    <div className="svm-info-text">
                                        Faithly Inc. ({paymentMethod === 'gcash' ? 'GCash: 0917-XXX-XXXX' : 'BDO: 1234-5678'})
                                    </div>
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

                            <div className="svm-field">
                                <label className="svm-label">Proof of payment</label>
                                <label className={`svm-upload-box ${receipt ? 'svm-upload-box--done' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        style={{ display: 'none' }}
                                        onChange={(e) => { setReceipt(e.target.files[0]); setError(''); }}
                                    />
                                    {receipt ? (
                                        <span className="svm-upload-done-text">✓ {receipt.name}</span>
                                    ) : (
                                        <>
                                            <FileText size={18} />
                                            <span>Upload receipt</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {!success && (
                    <div className="svm-modal-footer">
                        <button className="svm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                        <button className="svm-btn-submit" onClick={handleSubmit} disabled={loading || !numAmt}>
                            {loading ? <span className="btn-spinner" /> : `Deposit ${numAmt > 0 ? fmt(numAmt) : ''}`}
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
    // Detect if the existing name matches a preset or is custom
    const matchedPreset = GOAL_NAME_OPTIONS.find(
        o => o.value !== 'others' && o.value === goal?.name
    );
    const [nameOption, setNameOption] = useState(matchedPreset ? goal.name : 'others');
    const [customName, setCustomName] = useState(!matchedPreset ? (goal?.name || '') : '');
    const [target, setTarget] = useState(String(goal?.targetAmount || ''));
    const [monthly, setMonthly] = useState(String(goal?.monthlyContribution || ''));
    const [startDate, setStartDate] = useState(goal?.startDate ? goal.startDate.slice(0, 10) : new Date().toISOString().split('T')[0]);
    const [targetDate, setDate] = useState(goal?.targetDate ? goal.targetDate.slice(0, 10) : '');
    const [dateError, setDateError] = useState('');
    const [color, setColor] = useState(goal?.color || 'blue');
    const [iconType, setIcon] = useState(goal?.iconType || 'default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isOthers = nameOption === 'others';
    const resolvedName = isOthers ? customName.trim() : nameOption;
    const today = new Date().toISOString().split('T')[0];

    const handleDates = (start, end) => {
        if (start && end) {
            const s = new Date(start);
            const e = new Date(end);
            const minTarget = new Date(s);
            // Must be at least 1 month forward
            minTarget.setMonth(s.getMonth() + 1);
            if (e < minTarget) {
                setDateError('Target date must be at least 1 month from start date.');
            } else {
                setDateError('');
            }
        } else {
            setDateError('');
        }
    };

    const handleNameChange = (val) => {
        setNameOption(val);
        setCustomName('');
        
        // Auto-match icon
        const mapping = {
            'Vacation Fund': 'star',
            'Emergency Fund': 'emergency',
            'House / Down Payment': 'house',
            'Car Purchase': 'car',
            'Education Fund': 'bag'
        };
        setIcon(mapping[val] || 'default');
    };

    const handleSave = async () => {
        if (!resolvedName) { setError('Goal name is required.'); return; }
        if (dateError) { setError(dateError); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/goals/${goal._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: resolvedName,
                    targetAmount: parseFloat(target) || goal.targetAmount,
                    startDate: startDate || undefined,
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
                    <div>
                        <div className="svm-modal-title">Edit goal</div>
                        <div className="svm-modal-sub">Update your savings goal details</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    {error && <div className="svm-error">{error}</div>}

                    {/* GOAL NAME — dropdown + optional manual input */}
                    <div className="svm-field">
                        <label className="svm-label">Goal name</label>
                        <select
                            className="svm-select"
                            value={nameOption}
                            onChange={e => handleNameChange(e.target.value)}
                        >
                            <option value="" disabled>Select a goal…</option>
                            {GOAL_NAME_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        {isOthers && (
                            <input
                                className="svm-input svm-input--others"
                                type="text"
                                placeholder="e.g. Dream Concert Fund"
                                value={customName}
                                onChange={e => setCustomName(e.target.value)}
                            />
                        )}
                    </div>

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

                    {/* START DATE + TARGET DATE side by side */}
                    <div className="svm-field-row">
                        <div className="svm-field">
                            <label className="svm-label">Start date</label>
                            <input
                                className="svm-input"
                                type="date"
                                value={startDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => { setStartDate(e.target.value); handleDates(e.target.value, targetDate); }}
                            />
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Target date <span className="svm-label-opt">(optional)</span></label>
                            <input
                                className={`svm-input${dateError ? ' svm-input--error' : ''}`}
                                type="date"
                                value={targetDate}
                                min={(() => {
                                    if (!startDate) return today;
                                    const d = new Date(startDate);
                                    d.setMonth(d.getMonth() + 1);
                                    return d.toISOString().split('T')[0];
                                })()}
                                onChange={e => { setDate(e.target.value); handleDates(startDate, e.target.value); }}
                            />
                        </div>
                    </div>
                    {dateError && <div className="svm-date-error">{dateError}</div>}
                    <div className="svm-helper-text">When to begin saving</div>

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
                                        {loading ? <span className="btn-spinner" /> : 'Yes, delete'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="svm-modal-footer">
                    <button className="svm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="svm-btn-submit" onClick={handleSave} disabled={loading}>
                        {loading ? <span className="btn-spinner" /> : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   5.  TRANSFER MODAL  (move funds between goals)
───────────────────────────────────────────────────────────── */
function TransferModal({ goal, goals, onClose }) {
    const [fromGoalId, setFromGoalId] = useState(goal?._id || '');
    const [toGoalId, setToGoalId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const fromGoal = goals.find(g => g._id === fromGoalId);
    const available = fromGoal?.savedAmount || 0;
    const numAmt = parseFloat(amount) || 0;
    const quickAmounts = [100, 500, 1000, 2000].filter(v => v <= available);

    const handleSubmit = async () => {
        if (!fromGoalId) { setError('Select a source goal.'); return; }
        if (!toGoalId) { setError('Select a destination goal.'); return; }
        if (fromGoalId === toGoalId) { setError('Source and destination must be different.'); return; }
        if (!numAmt || numAmt <= 0) { setError('Enter a valid amount.'); return; }
        if (numAmt > available) { setError('Amount exceeds available balance.'); return; }
        setError('');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/savings/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ fromGoalId, toGoalId, amount: numAmt, note }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Transfer failed.');
            setSuccess(true);
            setTimeout(onClose, 1500);
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
                    <div>
                        <div className="svm-modal-title">Transfer funds</div>
                        <div className="svm-modal-sub">Move savings between your goals</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    {error && <div className="svm-error">{error}</div>}

                    {success ? (
                        <div className="svm-success">
                            <CheckCircle size={20} color="#fff" />
                            ₱{numAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })} transferred!
                        </div>
                    ) : (
                        <>
                            <div className="svm-field">
                                <label className="svm-label">From goal</label>
                                <select
                                    className="svm-select"
                                    value={fromGoalId}
                                    onChange={e => { setFromGoalId(e.target.value); setAmount(''); }}
                                >
                                    <option value="" disabled>Select source…</option>
                                    {goals.filter(g => (g.savedAmount || 0) > 0).map(g => (
                                        <option key={g._id} value={g._id}>
                                            {g.name} — {fmt(g.savedAmount)} available
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="svm-field">
                                <label className="svm-label">To goal</label>
                                <select
                                    className="svm-select"
                                    value={toGoalId}
                                    onChange={e => setToGoalId(e.target.value)}
                                >
                                    <option value="" disabled>Select destination…</option>
                                    {goals.filter(g => g._id !== fromGoalId).map(g => (
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
                                        onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                    />
                                </div>
                                {available > 0 && (
                                    <div className="svm-helper-text">
                                        Available: {fmt(available)}
                                    </div>
                                )}
                                {quickAmounts.length > 0 && (
                                    <div className="svm-quick-pills">
                                        {quickAmounts.map(v => (
                                            <button key={v} className="svm-quick-pill" onClick={() => setAmount(String(v))}>
                                                ₱{v.toLocaleString()}
                                            </button>
                                        ))}
                                        <button className="svm-quick-pill" onClick={() => setAmount(String(available))}>
                                            All
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="svm-field">
                                <label className="svm-label">
                                    Note <span className="svm-label-opt">(optional)</span>
                                </label>
                                <input
                                    className="svm-input"
                                    type="text"
                                    placeholder="e.g. Re-allocating funds"
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
                            {loading ? <span className="btn-spinner" /> : `Transfer ${numAmt > 0 ? fmt(numAmt) : ''}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   3.5 GOAL INFO MODAL (Read-only + history)
───────────────────────────────────────────────────────────── */
function GoalInfoModal({ goal, onClose, onEdit, onTransfer, onQuickDeposit }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!goal) return;
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API}/api/savings/transactions?goalId=${goal._id}&limit=50`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setTransactions(data.transactions || []);
                }
            } catch (err) {
                console.error('Failed to fetch goal history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [goal._id, goal]);

    const fmtDateShort = (d) => {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (!goal) return null;

    return (
        <div className="svm-overlay" onClick={onClose}>
            <div className="svm-modal" onClick={e => e.stopPropagation()}>
                <div className="svm-modal-head">
                    <div className="svm-modal-title-row">
                        <div className="svm-modal-title">{goal.name}</div>
                        <div className="svm-modal-goal-tag">Goal Details & History</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body">
                    <div className="svm-info-grid">
                        <div className="svm-info-item">
                            <span className="svm-info-label">Current Balance</span>
                            <span className="svm-info-value">{fmt(goal.savedAmount)}</span>
                        </div>
                        <div className="svm-info-item">
                            <span className="svm-info-label">Target Amount</span>
                            <span className="svm-info-value">{fmt(goal.targetAmount)}</span>
                        </div>
                        <div className="svm-info-item">
                            <span className="svm-info-label">Monthly Goal</span>
                            <span className="svm-info-value">{goal.monthlyContribution > 0 ? fmt(goal.monthlyContribution) : '—'}</span>
                        </div>
                        <div className="svm-info-item">
                            <span className="svm-info-label">Target Date</span>
                            <span className="svm-info-value">{goal.targetDate ? fmtDateShort(goal.targetDate) : 'No target'}</span>
                        </div>
                    </div>

                    <div className="svm-history-section">
                        <div className="svm-history-head">
                            <History size={16} />
                            Transaction History
                        </div>

                        <div className="svm-history-list">
                            {loading ? (
                                <div className="svm-history-empty">Loading history...</div>
                            ) : transactions.length === 0 ? (
                                <div className="svm-history-empty">No transactions yet for this goal.</div>
                            ) : (
                                transactions.map(txn => {
                                    const isPos = txn.type === 'deposit';
                                    const isNeg = txn.type === 'withdrawal';
                                    const isTransfer = txn.source === 'Transfer';
                                    
                                    let Icon = ArrowDownRight;
                                    let iconClass = 'svm-hist-icon--deposit';
                                    if (isNeg) { Icon = ArrowUpLeft; iconClass = 'svm-hist-icon--withdrawal'; }
                                    if (isTransfer) { Icon = Repeat; iconClass = 'svm-hist-icon--transfer'; }

                                    return (
                                        <div key={txn._id} className="svm-history-row">
                                            <div className={`svm-hist-icon-wrap ${iconClass}`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="svm-hist-main">
                                                <div className="svm-hist-type">
                                                    {txn.source === 'Transfer' && ' (Transfer)'}
                                                </div>
                                                <div className="svm-hist-date">{fmtDateShort(txn.date)}</div>
                                            </div>
                                            <div className="svm-hist-right">
                                                <div className={`svm-hist-amt ${isPos ? 'svm-hist-amt--pos' : 'svm-hist-amt--neg'}`}>
                                                    {isPos ? '+' : '-'}{fmt(txn.amount)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="svm-modal-footer">
                    <button className="svm-btn-cancel" style={{ flex: 1 }} onClick={onClose}>Close</button>
                    <button className="svm-btn-submit" style={{ flex: 1.2, background: '#639922' }} onClick={() => onQuickDeposit(goal)}>
                        Deposit
                    </button>
                    <button className="svm-btn-submit" style={{ flex: 1.2 }} onClick={() => onTransfer(goal)}>
                        Transfer
                    </button>
                    <button className="svm-btn-submit" style={{ flex: 1.2, background: 'var(--secondary)', color: 'var(--foreground)', border: '0.8px solid var(--border)' }} onClick={() => onEdit(goal)}>
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   6.  TRANSACTION INFO MODAL (Specific details)
 ───────────────────────────────────────────────────────────── */
function TransactionInfoModal({ transaction, onClose }) {
    const [fullImage, setFullImage] = useState(false);


    if (!transaction) return null;

    const isIn = transaction.type === 'deposit';
    const isOut = transaction.type === 'withdrawal';
    const isTransfer = transaction.source === 'Transfer';
    const isGcash = transaction.paymentMethod === 'gcash';
    const isBank = transaction.paymentMethod === 'bank';

    let Icon = ArrowDownRight;
    let iconClass = 'svm-tx-icon--in';
    let statusText = transaction.status === 'confirmed' ? 'Validated' : transaction.status === 'rejected' ? 'Rejected' : 'Pending';

    if (isOut) { Icon = ArrowUpLeft; iconClass = 'svm-tx-icon--out'; }
    if (isTransfer) { Icon = Repeat; iconClass = 'svm-tx-icon--transfer'; }

    return (
        <div className="svm-overlay" onClick={onClose}>
            <div className="svm-modal svm-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="svm-modal-head">
                    <div>
                        <div className="svm-modal-title">Transaction Receipt</div>
                        <div className="svm-modal-sub">Activity reference details</div>
                    </div>
                    <button className="svm-close-btn" onClick={onClose}><CloseIcon /></button>
                </div>

                <div className="svm-modal-body svm-tx-compact">
                    <div className="svm-tx-main-card">
                        <div className="svm-tx-header-compact">
                            <div className={`svm-tx-icon-circle ${iconClass}`}>
                                <Icon size={20} />
                            </div>
                            <div className="svm-tx-amount-v2">
                                {isIn ? '+' : '-'}{fmt(transaction.amount)}
                            </div>
                            <span className={`svm-tx-status-pill svm-tx-status--${transaction.status || 'pending'}`}>
                                {statusText}
                            </span>
                        </div>

                        <div className="svm-tx-data-grid">
                            <div className="svm-tx-data-item">
                                <label>Date & Time</label>
                                <span>{new Date(transaction.date).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="svm-tx-data-item">
                                <label>Type</label>
                                <span>{transaction.type} {isTransfer ? '(Transfer)' : ''}</span>
                            </div>
                            <div className="svm-tx-data-item">
                                <label>Allocated Goal</label>
                                <span>{transaction.goalName || 'General Savings'}</span>
                            </div>
                            <div className="svm-tx-data-item">
                                <label>Description</label>
                                <span>{transaction.description || (isIn ? 'Deposit' : 'Withdrawal')}</span>
                            </div>
                        </div>
                    </div>

                    {(transaction.paymentMethod && transaction.paymentMethod !== 'cash') && (
                        <div className="svm-tx-payment-card">
                            <div className="svm-tx-payment-row">
                                <div className="svm-tx-data-item">
                                    <label>Method</label>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isGcash ? <Smartphone size={14} /> : isBank ? <Building2 size={14} /> : <CreditCard size={14} />} 
                                        {transaction.paymentMethod}
                                    </span>
                                </div>
                                {transaction.referenceNumber && (
                                    <div className="svm-tx-data-item">
                                        <label>Reference No.</label>
                                        <span className="svm-tx-ref-v2">{transaction.referenceNumber}</span>
                                    </div>
                                )}
                            </div>

                            {transaction.proofOfPayment && (
                                <div className="svm-tx-proof-preview">
                                    <label>Proof of Payment</label>
                                    <div className="svm-tx-img-box" onClick={() => setFullImage(true)}>
                                        <img src={transaction.proofOfPayment} alt="Receipt" />
                                        <div className="svm-tx-img-overlay">
                                            <Info size={14} /> Tap to expand
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="svm-modal-footer">
                    <button className="svm-btn-cancel" style={{ flex: 1 }} onClick={onClose}>Done</button>
                </div>
            </div>

            {/* Internal Image Preview Overlay */}
            {fullImage && (
                <div className="svm-full-img-overlay" onClick={() => setFullImage(false)}>
                    <div className="svm-full-img-container" onClick={e => e.stopPropagation()}>
                        <button className="svm-full-img-close" onClick={() => setFullImage(false)}>
                            <X size={20} />
                        </button>
                        <img src={transaction.proofOfPayment} alt="Full Proof" className="svm-full-img" />
                    </div>
                </div>
            )}
        </div>
    );
}



/* ─────────────────────────────────────────────────────────────
   ROOT EXPORT  — renders whichever modal is active
───────────────────────────────────────────────────────────── */
export default function SavingsModals({ modal, modalData, goals, onClose, onEdit, onTransfer, onQuickDeposit }) {
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

    if (modal === 'goalInfo')
        return <GoalInfoModal goal={modalData} onClose={onClose} onEdit={onEdit} onTransfer={onTransfer} onQuickDeposit={onQuickDeposit} />;

    if (modal === 'transfer')
        return <TransferModal goal={modalData} goals={goals} onClose={onClose} />;

    if (modal === 'transactionInfo')
        return <TransactionInfoModal transaction={modalData} onClose={onClose} />;

    return null;
}
