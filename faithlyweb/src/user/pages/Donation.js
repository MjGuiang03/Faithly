import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { ChevronDown, Receipt, X, Download, Share2 } from 'lucide-react';
import '../styles/Donation.css';
import gcashLogo from '../../assets/gcashlogo.png';
import bankLogo from '../../assets/whitebanklogo.png';

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

const mockProcessPayment = () =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1200));

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
    src={bankLogo}
    alt="Bank Transfer"
    style={{ width: 32, height: 32, objectFit: 'contain' }}
  />
);

export default function Donation() {
  const { user } = useAuth();
  const [donationAmount, setDonationAmount] = useState('');
  const [donationCategory, setDonationCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCash');
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
  
  /* ── History Modal States ── */
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalCategory, setModalCategory] = useState('');
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
      const res = await fetch(`${API}/api/donations/my-donations?page=${modalPage}&limit=${MODAL_LIMIT}${catParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalHistory(data.donations || []);
        setModalTotalPages(data.totalPages || 1);
      }
    } catch { /* silent */ }
    finally { setModalLoading(false); }
  }, [modalPage, modalCategory]);

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

    setSubmitting(true);
    try {
      await mockProcessPayment();
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: num, category: donationCategory, paymentMethod, isRecurring }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to record donation');
      setSuccessModal({ amount: num, category: donationCategory });
      setDonationAmount('');
      setDonationCategory('');
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
    setIsHistoryModalOpen(true);
  };

  const handleOpenReceipt = (donation) => {
    setSelectedDonation(donation);
    setIsReceiptModalOpen(true);
  };

  return (
    <>
      <div className="home-layout">
        <Sidebar />
        <div className="main-content">

          {/* Header */}
          <div className="home-header">
            <h1 className="page-title">Donations</h1>
            <p className="page-subtitle">Support the church and track your giving</p>
          </div>

          {/* Stats */}
          <div className="donations-stats">
            <div className="donation-stat-card">
              <div className="donation-stat-header">
                <p className="donation-stat-label">Total Donated</p>
                <svg className="donation-stat-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M17.3667 3.84167C16.941 3.41583 16.4357 3.07803 15.8794 2.84757C15.3231 2.61712 14.7267 2.49854 14.1245 2.49854C13.5224 2.49854 12.9259 2.61712 12.3696 2.84757C11.8133 3.07803 11.308 3.41583 10.8823 3.84167L10.0001 4.72417L9.11793 3.84167C8.25853 2.98227 7.09337 2.49898 5.87593 2.49898C4.65849 2.49898 3.49334 2.98227 2.63393 3.84167C1.77453 4.70108 1.29124 5.86623 1.29124 7.08367C1.29124 8.30111 1.77453 9.46626 2.63393 10.3257L10.0001 17.6917L17.3662 10.3257C17.792 9.89993 18.1298 9.39461 18.3602 8.83831C18.5907 8.28202 18.7092 7.68556 18.7092 7.08334C18.7092 6.48112 18.5907 5.88465 18.3602 5.32836C18.1298 4.77207 17.792 4.26743 17.3662 3.84167H17.3667Z" stroke="#E60076" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <p className="donation-stat-value">{fmt(stats.totalDonated)}</p>
            </div>
            <div className="donation-stat-card">
              <div className="donation-stat-header">
                <p className="donation-stat-label">This Year</p>
                <svg className="donation-stat-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M10 16.6667V10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M6.66667 13.3333L10 10L13.3333 13.3333" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <p className="donation-stat-value">{fmt(stats.thisYearTotal)}</p>
            </div>
            <div className="donation-stat-card">
              <div className="donation-stat-header">
                <p className="donation-stat-label">Total Donations</p>
                <svg className="donation-stat-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M15.8333 3.33333H4.16667C3.24619 3.33333 2.5 4.07952 2.5 5V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V5C17.5 4.07952 16.7538 3.33333 15.8333 3.33333Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              <p className="donation-stat-value">{stats.totalCount}</p>
            </div>
          </div>

          {/* Two-column grid */}
          <div className="donations-content-grid">

            {/* Left: Make a Donation */}
            <div className="donation-form-card">
              <h2 className="section-title">Make a Donation</h2>
              <div className="donation-form">

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label">Donation Amount</label>
                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">₱</span>
                    <input
                      type="number"
                      className="amount-input"
                      placeholder="Enter amount"
                      value={donationAmount}
                      onChange={(e) => { setDonationAmount(e.target.value); setFormError(''); }}
                      disabled={submitting}
                    />
                  </div>
                  <div className="quick-amounts">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        className={`quick-amount-btn${Number(donationAmount) === q ? ' quick-amount-active' : ''}`}
                        onClick={() => { setDonationAmount(String(q)); setFormError(''); }}
                        disabled={submitting}
                      >
                        ₱{q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Donation Category</label>
                  <div className="select-wrapper">
                    <select
                      className="form-select category-select"
                      value={donationCategory}
                      onChange={(e) => { setDonationCategory(e.target.value); setFormError(''); }}
                      disabled={submitting}
                    >
                      <option value="" disabled>Select a category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="select-icon" size={18} />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div className="payment-methods">
                    <button
                      className={`payment-method-btn${paymentMethod === 'GCash' ? ' active' : ''}`}
                      onClick={() => setPaymentMethod('GCash')}
                      disabled={submitting}
                    >
                      <GCashIcon />
                      <span>GCash</span>
                    </button>
                    <button
                      className={`payment-method-btn${paymentMethod === 'Bank' ? ' active' : ''}`}
                      onClick={() => setPaymentMethod('Bank')}
                      disabled={submitting}
                    >
                      <BankIcon />
                      <span>Bank Transfer</span>
                    </button>
                  </div>
                </div>

                {/* Recurring */}
                <div className="recurring-container">
                  <input
                    type="checkbox"
                    id="recurring"
                    className="recurring-checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    disabled={submitting}
                  />
                  <label htmlFor="recurring" className="recurring-label">
                    <span className="recurring-title">Make this a recurring donation</span>
                    <span className="recurring-description">Automatically donate this amount monthly</span>
                  </label>
                </div>

                {formError && <p className="donation-form-error">{formError}</p>}

                <button className="donate-btn" onClick={handleDonate} disabled={submitting}>
                  {submitting ? 'Processing…' : (
                    <>
                      <svg className="donate-icon" fill="none" viewBox="0 0 20 20">
                        <path d="M17.3667 3.84167C16.941 3.41583 16.4357 3.07803 15.8794 2.84757C15.3231 2.61712 14.7267 2.49854 14.1245 2.49854C13.5224 2.49854 12.9259 2.61712 12.3696 2.84757C11.8133 3.07803 11.308 3.41583 10.8823 3.84167L10.0001 4.72417L9.11793 3.84167C8.25853 2.98227 7.09337 2.49898 5.87593 2.49898C4.65849 2.49898 3.49334 2.98227 2.63393 3.84167C1.77453 4.70108 1.29124 5.86623 1.29124 7.08367C1.29124 8.30111 1.77453 9.46626 2.63393 10.3257L10.0001 17.6917L17.3662 10.3257C17.792 9.89993 18.1298 9.39461 18.3602 8.83831C18.5907 8.28202 18.7092 7.68556 18.7092 7.08334C18.7092 6.48112 18.5907 5.88465 18.3602 5.32836C18.1298 4.77207 17.792 4.26743 17.3662 3.84167H17.3667Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </svg>
                      Donate Now
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Donation Categories */}
            <div className="donation-history-card">
              <h2 className="section-title">Donation Categories</h2>
              <div className="donation-categories-list">
                {CATEGORIES.map((c) => (
                  <div key={c.name} className="donation-category-row">
                    <h3 className="donation-fund">{c.name}</h3>
                    <p className="donation-details" style={{ margin: 0 }}>{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Donation History (Preview) */}
          <div className="donation-categories-section">
            <div className="history-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>Donation History</h2>
              <button className="view-history-btn" onClick={handleOpenHistory}>View History</button>
            </div>

            {loading && <p className="donations-loading-text">Loading…</p>}

            {!loading && donationHistory.length === 0 && (
              <p className="donations-empty-text">No donations yet.</p>
            )}

            {!loading && donationHistory.length > 0 && (
              <div className="donation-history-list">
                {donationHistory.slice(0, 5).map((d) => (
                  <div 
                    key={d._id || d.donationId} 
                    className="donation-history-item clickable"
                    onClick={() => handleOpenReceipt(d)}
                  >
                    <div className="donation-history-main">
                      <svg className="donation-history-icon" fill="none" viewBox="0 0 20 20">
                        <path d="M17.3667 3.84167C16.941 3.41583 16.4357 3.07803 15.8794 2.84757C15.3231 2.61712 14.7267 2.49854 14.1245 2.49854C13.5224 2.49854 12.9259 2.61712 12.3696 2.84757C11.8133 3.07803 11.308 3.41583 10.8823 3.84167L10.0001 4.72417L9.11793 3.84167C8.25853 2.98227 7.09337 2.49898 5.87593 2.49898C4.65849 2.49898 3.49334 2.98227 2.63393 3.84167C1.77453 4.70108 1.29124 5.86623 1.29124 7.08367C1.29124 8.30111 1.77453 9.46626 2.63393 10.3257L10.0001 17.6917L17.3662 10.3257C17.792 9.89993 18.1298 9.39461 18.3602 8.83831C18.5907 8.28202 18.7092 7.68556 18.7092 7.08334C18.7092 6.48112 18.5907 5.88465 18.3602 5.32836C18.1298 4.77207 17.792 4.26743 17.3662 3.84167H17.3667Z" stroke="#E60076" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </svg>
                      <div className="donation-history-info">
                        <h3 className="donation-fund">{d.category}</h3>
                        <p className="donation-id">{d.donationId}</p>
                        <p className="donation-details">
                          {fmtDate(d.createdAt || d.date)} · {d.method || d.paymentMethod}
                        </p>
                        {d.type === 'Recurring' && (
                          <span className="recurring-badge">Recurring</span>
                        )}
                      </div>
                    </div>
                    <p className="donation-history-amount">{fmt(d.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Thank You Modal ── */}
      {successModal && (
        <div className="donation-success-overlay" onClick={() => setSuccessModal(null)}>
          <div className="donation-success-modal" onClick={e => e.stopPropagation()}>
            {/* Checkmark icon */}
            <div className="donation-success-icon-wrap">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="22" fill="#dcfce7" />
                <path d="M13 22.5L19.5 29L31 16" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 className="donation-success-title">Thank You!</h2>
            <p className="donation-success-subtitle">Your generous donation has been received</p>

            {/* Amount + Category box */}
            <div className="donation-success-details">
              <p className="donation-success-detail-label">Donation Amount</p>
              <p className="donation-success-amount">{fmt(successModal.amount)}</p>
              <div className="donation-success-category">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <path d="M17.3667 3.84167C16.941 3.41583 16.4357 3.07803 15.8794 2.84757C15.3231 2.61712 14.7267 2.49854 14.1245 2.49854C13.5224 2.49854 12.9259 2.61712 12.3696 2.84757C11.8133 3.07803 11.308 3.41583 10.8823 3.84167L10.0001 4.72417L9.11793 3.84167C8.25853 2.98227 7.09337 2.49898 5.87593 2.49898C4.65849 2.49898 3.49334 2.98227 2.63393 3.84167C1.77453 4.70108 1.29124 5.86623 1.29124 7.08367C1.29124 8.30111 1.77453 9.46626 2.63393 10.3257L10.0001 17.6917L17.3662 10.3257C17.792 9.89993 18.1298 9.39461 18.3602 8.83831C18.5907 8.28202 18.7092 7.68556 18.7092 7.08334C18.7092 6.48112 18.5907 5.88465 18.3602 5.32836C18.1298 4.77207 17.792 4.26743 17.3662 3.84167H17.3667Z" stroke="#E60076" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <span>{successModal.category}</span>
              </div>
            </div>

            <p className="donation-success-note">
              Your contribution helps us continue our mission and ministry work
            </p>

            <button className="donation-success-close" onClick={() => setSuccessModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {/* ── Donation History Modal ── */}
      {isHistoryModalOpen && (
        <div className="donation-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="donation-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Donation History</h2>
              <button className="modal-close-btn" onClick={() => setIsHistoryModalOpen(false)}>×</button>
            </div>

            <div className="modal-filters">
              <div className="filter-group">
                <label className="filter-label" style={{ marginRight: '8px' }}>Filter by Category:</label>
                <select
                  className="filter-select"
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
              </div>
            </div>

            <div className="modal-body history-modal-body">
              {modalLoading ? (
                <p className="modal-loading">Loading history...</p>
              ) : modalHistory.length === 0 ? (
                <p className="modal-empty">No donations found for this filter.</p>
              ) : (
                <div className="modal-history-list">
                  {modalHistory.map((d) => (
                    <div 
                      key={d._id || d.donationId} 
                      className="donation-history-item modal-item clickable"
                      onClick={() => handleOpenReceipt(d)}
                    >
                      <div className="donation-history-main">
                        <div className="donation-history-info">
                          <h3 className="donation-fund">{d.category}</h3>
                          <p className="donation-id">{d.donationId} · {fmtDate(d.createdAt || d.date)}</p>
                          <p className="donation-details">{d.method || d.paymentMethod}</p>
                        </div>
                      </div>
                      <p className="donation-history-amount">{fmt(d.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {modalTotalPages > 1 && (
              <div className="modal-pagination">
                <button
                  className="modal-page-btn"
                  onClick={() => setModalPage(p => Math.max(1, p - 1))}
                  disabled={modalPage === 1 || modalLoading}
                >‹ Prev</button>
                <span className="modal-page-info">Page {modalPage} of {modalTotalPages}</span>
                <button
                  className="modal-page-btn"
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
        <div className="receipt-modal-overlay" onClick={() => setIsReceiptModalOpen(false)}>
          <div className="receipt-modal-card" onClick={e => e.stopPropagation()}>
            <div className="receipt-header-gradient">
              <div className="receipt-header-content">
                <Receipt className="receipt-main-icon" size={32} />
                <h2 className="receipt-header-title">Donation Receipt</h2>
                <p className="receipt-header-subtitle">Faithly Official Record</p>
              </div>
              <button 
                className="receipt-close-btn" 
                onClick={() => setIsReceiptModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="receipt-body">
              <div className="receipt-amount-section">
                <p className="receipt-amount-label">Amount Contributed</p>
                <h1 className="receipt-amount-value">{fmt(selectedDonation.amount)}</h1>
                <div className="receipt-status-badge">Completed</div>
              </div>

              <div className="receipt-details-list">
                <div className="receipt-detail-item">
                  <span className="receipt-detail-label">Donor Name</span>
                  <span className="receipt-detail-value">{user?.fullName || 'Valued Member'}</span>
                </div>
                <div className="receipt-detail-item">
                  <span className="receipt-detail-label">Fund Category</span>
                  <span className="receipt-detail-value">{selectedDonation.category}</span>
                </div>
                <div className="receipt-detail-item">
                  <span className="receipt-detail-label">Transaction ID</span>
                  <span className="receipt-detail-value">{selectedDonation.donationId}</span>
                </div>
                <div className="receipt-detail-item">
                  <span className="receipt-detail-label">Date & Time</span>
                  <span className="receipt-detail-value">{fmtDate(selectedDonation.createdAt || selectedDonation.date)}</span>
                </div>
                <div className="receipt-detail-item">
                  <span className="receipt-detail-label">Payment Method</span>
                  <span className="receipt-detail-value">{selectedDonation.method || selectedDonation.paymentMethod}</span>
                </div>
              </div>

              <div className="receipt-footer-note">
                <p>Thank you for your generous support of God's work. Your contribution makes a difference in our community.</p>
              </div>

              <div className="receipt-actions">
                <button className="receipt-action-btn secondary">
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
                <button className="receipt-action-btn primary">
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