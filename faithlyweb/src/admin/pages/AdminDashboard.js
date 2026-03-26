import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/AdminDashboard.css';
import svgPaths from '../../imports/svg-icons';
import API from '../../utils/api';

const fmt    = (n) => `₱${Number(n).toLocaleString()}`;


const donationCategories = [
  { name: 'Tithes',        value: 1800000, color: '#155DFC' },
  { name: 'Offerings',     value: 1300000, color: '#00A63E' },
  { name: 'Special Gifts', value: 800000,  color: '#F59E0B' },
  { name: 'Other',         value: 270000,  color: '#EF4444' },
];

const memberGrowthData = [
  { month: 'Jan', totalMembers: 950,  newMembers: 25 },
  { month: 'Feb', totalMembers: 980,  newMembers: 30 },
  { month: 'Mar', totalMembers: 1050, newMembers: 70 },
  { month: 'Apr', totalMembers: 1120, newMembers: 70 },
  { month: 'May', totalMembers: 1180, newMembers: 60 },
  { month: 'Jun', totalMembers: 1245, newMembers: 65 },
];

const attendanceVsDonations = [
  { month: 'Jan', attendance: 850,  donations: 650 },
  { month: 'Feb', attendance: 920,  donations: 590 },
  { month: 'Mar', attendance: 1050, donations: 800 },
  { month: 'Apr', attendance: 880,  donations: 810 },
  { month: 'May', attendance: 950,  donations: 560 },
  { month: 'Jun', attendance: 1100, donations: 900 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [memberStats,   setMemberStats]   = useState({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });
  const [loanStats,     setLoanStats]     = useState({ active: 0, pending: 0, totalDisbursed: 0 });
  const [donationStats, setDonationStats] = useState({ thisMonth: 0, total: 0 });
  const [attendStats,   setAttendStats]   = useState({ thisWeek: 0, avgPerService: 0 });
  const [membersByBranch, setMembersByBranch] = useState([]);
  const [loading,       setLoading]       = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [membersRes, loansRes, donationsRes, attendRes] = await Promise.all([
        fetch(`${API}/api/admin/members?limit=100`,      { headers }),
        fetch(`${API}/api/admin/loans`,                  { headers }),
        fetch(`${API}/api/admin/donations`,              { headers }),
        fetch(`${API}/api/admin/attendance`,             { headers }),
      ]);

      const [membersData, loansData, donationsData, attendData] = await Promise.all([
        membersRes.json(),
        loansRes.json(),
        donationsRes.json(),
        attendRes.json(),
      ]);

      if (membersData.success && membersData.stats) {
        const s = membersData.stats;
        setMemberStats({ total: s.total || 0, active: s.active || 0, inactive: s.inactive || 0, newThisMonth: s.newThisMonth || 0 });
      }
      if (loansData.success && loansData.stats) {
        setLoanStats({ active: loansData.stats.active || 0, pending: loansData.stats.pending || 0, totalDisbursed: loansData.stats.totalDisbursed || 0 });
      }
      if (donationsData.success && donationsData.stats) {
        setDonationStats({ thisMonth: donationsData.stats.thisMonth || 0, total: donationsData.stats.total || 0 });
      }
      if (attendData.success && attendData.stats) {
        setAttendStats({ thisWeek: attendData.stats.thisWeek || 0, avgPerService: attendData.stats.avgPerService || 0 });
      }

      // Members by branch
      if (membersData.success && membersData.members) {
        const branchMap = {};
        membersData.members.forEach(m => {
          const b = m.branch || 'Unknown';
          branchMap[b] = (branchMap[b] || 0) + 1;
        });
        setMembersByBranch(Object.entries(branchMap).map(([branch, count]) => ({ branch, count })));
      }


    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/'); return; }
    fetchAll();
  }, [navigate, fetchAll]);

  const dash = (v) => loading ? '—' : v;

  return (
    <div className="admin-dashboard-main">
      {/* Header */}
      <div className="admin-dashboard-header">
        <h1 className="admin-dashboard-title">Dashboard</h1>
      </div>

      {/* ── Row 1: 4 Stat Cards ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card blue">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Members</span>
            <div className="adm-stat-icon adm-icon-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d={svgPaths.p1d820380} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p161d4800} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="adm-stat-value">{dash(memberStats.total.toLocaleString())}</div>
          <div className="adm-stat-sub">+{dash(memberStats.newThisMonth)} new this month</div>
        </div>

        <div className="adm-stat-card green">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Active Loans</span>
            <div className="adm-stat-icon adm-icon-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d={svgPaths.pb47f400}  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p17a13100} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="adm-stat-value">{dash(loanStats.active)}</div>
          <div className="adm-stat-sub">{dash(loanStats.pending)} pending</div>
        </div>

        <div className="adm-stat-card pink">
          <div className="adm-stat-top">
            <span className="adm-stat-label">This Month Donations</span>
            <div className="adm-stat-icon adm-icon-pink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d={svgPaths.p1dff4600} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="adm-stat-value">{dash(fmt(donationStats.thisMonth))}</div>
          <div className="adm-stat-sub">Total: {dash(fmt(donationStats.total))}</div>
        </div>

        <div className="adm-stat-card gray">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Avg. Per Service</span>
            <div className="adm-stat-icon adm-icon-navy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M8 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p32f12c00} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 10H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="adm-stat-value">{dash(attendStats.avgPerService.toLocaleString())}</div>
          <div className="adm-stat-sub">{dash(attendStats.thisWeek)} attended this week</div>
        </div>
      </div>

      {/* ── Row 2: Analytics Row ── */}
      <div className="adm-analytics-row">
        {/* Donation Categories Pie */}
        <div className="adm-card adm-card-pie">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Donation Categories</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={donationCategories} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                  {donationCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="adm-pie-legend">
              {donationCategories.map((cat, i) => (
                <div key={i} className="adm-pie-legend-item">
                  <div className="adm-pie-dot" style={{ background: cat.color }} />
                  <span className="adm-pie-label">{cat.name}</span>
                  <span className="adm-pie-val">₱{(cat.value / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Members by Branch Bar */}
        <div className="adm-card adm-card-bar">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Members by Branch</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={membersByBranch.length > 0 ? membersByBranch : [{ branch: 'No data', count: 0 }]} margin={{ top: 0, right: 8, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="branch" stroke="#9CA3AF" fontSize={11} angle={-15} textAnchor="end" height={50} />
              <YAxis stroke="#9CA3AF" fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#155DFC" radius={[6, 6, 0, 0]} name="Members" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vertical summary column */}
        <div className="adm-summary-col">
          <div className="adm-summary-card">
            <span className="adm-summary-label">Total Donations</span>
            <span className="adm-summary-value green">{dash(fmt(donationStats.total))}</span>
          </div>
          <div className="adm-summary-card">
            <span className="adm-summary-label">Member Growth</span>
            <span className="adm-summary-value blue">+{dash(memberStats.newThisMonth)}</span>
            <span className="adm-summary-sub">new this month</span>
          </div>
          <div className="adm-summary-card">
            <span className="adm-summary-label">Total Disbursed</span>
            <span className="adm-summary-value">{dash(fmt(loanStats.totalDisbursed))}</span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Member Growth Trends ── */}
      <div className="adm-card adm-chart-full">
        <div className="adm-card-header">
          <h3 className="adm-card-title">Member Growth Trends</h3>
          <span className="adm-card-sub">Total vs new registrations this year</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={memberGrowthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
            <Line type="monotone" dataKey="totalMembers" stroke="#155DFC" strokeWidth={2} dot={{ r: 3 }} name="Total Members" />
            <Line type="monotone" dataKey="newMembers"   stroke="#00A63E" strokeWidth={2} dot={{ r: 3 }} name="New Members" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Row 4: Attendance vs Donations ── */}
      <div className="adm-card adm-chart-full">
        <div className="adm-card-header">
          <h3 className="adm-card-title">Attendance vs Donations</h3>
          <span className="adm-card-sub">Correlation by month</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={attendanceVsDonations} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip />
            <Legend iconType="square" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
            <Bar dataKey="attendance" fill="#00A63E" radius={[6, 6, 0, 0]} name="Attendance" />
            <Bar dataKey="donations"  fill="#155DFC" radius={[6, 6, 0, 0]} name="Donations" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}