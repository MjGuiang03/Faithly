import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
// import Sidebar from '../components/Sidebar'; // Moved to UserLayout
import { Banknote, CheckCircle, ChevronDown, Download, Heart, Receipt, Share2, X, Wallet, TrendingUp, History, CreditCard } from 'lucide-react';
import '../styles/Donation.css';
import gcashLogo from '../../assets/gcashlogo.png';
import bank from '../../assets/bank.png';
import gcashQr from '../../assets/gcash_qr.png';

import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '₱0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const QUICK_AMOUNTS = [25, 50, 100, 250];

const CATEGORIES = [
  { name: 'General Fund', description: 'Church operations and ministry' },
  { name: 'Children Ministry', description: "Children's programs and activities" },
  { name: 'Building Fund', description: 'Infrastructure and facility improvements' },
  { name: 'Youth Ministry', description: 'Youth programs and events' },
  { name: 'Mission Fund', description: 'Missionary work and outreach programs' },
];



/* ── Payment method icons ── */
const GCashIcon = () => (
  <img
    src={gcashLogo}
    alt="GCash"
    style={{ width: 60, height: 30, objectFit: 'contain' }}
  />
);

const BankIcon = () => (
  <img
    src={bank}
    alt="Bank Transfer"
    style={{ width: 32, height: 32, objectFit: 'contain' }}
  />
);

