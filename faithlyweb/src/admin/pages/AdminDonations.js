import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminDonations.css';

const API = process.env.REACT_APP_API_URL;

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
};

const CATEGORIES = ['all', 'General Fund', 'Children Ministry', 'Building Fund', 'Youth Ministry', 'Mission Fund'];
const ITEMS_PER_PAGE = 5;

export default function AdminDonations() {
  const navigate = useNavigate();

  const [donations,    setDonations]    = useState([]);
  const [stats,        setStats]        = useState({ totalAmount: 0, thisMonth: 0, totalCount: 0, recurringCount: 0 });
  const [searchTerm,   setSearchTerm]   = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [loading,      setLoading]      = useState(true);

  /* ── Pagination ── */
  const [currentPage,  setCurrentPage]  = useState(1);

  /* ── Auth guard ── */
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin/login');
  }, [navigate]);

  /* ── Fetch ── */
  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const token  = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      if (catFilter !== 'all')  params.set('category', catFilter);
      if (searchTerm.trim())    params.set('search', searchTerm.trim());

      const res  = await fetch(`${API}/api/admin/donations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { navigate('/admin/login'); return; }
        toast.error(data.message || 'Failed to fetch donations');
        return;
      }

      setDonations(data.donations || []);
      setStats(data.stats || { totalAmount: 0, thisMonth: 0, totalCount: 0, recurringCount: 0 });
      setCurrentPage(1); // reset to page 1 on new fetch
    } catch {
      toast.error('Network error. Could not load donations.');
    } finally {
      setLoading(false);
    }
  }, [catFilter, searchTerm, navigate]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => fetchDonations(), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /* ── Pagination math ── */
  const totalPages   = Math.max(1, Math.ceil(donations.length / ITEMS_PER_PAGE));
  const paginatedRows = donations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goTo   = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const goFirst = () => goTo(1);
  const goPrev  = () => goTo(currentPage - 1);
  const goNext  = () => goTo(currentPage + 1);
  const goLast  = () => goTo(totalPages);

  /* page number buttons — show up to 5 */
  const pageNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();

  /* ── Render ── */
  return (
    <div className="admin-loan-main">

      {/* Header */}
      <div className="admin-loan-header">
        <h1 className="admin-loan-title">Donation Management</h1>
        <p className="admin-loan-subtitle">View and manage all member donations</p>
      </div>

      {/* Stats */}
      <div className="admin-loan-stats-grid">
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Total Received</p>
          <p className="admin-loan-stat-value">{fmt(stats.totalAmount)}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">This Month</p>
          <p className="admin-loan-stat-value">{fmt(stats.thisMonth)}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Total Donations</p>
          <p className="admin-loan-stat-value">{stats.totalCount}</p>
        </div>
        <div className="admin-loan-stat-card">
          <p className="admin-loan-stat-label">Recurring</p>
          <p className="admin-loan-stat-value">{stats.recurringCount}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="admin-loan-search-section">
        <div className="admin-loan-search-container">
          <div className="admin-loan-search-wrapper">
            <div className="admin-loan-search-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.5 17.5L13.875 13.875" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by member name or donation ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-loan-search-input"
            />
          </div>

          <div className="admin-loan-filter">
            <select
              value={catFilter}
              onChange={(e) => { setCatFilter(e.target.value); setCurrentPage(1); }}
              className="admin-loan-filter-button"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="admin-loan-table-card">
        <div className="admin-loan-table-scroll">
          <table className="admin-loan-table">
            <thead>
              <tr className="admin-loan-table-header">
                <th className="admin-loan-table-header-cell">Donation ID</th>
                <th className="admin-loan-table-header-cell">Member</th>
                <th className="admin-loan-table-header-cell">Category</th>
                <th className="admin-loan-table-header-cell">Amount</th>
                <th className="admin-loan-table-header-cell">Method</th>
                <th className="admin-loan-table-header-cell">Type</th>
                <th className="admin-loan-table-header-cell">Date</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="admin-loan-table-cell admin-loan-table-empty">
                    <div className="admin-loan-loading-row">
                      <div className="admin-loan-spinner" />
                      Loading donations…
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-loan-table-cell admin-loan-table-empty">
                    No donations found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((d) => (
                  <tr key={d._id} className="admin-loan-table-row">
                    <td className="admin-loan-table-cell">
                      <span className="admin-don-id">{d.donationId}</span>
                    </td>

                    <td className="admin-loan-table-cell">
                      <div className="admin-loan-member-info">
                        <span className="admin-loan-member-name">{d.memberName}</span>
                        <span className="admin-loan-member-email">{d.email}</span>
                      </div>
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className="admin-don-category">{d.category}</span>
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className="admin-loan-amount">{fmt(d.amount)}</span>
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className="admin-don-method">{d.method || d.paymentMethod}</span>
                    </td>

                    <td className="admin-loan-table-cell">
                      {d.type === 'Recurring' ? (
                        <span className="admin-don-badge admin-don-badge-recurring">Recurring</span>
                      ) : (
                        <span className="admin-don-badge admin-don-badge-once">One-time</span>
                      )}
                    </td>

                    <td className="admin-loan-table-cell">
                      <span className="admin-loan-date">{fmtDate(d.createdAt || d.date)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && donations.length > 0 && (
          <div className="admin-don-pagination">
            <p className="admin-don-pagination-info">
              Showing{' '}
              <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, donations.length)}</strong>
              {' '}of <strong>{donations.length}</strong> donations
            </p>

            <div className="admin-don-pagination-controls">
              {/* First */}
              <button
                className="admin-don-page-btn"
                onClick={goFirst}
                disabled={currentPage === 1}
                title="First page"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 10L5 7L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Prev */}
              <button
                className="admin-don-page-btn"
                onClick={goPrev}
                disabled={currentPage === 1}
                title="Previous page"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 10L5 7L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Page numbers */}
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  className={`admin-don-page-btn${p === currentPage ? ' admin-don-page-btn-active' : ''}`}
                  onClick={() => goTo(p)}
                >
                  {p}
                </button>
              ))}

              {/* Next */}
              <button
                className="admin-don-page-btn"
                onClick={goNext}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 4L9 7L5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Last */}
              <button
                className="admin-don-page-btn"
                onClick={goLast}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 4L9 7L5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}