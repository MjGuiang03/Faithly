import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import API from '../../utils/api';
import { Play, Square, XCircle, ArrowLeft } from 'lucide-react';
import QRCode from 'react-qr-code';
import '../styles/AdminRFIDPreview.css';

function StartServiceModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    branch: 'Bulacan Main',
    serviceType: 'Sunday Worship',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
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
          <div className="admin-att-form-group">
            <label className="admin-att-label">Branch</label>
            <select name="branch" value={form.branch} onChange={handleChange} className="admin-att-select">
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
              <optgroup label="Nueva Ecija"><option>Bambanaba,  Cuyapo</option></optgroup>
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
          <div className="admin-att-form-group">
            <label className="admin-att-label">Service Type</label>
            <select name="serviceType" value={form.serviceType} onChange={handleChange} className="admin-att-select">
              {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="admin-att-form-row">
            <div className="admin-att-form-group">
              <label className="admin-att-label">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} className="admin-att-input" />
            </div>
            <div className="admin-att-form-group">
              <label className="admin-att-label">Time</label>
              <input type="time" name="time" value={form.time} onChange={handleChange} className="admin-att-input" />
            </div>
          </div>
        </div>
        <div className="admin-att-modal-footer">
          <button className="admin-att-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="admin-att-btn-submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Starting...' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EndSessionModal({ onClose, onConfirm }) {
  return (
    <div className="admin-att-modal-overlay" onClick={onClose}>
      <div className="admin-att-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header">
          <div className="admin-att-modal-icon admin-rfid-modal-icon-danger">
            <Square size={20} />
          </div>
          <div className="admin-att-modal-title-group">
            <h2 className="admin-att-modal-title">End Service Session</h2>
            <p className="admin-att-modal-subtitle">Are you sure you want to end this session?</p>
          </div>
        </div>
        <div className="admin-att-modal-body">
          <p className="admin-rfid-modal-warning-text">
            Ending this session will stop accepting new check-ins. All unregistered members from this branch will automatically be marked as <strong>Absent</strong>. This action cannot be undone.
          </p>
        </div>
        <div className="admin-att-modal-footer">
          <button className="admin-att-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="admin-att-btn-danger admin-rfid-modal-btn-small" onClick={onConfirm}>End Session</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRFIDPreview() {
  const navigate = useNavigate();

  const [activeSessions, setActiveSessions] = useState([]);
  const [lastTappedUser, setLastTappedUser] = useState(null);
  const selectedSession = activeSessions.length > 0 ? activeSessions[0] : null;
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [sessionToEnd, setSessionToEnd] = useState(null);
  const rfidBuffer = useRef('');

  const fetchActiveSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setActiveSessions(data.sessions);
        // Auto-open start modal if no sessions are active
        if (data.sessions.length === 0) {
          setShowStartModal(true);
        }
      }
    } catch (err) { console.error('Failed to get active sessions', err); }
  }, []);

  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  // Global RFID Listener
  const lastTapTime = useRef(0);
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Enter') {
        const code = rfidBuffer.current.trim();
        rfidBuffer.current = '';
        if (code.length > 0) {
          if (!selectedSession) {
            toast.error('No active service session. Start a service first to log attendance.');
            return;
          }
          // Prevent overlapping API calls from rapid taps
          if (isProcessing.current) return;
          isProcessing.current = true;
          lastTapTime.current = Date.now();

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
              // Mark the tap time again after response to protect the display
              lastTapTime.current = Date.now();
              setLastTappedUser({ ...data.user, recordId: data.record?.recordId, status: data.user?.status || 'Present', alreadyLogged: data.alreadyLogged });
            } else {
              toast.error(data.message);
            }
          } catch (err) {
            toast.error('RFID processing error');
          } finally {
            isProcessing.current = false;
          }
        }
      } else {
        if (e.key.length === 1) {
          rfidBuffer.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSession]);

  // Poll for remote QR scans (won't overwrite recent RFID taps)
  useEffect(() => {
    let interval;
    if (selectedSession) {
      interval = setInterval(async () => {
        // Skip poll if an RFID tap happened in the last 4 seconds
        if (Date.now() - lastTapTime.current < 4000) return;

        try {
          const token = localStorage.getItem('adminToken');
          const cacheBuster = `_t=${Date.now()}`;
          const res = await fetch(`${API}/api/admin/attendance?session=${selectedSession.sessionId}&limit=5&${cacheBuster}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success && data.attendance && data.attendance.length > 0) {
            // Only show actual check-ins, not auto-generated absent records
            const checkedIn = data.attendance.find(a => a.status === 'Present' || a.status === 'Late');
            if (checkedIn) {
              const latest = checkedIn;
              setLastTappedUser(prev => {
                if (!prev || prev.recordId !== latest.recordId) {
                  return {
                    recordId: latest.recordId,
                    name: latest.member,
                    branch: latest.userBranch || latest.branch,
                    status: latest.status,
                    alreadyLogged: false
                  };
                }
                return prev;
              });
            }
          }
        } catch (e) {
          // silent error
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [selectedSession]);

  const confirmEndSession = (sessionId) => {
    setSessionToEnd(sessionId);
    setShowEndModal(true);
  };

  const endSession = async () => {
    if (!sessionToEnd) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/api/admin/attendance/sessions/${sessionToEnd}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Session ended. Absences calculated.');
        fetchActiveSessions();
        setShowEndModal(false);
        setSessionToEnd(null);
        setLastTappedUser(null);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Error ending session');
    }
  };

  const handleBack = () => {
    navigate('/admin/attendance');
  };

  return (
    <div className="admin-rfid-container">
      {showStartModal && <StartServiceModal onClose={() => setShowStartModal(false)} onSave={() => { setShowStartModal(false); fetchActiveSessions(); }} />}
      {showEndModal && <EndSessionModal onClose={() => setShowEndModal(false)} onConfirm={endSession} />}

      <div className="admin-rfid-header">
        <h2>Faithly RFID System</h2>
        <button className="admin-rfid-logout" style={{ display: 'flex', alignItems: 'center' }} onClick={handleBack}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} />
          Back
        </button>
      </div>

      <div className="admin-rfid-content">
        {selectedSession && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', marginBottom: '24px' }}>
            <div className="admin-rfid-tapped-user" style={{ flex: 1, margin: 0 }}>
              {lastTappedUser ? (
                <>
                  <img
                    src={lastTappedUser.profilePicture ? `${API}${lastTappedUser.profilePicture}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(lastTappedUser.name)}&background=0D1F45&color=fff`}
                    alt="User"
                    className="admin-rfid-user-avatar"
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(lastTappedUser.name)}&background=0D1F45&color=fff` }}
                  />
                  <div className="admin-rfid-user-details">
                    <h3 className="admin-rfid-user-name">{lastTappedUser.name}</h3>
                    <span className="admin-rfid-user-branch">{lastTappedUser.branch}</span>
                    <span className={`admin-rfid-user-status ${lastTappedUser.alreadyLogged ? 'status-already' : (lastTappedUser.status === 'Present' ? 'status-present' : 'status-late')}`}>
                      {lastTappedUser.alreadyLogged ? 'Already Checked In' : `Checked in as ${lastTappedUser.status}`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="admin-rfid-empty-state">
                  <div className="admin-rfid-empty-avatar">
                    <span className="admin-rfid-empty-icon">?</span>
                  </div>
                  <span className="admin-rfid-empty-text">Waiting for next tap...</span>
                </div>
              )}
            </div>
            <div style={{ padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '200px' }}>
              <QRCode value={selectedSession.sessionId} size={140} />
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#4B5563', fontWeight: '600' }}>Scan to Check In</p>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>{selectedSession.sessionId}</span>
            </div>
          </div>
        )}

        <div className={`admin-att-scanner-panel ${selectedSession ? 'active' : 'idle'}`}>
          <div className="scanner-status">
            <div className="pulse-indicator"></div>
            <h3>{selectedSession ? 'Scanner Active. Ready for Taps.' : 'Scanner Idle. Start a service to scan cards.'}</h3>
          </div>

          {selectedSession && (
            <div className="scanner-details">
              <div className="detail-item">
                <span className="label">Branch</span>
                <span className="value">{selectedSession.branch}</span>
              </div>
              <div className="detail-item">
                <span className="label">Service</span>
                <span className="value">{selectedSession.serviceType}</span>
              </div>
            </div>
          )}
        </div>

        <div className="admin-rfid-actions">
          {selectedSession ? (
            <button className="admin-att-btn-danger admin-rfid-action-btn" onClick={() => confirmEndSession(selectedSession.sessionId)}>
              <Square size={20} /> End Session
            </button>
          ) : (
            <button className="admin-att-btn-primary admin-rfid-action-btn" onClick={() => setShowStartModal(true)}>
              <Play size={20} /> Start Service
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