export default function Donation() {
  const { user } = useAuth();
  const [donationAmount, setDonationAmount] = useState('');
  const [donationCategory, setDonationCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [donationHistory, setDonationHistory] = useState([]);
  const [stats, setStats] = useState({ totalDonated: 0, thisYearTotal: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [successModal, setSuccessModal] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState(null);

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
        setDonationHistory(data.donations || []);
        setStats(data.stats || { totalDonated: 0, thisYearTotal: 0, totalCount: 0 });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [historyPage]);

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

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // const historyTotalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PER_PAGE));
  // const paginatedHistory = donationHistory;

  const handleDonate = async () => {
    setFormError('');
    const num = Number(donationAmount);
    if (!num || num <= 0) { setFormError('Please enter a valid donation amount.'); return; }
    if (!donationCategory) { setFormError('Please select a donation category.'); return; }
    if (!paymentMethod) { setFormError('Please select a payment method.'); return; }
    if (!proofFile) { setFormError('Please upload proof of payment.'); return; }

    setSubmitting(true);
    try {
      // Convert proof image to base64
      const proofImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(proofFile);
      });

      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: num, category: donationCategory, paymentMethod, isRecurring, proofImage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to record donation');
      setSuccessModal({ amount: num, category: donationCategory });
      setDonationAmount('');
      setDonationCategory('');
      setPaymentMethod('');
      setProofFile(null);
      setIsRecurring(false);
      setHistoryPage(1);
      fetchHistory();
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
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
      <div className="user-main-content user-donation-main">

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
              <Wallet className="user-donation-stat-icon" size={20} color="#155DFC" />
            </div>
            {loading ? <div className="user-skeleton" style={{ height: '32px', width: '100px', margin: '8px 0' }}></div> : <p className="user-donation-stat-value user-fade-in">{fmt(stats.totalDonated)}</p>}
          </div>
          <div className="user-donation-stat-card">
            <div className="user-donation-stat-header">
              <p className="user-donation-stat-label">This Year</p>
              <TrendingUp className="user-donation-stat-icon" size={20} color="#155DFC" />
            </div>
            {loading ? <div className="user-skeleton" style={{ height: '32px', width: '100px', margin: '8px 0' }}></div> : <p className="user-donation-stat-value user-fade-in">{fmt(stats.thisYearTotal)}</p>}
          </div>
          <div className="user-donation-stat-card">
            <div className="user-donation-stat-header">
              <p className="user-donation-stat-label">Total Donations</p>
              <History className="user-donation-stat-icon" size={20} color="#155DFC" />
            </div>
            {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-donation-stat-value user-fade-in">{stats.totalCount}</p>}
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
                    type="number"
                    className="user-amount-input"
                    placeholder="Enter amount"
                    value={donationAmount}
                    onChange={(e) => { setDonationAmount(e.target.value); setFormError(''); }}
                    disabled={submitting}
                  />
                </div>
                <div className="user-quick-amounts" style={{ marginTop: '20px', marginBottom: '8px' }}>
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      className={`user-quick-amount-btn${Number(donationAmount) === q ? ' user-quick-amount-active' : ''}`}
                      onClick={() => { setDonationAmount(String(q)); setFormError(''); }}
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
                    className={`user-payment-method-btn${paymentMethod === 'GCash' ? ' active' : ''}`}
                    onClick={() => setPaymentMethod(paymentMethod === 'GCash' ? '' : 'GCash')}
                    disabled={submitting}
                  >
                    <GCashIcon />
                    <span>GCash</span>
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

                {/* ── Payment Account & Proof Wrapper ── */}
                <div className={`user-payment-info-wrapper ${paymentMethod !== '' ? 'expanded' : ''}`}>
                    <div className="user-payment-info-box" style={{ display: paymentMethod === 'Bank' ? 'none' : 'block' }}>
                      <div className="user-payment-info-header">
                        <img src={gcashLogo} alt="GCash" style={{ width: 50, height: 25, objectFit: 'contain' }} />
                        <span className="user-payment-info-title">GCash Account Details</span>
                      </div>
                      <div className="user-payment-info-content">
                        <div className="user-payment-info-details">
                          <div className="user-payment-info-row">
                            <span className="user-payment-info-label">Account Name</span>
                            <span className="user-payment-info-value">Faithly Church Ministry</span>
                          </div>
                          <div className="user-payment-info-row">
                            <span className="user-payment-info-label">GCash Number</span>
                            <span className="user-payment-info-value user-payment-info-value--mono">0917 123 4567</span>
                          </div>
                        </div>
                        <div className="user-payment-qr-wrap">
                          <img src={gcashQr} alt="GCash QR Code" className="user-payment-qr-img" />
                          <span className="user-payment-qr-label">Scan to pay</span>
                        </div>
                      </div>
                    </div>

                    <div className="user-payment-info-box" style={{ display: paymentMethod === 'Bank' ? 'block' : 'none' }}>
                      <div className="user-payment-info-header">
                        <img src={bank} alt="Bank" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        <span className="user-payment-info-title">Bank Transfer Details</span>
                      </div>
                      <div className="user-payment-info-content">
                        <div className="user-payment-info-details">
                          <div className="user-payment-info-row">
                            <span className="user-payment-info-label">Bank Name</span>
                            <span className="user-payment-info-value">BDO Unibank</span>
                          </div>
                          <div className="user-payment-info-row">
                            <span className="user-payment-info-label">Account Name</span>
                            <span className="user-payment-info-value">Faithly Church Ministry Inc.</span>
                          </div>
                          <div className="user-payment-info-row">
                            <span className="user-payment-info-label">Account Number</span>
                            <span className="user-payment-info-value user-payment-info-value--mono">0012 3456 7890</span>
                          </div>
                          <div className="user-payment-info-row">
                            <span className="user-payment-info-label">Branch</span>
                            <span className="user-payment-info-value">BDO Main Branch</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* ── Proof of Payment ── */}
                  <div className="user-donation-form-group" style={{ marginTop: '16px' }}>
                    <label className="user-donation-form-label">Proof of Payment</label>
                    <label
                      htmlFor="donation-proof-upload"
                      className={`user-proof-upload-box ${proofFile ? 'user-proof-upload-box--done' : ''}`}
                    >
                      {proofFile ? (
                        <>
                          <CheckCircle className="user-proof-upload-icon" size={24} color="#16a34a" />
                          <p className="user-proof-upload-text user-proof-upload-text--done">File selected</p>
                          <p className="user-proof-upload-subtext">{proofFile.name}</p>
                          <button
                            type="button"
                            className="user-proof-remove-btn"
                            onClick={(e) => { e.preventDefault(); setProofFile(null); }}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <Banknote className="user-proof-upload-icon" size={24} color="#99A1AF" />
                          <p className="user-proof-upload-text">Click to upload proof of payment</p>
                          <p className="user-proof-upload-subtext">Screenshot or photo of payment confirmation · PNG, JPG</p>
                        </>
                      )}
                      <input
                        type="file"
                        id="donation-proof-upload"
                        accept="image/png, image/jpeg"
                        onChange={(e) => setProofFile(e.target.files[0] || null)}
                        hidden
                      />
                    </label>
                  </div>
                </div>
              </div>

              {formError && <p className="user-donation-form-error">{formError}</p>}

              <button className="user-donate-btn" onClick={handleDonate} disabled={submitting}>
                {submitting ? <span className="btn-spinner" /> : (
                  <>
                    <CreditCard className="user-donate-icon" size={20} color="white" />
                    Donate Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Donation History (Preview) */}
          <div className="user-donation-history-card">
            <div className="user-card-header-row">
              <h2 className="user-donation-section-title">Donation History</h2>
              <button className="user-view-history-btn" onClick={handleOpenHistory}>View History</button>
            </div>

            {loading && (
              <div className="user-donation-history-list">
                {[1, 2, 3].map(i => (
                  <div key={i} className="user-donation-history-item" style={{ padding: '16px' }}>
                    <div className="user-donation-history-main" style={{ width: '100%' }}>
                      <div className="user-skeleton user-skeleton-circle" style={{ width: '32px', height: '32px', flexShrink: 0 }}></div>
                      <div style={{ flex: 1, marginLeft: '12px' }}>
                        <div className="user-skeleton" style={{ height: '14px', width: '30%', marginBottom: '6px' }}></div>
                        <div className="user-skeleton" style={{ height: '12px', width: '50%' }}></div>
                      </div>
                      <div className="user-skeleton" style={{ height: '16px', width: '60px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && donationHistory.length === 0 && (
              <p className="user-donations-empty-text">No donations yet.</p>
            )}

              {!loading && donationHistory.length > 0 && (
              <div className="user-donation-history-list user-fade-in">
                {donationHistory.slice(0, 5).map((d) => (
                  <div
                    key={d._id || d.donationId}
                    className="user-donation-history-item user-clickable"
                    onClick={() => handleOpenReceipt(d)}
                  >
                    <div className="user-donation-history-main">
                      <Heart className="user-donation-history-icon" size={20} color="#155DFC" />
                      <div className="user-donation-history-info">
                        <h3 className="user-donation-fund">{d.category}</h3>
                        <p className="user-donation-id">{d.donationId}</p>
                        <p className="user-donation-details">
                          {fmtDate(d.createdAt || d.date)} · {d.method || d.paymentMethod}
                        </p>
                        {d.type === 'Recurring' && (
                          <span className="user-recurring-badge">Recurring</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <p className="user-donation-history-amount">{fmt(d.amount)}</p>
                      <span className={`user-donation-status-badge user-donation-status-${d.status || 'pending'}`}>
                        {d.status === 'confirmed' ? 'Confirmed' : d.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Thank You Modal ── */}
      {successModal && (
        <div className="user-donation-success-overlay" onClick={() => setSuccessModal(null)}>
          <div className="user-donation-success-modal" onClick={e => e.stopPropagation()}>
            {/* Checkmark icon */}
            <div className="user-donation-success-icon-wrap">
              <CheckCircle size={44} color="#16a34a" />
            </div>

            <h2 className="user-donation-success-title">Thank You!</h2>
            <p className="user-donation-success-subtitle">Your donation has been received and is pending admin confirmation</p>

            {/* Amount + Category box */}
            <div className="user-donation-success-details">
              <p className="user-donation-success-detail-label">Donation Amount</p>
              <p className="user-donation-success-amount">{fmt(successModal.amount)}</p>
              <div className="user-donation-success-category">
                <CheckCircle size={15} color="#E60076" />
                <span>{successModal.category}</span>
              </div>
            </div>

            <p className="user-donation-success-note">
              Your contribution helps us continue our mission and ministry work
            </p>

            <button className="user-donation-success-close" onClick={() => setSuccessModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
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
                    <option value="GCash">GCash</option>
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
                        <div className="user-donation-history-info">
                          <h3 className="user-donation-fund">{d.category}</h3>
                          <p className="user-donation-id">{d.donationId} · {fmtDate(d.createdAt || d.date)}</p>
                          <p className="user-donation-details">{d.method || d.paymentMethod}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <p className="user-donation-history-amount">{fmt(d.amount)}</p>
                        <span className={`user-donation-status-badge user-donation-status-${d.status || 'pending'}`}>
                          {d.status === 'confirmed' ? 'Confirmed' : d.status === 'rejected' ? 'Rejected' : 'Pending'}
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
                  {selectedDonation.status === 'confirmed' ? 'Confirmed' : selectedDonation.status === 'rejected' ? 'Rejected' : 'Pending Confirmation'}
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