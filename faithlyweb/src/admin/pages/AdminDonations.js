import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminDonations.css';
import svgPaths from "../../imports/svg-icons";

const API = process.env.REACT_APP_API_URL;

export default function AdminDonations() {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    recurring: 0,
    totalCount: 0
  });
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/admin/login');
      return;
    }
    fetchDonations();
  }, [navigate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchDonations();
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter, branchFilter]);

  const fetchDonations = async () => {
    try {
      setLoading(true);

      // Mock data
      setStats({ 
        total: 2850000, 
        thisMonth: 2850000, 
        recurring: 850000, 
        totalCount: 127 
      });

      setCategories([
        { name: 'Building Fund', amount: 1000000, count: 32 },
        { name: 'General Fund', amount: 800000, count: 45 },
        { name: 'Mission Fund', amount: 700000, count: 28 },
        { name: 'Youth Ministry', amount: 200000, count: 15 },
        { name: 'Children Ministry', amount: 150000, count: 7 },
      ]);

      setDonations([
        { _id: 1, donationId: 'D-2026-001', member: 'Juan Dela Cruz', amount: 5000, category: 'General Fund', date: '2/24/2026', method: 'Credit Card', type: 'Recurring' },
        { _id: 2, donationId: 'D-2026-002', member: 'Maria Santos', amount: 2500, category: 'Mission Fund', date: '2/23/2026', method: 'Bank Transfer', type: 'One-time' },
        { _id: 3, donationId: 'D-2026-003', member: 'Pedro Garcia', amount: 10000, category: 'Building Fund', date: '2/22/2026', method: 'Credit Card', type: 'One-time' },
        { _id: 4, donationId: 'D-2026-004', member: 'Ana Reyes', amount: 1500, category: 'Children Ministry', date: '2/21/2026', method: 'Credit Card', type: 'Recurring' },
        { _id: 5, donationId: 'D-2026-005', member: 'Carlos Torres', amount: 3000, category: 'General Fund', date: '2/20/2026', method: 'Bank Transfer', type: 'One-time' },
        { _id: 6, donationId: 'D-2026-006', member: 'Sofia Villanueva', amount: 2000, category: 'Youth Ministry', date: '2/19/2026', method: 'Credit Card', type: 'Recurring' },
        { _id: 7, donationId: 'D-2026-007', member: 'Miguel Ramos', amount: 4500, category: 'Mission Fund', date: '2/18/2026', method: 'Bank Transfer', type: 'One-time' },
      ]);
    } catch (err) {
      toast.error('Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `₱${Number(amount).toLocaleString()}`;

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.member.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          donation.donationId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          donation.type.toLowerCase().replace('-', '') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-donations-main">
      {/* Header */}
      <div className="admin-donations-header">
        <h1 className="admin-donations-title">Donation Tracking</h1>
        <p className="admin-donations-subtitle">Monitor and analyze church donations</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-donations-stats-grid">
        <div className="admin-donations-stat-card">
          <div className="admin-donations-stat-header">
            <p className="admin-donations-stat-label">Total Donations</p>
            <div className="admin-donations-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17.3667 4.68333C17.0584 4.375 16.6917 4.13 16.2879 3.97083C15.8841 3.81166 15.4517 3.72916 15.015 3.72916C14.5783 3.72916 14.1459 3.81166 13.7421 3.97083C13.3383 4.13 12.9716 4.375 12.6633 4.68333L11.875 5.47166L11.0867 4.68333C10.4636 4.06019 9.62353 3.71061 8.74667 3.71061C7.8698 3.71061 7.02973 4.06019 6.40667 4.68333C5.78352 5.30639 5.43395 6.14647 5.43395 7.02333C5.43395 7.9002 5.78352 8.74027 6.40667 9.36333L7.195 10.1517L11.875 14.8317L16.555 10.1517L17.3433 9.36333C17.6517 9.055 17.8967 8.68833 18.0558 8.28458C18.215 7.88083 18.2975 7.44842 18.2975 7.01166C18.2975 6.57491 18.215 6.1425 18.0558 5.73875C17.8967 5.335 17.6517 4.96833 17.3433 4.66V4.68333H17.3667Z" stroke="#E60076" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-donations-stat-value">{formatCurrency(stats.total)}</p>
        </div>

        <div className="admin-donations-stat-card">
          <div className="admin-donations-stat-header">
            <p className="admin-donations-stat-label">This Month</p>
            <div className="admin-donations-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13.3333 5.83333H18.3333V10.8333" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.3333 5.83333L11.25 12.9167L7.08333 8.75L1.66667 14.1667" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-donations-stat-value">{formatCurrency(stats.thisMonth)}</p>
        </div>

        <div className="admin-donations-stat-card">
          <div className="admin-donations-stat-header">
            <p className="admin-donations-stat-label">Recurring</p>
            <div className="admin-donations-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2.5" y="3.33333" width="15" height="13.3333" rx="1.66667" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-donations-stat-value">{formatCurrency(stats.recurring)}</p>
        </div>

        <div className="admin-donations-stat-card">
          <div className="admin-donations-stat-header">
            <p className="admin-donations-stat-label">Total Count</p>
            <div className="admin-donations-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3.33333 17.5V10.8333L1.66667 12.5L10 2.5L18.3333 12.5L16.6667 10.8333V17.5H3.33333Z" stroke="#101828" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-donations-stat-value">{stats.totalCount}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="admin-donations-category-section">
        <h2 className="admin-donations-section-title">Category Breakdown</h2>
        <div className="admin-donations-category-grid">
          {categories.map((category, index) => (
            <div key={index} className="admin-donations-category-card">
              <h3 className="admin-donations-category-name">{category.name}</h3>
              <p className="admin-donations-category-amount">{formatCurrency(category.amount)}</p>
              <p className="admin-donations-category-count">{category.count} donations</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="admin-donations-search-section">
        <div className="admin-donations-search-container">
          <div className="admin-donations-search-wrapper">
            <div className="admin-donations-search-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.5 17.5L13.875 13.875" stroke="#9CA3AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or member ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-donations-search-input"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-donations-filter"
          >
            <option value="all">Status</option>
            <option value="onetime">One-time</option>
            <option value="recurring">Recurring</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="admin-donations-branch-filter"
          >
            <option value="all">Select Branch</option>
            <option value="main">Main Branch</option>
            <option value="north">North Branch</option>
            <option value="south">South Branch</option>
          </select>
        </div>
      </div>

      {/* Donations Table */}
      <div className="admin-donations-table-section">
        <table className="admin-donations-table">
          <thead>
            <tr className="admin-donations-table-header">
              <th className="admin-donations-table-header-cell">Donation ID</th>
              <th className="admin-donations-table-header-cell">Member</th>
              <th className="admin-donations-table-header-cell">Amount</th>
              <th className="admin-donations-table-header-cell">Category</th>
              <th className="admin-donations-table-header-cell">Date</th>
              <th className="admin-donations-table-header-cell">Method</th>
              <th className="admin-donations-table-header-cell">Type</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-donations-table-cell" style={{ textAlign: 'center', color: '#6a7282' }}>
                  Loading donations...
                </td>
              </tr>
            ) : filteredDonations.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-donations-table-cell" style={{ textAlign: 'center', color: '#6a7282' }}>
                  No donations found
                </td>
              </tr>
            ) : (
              filteredDonations.map((donation) => (
                <tr key={donation._id} className="admin-donations-table-row">
                  <td className="admin-donations-table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="admin-donations-heart-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.8933 3.74667C13.6467 3.5 13.3533 3.304 13.0303 3.17667C12.7073 3.04933 12.3613 2.98333 12.012 2.98333C11.6627 2.98333 11.3167 3.04933 10.9937 3.17667C10.6707 3.304 10.3773 3.5 10.1307 3.74667L9.5 4.37733L8.86933 3.74667C8.37087 3.24815 7.69882 2.96849 6.99733 2.96849C6.29585 2.96849 5.62379 3.24815 5.12533 3.74667C4.62682 4.24512 4.34716 4.91718 4.34716 5.61867C4.34716 6.32016 4.62682 6.99221 5.12533 7.49067L5.756 8.12133L9.5 11.8653L13.244 8.12133L13.8747 7.49067C14.1213 7.244 14.3173 6.95067 14.4447 6.62767C14.572 6.30467 14.638 5.95874 14.638 5.60933C14.638 5.25993 14.572 4.914 14.4447 4.591C14.3173 4.268 14.1213 3.97467 13.8747 3.728V3.74667H13.8933Z" stroke="#E60076" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>{donation.donationId}</span>
                    </div>
                  </td>
                  <td className="admin-donations-table-cell">
                    <span className="admin-donations-member-name">{donation.member}</span>
                  </td>
                  <td className="admin-donations-table-cell">
                    <span className="admin-donations-amount">{formatCurrency(donation.amount)}</span>
                  </td>
                  <td className="admin-donations-table-cell">
                    <span className="admin-donations-category">{donation.category}</span>
                  </td>
                  <td className="admin-donations-table-cell">
                    <span className="admin-donations-date">{donation.date}</span>
                  </td>
                  <td className="admin-donations-table-cell">
                    <span className="admin-donations-method">{donation.method}</span>
                  </td>
                  <td className="admin-donations-table-cell">
                    <span className={`admin-donations-type-badge admin-donations-type-${donation.type.toLowerCase().replace('-', '')}`}>
                      {donation.type}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}