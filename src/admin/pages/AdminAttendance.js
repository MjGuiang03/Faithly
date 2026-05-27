/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminAttendance.css';
import API from '../../utils/api';
import { 
  CalendarDays, MapPin, Search, UserCheck, Clock, ShieldAlert,
  Play, Square, Plus, CheckCircle2, AlertCircle, XCircle, Download,
  ArrowLeft, ChevronLeft, ChevronRight, CreditCard, FileText
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
  
  // Tabs
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

  // History Sessions Page
  const [historyPage, setHistoryPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Drilldown: viewing a specific session's logs
  const [viewingSession, setViewingSession] = useState(null);
  const [logsPage, setLogsPage] = useState(1);

  // Pagination for sessions table (client-side)
  const [sessionsPage, setSessionsPage] = useState(1);
  const PER_PAGE = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const rfidBuffer = useRef('');

  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }).then(res => res.json());

  // 1. Fetch Active Sessions
  const { data: activeSessionsData } = useSWR(
    `${API}/api/admin/attendance/sessions/active`,
    fetcherSingle,
    { revalidateOnFocus: false, refreshInterval: 5000 }
  );

  const activeSessions = useMemo(() => activeSessionsData?.sessions || [], [activeSessionsData]);
  const selectedSession = activeSessions.length > 0 ? activeSessions[0] : null;

  // 2. Fetch History Sessions
  const { data: historySessionsData, isValidating: historyLoading } = useSWR(
    activeTab === 'history' ? `${API}/api/admin/attendance/sessions/history?page=${historyPage}&limit=${PER_PAGE}` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const historySessions = useMemo(() => historySessionsData?.sessions || [], [historySessionsData]);
  const historyTotalPages = useMemo(() => historySessionsData?.totalPages || 1, [historySessionsData]);
  const historyTotalCount = useMemo(() => historySessionsData?.totalCount || 0, [historySessionsData]);

  // 3. Fetch Logs & Stats
  const attendanceQueryParams = useMemo(() => {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (filterBranch && filterBranch !== 'all') params.set('branch', filterBranch);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      return params.toString();
  }, [page, debouncedSearch, filterBranch, filterStatus]);

  const { data: attendanceData, isValidating: attendanceLoading, mutate: fetchAttendance } = useSWR(
    `${API}/api/admin/attendance?${attendanceQueryParams}`,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const logs = useMemo(() => attendanceData?.attendance || [], [attendanceData]);
  const totalCount = useMemo(() => attendanceData?.totalCount || 0, [attendanceData]);
  const stats = useMemo(() => ({
      totalToday: attendanceData?.stats?.totalToday || 0,
      servicesThisWeek: attendanceData?.stats?.servicesThisWeek || 0,
      avgAttendance: attendanceData?.stats?.avgAttendance || 0,
      lateToday: attendanceData?.stats?.lateToday || 0,
  }), [attendanceData]);

  useEffect(() => { setLoading(attendanceLoading && !attendanceData); }, [attendanceLoading, attendanceData]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterBranch, filterStatus]);

  // 4. Session Logs (drilldown)
  const { data: sessionLogsData, isValidating: sessionLogsLoading } = useSWR(
    viewingSession ? `${API}/api/admin/attendance?session=${viewingSession.sessionId}&page=${logsPage}&limit=${PER_PAGE}` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false, 
      refreshInterval: viewingSession && logsPage === 1 ? 3000 : 0,
      dedupingInterval: 10000,
      keepPreviousData: true
    }
  );

  const sessionLogs = useMemo(() => sessionLogsData?.attendance || [], [sessionLogsData]);
  const logsTotalCount = useMemo(() => sessionLogsData?.totalCount || sessionLogsData?.attendance?.length || 0, [sessionLogsData]);

  const handleSessionClick = (session) => {
    setViewingSession(session);
    setLogsPage(1);
  };

  const handleLogsPageChange = (newPage) => {
    setLogsPage(newPage);
  };

  const handleBackToSessions = () => {
    setViewingSession(null);
    setLogsPage(1);
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
    link.setAttribute("download", `IsangDiwa_Attendance_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  /* ── Export session attendance to PDF ── */
  const [pdfExporting, setPdfExporting] = useState(false);

  const exportSessionPDF = async () => {
    if (!viewingSession) return toast.info('No session selected');
    setPdfExporting(true);

    try {
      // Fetch ALL logs for this session (not just the paginated page)
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance?session=${viewingSession.sessionId}&limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const allLogs = (data.success && data.attendance) ? data.attendance : sessionLogs;

      if (allLogs.length === 0) { toast.info('No attendance data to export'); setPdfExporting(false); return; }

      const sessionDate = new Date(viewingSession.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const presentCount = allLogs.filter(l => l.status === 'Present').length;
      const lateCount = allLogs.filter(l => l.status === 'Late').length;

      const tableRows = allLogs.map((log, i) => `
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 10px 12px; font-size: 12px; color: #374151;">${i + 1}</td>
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #111827;">${log.member}</td>
          <td style="padding: 10px 12px; font-size: 12px; color: #374151;">${log.time || 'N/A'}</td>
          <td style="padding: 10px 12px; font-size: 12px;">
            <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
              background: ${log.status === 'Present' ? '#D1FAE5' : '#FEF3C7'};
              color: ${log.status === 'Present' ? '#065F46' : '#92400E'};">
              ${log.status}
            </span>
          </td>
          <td style="padding: 10px 12px; font-size: 11px; color: #6B7280; font-family: monospace;">${log.rfidCardId || log.method || 'Manual'}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; padding: 32px; max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #1E3A8A;">Philippine United Apostolic Church</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: #6B7280;">Attendance Report</p>
          </div>

          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-size: 12px; color: #6B7280; width: 120px;">Branch</td>
                <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #111827;">${viewingSession.branch}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-size: 12px; color: #6B7280;">Service Type</td>
                <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #111827;">${viewingSession.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-size: 12px; color: #6B7280;">Date</td>
                <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #111827;">${sessionDate}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-size: 12px; color: #6B7280;">Start Time</td>
                <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #111827;">${viewingSession.time}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-size: 12px; color: #6B7280;">Total Attendees</td>
                <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #111827;">${allLogs.length} (Present: ${presentCount}, Late: ${lateCount})</td>
              </tr>
            </table>
          </div>

          <table style="width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #1E3A8A;">
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #fff; text-transform: uppercase;">#</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #fff; text-transform: uppercase;">Member</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #fff; text-transform: uppercase;">Time In</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #fff; text-transform: uppercase;">Status</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #fff; text-transform: uppercase;">Method</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <p style="text-align: center; font-size: 10px; color: #9CA3AF; margin-top: 24px;">
            Generated by IsangDiwa Portal · ${new Date().toLocaleString()}
          </p>
        </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `Attendance_${viewingSession.branch}_${viewingSession.serviceType}_${sessionDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(container).save();

      document.body.removeChild(container);
      toast.success('PDF exported successfully');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to export PDF');
    } finally {
      setPdfExporting(false);
    }
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
                <div style={{ flex: 1 }}>
                  <h2>{viewingSession.branch} — {viewingSession.serviceType}</h2>
                  <p className="admin-att-section-sub">{new Date(viewingSession.date).toLocaleDateString()} · Started at {viewingSession.time}</p>
                </div>
                <button
                  className="admin-att-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                  onClick={exportSessionPDF}
                  disabled={pdfExporting || sessionLogs.length === 0}
                >
                  {pdfExporting ? <span className="btn-spinner" /> : <FileText size={16} />}
                  Export PDF
                </button>
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