import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import '../styles/Attendance.css';
import API from '../../utils/api';
import { CalendarDays, CheckCircle, Activity, CreditCard, Camera, XCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from 'sonner';

const PAGE_SIZE = 5;

const CountUp = ({ end, duration = 1000, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const numericEnd = typeof end === 'number' ? end : parseInt(end) || 0;
    
    if (numericEnd === 0) {
      setCount(0);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * numericEnd));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <>{count}{suffix}</>;
};

export default function Attendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats,          setStats]          = useState({ total: 0, thisMonth: 0 });
  const [loading,        setLoading]        = useState(true);
  const [page]           = useState(1);


  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const token = localStorage.getItem('token');

  const fetcher = async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.json();
  };

  const { data, isValidating, mutate } = useSWR(
    token ? `${API}/api/attendance/my-attendance?page=${page}&limit=${PAGE_SIZE}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: true }
  );

  useEffect(() => {
    if (!data) return;
    setLoading(isValidating && !data);
    if (data.success) {
      setAttendanceData(data.attendance || []);
      setStats(data.stats || { total: 0, thisMonth: 0 });
    }
    if (data) setLoading(false);
  }, [data, isValidating]);

  // Attendance rate = thisMonth / weeks in current month * 100 (capped at 100)
  const attendanceRateNum = useMemo(() => {
    if (!stats.total) return 0;
    const weeksInMonth = 4;
    return Math.min(100, Math.round((stats.thisMonth / weeksInMonth) * 100));
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

  const { data: modalData, isValidating: modalValidating } = useSWR(
    isHistoryModalOpen && token ? `${API}/api/attendance/my-attendance?page=${modalPage}&limit=${MODAL_LIMIT}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!modalData) return;
    setModalLoading(modalValidating && !modalData);
    if (modalData.success) {
      setModalHistory(modalData.attendance || []);
      setModalTotalPages(modalData.totalPages || 1);
    }
    if (modalData) setModalLoading(false);
  }, [modalData, modalValidating]);

  const handleOpenHistory = () => {
    setModalPage(1);
    setIsHistoryModalOpen(true);
  };

  const handleScan = async (sessionId) => {
    setIsScanning(true);
    console.log('[QR Scan] Sending sessionId:', sessionId);
    try {
      const res = await fetch(`${API}/api/attendance/scan-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      console.log('[QR Scan] Response:', res.status, data);
      if (data.success) {
        toast.success(data.message);
        setIsScannerOpen(false);
        setIsScanning(false);
        mutate();
      } else {
        toast.error(data.message);
        setTimeout(() => setIsScanning(false), 2500); // Delay before next scan
      }
    } catch (err) {
      console.error('[QR Scan] Error:', err);
      toast.error('Failed to process QR code');
      setTimeout(() => setIsScanning(false), 2500);
    }
  };

  return (
    <>
      <div className="user-attendance-container">
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
              <CheckCircle className="user-attendance-stat-icon" size={20} color="#155DFC" />
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in"><CountUp end={stats.total} /></p>}
            </div>

          <div className="user-attendance-stat-card">
            <div className="user-attendance-stat-header">
              <p className="user-attendance-stat-label">This Month</p>
              <CalendarDays className="user-attendance-stat-icon" size={20} color="#155DFC" />
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in"><CountUp end={stats.thisMonth} /></p>}
            </div>

          <div className="user-attendance-stat-card">
            <div className="user-attendance-stat-header">
              <p className="user-attendance-stat-label">Attendance Rate</p>
              <Activity className="user-attendance-stat-icon" size={20} color="#155DFC" />
              </div>
              {loading ? <div className="user-skeleton" style={{ height: '32px', width: '60px', margin: '8px 0' }}></div> : <p className="user-attendance-stat-value user-fade-in"><CountUp end={attendanceRateNum} suffix="%" /></p>}
            </div>
        </div>

        {/* Check In + Upcoming Services */}
        <div className="user-attendance-content-grid">
          {/* Check In */}
          <div className="user-check-in-card">
            <h2 className="user-attendance-section-title">Check In</h2>
            <p className="user-check-in-subtitle">Choose how you'd like to check in:</p>

            <div className="user-check-in-method" onClick={() => setIsScannerOpen(true)} style={{ cursor: 'pointer' }}>
              <div className="user-qr-scanner-box">
                <Camera className="user-qr-icon" size={32} color="#155DFC" />
              </div>
              <div className="user-check-in-method-info">
                <h3 className="user-check-in-method-title">Scan Church QR</h3>
                <p className="user-check-in-method-description">Open camera to scan a service QR</p>
              </div>
            </div>

            {/* RFID Scanner Button for authorized roles */}
            {['admin', 'secretaryAdmin', 'secretary', 'loanAdmin', 'loan'].includes(user?.role) && (
              <div className="user-check-in-method user-check-in-rfid-method" onClick={() => navigate('/admin/rfid-preview')}>
                <div className="user-qr-scanner-box" style={{ background: '#F5F3FF' }}>
                  <CreditCard className="user-qr-icon" size={32} color="#7C3AED" />
                </div>
                <div className="user-check-in-method-info">
                  <h3 className="user-check-in-method-title">RFID Scanner</h3>
                  <p className="user-check-in-method-description">Open dedicated RFID check-in kiosk</p>
                </div>
              </div>
            )}

            <div className="user-check-in-tip">
              <span className="user-tip-label">Tip:</span>
              <span className="user-tip-text">Check in when you arrive at the service venue. Your attendance will be recorded automatically.</span>
            </div>
          </div>

          {/* Attendance History (Moved from bottom) */}
          <div className="user-attendance-history-card">
            <div className="user-history-header-row">
              <h2 className="user-attendance-section-title">Recent Attendance</h2>
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
                <div className="user-history-empty-state">
                  <div className="user-history-empty-icon">
                    <Activity size={40} color="#cbd5e1" />
                  </div>
                  <h3 className="user-history-empty-title">No records yet</h3>
                  <p className="user-history-empty-text">
                    Your attendance history will appear here once you check in to a service.
                  </p>
                </div>
              ) : (
                <div className="user-fade-in">
                  <table className="user-attendance-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.slice(0, 5).map((record, index) => (
                        <tr key={index}>
                          <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.service}</td>
                          <td>{record.date}</td>
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
      {/* ── QR Scanner Modal ── */}
      {isScannerOpen && (
        <div className="user-attendance-modal-overlay" onClick={() => !isScanning && setIsScannerOpen(false)}>
          <div className="user-attendance-modal-content" style={{ maxWidth: '400px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="user-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="user-modal-title" style={{ fontSize: '18px' }}>Scan Service QR</h2>
              <button className="user-modal-close-btn" onClick={() => setIsScannerOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><XCircle size={24} color="#6B7280" /></button>
            </div>
            <div style={{ background: '#000', position: 'relative' }}>
              <Scanner
                onScan={(result) => {
                  if (isScanning) return;
                  let scannedValue = '';
                  
                  if (Array.isArray(result) && result.length > 0) {
                    scannedValue = result[0].rawValue || result[0].text || '';
                  } else if (result && typeof result === 'object') {
                    scannedValue = result.rawValue || result.text || '';
                  } else if (typeof result === 'string') {
                    scannedValue = result;
                  }

                  if (scannedValue) {
                    handleScan(scannedValue);
                  }
                }}
                onError={(error) => console.log(error?.message)}
              />
              {isScanning && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', color: 'white', fontWeight: 'bold' }}>
                  Processing...
                </div>
              )}
            </div>
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
              Point your camera at the session QR code displayed by the admin.
            </div>
          </div>
        </div>
      )}
    </>
  );
}