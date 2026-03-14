import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import '../styles/AdminReports.css';
import svgPaths from "../../imports/svg-icons";

import API from '../../utils/api';

export default function AdminReports() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalMembers: 1245,
    totalMembersChange: '+150 this year',
    totalDonations: '₱3.5M',
    totalDonationsperiod: 'Jan - Jun 2026',
    avgAttendance: 495,
    avgAttendancePeriod: 'Per service',
    netBalance: '₱2.6M',
    netBalancePeriod: 'Available funds',
    totalReceived: '₱3930.0M',
    totalReceivedPeriod: 'All income sources',
    totalDisbursed: '₱1335.0M',
    totalDisbursedPeriod: 'Total expenses'
  });

  const [financialFlowData, setFinancialFlowData] = useState([
    { month: 'Jan', received: 650, released: 420 },
    { month: 'Feb', received: 590, released: 380 },
    { month: 'Mar', received: 800, released: 550 },
    { month: 'Apr', received: 810, released: 490 },
    { month: 'May', received: 560, released: 410 },
    { month: 'Jun', received: 900, released: 630 }
  ]);

  const [donationCategories, setDonationCategories] = useState([
    { name: 'Tithes', value: 1800000, color: '#155DFC' },
    { name: 'Offerings', value: 1300000, color: '#00A63E' },
    { name: 'Special Gifts', value: 800000, color: '#F59E0B' },
    { name: 'Other', value: 270000, color: '#EF4444' }
  ]);

  const [membersByBranch, setMembersByBranch] = useState([
    { branch: 'Main Branch', count: 450 },
    { branch: 'North Branch', count: 320 },
    { branch: 'South Branch', count: 280 },
    { branch: 'East Branch', count: 195 }
  ]);

  const [activeLoans, setActiveLoans] = useState([
    { branch: 'Main Branch', amount: '₱450,000', count: 45 },
    { branch: 'North Branch', amount: '₱320,000', count: 32 },
    { branch: 'South Branch', amount: '₱280,000', count: 28 },
    { branch: 'East Branch', amount: '₱195,000', count: 18 }
  ]);

  const [memberGrowthData, setMemberGrowthData] = useState([
    { month: 'Jan', totalMembers: 950, newMembers: 25, verifiedOfficers: 45 },
    { month: 'Feb', totalMembers: 980, newMembers: 30, verifiedOfficers: 48 },
    { month: 'Mar', totalMembers: 1050, newMembers: 70, verifiedOfficers: 52 },
    { month: 'Apr', totalMembers: 1120, newMembers: 70, verifiedOfficers: 55 },
    { month: 'May', totalMembers: 1180, newMembers: 60, verifiedOfficers: 58 },
    { month: 'Jun', totalMembers: 1245, newMembers: 65, verifiedOfficers: 60 }
  ]);

  const [attendanceVsDonations, setAttendanceVsDonations] = useState([
    { month: 'Jan', attendance: 850, donations: 650 },
    { month: 'Feb', attendance: 920, donations: 590 },
    { month: 'Mar', attendance: 1050, donations: 800 },
    { month: 'Apr', attendance: 880, donations: 810 },
    { month: 'May', attendance: 950, donations: 560 },
    { month: 'Jun', attendance: 1100, donations: 900 }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchReports();
  }, [navigate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // In production, fetch from API:
      // const res = await fetch(`${API}/api/admin/reports`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const data = await res.json();
      
    } catch (err) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-reports-main">
      {/* Header */}
      <div className="admin-reports-header">
        <h1 className="admin-reports-title">Analytics & Reports Dashboard</h1>
        <p className="admin-reports-subtitle">Comprehensive overview of church operations, finances, and growth</p>
      </div>

      {/* First Row Stats */}
      <div className="admin-reports-stats-grid-4">
        <div className="admin-reports-stat-card">
          <div className="admin-reports-stat-header">
            <span className="admin-reports-stat-label">Total Members</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p25397b80} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2c4f400} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2241fff0} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.pae3c380} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-reports-stat-value admin-reports-stat-value-blue">{stats.totalMembers}</p>
          <p className="admin-reports-stat-change admin-reports-stat-change-green">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d={svgPaths.p3a7e7417} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 3.5H11V6.5" stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {stats.totalMembersChange}
          </p>
        </div>

        <div className="admin-reports-stat-card">
          <div className="admin-reports-stat-header">
            <span className="admin-reports-stat-label">Total Donations</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 1.66667V18.3333" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3055a600} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-reports-stat-value admin-reports-stat-value-green">{stats.totalDonations}</p>
          <p className="admin-reports-stat-period">{stats.totalDonationsperiod}</p>
        </div>

        <div className="admin-reports-stat-card">
          <div className="admin-reports-stat-header">
            <span className="admin-reports-stat-label">Avg. Attendance</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p25397b80} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2c4f400} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2f5eb900} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-reports-stat-value admin-reports-stat-value-blue">{stats.avgAttendance}</p>
          <p className="admin-reports-stat-period">{stats.avgAttendancePeriod}</p>
        </div>

        <div className="admin-reports-stat-card">
          <div className="admin-reports-stat-header">
            <span className="admin-reports-stat-label">Net Balance</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p3c797180} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3ac0b600} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-reports-stat-value admin-reports-stat-value-blue">{stats.netBalance}</p>
          <p className="admin-reports-stat-period">{stats.netBalancePeriod}</p>
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="admin-reports-stats-grid-2">
        <div className="admin-reports-stat-card">
          <div className="admin-reports-stat-header">
            <span className="admin-reports-stat-label">Total Received</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p3c797180} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3ac0b600} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-reports-stat-value admin-reports-stat-value-green">{stats.totalReceived}</p>
          <p className="admin-reports-stat-period">{stats.totalReceivedPeriod}</p>
        </div>

        <div className="admin-reports-stat-card">
          <div className="admin-reports-stat-header">
            <span className="admin-reports-stat-label">Total Disbursed</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p145ec80} stroke="#EF4444" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p548e880} stroke="#EF4444" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="admin-reports-stat-value admin-reports-stat-value-red">{stats.totalDisbursed}</p>
          <p className="admin-reports-stat-period">{stats.totalDisbursedPeriod}</p>
        </div>
      </div>

      {/* Financial Flow Analysis */}
      <div className="admin-reports-chart-section">
        <h2 className="admin-reports-section-title">Financial Flow Analysis</h2>
        <p className="admin-reports-section-subtitle">Monthly comparison of income and loan disbursements</p>
        
        <div className="admin-reports-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={financialFlowData}>
              <defs>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A63E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00A63E" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReleased" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6A7282" fontSize={14} />
              <YAxis stroke="#6A7282" fontSize={14} />
              <Tooltip />
              <Legend 
                iconType="line"
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Area 
                type="monotone" 
                dataKey="received" 
                stroke="#00A63E" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorReceived)" 
                name="Money Received"
              />
              <Area 
                type="monotone" 
                dataKey="released" 
                stroke="#EF4444" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorReleased)" 
                name="Money Released"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donation Categories and Members by Branch */}
      <div className="admin-reports-two-col-grid">
        {/* Donation Categories */}
        <div className="admin-reports-chart-section">
          <h2 className="admin-reports-section-title">Donation Categories</h2>
          <p className="admin-reports-section-subtitle">Distribution breakdown by contribution type</p>
          
          <div className="admin-reports-chart-container" style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donationCategories}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donationCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="admin-reports-pie-legend">
              {donationCategories.map((category, index) => (
                <div key={index} className="admin-reports-pie-legend-item">
                  <div className="admin-reports-pie-legend-left">
                    <div 
                      className="admin-reports-pie-legend-color" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="admin-reports-pie-legend-label">{category.name}</span>
                  </div>
                  <span className="admin-reports-pie-legend-value">₱{(category.value / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Members by Branch */}
        <div className="admin-reports-chart-section">
          <h2 className="admin-reports-section-title">Members by Branch</h2>
          <p className="admin-reports-section-subtitle">Active member distribution across locations</p>
          
          <div className="admin-reports-chart-container" style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={membersByBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="branch" stroke="#6A7282" fontSize={12} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#6A7282" fontSize={14} />
                <Tooltip />
                <Bar dataKey="count" fill="#155DFC" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="admin-reports-branch-stats">
              {activeLoans.map((loan, index) => (
                <div key={index} className="admin-reports-branch-stat-item">
                  <div className="admin-reports-branch-stat-label">{loan.branch}</div>
                  <div className="admin-reports-branch-stat-values">
                    <span className="admin-reports-branch-stat-count">{loan.count}</span>
                    <span className="admin-reports-branch-stat-amount">{loan.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Member Growth Trends */}
      <div className="admin-reports-chart-section">
        <h2 className="admin-reports-section-title">Member Growth Trends</h2>
        <p className="admin-reports-section-subtitle">Track total members, new registrations, and verified officers</p>
        
        <div className="admin-reports-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={memberGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6A7282" fontSize={14} />
              <YAxis stroke="#6A7282" fontSize={14} />
              <Tooltip />
              <Legend 
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Line 
                type="monotone" 
                dataKey="totalMembers" 
                stroke="#155DFC" 
                strokeWidth={2}
                dot={{ fill: '#155DFC', r: 4 }}
                name="Total Members"
              />
              <Line 
                type="monotone" 
                dataKey="newMembers" 
                stroke="#00A63E" 
                strokeWidth={2}
                dot={{ fill: '#00A63E', r: 4 }}
                name="New Members"
              />
              <Line 
                type="monotone" 
                dataKey="verifiedOfficers" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B', r: 4 }}
                name="Verified Officers"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance vs Donations */}
      <div className="admin-reports-chart-section">
        <h2 className="admin-reports-section-title">Attendance vs Donations</h2>
        <p className="admin-reports-section-subtitle">Correlation between service attendance and donation amounts</p>
        
        <div className="admin-reports-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={attendanceVsDonations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6A7282" fontSize={14} />
              <YAxis stroke="#6A7282" fontSize={14} />
              <Tooltip />
              <Legend 
                iconType="square"
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Bar dataKey="attendance" fill="#00A63E" radius={[8, 8, 0, 0]} name="Attendance (P)" />
              <Bar dataKey="donations" fill="#155DFC" radius={[8, 8, 0, 0]} name="Donations (M)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
