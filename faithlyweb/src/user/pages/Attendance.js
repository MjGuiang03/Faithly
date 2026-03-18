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
  const [page]           = useState(1);


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

  // Pagination
  // const totalPages  = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* ── History Modal States ── */
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalHistory, setModalHistory] = useState([]);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalLoading, setModalLoading] = useState(false);
  const MODAL_LIMIT = 10;

  const fetchModalHistory = useCallback(async () => {
    setModalLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/attendance/my-attendance?page=${modalPage}&limit=${MODAL_LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalHistory(data.attendance || []);
        setModalTotalPages(data.totalPages || 1);
      }
    } catch { /* silent */ }
    finally { setModalLoading(false); }
  }, [modalPage]);

  useEffect(() => {
    if (isHistoryModalOpen) fetchModalHistory();
  }, [isHistoryModalOpen, fetchModalHistory]);

  const handleOpenHistory = () => {
    setModalPage(1);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="user-home-layout">
      <Sidebar />

      <div className="user-main-content">
        {/* Header */}
        <div className="user-attendance-page-header">
          <h1 className="user-attendance-page-title">Attendance Tracking</h1>
          <p className="user-attendance-page-subtitle">Check in to services and view your attendance history</p>
        </div>

        {/* Stats */}
        <div className="user-attendance-stats">
          <div className="user-attendance-stat-card">
            <div className="user-attendance-stat-header">
              <p className="user-attendance-stat-label">Total Attendance</p>
              <svg className="user-attendance-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p1da67b80} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in">{stats.total}</p>}
            </div>

          <div className="user-attendance-stat-card">
            <div className="user-attendance-stat-header">
              <p className="user-attendance-stat-label">This Month</p>
              <svg className="user-attendance-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M16.6667 10L10 3.33333L3.33333 10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M16.6667 10L10 16.6667L3.33333 10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in">{stats.thisMonth}</p>}
            </div>

          <div className="user-attendance-stat-card">
            <div className="user-attendance-stat-header">
              <p className="user-attendance-stat-label">Attendance Rate</p>
              <svg className="user-attendance-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M6.66667 1.66667V5" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M13.3333 1.66667V5" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d={svgPaths.p1da67b80} stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M2.5 8.33333H17.5" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in">{attendanceRate}</p>}
            </div>
        </div>

        {/* Check In + Upcoming Services */}
        <div className="user-attendance-content-grid">
          {/* Check In */}
          <div className="user-check-in-card">
            <h2 className="user-attendance-section-title">Check In</h2>
            <p className="user-check-in-subtitle">Select a check-in method:</p>

            <div className="user-check-in-method">
              <div className="user-qr-scanner-box">
                <svg className="user-qr-icon" fill="none" viewBox="0 0 24 24">
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
              <div className="user-check-in-method-info">
                <h3 className="user-check-in-method-title">QR Code Scanner</h3>
                <p className="user-check-in-method-description">Scan QR code to check in to service</p>
              </div>
            </div>

            <div className="user-check-in-tip">
              <span className="user-tip-label">Tip:</span>
              <span className="user-tip-text">Check in when you arrive at the service venue. Your attendance will be recorded automatically.</span>
            </div>
          </div>

          {/* Upcoming Services */}
          <div className="user-upcoming-services-card">
            <h2 className="user-attendance-section-title">Upcoming Services</h2>
            <div className="user-upcoming-services-list">
              {loading ? (
                <div className="user-upcoming-active-list">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="user-upcoming-service-item" style={{ marginBottom: '16px' }}>
                      <div className="user-skeleton user-skeleton-circle" style={{ width: '12px', height: '12px', marginTop: '6px' }}></div>
                      <div style={{ flex: 1, marginLeft: '12px' }}>
                        <div className="user-skeleton" style={{ height: '16px', width: '40%', marginBottom: '8px' }}></div>
                        <div className="user-skeleton" style={{ height: '12px', width: '80%', marginBottom: '8px' }}></div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div className="user-skeleton" style={{ height: '10px', width: '60px' }}></div>
                          <div className="user-skeleton" style={{ height: '10px', width: '80px' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingData.length === 0 ? (
                <div className="user-upcoming-empty">
                  <svg fill="none" viewBox="0 0 40 40" width="36" height="36">
                    <path d="M13.3333 3.33333V10" stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="M26.6667 3.33333V10" stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="M5 16.6667H35" stroke="#d1d5db" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <rect x="5" y="6.66667" width="30" height="30" rx="2" stroke="#d1d5db" strokeWidth="2" />
                  </svg>
                  <p className="user-upcoming-empty-text">No upcoming services announced yet.</p>
                  <p className="user-upcoming-empty-sub">Check back when your admin posts new schedules.</p>
                </div>
              ) : (
                <div className="user-upcoming-active-list user-fade-in">
                  {upcomingData.map((item, idx) => (
                    <div key={idx} className="user-upcoming-service-item">
                      <div className="user-upcoming-service-dot" />
                      <div className="user-upcoming-service-info">
                        <div className="user-upcoming-service-header">
                          <h4 className="user-upcoming-service-title">{item.title}</h4>
                          <span className={`user-upcoming-type-badge ${item.type === 'service' ? 'user-type-svc' : 'user-type-notif'}`}>
                            {item.type === 'service' ? 'Service' : 'Update'}
                          </span>
                        </div>
                        <p className="user-upcoming-service-message">{item.message}</p>
                        <div className="user-upcoming-service-meta">
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

        {/* Attendance History (Preview) */}
        <div className="user-attendance-history-section">
          <div className="user-history-header-row">
            <h2 className="user-attendance-section-title">Recent Attendance History</h2>
            <button className="user-view-history-btn" onClick={handleOpenHistory}>View History</button>
          </div>

          <div className="user-attendance-table-wrapper user-preview-table">
            {loading ? (
              <div style={{ padding: '16px' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                    <div className="user-skeleton" style={{ height: '14px', flex: 1 }}></div>
                    <div className="user-skeleton" style={{ height: '14px', flex: 1 }}></div>
                    <div className="user-skeleton" style={{ height: '14px', flex: 1 }}></div>
                  </div>
                ))}
              </div>
            ) : attendanceData.length === 0 ? (
              <p className="user-attendance-empty-text" style={{ padding: '16px' }}>No attendance records yet.</p>
            ) : (
              <div className="user-fade-in">
                <table className="user-attendance-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Date</th>
                      <th>Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.slice(0, 5).map((record, index) => (
                      <tr key={index}>
                        <td>{record.service}</td>
                        <td>{record.date}</td>
                        <td>{record.branch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Chat Button */}
      <button className="user-chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>

      {/* ── Attendance History Modal ── */}
      {isHistoryModalOpen && (
        <div className="user-attendance-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="user-attendance-modal-content" onClick={e => e.stopPropagation()}>
            <div className="user-modal-header">
              <h2 className="user-modal-title">Attendance History</h2>
              <button className="user-modal-close-btn" onClick={() => setIsHistoryModalOpen(false)}>×</button>
            </div>

            <div className="user-modal-body user-history-modal-body">
              {modalLoading ? (
                <p className="user-attendance-modal-loading">Loading history...</p>
              ) : modalHistory.length === 0 ? (
                <p className="user-attendance-modal-empty">No attendance records found.</p>
              ) : (
                <div className="user-attendance-table-wrapper">
                  <table className="user-attendance-table user-modal-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Branch</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalHistory.map((record, index) => (
                        <tr key={index}>
                          <td>{record.service}</td>
                          <td>{record.date}</td>
                          <td>{record.time}</td>
                          <td>{record.branch}</td>
                          <td>
                            <span className={`user-method-badge user-method-${record.method?.toLowerCase()}`}>
                              {record.method}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
    </div>
  );
}