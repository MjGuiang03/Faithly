import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import useDebounce from '../../hooks/useDebounce';
import '../styles/AdminAttendance.css';
import API from '../../utils/api';
import { 
  CalendarDays, MapPin, Search, UserCheck, Clock, ShieldAlert,
  Play, Square, Plus, CheckCircle2, AlertCircle, XCircle, Download
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   MANUAL ATTENDANCE MODAL
═══════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════
   START SERVICE MODAL
═══════════════════════════════════════════════════════════════════════════ */
function StartServiceModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    branch: 'Bulacan Main',
    serviceType: 'Sunday Worship',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0,5),
    gracePeriod: 15
  });
  const [saving, setSaving] = useState(false);

  const serviceTypes = [
    'Sunday Worship', 'Bible Study', 'Prayer Meeting', 'Youth Service', 'Midweek Service', 'Special Event'
  ];

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.branch || !form.serviceType || !form.date || !form.time) {
      return toast.error('Please fill all required fields');
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Service session started! Scanner is active.');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to start session');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-att-modal-overlay" onClick={onClose}>
      <div className="admin-att-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header">
           <div className="admin-att-modal-icon bg-green-100 text-green-600">
             <Play size={20} />
           </div>
          <div className="admin-att-modal-title-group">
            <h2 className="admin-att-modal-title">Start Service Session</h2>
            <p className="admin-att-modal-subtitle">Initialize a new check-in period</p>
          </div>
          <button className="admin-att-modal-close" onClick={onClose}><XCircle size={20} color="#6B7280" /></button>
        </div>

        <div className="admin-att-modal-body">
           <div className="admin-att-form-grid-2col">
             <div className="admin-att-form-row">
               <label className="admin-att-form-label">Location / Branch</label>
               <select name="branch" value={form.branch} onChange={handleChange} className="admin-att-form-input">
                  <option value="Bulacan Main">Bulacan Main</option>
                  <optgroup label="Kalinga">
                    <option>Tabuk</option><option>Zapote</option><option>Bliss</option>
                    <option>Libanon</option><option>Batong Buhay</option><option>Balatoc</option><option>Lat-nog</option>
                  </optgroup>
                  <optgroup label="Isabela"><option>Santiago City</option></optgroup>
                  <optgroup label="Abra">
                    <option>Lamao</option><option>Lingey</option><option>Cabaruyan</option><option>Ducligan</option>
                    <option>Gangal</option><option>Bila-Bila</option><option>Naguillian</option><option>Ud-udiao</option>
                    <option>Villa Conchita</option><option>Ay-yeng Manabo</option><option>Dao-angan</option>
                    <option>Kilong-olao</option><option>Bao-yan</option><option>Amti</option><option>Danac</option>
                    <option>Bengued</option><option>Sappaac</option><option>Saccaang</option>
                  </optgroup>
                  <optgroup label="Benguet"><option>Baguio</option></optgroup>
                  <optgroup label="Rizal"><option>Montalban</option></optgroup>
                  <optgroup label="NCR">
                    <option>Valenzuela City</option><option>Tandang Sora, Quezon City</option>
                    <option>COA, Quezon City</option><option>Payatas, Quezon City</option><option>Malaria, Caloocan</option>
                  </optgroup>
                  <optgroup label="Bulacan">
                    <option>Meycauayan City</option><option>Camalig</option><option>San Jose Del Monte</option>
                  </optgroup>
                  <optgroup label="Tarlac">
                    <option>Pacpaco, San Manuel</option><option>Victoria</option>
                  </optgroup>
                  <optgroup label="Nueva Ecija"><option>Bambanaba, Cuyapo</option></optgroup>
                  <optgroup label="Pangasinan">
                    <option>Dagupan</option><option>Mangatarem</option><option>Laoak Langka</option>
                    <option>Orbiztondo</option><option>Malasiqui, Bolaoit</option><option>Taloyan</option>
                    <option>Binmaley</option><option>San Carlos</option><option>Manaoag</option>
                    <option>Pozorrubio</option><option>Alcala</option>
                  </optgroup>
                  <optgroup label="Agusan Del Norte">
                    <option>Butuan City</option><option>RTR</option><option>Jabonga, Bangonay</option>
                    <option>Kasiklan</option><option>San Mateo</option><option>Fatima Kim.13</option>
                    <option>Bayugan</option><option>Ibuan</option><option>Balubo</option>
                  </optgroup>
                  <optgroup label="Cebu">
                    <option>Mandaue</option><option>Liloan</option><option>Calero</option><option>Compostela</option>
                  </optgroup>
                  <optgroup label="Surigao Del Norte">
                    <option>Alegria</option><option>Bonifacio</option><option>Matin-ao</option><option>Ipil</option>
                  </optgroup>
                  <optgroup label="Surigao Del Sur"><option>Kinabigtasan, Tago</option></optgroup>
               </select>
             </div>
             <div className="admin-att-form-row">
                <label className="admin-att-form-label">Service Type</label>
                <select name="serviceType" value={form.serviceType} onChange={handleChange} className="admin-att-form-input">
                  {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>
           </div>
           
           <div className="admin-att-form-grid-2col">
             <div className="admin-att-form-row">
                <label className="admin-att-form-label">Date</label>
                <input type="date" name="date" value={form.date} onChange={handleChange} className="admin-att-form-input" />
             </div>
             <div className="admin-att-form-row">
                <label className="admin-att-form-label">Start Time</label>
                <input type="time" name="time" value={form.time} onChange={handleChange} className="admin-att-form-input" />
             </div>
           </div>

           <div className="admin-att-form-row">
              <label className="admin-att-form-label">Grace Period (Minutes)</label>
              <input type="number" name="gracePeriod" min="0" value={form.gracePeriod} onChange={handleChange} className="admin-att-form-input" />
              <p className="admin-att-help-text">Taps after this period will be marked as "Late".</p>
           </div>
        </div>

        <div className="admin-att-modal-footer">
          <button className="admin-att-btn admin-att-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="admin-att-btn admin-att-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN ATTENDANCE DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminAttendance() {
  const [stats, setStats] = useState({ totalToday: 0, servicesThisWeek: 0, avgAttendance: 0, lateToday: 0 });
  const [logs, setLogs] = useState([]);
  
  // Active Sessions
  const [activeSessions, setActiveSessions] = useState([]);
  const selectedSession = activeSessions.length > 0 ? activeSessions[0] : null;

  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

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

  // Global RFID Listener
  useEffect(() => {
    const handleKeyDown = async (e) => {
        // Disregard events going into inputs/textareas
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

        // RFID readers usually send Enter at the end
        if (e.key === 'Enter') {
            const code = rfidBuffer.current.trim();
            rfidBuffer.current = ''; // clear buffer
            
            if (code.length > 0) {
               if (!selectedSession) {
                  toast.error('No active service session. Start a service first to log attendance.');
                  return;
               }
               // Perform check-in tap!
               try {
                  const token = localStorage.getItem('adminToken');
                  const res = await fetch(`${API}/api/admin/attendance/log-tap`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ 
                       cardId: code, 
                       method: 'RFID', 
                       minLevelSessionId: selectedSession.sessionId 
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                      toast.success(data.message);
                      fetchAttendance(); // refresh logs
                  } else {
                      toast.error(data.message);
                  }
               } catch(err) {
                  toast.error('RFID processing error');
               }
            }
        } else {
            // Append char (only alphanumeric if standard)
            if (e.key.length === 1) {
                rfidBuffer.current += e.key;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSession, fetchAttendance]);

  const endSession = async (sessionId) => {
     if (!window.confirm('Are you sure you want to end this session? All unregistered members will be marked Absent.')) return;
     try {
       const token = localStorage.getItem('adminToken');
       const res = await fetch(`${API}/api/admin/attendance/sessions/${sessionId}/end`, {
         method: 'POST',
         headers: { Authorization: `Bearer ${token}` }
       });
       const data = await res.json();
       if (data.success) {
          toast.success('Session ended. Absences calculated.');
          fetchActiveSessions();
          fetchAttendance();
       } else {
          throw new Error(data.message);
       }
     } catch (err) {
       toast.error(err.message || 'Error ending session');
     }
  };

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
      {showStartModal && <StartServiceModal onClose={() => setShowStartModal(false)} onSave={() => { setShowStartModal(false); fetchActiveSessions(); }} />}
      {showManualModal && selectedSession && <ManualAttendanceModal session={selectedSession} onClose={() => setShowManualModal(false)} onSave={() => { setShowManualModal(false); fetchAttendance(); }} />}

      {/* Header */}
      <div className="admin-att-page-header">
        <div>
           <h1 className="admin-att-title">Attendance Tracking</h1>
           <p className="admin-att-subtitle">Manage service sessions and monitor active RFID logging.</p>
        </div>
        <div className="admin-att-header-actions">
           {selectedSession ? (
              <button className="admin-att-btn-danger" onClick={() => endSession(selectedSession.sessionId)}>
                <Square size={16} /> End Session
              </button>
           ) : (
              <button className="admin-att-btn-primary" onClick={() => setShowStartModal(true)}>
                <Play size={16} /> Start Service
              </button>
           )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="admin-att-stats-row">
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Total Attendance Today</span>
            <div className="admin-att-stat-icon icon-blue"><UserCheck size={18} /></div>
          </div>
          <span className="admin-att-stat-value">{stats.totalToday.toLocaleString()}</span>
        </div>
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Services This Week</span>
            <div className="admin-att-stat-icon icon-green"><CalendarDays size={18} /></div>
          </div>
          <span className="admin-att-stat-value">{stats.servicesThisWeek}</span>
        </div>
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Average Attendance</span>
            <div className="admin-att-stat-icon icon-indigo"><MapPin size={18} /></div>
          </div>
          <span className="admin-att-stat-value">{stats.avgAttendance.toLocaleString()}</span>
          <span className="admin-att-stat-sub">past 30 days</span>
        </div>
        <div className="admin-att-stat-block">
          <div className="admin-att-stat-top">
            <span className="admin-att-stat-label">Late Arrivals Today</span>
            <div className="admin-att-stat-icon icon-orange"><ShieldAlert size={18} /></div>
          </div>
          <span className="admin-att-stat-value text-orange">{stats.lateToday.toLocaleString()}</span>
        </div>
      </div>

      {/* RFID Scanner Panel */}
      <div className={`admin-att-scanner-panel ${selectedSession ? 'active' : 'idle'}`}>
          <div className="scanner-status">
             <div className="pulse-indicator"></div>
             <h3>{selectedSession ? 'Scanner Active. Ready for Taps.' : 'Scanner Idle. Start a service to scan cards.'}</h3>
          </div>
          
          {selectedSession && (
             <div className="scanner-details">
                <div className="scanner-detail-item">
                   <span className="label">Branch</span>
                   <span className="val">{selectedSession.branch}</span>
                </div>
                <div className="scanner-detail-item">
                   <span className="label">Service</span>
                   <span className="val">{selectedSession.serviceType}</span>
                </div>
                <div className="scanner-detail-item">
                   <span className="label">Started</span>
                   <span className="val">{new Date(selectedSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                </div>
                <button className="admin-att-btn-secondary" onClick={() => setShowManualModal(true)}>
                   <Plus size={16} /> Manual Input
                </button>
             </div>
          )}
      </div>

      {/* Logs Table Area */}
      <div className="admin-att-table-container">
         <div className="admin-att-table-toolbar">
            <div className="admin-att-table-search">
              <Search size={18} color="#9CA3AF" />
              <input type="text" placeholder="Search by name, ID, or RFID..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            
            <div className="admin-att-table-filters">
               <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="admin-att-filter-select">
                  <option value="all">All Branches</option>
                  <option value="Bulacan Main">Bulacan Main</option>
                  <option value="Tandang Sora, Quezon City">Tandang Sora</option>
                  {/* Keep simplified for UI - standard would map full list or just highly active ones */}
               </select>

               <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="admin-att-filter-select">
                  <option value="all">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
               </select>

               <button className="admin-att-export-btn" onClick={exportCSV}>
                 <Download size={16} /> Export
               </button>
            </div>
         </div>

         <div className="admin-att-table-wrapper">
           <table className="admin-att-table">
             <thead>
               <tr>
                 <th>Member</th>
                 <th>Branch</th>
                 <th>Service</th>
                 <th>Date & Time</th>
                 <th>Status</th>
                 <th className="pr-6 text-right">RFID Data</th>
               </tr>
             </thead>
             <tbody>
               {loading ? (
                 <tr>
                   <td colSpan={6} align="center" className="py-12 text-gray-500">
                     <span className="btn-spinner" style={{ borderColor: '#6B7280', borderTopColor: 'transparent', margin: '0 auto' }} />
                   </td>
                 </tr>
               ) : logs.length === 0 ? (
                 <tr>
                   <td colSpan={6} align="center" className="py-12 text-gray-500">No attendance records found.</td>
                 </tr>
               ) : (
                 logs.map(log => (
                   <tr key={log._id}>
                      <td>
                         <div className="font-medium text-gray-900">{log.member}</div>
                         <div className="text-xs text-gray-500">{log.email}</div>
                      </td>
                      <td className="text-gray-600">{log.branch}</td>
                      <td className="text-gray-600">{log.service}</td>
                      <td>
                         <div className="text-gray-900">{log.date}</div>
                         <div className="text-xs text-gray-500">{log.time}</div>
                      </td>
                      <td>
                         <span className={`status-badge ${log.status.toLowerCase()}`}>
                            {log.status === 'Present' && <CheckCircle2 size={12} />}
                            {log.status === 'Late' && <Clock size={12} />}
                            {log.status === 'Absent' && <AlertCircle size={12} />}
                            {log.status}
                         </span>
                      </td>
                      <td align="right" className="pr-6">
                         <span className="rfid-pill font-mono text-xs">{log.rfidCardId || 'Manual'}</span>
                      </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>

         {totalCount > LIMIT && (
           <div className="admin-att-pagination">
             <span>Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, totalCount)} of {totalCount}</span>
             <div className="flex gap-1">
               <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
               <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalCount / LIMIT)}>Next</button>
             </div>
           </div>
         )}
      </div>

    </div>
  );
}