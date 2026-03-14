import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminDonations.css';
import svgPaths from "../../imports/svg-icons";

import API from '../../utils/api';

const fmt = (n) =>
  n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '₱0';

const fmtDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
};

const ITEMS_PER_PAGE = 10;

export default function AdminDonationsNew() {
  const navigate = useNavigate();

  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({
    totalThisMonth: 0,
    totalDonors: 0,
    avgDonation: 0,
    thisWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Auth guard ── */
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin/login');
  }, [navigate]);

  /* ── Fetch ── */
  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');

      const res = await fetch(`${API}/api/admin/donations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          navigate('/admin/login');
          return;
        }
        toast.error(data.message || 'Failed to fetch donations');
        return;
      }

      setDonations(data.donations || []);
      
      const thisMonthTotal = data.stats?.thisMonth || 0;
      const totalDonations = data.donations?.length || 0;
      const avgDonation = totalDonations > 0 
        ? data.donations.reduce((sum, d) => sum + (d.amount || 0), 0) / totalDonations
        : 0;
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekTotal = data.donations
        ?.filter(d => new Date(d.createdAt || d.date) >= oneWeekAgo)
        ?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      
      // FIX: use d.member (the actual DB field), fallback to d.email
      const uniqueDonors = new Set(data.donations?.map(d => d.member || d.email)).size;

      setStats({
        totalThisMonth: thisMonthTotal,
        totalDonors: uniqueDonors,
        avgDonation: avgDonation,
        thisWeek: thisWeekTotal
      });

      setCurrentPage(1);
    } catch {
      toast.error('Network error. Could not load donations.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  /* ── Pagination math ── */
  const totalPages = Math.max(1, Math.ceil(donations.length / ITEMS_PER_PAGE));
  const paginatedRows = donations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goTo = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const goPrev = () => goTo(currentPage - 1);
  const goNext = () => goTo(currentPage + 1);

  const percentageChange = '+8%';

  /* ── Render ── */
  return (
    <div className="admin-don-new-main">
      {/* Header */}
      <div className="admin-don-new-header">
        <h1 className="admin-don-new-title">Donations</h1>
        <p className="admin-don-new-subtitle">Track and manage church donations</p>
      </div>

      {/* Stats Cards */}
      <div className="admin-don-new-stats">
        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Total This Month</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p2f84f400} stroke="#E60076" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{fmt(stats.totalThisMonth)}</p>
          <p className="admin-don-new-stat-change">{percentageChange} from last month</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Total Donors</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p3c797180} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3ac0b600} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{stats.totalDonors}</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">Avg. Donation</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 1.66667V18.3333" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3055a600} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{fmt(stats.avgDonation)}</p>
        </div>

        <div className="admin-don-new-stat-card">
          <div className="admin-don-new-stat-header">
            <span className="admin-don-new-stat-label">This Week</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6.66667 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.3333 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p1da67b80} stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 8.33333H17.5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-don-new-stat-value">{fmt(stats.thisWeek)}</p>
        </div>
      </div>

      {/* Recent Donations Section */}
      <div className="admin-don-new-section">
        <h2 className="admin-don-new-section-title">Recent Donations</h2>

        <div className="admin-don-new-table-container">
          <table className="admin-don-new-table">
            <thead className="admin-don-new-thead">
              <tr>
                <th className="admin-don-new-th">Donation ID</th>
                <th className="admin-don-new-th">Member</th>
                <th className="admin-don-new-th">Amount</th>
                <th className="admin-don-new-th">Purpose</th>
                <th className="admin-don-new-th">Date</th>
              </tr>
            </thead>
            <tbody className="admin-don-new-tbody">
              {loading ? (
                <tr>
                  <td colSpan={5} className="admin-don-new-td admin-don-new-empty">
                    <div className="admin-don-new-loading">
                      <div className="admin-don-new-spinner" />
                      Loading donations…
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-don-new-td admin-don-new-empty">
                    No donations found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((donation, index) => (
                  <tr key={donation._id || index} className="admin-don-new-tr">
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-donation-id">
                        {donation.donationId || `D-${String(index + 1).padStart(3, '0')}`}
                      </span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-member-name">
                        {/* FIX: backend stores donor name as 'member', not 'memberName' */}
                        {donation.member || '—'}
                      </span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-amount">{fmt(donation.amount)}</span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-purpose">
                        {donation.category || donation.purpose || 'General Fund'}
                      </span>
                    </td>
                    <td className="admin-don-new-td">
                      <span className="admin-don-new-date">
                        {fmtDate(donation.createdAt || donation.date)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && donations.length > 0 && (
          <div className="admin-don-new-pagination">
            <div className="admin-don-new-pagination-info">
              Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * ITEMS_PER_PAGE, donations.length)}</strong> of{' '}
              <strong>{donations.length}</strong> results
            </div>
            <div className="admin-don-new-pagination-controls">
              <button
                className="admin-don-new-pagination-btn"
                onClick={goPrev}
                disabled={currentPage === 1}
              >
                &lt;
              </button>
              <button className="admin-don-new-pagination-number admin-don-new-pagination-active">
                {currentPage}
              </button>
              {currentPage < totalPages && (
                <button
                  className="admin-don-new-pagination-number"
                  onClick={() => goTo(currentPage + 1)}
                >
                  {currentPage + 1}
                </button>
              )}
              <button
                className="admin-don-new-pagination-btn"
                onClick={goNext}
                disabled={currentPage === totalPages}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}