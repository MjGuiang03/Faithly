import { useState, useEffect, useMemo, useCallback } from 'react';
import svgPaths from '../../imports/svg-icons';
import '../styles/Attendance.css';
import Sidebar from '../components/Sidebar';
import API from '../../utils/api';
const PAGE_SIZE = 5;

export default function Attendance() {
  // const navigate = useNavigate();

  const [attendanceData, setAttendanceData] = useState([]);
  const [upcomingData,   setUpcomingData]   = useState([]);
  const [stats,          setStats]          = useState({ total: 0, thisMonth: 0 });
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [page,           setPage]           = useState(1);
  const [totalCount,     setTotalCount]     = useState(0);


  const token = localStorage.getItem('token');

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [attRes, upRes] = await Promise.all([
        fetch(`${API}/api/attendance/my-attendance?page=${page}&limit=${PAGE_SIZE}`, { headers }),
        fetch(`${API}/api/upcoming`, { headers }) // Fixed: fetch from the new upcoming route
      ]);
      
      const attData = await attRes.json();
      const upData  = await upRes.json();

      if (attData.success) {
        setAttendanceData(attData.attendance || []);
        setStats(attData.stats || { total: 0, thisMonth: 0 });
        setTotalCount(attData.totalCount || 0);
      }
      if (upData.success) {
        setUpcomingData(upData.announcements || []);
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page]);


  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Attendance rate = thisMonth / weeks in current month * 100 (capped at 100)
  const attendanceRate = useMemo(() => {
    if (!stats.total) return '0%';
    const weeksInMonth = 4;
    const rate = Math.min(100, Math.round((stats.thisMonth / weeksInMonth) * 100));
    return `${rate}%`;
  }, [stats]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return attendanceData;
    const q = search.toLowerCase();
    return attendanceData.filter(r =>
      r.service?.toLowerCase().includes(q) ||
      r.branch?.toLowerCase().includes(q)  ||
      r.method?.toLowerCase().includes(q)  ||
      r.date?.toLowerCase().includes(q)
    );
  }, [attendanceData, search]);

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated   = attendanceData;

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="home-layout">
      <Sidebar />

      <div className="main-content">
        {/* Header */}
        <div className="home-header">
          <h1 className="page-title">Attendance Tracking</h1>
          <p className="page-subtitle">Check in to services and view your attendance history</p>
        </div>

        {/* Stats */}
        <div className="attendance-stats">
          <div className="attendance-stat-card">
            <div className="attendance-stat-header">
              <p className="attendance-stat-label">Total Attendance</p>
              <svg className="attendance-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p1da67b80} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <p className="attendance-stat-value">{loading ? '—' : stats.total}</p>
          </div>

          <div className="attendance-stat-card">
            <div className="attendance-stat-header">
              <p className="attendance-stat-label">This Month</p>
              <svg className="attendance-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M16.6667 10L10 3.33333L3.33333 10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M16.6667 10L10 16.6667L3.33333 10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <p className="attendance-stat-value">{loading ? '—' : stats.thisMonth}</p>
          </div>

          <div className="attendance-stat-card">
            <div className="attendance-stat-header">
              <p className="attendance-stat-label">Attendance Rate</p>
              <svg className="attendance-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M6.66667 1.66667V5" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M13.3333 1.66667V5" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p1da67b80} stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M2.5 8.33333H17.5" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <p className="attendance-stat-value">{loading ? '—' : attendanceRate}</p>
          </div>
        </div>

        {/* Check In + Upcoming Services */}
        <div className="attendance-content-grid">
          {/* Check In */}
          <div className="check-in-card">
            <h2 className="section-title">Check In</h2>
            <p className="check-in-subtitle">Select a check-in method:</p>

            <div className="check-in-method">
              <div className="qr-scanner-box">
                <svg className="qr-icon" fill="none" viewBox="0 0 24 24">
                  <rect width="9" height="9" x="3" y="3" stroke="#155DFC" strokeWidth="2" />
                  <rect width="9" height="9" x="3" y="12" stroke="#155DFC" strokeWidth="2" />
                  <rect width="9" height="9" x="12" y="3" stroke="#155DFC" strokeWidth="2" />
                  <rect width="9" height="9" x="12" y="12" stroke="#155DFC" strokeWidth="2" />
                  <path d="M6 6h3v3H6z" fill="#155DFC" />
                  <path d="M6 15h3v3H6z" fill="#155DFC" />
                  <path d="M15 6h3v3h-3z" fill="#155DFC" />
                  <path d="M15 15h3v3h-3z" fill="#155DFC" />
                </svg>
              </div>
              <div className="check-in-method-info">
                <h3 className="check-in-method-title">QR Code Scanner</h3>
                <p className="check-in-method-description">Scan QR code to check in to service</p>
              </div>
            </div>

            <div className="check-in-tip">
              <span className="tip-label">Tip:</span>
              <span className="tip-text">Check in when you arrive at the service venue. Your attendance will be recorded automatically.</span>
            </div>
          </div>

          {/* Upcoming Services — admin-driven, empty state shown */}
          <div className="upcoming-services-card">
            <h2 className="section-title">Upcoming Services</h2>
            <div className="upcoming-services-list">
              {loading ? (
                <p className="upcoming-loading">Loading schedules...</p>
              ) : upcomingData.length === 0 ? (
                <div className="upcoming-empty">
                  <svg fill="none" viewBox="0 0 40 40" width="36" height="36">
                    <path d="M13.3333 3.33333V10" stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="M26.6667 3.33333V10" stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="M5 16.6667H35" stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <rect x="5" y="6.66667" width="30" height="30" rx="2" stroke="#d1d5db" strokeWidth="2" />
                  </svg>
                  <p className="upcoming-empty-text">No upcoming services announced yet.</p>
                  <p className="upcoming-empty-sub">Check back when your admin posts new schedules.</p>
                </div>
              ) : (
                <div className="upcoming-active-list">
                  {upcomingData.map((item, idx) => (
                    <div key={idx} className="upcoming-service-item">
                      <div className="upcoming-service-dot" />
                      <div className="upcoming-service-info">
                        <div className="upcoming-service-header">
                          <h4 className="upcoming-service-title">{item.title}</h4>
                          <span className={`upcoming-type-badge ${item.type === 'service' ? 'type-svc' : 'type-notif'}`}>
                            {item.type === 'service' ? 'Service' : 'Update'}
                          </span>
                        </div>
                        <p className="upcoming-service-message">{item.message}</p>
                        <div className="upcoming-service-meta">
                           <span className="upcoming-meta-item">
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                             {item.branch}
                           </span>
                           <span className="upcoming-meta-item">
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                             {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                           </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Attendance History */}
        <div className="attendance-history-section">
          <div className="history-header">
            <h2 className="section-title">Attendance History</h2>
            <button className="view-all-btn" onClick={() => setPage(1)}>View All</button>
            <div className="history-search-box">
              <svg fill="none" viewBox="0 0 16 16" width="14" height="14" className="search-icon-inner">
                <circle cx="7" cy="7" r="5" stroke="#9ca3af" strokeWidth="1.5" />
                <path d="M10.5 10.5L13.5 13.5" stroke="#9ca3af" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
              <input
                type="text"
                className="history-search-input"
                placeholder="Search service, branch..."
                value={search}
                onChange={handleSearch}
              />
            </div>
          </div>

          <div className="attendance-table-wrapper">
            {loading ? (
              <p className="empty-text" style={{ padding: '16px' }}>Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="empty-text" style={{ padding: '16px' }}>
                {search ? 'No records match your search.' : 'No attendance records yet.'}
              </p>
            ) : (
              <>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Branch</th>
                      <th>Check-in Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((record, index) => (
                      <tr key={index}>
                        <td>{record.service}</td>
                        <td>{record.date}</td>
                        <td>{record.time}</td>
                        <td>{record.branch}</td>
                        <td>
                          <span className={`method-badge method-${record.method?.toLowerCase()}`}>
                            {record.method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <span className="pagination-info">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                    </span>
                    <div className="pagination-controls">
                      <button
                        className="page-btn"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 1}
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          className={`page-btn ${p === page ? 'page-btn-active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className="page-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === totalPages}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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