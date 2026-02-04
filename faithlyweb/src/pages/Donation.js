import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import svgPaths from '../imports/svg-kfi3zq3ims';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Donation.css';
import Sidebar from '../components/Sidebar';

export default function Donations() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [donationAmount, setDonationAmount] = useState('');
  const [donationCategory, setDonationCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  const quickAmounts = [25, 50, 100, 250];

  const donationHistory = [
    {
      fund: 'General Fund',
      id: 'D-2026-001',
      date: '1/15/2026',
      method: 'Credit Card',
      amount: '₱100',
      recurring: true
    },
    {
      fund: 'Mission Fund',
      id: 'D-2025-089',
      date: '12/20/2025',
      method: 'Bank Transfer',
      amount: '₱50',
      recurring: false
    },
    {
      fund: 'Building Fund',
      id: 'D-2025-076',
      date: '11/10/2025',
      method: 'Credit Card',
      amount: '₱200',
      recurring: false
    }
  ];

  const categories = [
    {
      name: 'General Fund',
      description: 'Church operations and ministry'
    },
    {
      name: 'Building Fund',
      description: 'Infrastructure and facility improvements'
    },
    {
      name: 'Mission Fund',
      description: 'Missionary work and outreach programs'
    },
    {
      name: 'Children Ministry',
      description: "Children's programs and activities"
    },
    {
      name: 'Youth Ministry',
      description: 'Youth programs and events'
    }
  ];

  const handleQuickAmount = (amount) => {
    setDonationAmount(amount.toString());
  };

  const handleDonate = () => {
    alert('Donation feature coming soon!');
  };

  return (
    <div className="home-layout">
      {/* Sidebar */}
     <Sidebar/>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="donations-header">
          <h1 className="page-title">Donations</h1>
          <p className="page-subtitle">Support the church and track your giving</p>
        </div>

        {/* Stats Cards */}
        <div className="donations-stats">
          <div className="donation-stat-card">
            <div className="donation-stat-header">
              <p className="donation-stat-label">Total Donated</p>
              <svg className="donation-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d={svgPaths.p387b1200} stroke="#E60076" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <p className="donation-stat-value">₱0</p>
          </div>
          <div className="donation-stat-card">
            <div className="donation-stat-header">
              <p className="donation-stat-label">This Year</p>
              <svg className="donation-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M10 16.6667V10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M6.66667 13.3333L10 10L13.3333 13.3333" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <p className="donation-stat-value">₱0</p>
          </div>
          <div className="donation-stat-card">
            <div className="donation-stat-header">
              <p className="donation-stat-label">Total Donations</p>
              <svg className="donation-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p1da67b80} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <p className="donation-stat-value">0</p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="donations-content-grid">
          {/* Make a Donation Form */}
          <div className="donation-form-card">
            <h2 className="section-title">Make a Donation</h2>
            
            <div className="donation-form">
              {/* Amount Input */}
              <div className="form-group">
                <label className="form-label">Donation Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">₱</span>
                  <input
                    type="number"
                    className="amount-input"
                    placeholder="Enter amount"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                  />
                </div>
                <div className="quick-amounts">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      className="quick-amount-btn"
                      onClick={() => handleQuickAmount(amount)}
                    >
                      ₱{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="form-group">
                <label className="form-label">Donation Category</label>
                <select
                  className="form-select"
                  value={donationCategory}
                  onChange={(e) => setDonationCategory(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((cat, index) => (
                    <option key={index} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div className="payment-methods">
                  <button
                    className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <svg className="payment-icon" fill="none" viewBox="0 0 24 24">
                      <path d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z" stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <path d="M1 10H23" stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>Credit Card</span>
                  </button>
                  <button
                    className={`payment-method-btn ${paymentMethod === 'bank' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('bank')}
                  >
                    <span className="peso-icon">₱</span>
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* Recurring Checkbox */}
              <div className="recurring-container">
                <input
                  type="checkbox"
                  id="recurring"
                  className="recurring-checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <label htmlFor="recurring" className="recurring-label">
                  <span className="recurring-title">Make this a recurring donation</span>
                  <span className="recurring-description">Automatically donate this amount monthly</span>
                </label>
              </div>

              {/* Donate Button */}
              <button className="donate-btn" onClick={handleDonate}>
                <svg className="donate-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p387b1200} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                Donate Now
              </button>
            </div>
          </div>

          {/* Donation History */}
          <div className="donation-history-card">
            <h2 className="section-title">Donation History</h2>
            <div className="donation-history-list">
              {donationHistory.map((donation, index) => (
                <div key={index} className="donation-history-item">
                  <div className="donation-history-main">
                    <svg className="donation-history-icon" fill="none" viewBox="0 0 20 20">
                      <path d={svgPaths.p387b1200} stroke="#E60076" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    </svg>
                    <div className="donation-history-info">
                      <h3 className="donation-fund">{donation.fund}</h3>
                      <p className="donation-id">{donation.id}</p>
                      <p className="donation-details">{donation.date} • {donation.method}</p>
                      {donation.recurring && (
                        <span className="recurring-badge">Recurring</span>
                      )}
                    </div>
                  </div>
                  <p className="donation-history-amount">{donation.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donation Categories */}
        <div className="donation-categories-section">
          <h2 className="section-title">Donation Categories</h2>
          <div className="donation-categories-grid">
            {categories.map((category, index) => (
              <div key={index} className="category-card">
                <h3 className="category-name">{category.name}</h3>
                <p className="category-description">{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button className="chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
