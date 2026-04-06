import { useState, useEffect, useMemo, useCallback } from 'react';

import '../styles/Attendance.css';
// import Sidebar from '../components/Sidebar'; // Moved to UserLayout
import API from '../../utils/api';
import { CalendarDays, CheckCircle, MapPin, UserCheck, TrendingUp, Activity } from 'lucide-react';

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
    <>
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
              <UserCheck className="user-attendance-stat-icon" size={20} color="#155DFC" />
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in">{stats.total}</p>}
            </div>

          <div className="user-attendance-stat-card">
            <div className="user-attendance-stat-header">
              <p className="user-attendance-stat-label">This Month</p>
              <CalendarDays className="user-attendance-stat-icon" size={20} color="#155DFC" />
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in">{stats.thisMonth}</p>}
            </div>

          <div className="user-attendance-stat-card">
            <div className="user-attendance-stat-header">
              <p className="user-attendance-stat-label">Attendance Rate</p>
              <Activity className="user-attendance-stat-icon" size={20} color="#155DFC" />
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
                <CheckCircle className="user-qr-icon" size={20} color="#155DFC" />
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
                  <CalendarDays size={36} color="#d1d5db" />
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
                             <MapPin size={12} />
                             {item.branch}
                           </span>
                           <span className="upcoming-meta-item">
                             <CalendarDays size={12} />
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
            <h2 className="user-attendance-section-title">Attendance History</h2>
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
    </>
  );
}