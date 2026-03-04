import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminAttendance.css';

const API = process.env.REACT_APP_API_URL;

export default function AdminAttendance() {
  const navigate = useNavigate();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    total: 7567,
    thisWeek: 1234,
    avgPerService: 1890,
    topBranch: 'Main Branch'
  });
  const [byService, setByService] = useState([]);
  const [byBranch, setByBranch] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) {
      navigate('/admin/login');
      return;
    }
    fetchAttendance();
  }, [navigate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAttendance();
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      setByService([
        { service: 'Sunday Service', count: 5 },
        { service: 'Midweek Service', count: 1 },
        { service: 'Friday Service', count: 1 },
      ]);

      setByBranch([
        { branch: 'Main Branch', count: 4 },
        { branch: 'North Branch', count: 1 },
        { branch: 'South Branch', count: 1 },
        { branch: 'East Branch', count: 1 },
      ]);

      setAttendanceRecords([
        { _id: 1, recordId: 'ATT-2026-001', member: 'Juan Dela Cruz', service: 'Sunday Service', date: '2/28/2026', time: '10:00 AM', branch: 'Main Branch', method: 'QR' },
        { _id: 2, recordId: 'ATT-2026-002', member: 'Maria Santos', service: 'Sunday Service', date: '2/28/2026', time: '10:05 AM', branch: 'Main Branch', method: 'RFID' },
        { _id: 3, recordId: 'ATT-2026-003', member: 'Pedro Garcia', service: 'Midweek Service', date: '2/26/2026', time: '07:00 PM', branch: 'North Branch', method: 'QR' },
        { _id: 4, recordId: 'ATT-2026-004', member: 'Ana Reyes', service: 'Sunday Service', date: '2/28/2026', time: '10:15 AM', branch: 'Main Branch', method: 'RFID' },
        { _id: 5, recordId: 'ATT-2026-005', member: 'Carlos Torres', service: 'Friday Service', date: '2/27/2026', time: '07:30 PM', branch: 'South Branch', method: 'QR' },
      ]);
    } catch (err) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter(record =>
    record.member.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.recordId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-attendance-main">
      {/* Header */}
      <div className="admin-attendance-header">
        <h1 className="admin-attendance-title">Attendance Monitoring</h1>
        <p className="admin-attendance-subtitle">Track and analyze service attendance</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-attendance-stats-grid">
        <div className="admin-attendance-stat-card">
          <div className="admin-attendance-stat-header">
            <p className="admin-attendance-stat-label">Total Attendance</p>
            <div className="admin-attendance-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M14.1667 17.5V15.8333C14.1667 14.9493 13.8155 14.1014 13.1904 13.4763C12.5652 12.8512 11.7174 12.5 10.8333 12.5H4.16667C3.28261 12.5 2.43476 12.8512 1.80964 13.4763C1.18452 14.1014 0.833333 14.9493 0.833333 15.8333V17.5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 9.16667C9.34095 9.16667 10.8333 7.67428 10.8333 5.83333C10.8333 3.99238 9.34095 2.5 7.5 2.5C5.65905 2.5 4.16667 3.99238 4.16667 5.83333C4.16667 7.67428 5.65905 9.16667 7.5 9.16667Z" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.1667 17.5V15.8333C19.1661 15.0948 18.9203 14.3773 18.4679 13.7936C18.0155 13.2099 17.3818 12.793 16.6667 12.6083" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3333 2.60833C14.0503 2.79192 14.6858 3.20892 15.1396 3.79359C15.5935 4.37827 15.8398 5.09736 15.8398 5.8375C15.8398 6.57764 15.5935 7.29673 15.1396 7.88141C14.6858 8.46608 14.0503 8.88308 13.3333 9.06667" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-attendance-stat-value">{stats.total.toLocaleString()}</p>
        </div>

        <div className="admin-attendance-stat-card">
          <div className="admin-attendance-stat-header">
            <p className="admin-attendance-stat-label">This Week</p>
            <div className="admin-attendance-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13.3333 5.83333H18.3333V10.8333" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.3333 5.83333L11.25 12.9167L7.08333 8.75L1.66667 14.1667" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-attendance-stat-value">{stats.thisWeek.toLocaleString()}</p>
        </div>

        <div className="admin-attendance-stat-card">
          <div className="admin-attendance-stat-header">
            <p className="admin-attendance-stat-label">Avg Per Service</p>
            <div className="admin-attendance-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6.66667 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3333 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="2.5" y="3.33333" width="15" height="13.3333" rx="1.66667" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.5 8.33333H17.5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-attendance-stat-value">{stats.avgPerService.toLocaleString()}</p>
        </div>

        <div className="admin-attendance-stat-card">
          <div className="admin-attendance-stat-header">
            <p className="admin-attendance-stat-label">Top Branch</p>
            <div className="admin-attendance-stat-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17.5 8.33333C17.5 14.1667 10 18.3333 10 18.3333C10 18.3333 2.5 14.1667 2.5 8.33333C2.5 6.34420 3.29018 4.43655 4.6967 3.03007C6.10322 1.62360 8.01088 0.833328 10 0.833328C11.9891 0.833328 13.8968 1.62360 15.3033 3.03007C16.7098 4.43655 17.5 6.34420 17.5 8.33333Z" stroke="#F54900" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 10.8333C11.3807 10.8333 12.5 9.714 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.714 8.61929 10.8333 10 10.8333Z" stroke="#F54900" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="admin-attendance-stat-value">{stats.topBranch}</p>
        </div>
      </div>

      {/* By Service and By Branch Breakdown */}
      <div className="admin-attendance-breakdown-section">
        <div className="admin-attendance-breakdown-card">
          <h2 className="admin-attendance-section-title">By Service</h2>
          {byService.map((item, i) => (
            <div key={i} className="admin-attendance-breakdown-item">
              <div className="admin-attendance-breakdown-left">
                <div className="admin-attendance-breakdown-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="2.5" y="3.33333" width="15" height="13.3333" rx="1.66667" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="admin-attendance-breakdown-label">{item.service}</span>
              </div>
              <span className="admin-attendance-breakdown-value">{item.count}</span>
            </div>
          ))}
        </div>

        <div className="admin-attendance-breakdown-card">
          <h2 className="admin-attendance-section-title">By Branch</h2>
          {byBranch.map((item, i) => (
            <div key={i} className="admin-attendance-breakdown-item">
              <div className="admin-attendance-breakdown-left">
                <div className="admin-attendance-breakdown-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M17.5 8.33333C17.5 14.1667 10 18.3333 10 18.3333C10 18.3333 2.5 14.1667 2.5 8.33333C2.5 6.34420 3.29018 4.43655 4.6967 3.03007C6.10322 1.62360 8.01088 0.833328 10 0.833328C11.9891 0.833328 13.8968 1.62360 15.3033 3.03007C16.7098 4.43655 17.5 6.34420 17.5 8.33333Z" stroke="#F54900" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 10.8333C11.3807 10.8333 12.5 9.714 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.714 8.61929 10.8333 10 10.8333Z" stroke="#F54900" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="admin-attendance-breakdown-label">{item.branch}</span>
              </div>
              <span className="admin-attendance-breakdown-value">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search Section */}
      <div className="admin-attendance-search-section">
        <div className="admin-attendance-search-container">
          <div className="admin-attendance-search-wrapper">
            <div className="admin-attendance-search-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.5 17.5L13.875 13.875" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by member name or record ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-attendance-search-input"
            />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="admin-attendance-table-section">
        <table className="admin-attendance-table">
          <thead>
            <tr className="admin-attendance-table-header">
              <th className="admin-attendance-table-header-cell">Record ID</th>
              <th className="admin-attendance-table-header-cell">Member</th>
              <th className="admin-attendance-table-header-cell">Service</th>
              <th className="admin-attendance-table-header-cell">Date</th>
              <th className="admin-attendance-table-header-cell">Time</th>
              <th className="admin-attendance-table-header-cell">Branch</th>
              <th className="admin-attendance-table-header-cell">Check-in Method</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-attendance-table-cell" style={{ textAlign: 'center', color: '#6a7282' }}>
                  Loading attendance records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-attendance-table-cell" style={{ textAlign: 'center', color: '#6a7282' }}>
                  No attendance records found
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record._id} className="admin-attendance-table-row">
                  <td className="admin-attendance-table-cell">{record.recordId}</td>
                  <td className="admin-attendance-table-cell">
                    <div className="admin-attendance-user-avatar">
                      <div className="admin-attendance-avatar">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.3333 14V12.6667C13.3333 11.9594 13.0524 11.2811 12.5523 10.781C12.0522 10.281 11.3739 10 10.6667 10H5.33333C4.62609 10 3.94781 10.281 3.44772 10.781C2.94762 11.2811 2.66667 11.9594 2.66667 12.6667V14" stroke="#155DFC" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 7.33333C9.47276 7.33333 10.6667 6.13943 10.6667 4.66667C10.6667 3.19391 9.47276 2 8 2C6.52724 2 5.33333 3.19391 5.33333 4.66667C5.33333 6.13943 6.52724 7.33333 8 7.33333Z" stroke="#155DFC" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="admin-attendance-member-name">{record.member}</span>
                    </div>
                  </td>
                  <td className="admin-attendance-table-cell">
                    <span className="admin-attendance-service">{record.service}</span>
                  </td>
                  <td className="admin-attendance-table-cell">
                    <span className="admin-attendance-date">{record.date}</span>
                  </td>
                  <td className="admin-attendance-table-cell">
                    <span className="admin-attendance-time">{record.time}</span>
                  </td>
                  <td className="admin-attendance-table-cell">
                    <span className="admin-attendance-branch">{record.branch}</span>
                  </td>
                  <td className="admin-attendance-table-cell">
                    <span className={`admin-attendance-method-badge admin-attendance-method-${record.method.toLowerCase()}`}>
                      {record.method}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
