import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import svgPaths from '../imports/svg-kfi3zq3ims';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Attendance.css';
import Sidebar from '../components/Sidebar';

export default function Attendance() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [selectedCheckInMethod, setSelectedCheckInMethod] = useState(null);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  const upcomingServices = [
    
  ];

  const attendanceHistory = [
    {
      service: 'Sunday Service',
      date: '1/19/2026',
      time: '10:00 AM',
      branch: 'Main Branch',
      method: 'QR'
    },
    {
      service: 'Midweek Service',
      date: '1/15/2026',
      time: '07:00 PM',
      branch: 'Main Branch',
      method: 'RFID'
    },
    {
      service: 'Sunday Service',
      date: '1/12/2026',
      time: '10:00 AM',
      branch: 'Main Branch',
      method: 'QR'
    },
    {
      service: 'Friday Service',
      date: '1/10/2026',
      time: '06:00 PM',
      branch: 'Main Branch',
      method: 'Manual'
    }
  ];

  return (
    <div className="home-layout">
     
     <Sidebar/>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="attendance-header">
          <h1 className="page-title">Attendance Tracking</h1>
          <p className="page-subtitle">Check in to services and view your attendance history</p>
        </div>

        {/* Stats Cards */}
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
            <p className="attendance-stat-value">0</p>
          </div>
          <div className="attendance-stat-card">
            <div className="attendance-stat-header">
              <p className="attendance-stat-label">This Month</p>
              <svg className="attendance-stat-icon" fill="none" viewBox="0 0 20 20">
                <path d="M16.6667 10L10 3.33333L3.33333 10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                <path d="M16.6667 10L10 16.6667L3.33333 10" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
            <p className="attendance-stat-value">0</p>
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
            <p className="attendance-stat-value">0%</p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="attendance-content-grid">
          {/* Check In Section */}
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

          {/* Upcoming Services */}
          <div className="upcoming-services-card">
            <h2 className="section-title">Upcoming Services</h2>
            <div className="upcoming-services-list">
              {upcomingServices.map((service, index) => (
                <div key={index} className="upcoming-service-item">
                  <div className="service-icon-box">
                    <svg className="service-icon" fill="none" viewBox="0 0 20 20">
                      <path d="M6.66667 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      <path d="M13.3333 1.66667V5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      <path d={svgPaths.p1da67b80} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      <path d="M2.5 8.33333H17.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    </svg>
                  </div>
                  <div className="service-info">
                    <h3 className="service-name">{service.name}</h3>
                    <p className="service-detail">
                      <svg className="detail-icon" fill="none" viewBox="0 0 16 16">
                        <path d="M8 14.6667A6.66667 6.66667 0 1 0 8 1.33333a6.66667 6.66667 0 0 0 0 13.3334Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        <path d="M8 4v4l2.66667 1.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      </svg>
                      {service.date} at {service.time}
                    </p>
                    <p className="service-detail">
                      <svg className="detail-icon" fill="none" viewBox="0 0 16 16">
                        <path d="M13.3333 6.66667C13.3333 11.3333 8 14.6667 8 14.6667S2.66667 11.3333 2.66667 6.66667C2.66667 5.25218 3.22857 3.89562 4.22876 2.89543C5.22896 1.89524 6.58551 1.33333 8 1.33333C9.41449 1.33333 10.771 1.89524 11.7712 2.89543C12.7714 3.89562 13.3333 5.25218 13.3333 6.66667Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                        <path d="M8 8.66667C9.10457 8.66667 10 7.77124 10 6.66667C10 5.5621 9.10457 4.66667 8 4.66667C6.89543 4.66667 6 5.5621 6 6.66667C6 7.77124 6.89543 8.66667 8 8.66667Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                      </svg>
                      {service.branch}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="attendance-history-section">
          <h2 className="section-title">Attendance History</h2>
          <div className="attendance-table-wrapper">
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
                {attendanceHistory.map((record, index) => (
                  <tr key={index}>
                    <td>{record.service}</td>
                    <td>{record.date}</td>
                    <td>{record.time}</td>
                    <td>{record.branch}</td>
                    <td>
                      <span className={`method-badge method-${record.method.toLowerCase()}`}>
                        {record.method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
