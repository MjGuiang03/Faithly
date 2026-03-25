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
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginBottom: '4px' }}>
                                        <path d="M10 13V7M7 10l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M3 17a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 15.5 7H16a3 3 0 0 1 0 6H3z" stroke="currentColor" strokeWidth="1.3" />
                                    </svg>
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
    const [nameOption, setNameOption] = useState('');
    const [customName, setCustomName] = useState('');
    const [targetAmount, setTarget] = useState('');
    const [startDate, setStartDate] = useState('');
    const [targetDate, setDate] = useState('');
    const [dateError, setDateError] = useState('');
    const [monthly, setMonthly] = useState('');
    const [color, setColor] = useState('blue');
    const [iconType, setIcon] = useState('default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isOthers = nameOption === 'others';
    const resolvedName = isOthers ? customName.trim() : nameOption;

    const handleDates = (start, end) => {
        if (start && end && end <= start) {
            setDateError('End date must be after start date.');
        } else {
            setDateError('');
        }
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
                            onChange={e => { setNameOption(e.target.value); setCustomName(''); }}
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
                                onChange={e => { setStartDate(e.target.value); handleDates(e.target.value, targetDate); }}
                            />
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Target date <span className="svm-label-opt">(optional)</span></label>
                            <input
                                className={`svm-input${dateError ? ' svm-input--error' : ''}`}
                                type="date"
                                value={targetDate}
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
                                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginBottom: '3px' }}>
                                                <path d="M10 13V7M7 10l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M3 17a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 15.5 7H16a3 3 0 0 1 0 6H3z" stroke="currentColor" strokeWidth="1.3" />
                                            </svg>
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
    // Detect if the existing name matches a preset or is custom
    const matchedPreset = GOAL_NAME_OPTIONS.find(
        o => o.value !== 'others' && o.value === goal?.name
    );
    const [nameOption, setNameOption] = useState(matchedPreset ? goal.name : 'others');
    const [customName, setCustomName] = useState(!matchedPreset ? (goal?.name || '') : '');
    const [target, setTarget] = useState(String(goal?.targetAmount || ''));
    const [monthly, setMonthly] = useState(String(goal?.monthlyContribution || ''));
    const [startDate, setStartDate] = useState(goal?.startDate ? goal.startDate.slice(0, 7) : '');
    const [targetDate, setDate] = useState(goal?.targetDate ? goal.targetDate.slice(0, 7) : '');
    const [dateError, setDateError] = useState('');
    const [color, setColor] = useState(goal?.color || 'blue');
    const [iconType, setIcon] = useState(goal?.iconType || 'default');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isOthers = nameOption === 'others';
    const resolvedName = isOthers ? customName.trim() : nameOption;

    const handleDates = (start, end) => {
        if (start && end && end <= start) {
            setDateError('End date must be after start date.');
        } else {
            setDateError('');
        }
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
                            onChange={e => { setNameOption(e.target.value); if (e.target.value !== 'others') setCustomName(''); }}
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
                                onChange={e => { setStartDate(e.target.value); handleDates(e.target.value, targetDate); }}
                            />
                        </div>
                        <div className="svm-field">
                            <label className="svm-label">Target date <span className="svm-label-opt">(optional)</span></label>
                            <input
                                className={`svm-input${dateError ? ' svm-input--error' : ''}`}
                                type="date"
                                value={targetDate}
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
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <circle cx="10" cy="10" r="8" fill="#639922" />
                                <path d="M6.5 10.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
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
                            {loading ? 'Transferring…' : `Transfer ${numAmt > 0 ? fmt(numAmt) : ''}`}
                        </button>
                    </div>
                )}
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

    if (modal === 'transfer')
        return <TransferModal goal={modalData} goals={goals} onClose={onClose} />;

    return null;
}