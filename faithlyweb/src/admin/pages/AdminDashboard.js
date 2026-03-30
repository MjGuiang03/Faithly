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



const INITIAL_DONATION_CATEGORIES = [
  { name: 'General Fund',      value: 0, color: '#155DFC' },
  { name: 'Children Ministry', value: 0, color: '#00A63E' },
  { name: 'Building Fund',     value: 0, color: '#F59E0B' },
  { name: 'Youth Ministry',    value: 0, color: '#E60076' },
  { name: 'Mission Fund',      value: 0, color: '#8B5CF6' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [memberStats,   setMemberStats]   = useState({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });
  const [loanStats,     setLoanStats]     = useState({ active: 0, pending: 0, totalDisbursed: 0 });
  const [donationStats, setDonationStats] = useState({ thisMonth: 0, total: 0 });

  const [membersByBranch, setMembersByBranch] = useState([]);
  const [pieData, setPieData] = useState(INITIAL_DONATION_CATEGORIES);
  const [growthData, setGrowthData] = useState([]);
  const [attendVsDonData, setAttendVsDonData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [membersRes, loansRes, donationsRes, attendRes] = await Promise.all([
        fetch(`${API}/api/admin/members?limit=1000`,      { headers }),
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

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // --- 1. Recalculate Member Stats (Active/Verified Only) ---
      if (membersData.success && membersData.members) {
        const activeMembers = membersData.members.filter(m => {
          const s = (m.status || '').toLowerCase();
          return s === 'active' || s === 'verified';
        });

        let newThisMonthCount = 0;
        activeMembers.forEach(m => {
          const d = new Date(m.createdAt);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            newThisMonthCount++;
          }
        });

        setMemberStats({
          total: activeMembers.length,
          active: activeMembers.length, // approximation or based on status
          inactive: membersData.members.length - activeMembers.length,
          newThisMonth: newThisMonthCount
        });
      }

      if (loansData.success && loansData.stats) {
        setLoanStats({ active: loansData.stats.active || 0, pending: loansData.stats.pending || 0, totalDisbursed: loansData.stats.totalDisbursed || 0 });
      }

      // --- 2. Recalculate Donation Stats (Confirmed Only) ---
      if (donationsData.success && donationsData.donations) {
        const confirmedDonations = donationsData.donations.filter(d => (d.status || '').toLowerCase() === 'confirmed');
        
        let thisMonthAmount = 0;
        let totalAmount = 0;
        confirmedDonations.forEach(d => {
          const amt = Number(d.amount) || 0;
          totalAmount += amt;
          const date = new Date(d.createdAt || d.date);
          if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
            thisMonthAmount += amt;
          }
        });

        setDonationStats({
          thisMonth: thisMonthAmount,
          total: totalAmount
        });
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

      // ── Process Donation Categories (Pie Chart) ──
      if (donationsData.success && donationsData.donations) {
        const catTotals = {
          'General Fund': 0, 'Children Ministry': 0, 'Building Fund': 0, 'Youth Ministry': 0, 'Mission Fund': 0
        };
        const confirmedDonations = donationsData.donations.filter(d => (d.status || '').toLowerCase() === 'confirmed');
        confirmedDonations.forEach(d => {
          const amt = Number(d.amount) || 0;
          const cat = d.category || 'General Fund';
          if (catTotals[cat] !== undefined) {
            catTotals[cat] += amt;
          } else {
            catTotals['General Fund'] += amt; // fallback
          }
        });
        
        setPieData(INITIAL_DONATION_CATEGORIES.map(cat => ({
          ...cat,
          value: catTotals[cat.name]
        })));
      }

      // ── Process Time Series Data (Jan-Dec current year) ──
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      // currentYear is already defined above
      const allMonths = monthNames.map((m, i) => ({
        monthStr: m,
        year: currentYear,
        monthIndex: i
      }));

      // 1. Member Growth
      if (membersData.success && membersData.members) {
        const growth = allMonths.map(m => ({ month: m.monthStr, totalMembers: 0, newMembers: 0 }));
        let runningTotal = 0;
        
        // count members that successfully registered (active or verified)
        const validMembers = membersData.members.filter(m => {
          const s = (m.status || '').toLowerCase();
          return s === 'active' || s === 'verified';
        });

        // sort members by date ascending
        const sortedMembers = validMembers.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        // Count base total before Jan 1 of the current year
        const windowStartDate = new Date(currentYear, 0, 1);
        sortedMembers.forEach(m => {
          const date = new Date(m.createdAt);
          if (date < windowStartDate) runningTotal++;
        });

        growth.forEach(g => {
          let newThisMonth = 0;
          sortedMembers.forEach(m => {
            const date = new Date(m.createdAt);
            if (date.getFullYear() === g.year && date.getMonth() === g.monthIndex) {
              newThisMonth++;
            }
          });
          runningTotal += newThisMonth;
          g.totalMembers = runningTotal;
          g.newMembers = newThisMonth;
        });
        setGrowthData(growth);
      }

      // 2. Attendance vs Donations
      const attendDonData = allMonths.map(m => ({ month: m.monthStr, attendance: 0, donations: 0, year: m.year, monthIndex: m.monthIndex }));
      
      if (attendData.success && attendData.attendance) {
        attendData.attendance.forEach(a => {
          const d = new Date(a.date || a.createdAt);
          const match = attendDonData.find(m => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
          if (match) match.attendance += (Number(a.adultsCount) || 0) + (Number(a.kidsCount) || 0);
        });
      }
      
      if (donationsData.success && donationsData.donations) {
        const confirmedDonations = donationsData.donations.filter(d => (d.status || '').toLowerCase() === 'confirmed');
        confirmedDonations.forEach(d => {
          const date = new Date(d.createdAt || d.date);
          const match = attendDonData.find(m => m.year === date.getFullYear() && m.monthIndex === date.getMonth());
          if (match) match.donations += Number(d.amount) || 0;
        });
      }
      setAttendVsDonData(attendDonData);

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
          <div className="adm-stat-sub"><span style={{ color: '#00A63E', fontWeight: 600 }}>+{dash(memberStats.newThisMonth)} new</span> this month</div>
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
          <div className="adm-stat-sub"><span style={{ color: '#D97706', fontWeight: 600 }}>{dash(loanStats.pending)} pending</span></div>
        </div>

        <div className="adm-stat-card orange">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Total Donations</span>
            <div className="adm-stat-icon adm-icon-orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="adm-stat-value">{loading ? '—' : `₱${(donationStats.total || 0).toLocaleString()}`}</div>
          <div className="adm-stat-sub"><span style={{ color: '#00A63E', fontWeight: 600 }}>+₱{loading ? '—' : (donationStats.thisMonth || 0).toLocaleString()}</span> this month</div>
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
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₱${(value || 0).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="adm-pie-legend">
              {pieData.map((cat, i) => (
                <div key={i} className="adm-pie-legend-item">
                  <div className="adm-pie-dot" style={{ background: cat.color }} />
                  <span className="adm-pie-label">{cat.name}</span>
                  <span className="adm-pie-val">₱{cat.value >= 1000 ? (cat.value / 1000).toFixed(0) + 'k' : cat.value}</span>
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
              <Bar dataKey="count" fill="#155DFC" radius={[6, 6, 0, 0]} name="Members" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Member Growth Trends ── */}
      <div className="adm-card adm-chart-full">
        <div className="adm-card-header">
          <h3 className="adm-card-title">Member Growth Trends</h3>
          <span className="adm-card-sub">Total vs new registrations this year</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={growthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
          <BarChart data={attendVsDonData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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