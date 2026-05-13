import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Banknote, CalendarDays, ChevronDown, Download, Heart, Receipt, Share2, X, UploadCloud, FileCheck2 } from 'lucide-react';
import { ComposedChart, Bar, Line, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import '../styles/Donation.css';
import ewalletLogo from '../../assets/gcashlogo.png';
import bank from '../../assets/bank.png';
import iconGeneral from '../../assets/icon_general.png';
import iconChildren from '../../assets/icon_children.png';
import iconBuilding from '../../assets/icon_building.png';
import iconYouth from '../../assets/icon_youth.png';
import iconMission from '../../assets/icon_mission.png';

import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const QUICK_AMOUNTS = [25, 50, 100, 250];

const CATEGORIES = [
  { name: 'General Fund', description: 'Church operations and ministry', icon: <img src={iconGeneral} alt="General Fund" className="user-3d-cat-icon" /> },
  { name: 'Children\'s Department', description: "Children's programs and activities", icon: <img src={iconChildren} alt="Children's Department" className="user-3d-cat-icon" /> },
  { name: 'Men\'s Department', description: 'Men\'s programs and activities', icon: <img src={iconBuilding} alt="Men's Department" className="user-3d-cat-icon" /> },
  { name: 'Women\'s Department', description: 'Women\'s programs and activities', icon: <img src={iconGeneral} alt="Women's Department" className="user-3d-cat-icon" /> },
  { name: 'Youth Department', description: 'Youth programs and events', icon: <img src={iconYouth} alt="Youth Department" className="user-3d-cat-icon" /> },
  { name: 'Mission Fund', description: 'Missionary work and outreach programs', icon: <img src={iconMission} alt="Mission Fund" className="user-3d-cat-icon" /> },
];



/* ── Payment method icons ── */
const EWalletIcon = () => (
  <img
    src={ewalletLogo}
    alt="E-Wallet"
    className="user-donation-e-wallet-icon"
  />
);

const BankIcon = () => (
  <img
    src={bank}
    alt="Bank Transfer"
    className="user-donation-bank-icon"
  />
);

export default function Donation() {
  const { user } = useAuth();
  const [donationAmount, setDonationAmount] = useState('');
  const [donationCategory, setDonationCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [subMethod, setSubMethod] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [stats, setStats] = useState({ totalDonated: 0, thisYearTotal: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [historyPage] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [recentDonations, setRecentDonations] = useState([]);
  
  // Settings
  const [approvalMethod, setApprovalMethod] = useState('gateway');
  const [proofFile, setProofFile] = useState(null);
  const [proofBase64, setProofBase64] = useState('');

  /* ── History Modal States ── */
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalCategory, setModalCategory] = useState('');
  const [modalPaymentMethod, setModalPaymentMethod] = useState('');
  const [modalHistory, setModalHistory] = useState([]);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalLoading, setModalLoading] = useState(false);
  const MODAL_LIMIT = 10;
  const HISTORY_PER_PAGE = 5;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/donations/my-donations?page=${historyPage}&limit=${HISTORY_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats || { totalDonated: 0, thisYearTotal: 0, totalCount: 0 });
        setRecentDonations(data.donations || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [historyPage]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/settings/public`);
      const data = await res.json();
      if (res.ok && data.success) {
        setApprovalMethod(data.paymentApprovalMethod || 'gateway');
      }
    } catch { /* silent */ }
  }, []);

  const fetchModalHistory = useCallback(async () => {
    setModalLoading(true);
    const token = localStorage.getItem('token');
    try {
      const catParam = modalCategory ? `&category=${modalCategory}` : '';
      const pmParam = modalPaymentMethod ? `&paymentMethod=${modalPaymentMethod}` : '';
      const res = await fetch(`${API}/api/donations/my-donations?page=${modalPage}&limit=${MODAL_LIMIT}${catParam}${pmParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalHistory(data.donations || []);
        setModalTotalPages(data.totalPages || 1);
      }
    } catch { /* silent */ }
    finally { setModalLoading(false); }
  }, [modalPage, modalCategory, modalPaymentMethod]);

  useEffect(() => {
    if (isHistoryModalOpen) fetchModalHistory();
  }, [isHistoryModalOpen, fetchModalHistory]);

  useEffect(() => { 
    fetchHistory(); 
    fetchSettings();
  }, [fetchHistory, fetchSettings]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // const historyTotalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PER_PAGE));
  // const paginatedHistory = donationHistory;
  const handleDonate = async () => {
    setFormError('');
    const num = Number(String(donationAmount).replace(/,/g, ''));
    if (!num || num <= 0) { setFormError('Please enter a valid donation amount.'); return; }
    if (!donationCategory) { setFormError('Please select a donation category.'); return; }
    if (!paymentMethod) { setFormError('Please select a payment method.'); return; }
    
    if (approvalMethod === 'manual') {
      if (!proofBase64) { setFormError('Please upload your proof of payment.'); return; }
      if (!subMethod) { setFormError(`Please select a ${paymentMethod} option.`); return; }
      if (!accountName.trim()) { setFormError('Please enter the account name.'); return; }
      if (!accountNumber.trim()) { setFormError('Please enter the account number.'); return; }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: num, category: donationCategory, paymentMethod, subMethod, accountName, accountNumber, isRecurring, proofOfPayment: proofBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to record donation');
      
      if (approvalMethod === 'manual') {
        alert('Donation submitted! Your payment is pending manual approval.');
        setDonationAmount('');
        setDonationCategory('');
        setPaymentMethod('');
        setSubMethod('');
        setAccountName('');
        setAccountNumber('');
        setProofFile(null);
        setProofBase64('');
        fetchHistory();
        setSubmitting(false);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setFormError('Failed to generate payment link.');
        setSubmitting(false);
      }
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    } 
  };

  const handleOpenHistory = () => {
    setModalPage(1);
    setModalCategory('');
    setModalPaymentMethod('');
    setIsHistoryModalOpen(true);
  };

  const handleOpenReceipt = (donation) => {
    setSelectedDonation(donation);
    setIsReceiptModalOpen(true);
  };

  return (
    <>
      <div className="user-donations-container">

        {/* Header */}
        <div className="user-donation-page-header">
          <h1 className="user-donation-page-title">Donations</h1>
          <p className="user-donation-page-subtitle">Support the church and track your giving</p>
        </div>

        {/* Stats */}
        <div className="user-donations-stats">
          <div className="user-donation-stat-card">
            <div className="user-donation-stat-header">
              <p className="user-donation-stat-label">Total Donated</p>
              <Banknote className="user-donation-stat-icon" size={20} color="#155DFC" />
            </div>
            {loading ? <div className="user-skeleton user-donation-stat-skeleton"></div> : <p className="user-donation-stat-value user-fade-in">{fmt(stats.totalDonated)}</p>}
          </div>
          <div className="user-donation-stat-card">
            <div className="user-donation-stat-header">
              <p className="user-donation-stat-label">This Year</p>
              <CalendarDays className="user-donation-stat-icon" size={20} color="#155DFC" />
            </div>
            {loading ? <div className="user-skeleton user-donation-stat-skeleton"></div> : <p className="user-donation-stat-value user-fade-in">{fmt(stats.thisYearTotal)}</p>}
          </div>
          <div className="user-donation-stat-card">
            <div className="user-donation-stat-header">
              <p className="user-donation-stat-label">Total Donations</p>
              <Heart className="user-donation-stat-icon" size={20} color="#155DFC" />
            </div>
            {loading ? <div className="user-skeleton user-donation-stat-skeleton-sm"></div> : <p className="user-donation-stat-value user-fade-in">{stats.totalCount}</p>}
          </div>
        </div>

        {/* Two-column grid */}
        <div className="user-donations-content-grid">

          {/* Left: Make a Donation */}
          <div className="user-donation-form-card">
            <div className="user-card-header-row">
              <h2 className="user-donation-section-title">Make a Donation</h2>
            </div>
            <div className="user-donation-form">

              {/* Amount */}
              <div className="user-donation-form-group">
                <label className="user-donation-form-label">Donation Amount</label>
                <div className="user-amount-input-wrapper">
                  <span className="user-currency-symbol">₱</span>
                  <input
                    type="text"
                    className="user-amount-input"
                    placeholder="Enter amount"
                    value={donationAmount}
                    onChange={(e) => {
                      let raw = e.target.value.replace(/[^0-9.]/g, '');
                      let val = parseFloat(raw) || 0;
                      if (val > 500000) raw = '500000';
                      
                      const parts = raw.split('.');
                      if (parts[0]) {
                        parts[0] = parseInt(parts[0], 10).toLocaleString('en-US');
                      }
                      setDonationAmount(parts.join('.'));
                      setFormError('');
                    }}
                    disabled={submitting}
                  />
                </div>
                <div className="user-quick-amounts user-quick-amounts-wrapper">
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      className={`user-quick-amount-btn${Number(String(donationAmount).replace(/,/g, '')) === q ? ' user-quick-amount-active' : ''}`}
                      onClick={() => { setDonationAmount(q.toLocaleString('en-US')); setFormError(''); }}
                      disabled={submitting}
                    >
                      ₱{q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="user-donation-form-group">
                <label className="user-donation-form-label">Donation Category</label>
                <div className="user-select-wrapper">
                  <select
                    className="user-donation-form-select user-category-select"
                    value={donationCategory}
                    onChange={(e) => { setDonationCategory(e.target.value); setFormError(''); }}
                    disabled={submitting}
                  >
                    <option value="" disabled>Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="user-select-icon" size={18} />
                </div>
              </div>

              {/* Payment Method */}
              <div className="user-donation-form-group">
                <label className="user-donation-form-label">Payment Method</label>
                <div className="user-payment-methods">
                  <button
                    className={`user-payment-method-btn${paymentMethod === 'E-Wallet' ? ' active' : ''}`}
                    onClick={() => setPaymentMethod(paymentMethod === 'E-Wallet' ? '' : 'E-Wallet')}
                    disabled={submitting}
                  >
                    <EWalletIcon />
                    <span>E-Wallet</span>
                  </button>
                  <button
                    className={`user-payment-method-btn${paymentMethod === 'Bank' ? ' active' : ''}`}
                    onClick={() => setPaymentMethod(paymentMethod === 'Bank' ? '' : 'Bank')}
                    disabled={submitting}
                  >
                    <BankIcon />
                    <span>Bank Transfer</span>
                  </button>
                </div>
                {paymentMethod && (
                  <div className="user-payment-info-wrapper expanded">
                    {approvalMethod === 'manual' ? (
                      <div style={{ marginTop: '16px' }}>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                          Please transfer your donation to our <strong>{paymentMethod}</strong> account and upload the receipt below.
                        </p>

                        <div className="user-donation-manual-info-grid">
                          <div className="user-donation-input-group">
                            <label className="user-donation-form-label">{paymentMethod} Option</label>
                            {paymentMethod === 'E-Wallet' ? (
                              <select className="user-donation-select" value={subMethod} onChange={(e) => setSubMethod(e.target.value)}>
                                <option value="">Select E-Wallet</option>
                                <option value="GCash">GCash</option>
                                <option value="Maya">Maya</option>
                              </select>
                            ) : (
                              <select className="user-donation-select" value={subMethod} onChange={(e) => setSubMethod(e.target.value)}>
                                <option value="">Select Bank</option>
                                <optgroup label="Card Payments">
                                  <option value="Master Card">Master Card</option>
                                  <option value="Visa">Visa</option>
                                </optgroup>
                                <optgroup label="Online Bank">
                                  <option value="BPI">BPI</option>
                                  <option value="BDO">BDO</option>
                                  <option value="PNB">PNB</option>
                                  <option value="Metrobank">Metrobank</option>
                                  <option value="Unionbank">Unionbank</option>
                                  <option value="Instapay">Instapay</option>
                                  <option value="RCBC">RCBC</option>
                                </optgroup>
                              </select>
                            )}
                          </div>
                          <div className="user-donation-input-group">
                            <label className="user-donation-form-label">Sender Account Name</label>
                            <input 
                              type="text" 
                              className="user-donation-input" 
                              placeholder="Juan Dela Cruz"
                              value={accountName}
                              onChange={(e) => setAccountName(e.target.value)}
                            />
                          </div>
                          <div className="user-donation-input-group">
                            <label className="user-donation-form-label">Sender Account Number</label>
                            <input 
                              type="text" 
                              className="user-donation-input" 
                              placeholder="09123456789 or 1234567890"
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <label className="user-file-upload-zone" style={{ marginTop: '16px' }}>
                          <input type="file" accept="image/*" onChange={handleFileChange} className="user-file-upload-input" />
                          <div className="user-file-upload-content">
                            <UploadCloud className="user-file-upload-icon" size={28} />
                            <p className="user-file-upload-text"><span>Click to upload</span> or drag and drop</p>
                            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>PNG, JPG, JPEG up to 5MB</p>
                          </div>
                        </label>

                        {proofFile && (
                          <div className="user-file-attached">
                            <FileCheck2 size={16} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {proofFile.name}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '10px' }}>
                        You will be securely redirected to PayMongo to complete your {paymentMethod} transaction.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {formError && <p className="user-donation-form-error">{formError}</p>}

              <button className="user-donate-btn" onClick={handleDonate} disabled={submitting}>
                {submitting ? <span className="btn-spinner" /> : (
                  <>
                    <Heart className="user-donate-icon" size={20} color="white" />
                    Donate Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column Container */}
          <div className="user-donations-right-col">
            {/* Donation History (Preview) */}
            <div className="user-donation-history-card">
              <div className="user-card-header-row">
                <h2 className="user-donation-section-title">Donation History</h2>
                <button className="user-view-history-btn" onClick={handleOpenHistory}>View History</button>
              </div>

              {/* Category Pie Chart & Recent Donations */}
              {!loading && (
                <div className="user-donation-history-preview-layout">
                  <div style={{ width: '100%', height: 300, minHeight: 300, position: 'relative' }}>
                    {(() => {
                      let runningTotal = 0;
                      const fallbackMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => ({ month: m, amount: 0 }));
                      const rawData = stats.monthlyData || fallbackMonths;
                      
                      const chartData = rawData.map(d => {
                        const amt = Number(d.amount) || 0;
                        runningTotal += amt;
                        return { ...d, cumulative: runningTotal, amount: amt > 0 ? amt : null };
                      });
                      
                      return (
                        <ResponsiveContainer width="99%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                            <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={11} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                            <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={11} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} hide />
                            <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} formatter={(v) => '₱' + Math.round(v).toLocaleString()} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar yAxisId="left" dataKey="amount" name="Monthly Volume" fill="#155DFC" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative Total" stroke="#00A63E" strokeWidth={2.5} dot={{ r: 3 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>

                  <div className="user-donation-recent-list-container">
                    <div className="user-donation-recent-list">
                      {recentDonations.slice(0, 5).map(d => (
                        <div key={d._id} className="user-donation-recent-item" onClick={() => handleOpenReceipt(d)}>
                          <div className="user-donation-recent-info">
                            <span className="user-donation-recent-fund">{d.category}</span>
                            <span className="user-donation-recent-date">{fmtDate(d.createdAt || d.date)}</span>
                          </div>
                          <div className="user-donation-recent-amount">
                            <span className="user-donation-recent-amt">{fmt(d.amount)}</span>
                            <span className={`user-donation-recent-status status-${d.status || 'pending'}`}>
                              {d.status === 'confirmed' ? 'Successful' : d.status === 'rejected' ? 'Failed' : 'Incomplete'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {recentDonations.length === 0 && (
                        <p className="user-donation-recent-empty">No recent donations yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && (!stats.categoryBreakdown || Object.keys(stats.categoryBreakdown).length === 0) && (
                <div className="user-donation-empty-state">
                  <div className="user-donation-empty-icon-wrap">
                    <Heart size={28} color="#1E3A8A" />
                  </div>
                  <p className="user-donation-empty-title">No donations yet</p>
                  <p className="user-donation-empty-subtitle">Your giving history will appear here. Every contribution makes a difference!</p>
                </div>
              )}
            </div>

            {/* Where your giving goes */}
            <div className="user-donation-history-card">
              <div className="user-card-header-row user-giving-goes-header">
                <h2 className="user-donation-section-title">Where Your Giving Goes</h2>
              </div>
              <div className="user-donation-empty-categories">
                {CATEGORIES.map((cat) => (
                  <div key={cat.name} className="user-donation-empty-category-item">
                    <div className="user-donation-3d-icon-wrap">
                      {cat.icon}
                    </div>
                    <div className="user-donation-empty-category-info">
                      <p className="user-donation-empty-category-name">{cat.name}</p>
                      <p className="user-donation-empty-category-desc">{cat.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ── Donation History Modal ── */}
      {isHistoryModalOpen && (
        <div className="user-donation-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="user-donation-modal-content" onClick={e => e.stopPropagation()}>
            <div className="user-modal-header">
              <h2 className="user-modal-title">Donation History</h2>
              <button className="user-modal-close-btn" onClick={() => setIsHistoryModalOpen(false)}>×</button>
            </div>

            <div className="user-modal-filters">
              <div className="user-donation-filter-group">
                <label className="user-donation-filter-label">Filter by Category</label>
                <div className="user-select-wrapper">
                  <select
                    className="user-donation-form-select user-donation-filter-select"
                    value={modalCategory}
                    onChange={(e) => {
                      setModalCategory(e.target.value);
                      setModalPage(1);
                    }}
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="user-select-icon" size={16} />
                </div>
              </div>
              <div className="user-donation-filter-group">
                <label className="user-donation-filter-label">Payment Method</label>
                <div className="user-select-wrapper">
                  <select
                    className="user-donation-form-select user-donation-filter-select"
                    value={modalPaymentMethod}
                    onChange={(e) => {
                      setModalPaymentMethod(e.target.value);
                      setModalPage(1);
                    }}
                  >
                    <option value="">All Methods</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                  <ChevronDown className="user-select-icon" size={16} />
                </div>
              </div>
            </div>

            <div className="user-modal-body user-history-modal-body">
              {modalLoading ? (
                <p className="user-modal-loading">Loading history...</p>
              ) : modalHistory.length === 0 ? (
                <p className="user-modal-empty">No donations found for this filter.</p>
              ) : (
                <div className="user-modal-history-list">
                  {modalHistory.map((d) => (
                    <div
                      key={d._id || d.donationId}
                      className="user-donation-history-item user-modal-item user-clickable"
                      onClick={() => handleOpenReceipt(d)}
                    >
                      <div className="user-donation-history-main">
                        <div className="user-modal-icon-wrapper">
                          <Receipt size={18} color="#155DFC" />
                        </div>
                        <div className="user-donation-history-info">
                          <h3 className="user-donation-fund">{d.category}</h3>
                          <p className="user-donation-id">{d.donationId} · {fmtDate(d.createdAt || d.date)}</p>
                          <p className="user-donation-details">{d.method || d.paymentMethod}</p>
                        </div>
                      </div>
                      <div className="user-donation-history-amount-col">
                        <p className="user-donation-history-amount">{fmt(d.amount)}</p>
                        <span className={`user-donation-status-badge user-donation-status-${d.status || 'pending'}`}>
                          {d.status === 'confirmed' ? 'Successful' : d.status === 'rejected' ? 'Failed' : 'Incomplete'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {modalTotalPages > 1 && (
              <div className="user-modal-pagination">
                <button
                  className="user-modal-page-btn"
                  onClick={() => setModalPage(p => Math.max(1, p - 1))}
                  disabled={modalPage === 1 || modalLoading}
                >‹ Prev</button>
                <span className="user-modal-page-info">Page {modalPage} of {modalTotalPages}</span>
                <button
                  className="user-modal-page-btn"
                  onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))}
                  disabled={modalPage === modalTotalPages || modalLoading}
                >Next ›</button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Receipt Modal ── */}
      {isReceiptModalOpen && selectedDonation && (
        <div className="user-receipt-modal-overlay" onClick={() => setIsReceiptModalOpen(false)}>
          <div className="user-receipt-modal-card" onClick={e => e.stopPropagation()}>
            <div className="user-receipt-header-gradient">
              <div className="user-receipt-header-content">
                <Receipt className="user-receipt-main-icon" size={32} />
                <h2 className="user-receipt-header-title">Donation Receipt</h2>
                <p className="user-receipt-header-subtitle">Faithly Official Record</p>
              </div>
              <button
                className="user-receipt-close-btn"
                onClick={() => setIsReceiptModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="user-receipt-body">
              <div className="user-receipt-amount-section">
                <p className="user-receipt-amount-label">Amount Contributed</p>
                <h1 className="user-receipt-amount-value">{fmt(selectedDonation.amount)}</h1>
                <div className={`user-receipt-status-badge user-receipt-status-${selectedDonation.status || 'pending'}`}>
                  {selectedDonation.status === 'confirmed' ? 'Successful' : selectedDonation.status === 'rejected' ? 'Failed' : 'Incomplete'}
                </div>
              </div>

              <div className="user-receipt-details-list">
                <div className="user-receipt-detail-item">
                  <span className="user-receipt-detail-label">Donor Name</span>
                  <span className="user-receipt-detail-value">{user?.fullName || 'Valued Member'}</span>
                </div>
                <div className="user-receipt-detail-item">
                  <span className="user-receipt-detail-label">Fund Category</span>
                  <span className="user-receipt-detail-value">{selectedDonation.category}</span>
                </div>
                <div className="user-receipt-detail-item">
                  <span className="user-receipt-detail-label">Transaction ID</span>
                  <span className="user-receipt-detail-value">{selectedDonation.donationId}</span>
                </div>
                <div className="user-receipt-detail-item">
                  <span className="user-receipt-detail-label">Date & Time</span>
                  <span className="user-receipt-detail-value">{fmtDate(selectedDonation.createdAt || selectedDonation.date)}</span>
                </div>
                <div className="user-receipt-detail-item">
                  <span className="user-receipt-detail-label">Payment Method</span>
                  <span className="user-receipt-detail-value">{selectedDonation.method || selectedDonation.paymentMethod}</span>
                </div>
              </div>

              <div className="user-receipt-footer-note">
                <p>Thank you for your generous support of God's work. Your contribution makes a difference in our community.</p>
              </div>

              <div className="user-receipt-actions">
                <button className="user-receipt-action-btn secondary">
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
                <button className="user-receipt-action-btn primary">
                  <Download size={16} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}