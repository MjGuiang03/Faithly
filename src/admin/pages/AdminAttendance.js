/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminAttendance.css';
import API from '../../utils/api';
import { 
  CalendarDays, MapPin, Search, UserCheck, Clock, ShieldAlert,
  Play, Square, Plus, CheckCircle2, AlertCircle, XCircle, Download,
  ArrowLeft, ChevronLeft, ChevronRight, CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ManualAttendanceModal({ session, onClose, onSave }) {
  const [memberId, setMemberId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberId.trim()) return toast.error('Member ID is required');

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance/log-tap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
           method: 'Manual', 
           memberId: memberId.trim(),
           minLevelSessionId: session.sessionId
        })
      });
      const data = await res.json();
      if (!data.success) {
         if (data.alreadyLogged) {
            toast.success(data.message);
            onSave();
         } else {
            throw new Error(data.message);
         }
      } else {
         toast.success(data.message);
         onSave();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record attendance manually');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-att-modal-overlay" onClick={onClose}>
      <div className="admin-att-modal admin-att-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header">
           <div className="admin-att-modal-icon bg-blue-100 text-blue-600">
             <UserCheck size={20} />
           </div>
          <div className="admin-att-modal-title-group">
            <h2 className="admin-att-modal-title">Manual Record</h2>
            <p className="admin-att-modal-subtitle">Add attendance without RFID card</p>
          </div>
          <button className="admin-att-modal-close" onClick={onClose}><XCircle size={20} color="#6B7280" /></button>
        </div>
        <form onSubmit={handleSubmit} className="admin-att-modal-body">
          <div className="admin-att-form-row">
             <label className="admin-att-form-label">Member ID</label>
             <input type="text" className="admin-att-form-input" 
                autoFocus
                placeholder="e.g. M-12345" 
                value={memberId} 
                onChange={e => setMemberId(e.target.value)} />
          </div>
        </form>
        <div className="admin-att-modal-footer">
          <button type="button" className="admin-att-btn admin-att-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="admin-att-btn admin-att-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Record Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionLogsModal({ session, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API}/api/admin/attendance?session=${session.sessionId}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setLogs(data.attendance || []);
        }
      } catch (err) {
        toast.error('Failed to load session logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [session]);

  return (
    <div className="admin-att-modal-overlay" onClick={onClose}>
      <div className="admin-att-modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header" style={{ padding: '20px 24px' }}>
          <div className="admin-att-modal-title-group">
            <h2 className="admin-att-modal-title">{session.branch} - {session.serviceType}</h2>
            <p className="admin-att-modal-subtitle">Attendance logs for this active session</p>
          </div>
          <button className="admin-att-modal-close" onClick={onClose}><XCircle size={20} color="#6B7280" /></button>
        </div>
        <div className="admin-att-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
          <table className="admin-att-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Time In</th>
                <th>Status</th>
                <th align="right" className="pr-6">Method</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" align="center" className="py-8 text-gray-500">Loading attendance data...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" align="center" className="py-8 text-gray-500">No members have tapped in yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id || log.recordId}>
                     <td>
                        <p className="font-semibold text-gray-900 m-0">{log.member}</p>
                        <p className="text-xs text-gray-500 m-0">{log.recordId}</p>
                     </td>
                     <td>
                        <p className="text-gray-800 m-0 font-medium">{log.time}</p>
                     </td>
                     <td>
                        <span className={`status-badge ${log.status.toLowerCase()}`}>
                          {log.status === 'Present' && <CheckCircle2 size={14} />}
                          {log.status === 'Late' && <Clock size={14} />}
                          {log.status}
                        </span>
                     </td>
                     <td align="right" className="pr-6">
                        <span className="rfid-pill font-mono text-xs">{log.rfidCardId || log.method || 'Manual'}</span>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-att-modal-footer">
          <button className="admin-att-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAttendance() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalToday: 0, servicesThisWeek: 0, avgAttendance: 0, lateToday: 0 });
  const [logs, setLogs] = useState([]);
  
  // Active Sessions
  const [activeSessions, setActiveSessions] = useState([]);
  const selectedSession = activeSessions.length > 0 ? activeSessions[0] : null;

  // Tabs
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

  // History Sessions
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Drilldown: viewing a specific session's logs
  const [viewingSession, setViewingSession] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [sessionLogsLoading, setSessionLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);

  // Pagination for sessions table (client-side)
  const [sessionsPage, setSessionsPage] = useState(1);
  const PER_PAGE = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 15;

  const rfidBuffer = useRef('');

  // 1. Fetch Active Sessions
  const fetchActiveSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
         setActiveSessions(data.sessions);
      }
    } catch(err) { console.error('Failed to get active sessions', err); }
  }, []);

  const fetchHistorySessions = useCallback(async (pg = 1) => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance/sessions/history?page=${pg}&limit=${PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistorySessions(data.sessions);
        setHistoryTotalPages(data.totalPages || 1);
        setHistoryTotalCount(data.totalCount || 0);
      }
    } catch (err) { console.error('Failed to get history sessions', err); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistorySessions(historyPage);
    }
  }, [activeTab, historyPage, fetchHistorySessions]);

  // 2. Fetch Logs & Stats
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (filterBranch && filterBranch !== 'all') params.set('branch', filterBranch);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);

      // If viewing logs for a specific session, we can filter, but usually admin wants to see all.
      // E.g. we could do params.set('session', selectedSession.sessionId) to lock table to current sess.
      
      const res = await fetch(`${API}/api/admin/attendance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLogs(data.attendance || []);
        setTotalCount(data.totalCount || 0);
        setStats({
          totalToday: data.stats?.totalToday || 0,
          servicesThisWeek: data.stats?.servicesThisWeek || 0,
          avgAttendance: data.stats?.avgAttendance || 0,
          lateToday: data.stats?.lateToday || 0,
        });
      }
    } catch (err) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterBranch, filterStatus]);

  // Initial loads
  useEffect(() => {
    fetchActiveSessions();
    fetchAttendance();
  }, [fetchActiveSessions, fetchAttendance]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterBranch, filterStatus]);

  // 3. Fetch logs for a specific session (drilldown) — server-side paginated
  const fetchSessionLogs = useCallback(async (session, pg = 1) => {
    setSessionLogsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance?session=${session.sessionId}&page=${pg}&limit=${PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSessionLogs(data.attendance || []);
        setLogsTotalCount(data.totalCount || data.attendance?.length || 0);
      }
    } catch (err) {
      toast.error('Failed to load session logs');
    } finally {
      setSessionLogsLoading(false);
    }
  }, []);

  const handleSessionClick = (session) => {
    setViewingSession(session);
    setLogsPage(1);
    fetchSessionLogs(session, 1);
  };

  // Poll for new logs while viewing a session
  useEffect(() => {
    let interval;
    if (viewingSession && logsPage === 1) {
      interval = setInterval(() => {
        // Fetch quietly without triggering the loading spinner overlay
        const token = localStorage.getItem('adminToken');
        const cacheBuster = `_t=${Date.now()}`;
        fetch(`${API}/api/admin/attendance?session=${viewingSession.sessionId}&page=1&limit=${PER_PAGE}&${cacheBuster}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSessionLogs(data.attendance || []);
            setLogsTotalCount(data.totalCount || data.attendance?.length || 0);
          }
        })
        .catch(() => {});
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [viewingSession, logsPage]);

  const handleLogsPageChange = (newPage) => {
    setLogsPage(newPage);
    fetchSessionLogs(viewingSession, newPage);
  };

  const handleBackToSessions = () => {
    setViewingSession(null);
    setSessionLogs([]);
    setLogsPage(1);
    setLogsTotalCount(0);
  };

  // Derived: paginated sessions (client-side)
  const totalSessionsPages = Math.ceil(activeSessions.length / PER_PAGE);
  const paginatedSessions = activeSessions.slice((sessionsPage - 1) * PER_PAGE, sessionsPage * PER_PAGE);
  const totalLogsPages = Math.ceil(logsTotalCount / PER_PAGE);

  const exportCSV = () => {
    if (logs.length === 0) return toast.info('No data to export');
    
    const headers = ['Record ID', 'Member', 'Service', 'Branch', 'Date', 'Time In', 'Status', 'Method', 'RFID'];
    const rows = logs.map(l => [
       l.recordId, 
       `"${l.member}"`, 
       l.service, 
       `"${l.branch}"`, 
       l.date, 
       l.time, 
       l.status, 
       l.method,
       l.rfidCardId || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FaithLy_Attendance_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="admin-att-main">
      
      {showManualModal && selectedSession && <ManualAttendanceModal session={selectedSession} onClose={() => setShowManualModal(false)} onSave={() => { setShowManualModal(false); fetchAttendance(); }} />}

      {/* Header */}
      <div className="admin-att-page-header">
        <div>
           <h1 className="admin-att-title">Attendance Tracking</h1>
           <p className="admin-att-subtitle">Manage service sessions and monitor active RFID logging.</p>
        </div>
        <div className="admin-att-header-actions">
           <button className="admin-att-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate('/admin/rfid-preview')}>
             <CreditCard size={18} />
             Open RFID Scanner
           </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="admin-att-stats-row">
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Total Attendance Today</span>
            <div className="admin-att-stat-icon icon-blue"><UserCheck size={18} color="white" /></div>
          </div>
          <span className="admin-att-stat-value">{stats.totalToday.toLocaleString()}</span>
        </div>
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Services This Week</span>
            <div className="admin-att-stat-icon icon-green"><CalendarDays size={18} color="white" /></div>
          </div>
          <span className="admin-att-stat-value">{stats.servicesThisWeek}</span>
        </div>
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Average Attendance</span>
            <div className="admin-att-stat-icon icon-indigo"><MapPin size={18} color="white" /></div>
          </div>
          <span className="admin-att-stat-value">{stats.avgAttendance.toLocaleString()}</span>
          <span className="admin-att-stat-sub">past 30 days</span>
        </div>
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Late Arrivals Today</span>
            <div className="admin-att-stat-icon icon-orange"><ShieldAlert size={18} color="white" /></div>
          </div>
          <span className="admin-att-stat-value text-orange">{stats.lateToday.toLocaleString()}</span>
        </div>
      </div>
      {/* Active Sessions / Session Logs Table */}
      <div className="admin-att-table-container">
        {viewingSession ? (
          /* ── Drilldown: Member logs for selected session ── */
          <>
            <div className="admin-att-section-header">
              <div className="admin-att-section-header-row">
                <button className="admin-att-back-btn" onClick={handleBackToSessions}>
                  <ArrowLeft size={16} />
                  Back
                </button>
                <div>
                  <h2>{viewingSession.branch} — {viewingSession.serviceType}</h2>
                  <p className="admin-att-section-sub">{new Date(viewingSession.date).toLocaleDateString()} · Started at {viewingSession.time}</p>
                </div>
              </div>
            </div>
            <div className="admin-att-table-wrapper">
              <table className="admin-att-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Time In</th>
                    <th>Status</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionLogsLoading ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>Loading attendance data...</td>
                    </tr>
                  ) : sessionLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>No members have tapped in yet.</td>
                    </tr>
                  ) : (
                    sessionLogs.map((log) => (
                      <tr key={log._id || log.recordId}>
                        <td>
                          <span className="admin-att-member-name">{log.member}</span>
                          <span className="admin-att-member-id">{log.recordId}</span>
                        </td>
                        <td>{log.time}</td>
                        <td>
                          <span className={`status-badge ${log.status.toLowerCase()}`}>
                            {log.status === 'Present' && <CheckCircle2 size={14} />}
                            {log.status === 'Late' && <Clock size={14} />}
                            {log.status}
                          </span>
                        </td>
                        <td>
                          <span className="rfid-pill">{log.rfidCardId || log.method || 'Manual'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Logs pagination */}
            {logsTotalCount > PER_PAGE && (
              <div className="admin-att-pagination">
                <span>Showing {((logsPage - 1) * PER_PAGE) + 1}–{Math.min(logsPage * PER_PAGE, logsTotalCount)} of {logsTotalCount}</span>
                <div className="admin-att-pagination-btns">
                  <button disabled={logsPage <= 1} onClick={() => handleLogsPageChange(logsPage - 1)}><ChevronLeft size={16} /> Previous</button>
                  <button disabled={logsPage >= totalLogsPages} onClick={() => handleLogsPageChange(logsPage + 1)}>Next <ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Default: Sessions list with Tabs ── */
          <>
            <div className="admin-att-section-header">
              <div className="admin-att-tabs">
                <button 
                  className={`admin-att-tab ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  Active Sessions
                </button>
                <button 
                  className={`admin-att-tab ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('history');
                    setHistoryPage(1);
                  }}
                >
                  Service History
                </button>
              </div>
            </div>
            <div className="admin-att-table-wrapper">
              <table className="admin-att-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Service Type</th>
                    <th>Date</th>
                    <th>Start Time</th>
                    <th>Status / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'active' ? (
                    activeSessions.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>No active RFID sessions right now.</td>
                      </tr>
                    ) : (
                      paginatedSessions.map((session) => (
                        <tr key={session.sessionId} className="admin-att-row-clickable" onClick={() => handleSessionClick(session)}>
                           <td>{session.branch}</td>
                           <td>{session.serviceType}</td>
                           <td>{new Date(session.date).toLocaleDateString()}</td>
                           <td>{session.time}</td>
                           <td>
                              <span className="status-badge present">
                                <span className="pulse-indicator"></span>
                                Active
                              </span>
                           </td>
                        </tr>
                      ))
                    )
                  ) : (
                    historyLoading ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>Loading history...</td>
                      </tr>
                    ) : historySessions.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280' }}>No historical sessions found.</td>
                      </tr>
                    ) : (
                      historySessions.map((session) => (
                        <tr key={session.sessionId} className="admin-att-row-clickable" onClick={() => handleSessionClick(session)}>
                           <td>{session.branch}</td>
                           <td>{session.serviceType}</td>
                           <td>{new Date(session.date).toLocaleDateString()}</td>
                           <td>{session.time}</td>
                           <td>
                              <span className="status-badge absent" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                                Ended
                              </span>
                              <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>
                                {session.stats?.total || 0} attendees
                              </span>
                           </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination depending on activeTab */}
            {activeTab === 'active' && activeSessions.length > PER_PAGE && (
              <div className="admin-att-pagination">
                <span>Showing {((sessionsPage - 1) * PER_PAGE) + 1}–{Math.min(sessionsPage * PER_PAGE, activeSessions.length)} of {activeSessions.length}</span>
                <div className="admin-att-pagination-btns">
                  <button disabled={sessionsPage <= 1} onClick={() => setSessionsPage(sessionsPage - 1)}><ChevronLeft size={16} /> Previous</button>
                  <button disabled={sessionsPage >= totalSessionsPages} onClick={() => setSessionsPage(sessionsPage + 1)}>Next <ChevronRight size={16} /></button>
                </div>
              </div>
            )}
            
            {activeTab === 'history' && historyTotalCount > PER_PAGE && (
              <div className="admin-att-pagination">
                <span>Showing {((historyPage - 1) * PER_PAGE) + 1}–{Math.min(historyPage * PER_PAGE, historyTotalCount)} of {historyTotalCount}</span>
                <div className="admin-att-pagination-btns">
                  <button disabled={historyPage <= 1} onClick={() => setHistoryPage(historyPage - 1)}><ChevronLeft size={16} /> Previous</button>
                  <button disabled={historyPage >= historyTotalPages} onClick={() => setHistoryPage(historyPage + 1)}>Next <ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </>

        )}
      </div>

    </div>
  );
}