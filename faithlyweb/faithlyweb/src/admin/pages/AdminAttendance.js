import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import '../styles/AdminAttendance.css';
import svgPaths from "../../imports/svg-icons";

const API = process.env.REACT_APP_API_URL;

/* ═══════════════════════════════════════════════════════════════════════════
   ADD SERVICE MODAL
═══════════════════════════════════════════════════════════════════════════ */
function AddServiceModal({ branch, onClose, onSave }) {
  const [form, setForm] = useState({
    serviceType: '',
    attendanceCount: '',
    date: ''
  });
  const [saving, setSaving] = useState(false);

  const serviceTypes = [
    'Sunday Service',
    'Bible Study',
    'Prayer Meeting',
    'Youth Service',
    'Midweek Service',
    'Special Event'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.serviceType) {
      toast.error('Please select a service type');
      return;
    }
    if (!form.attendanceCount || form.attendanceCount <= 0) {
      toast.error('Please enter a valid attendance count');
      return;
    }
    if (!form.date) {
      toast.error('Please select a date');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // In production, call API:
      // const res = await fetch(`${API}/api/admin/attendance/add-service`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     branch: branch,
      //     serviceType: form.serviceType,
      //     attendanceCount: parseInt(form.attendanceCount),
      //     date: form.date
      //   })
      // });
      // const data = await res.json();
      // if (!data.success) throw new Error(data.message);

      toast.success('Service added successfully');
      onSave();
    } catch (err) {
      toast.error(err.message || 'Failed to add service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-att-modal-overlay" onClick={onClose}>
      <div className="admin-att-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-att-modal-header">
          <h2 className="admin-att-modal-title">Add Service - {branch}</h2>
        </div>

        <div className="admin-att-modal-body">
          <div className="admin-att-form-row">
            <label className="admin-att-form-label">Service Type</label>
            <select
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              className="admin-att-form-select"
            >
              <option value="">Select service type</option>
              {serviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="admin-att-form-row">
            <label className="admin-att-form-label">Attendance Count</label>
            <input
              type="number"
              name="attendanceCount"
              value={form.attendanceCount}
              onChange={handleChange}
              placeholder="Enter attendance count"
              className="admin-att-form-input"
              min="0"
            />
          </div>

          <div className="admin-att-form-row">
            <label className="admin-att-form-label">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="admin-att-form-input"
            />
          </div>
        </div>

        <div className="admin-att-modal-footer">
          <button 
            className="admin-att-btn admin-att-btn-cancel" 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            className="admin-att-btn admin-att-btn-primary" 
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Adding...' : 'Add Service'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAttendance() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalToday: 2915,
    servicesThisWeek: 24,
    avgPerService: 1087
  });

  const [branches, setBranches] = useState([
    { name: 'Bulacan', services: 45, avg: 1234 },
    { name: 'Valenzuela', services: 38, avg: 892 },
    { name: 'Pangasinan', services: 52, avg: 1567 },
    { name: 'Rizal', services: 29, avg: 654 }
  ]);

  const [recentServices, setRecentServices] = useState([
    { id: 'S-001', branch: 'Bulacan', serviceType: 'Sunday Service', attendance: 1250, date: '3/7/2026' },
    { id: 'S-002', branch: 'Valenzuela', serviceType: 'Bible Study', attendance: 85, date: '3/7/2026' },
    { id: 'S-003', branch: 'Pangasinan', serviceType: 'Sunday Service', attendance: 1580, date: '3/7/2026' }
  ]);

  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchAttendance();
  }, [navigate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // In production, fetch from API:
      // const res = await fetch(`${API}/api/admin/attendance`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const data = await res.json();
      
      // For now, using mock data
      // setStats(data.stats);
      // setBranches(data.branches);
      // setRecentServices(data.recentServices);
      
    } catch (err) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = (branchName) => {
    setSelectedBranch(branchName);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setSelectedBranch(null);
  };

  const handleServiceAdded = () => {
    setShowAddModal(false);
    setSelectedBranch(null);
    fetchAttendance(); // Refresh data
  };

  return (
    <div className="admin-att-main">
      {showAddModal && (
        <AddServiceModal
          branch={selectedBranch}
          onClose={handleModalClose}
          onSave={handleServiceAdded}
        />
      )}

      {/* Header */}
      <div className="admin-att-header">
        <h1 className="admin-att-title">Attendance</h1>
        <p className="admin-att-subtitle">Track and manage service attendance across branches</p>
      </div>

      {/* Stats Cards */}
      <div className="admin-att-stats">
        <div className="admin-att-stat-card">
          <div className="admin-att-stat-header">
            <span className="admin-att-stat-label">Total Attendance Today</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p25397b80} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2c4f400} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2241fff0} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.pae3c380} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-att-stat-value">{stats.totalToday.toLocaleString()}</p>
        </div>

        <div className="admin-att-stat-card">
          <div className="admin-att-stat-header">
            <span className="admin-att-stat-label">Services This Week</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6.66667 1.66667V5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.3333 1.66667V5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="2.5" y="3.33333" width="15" height="13.3333" rx="1.66667" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 8.33333H17.5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-att-stat-value">{stats.servicesThisWeek}</p>
        </div>

        <div className="admin-att-stat-card">
          <div className="admin-att-stat-header">
            <span className="admin-att-stat-label">Average Per Service</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6.66667 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.3333 1.66667V5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="2.5" y="3.33333" width="15" height="13.3333" rx="1.66667" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 8.33333H17.5" stroke="#9810FA" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-att-stat-value">{stats.avgPerService.toLocaleString()}</p>
        </div>
      </div>

      {/* Branches Section */}
      <div className="admin-att-section">
        <h2 className="admin-att-section-title">Branches</h2>
        
        <div className="admin-att-branches-grid">
          {branches.map((branch, index) => (
            <div key={index} className="admin-att-branch-card">
              <div className="admin-att-branch-info">
                <div className="admin-att-branch-header">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d={svgPaths.p26ddc800} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={svgPaths.p35ba4680} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="admin-att-branch-name">{branch.name}</h3>
                </div>
                <p className="admin-att-branch-stats">
                  Services: {branch.services} | Avg: {branch.avg}
                </p>
              </div>
              <button 
                className="admin-att-add-service-btn"
                onClick={() => handleAddService(branch.name)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3.33333 8H12.6667" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 3.33333V12.6667" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add Service
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Services Table */}
      <div className="admin-att-table-section">
        <div className="admin-att-table-header">
          <h2 className="admin-att-section-title">Recent Services</h2>
        </div>

        <div className="admin-att-table-container">
          <table className="admin-att-table">
            <thead className="admin-att-thead">
              <tr>
                <th className="admin-att-th">Service ID</th>
                <th className="admin-att-th">Branch</th>
                <th className="admin-att-th">Service Type</th>
                <th className="admin-att-th">Attendance</th>
                <th className="admin-att-th">Date</th>
              </tr>
            </thead>
            <tbody className="admin-att-tbody">
              {loading ? (
                <tr>
                  <td colSpan={5} className="admin-att-td admin-att-empty">
                    <div className="admin-att-loading">
                      <div className="admin-att-spinner" />
                      Loading services…
                    </div>
                  </td>
                </tr>
              ) : recentServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-att-td admin-att-empty">
                    No services found
                  </td>
                </tr>
              ) : (
                recentServices.map((service) => (
                  <tr key={service.id} className="admin-att-tr">
                    <td className="admin-att-td">
                      <span className="admin-att-service-id">{service.id}</span>
                    </td>
                    <td className="admin-att-td">
                      <span className="admin-att-branch-name-cell">{service.branch}</span>
                    </td>
                    <td className="admin-att-td">
                      <span className="admin-att-service-type">{service.serviceType}</span>
                    </td>
                    <td className="admin-att-td">
                      <span className="admin-att-attendance">{service.attendance}</span>
                    </td>
                    <td className="admin-att-td">
                      <span className="admin-att-date">{service.date}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}