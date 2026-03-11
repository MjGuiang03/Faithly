import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import '../styles/AdminDashboard.css';
import svgPaths from "../../imports/svg-icons";

const API = process.env.REACT_APP_API_URL;

const fmt    = (n) => `₱${Number(n).toLocaleString()}`;
const fmtAgo = (date) => {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [memberStats,   setMemberStats]   = useState({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });
  const [loanStats,     setLoanStats]     = useState({ active: 0, pending: 0, totalDisbursed: 0 });
  const [donationStats, setDonationStats] = useState({ thisMonth: 0, total: 0 });
  const [attendStats,   setAttendStats]   = useState({ thisWeek: 0, avgPerService: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [allActivities,    setAllActivities]    = useState([]);
  const [showModal,        setShowModal]        = useState(false);
  const [modalPage,        setModalPage]        = useState(1);
  const MODAL_PER_PAGE = 10;
  const [loading,       setLoading]       = useState(true);

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const adminEmail = localStorage.getItem('adminEmail');
    if (!adminEmail) { navigate('/admin/login'); return; }
    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    setLoading(true);
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

      // ── Member stats ──────────────────────────────────────────
      if (membersData.success && membersData.stats) {
        const s = membersData.stats;
        setMemberStats({
          total:        s.total        || 0,
          active:       s.active       || 0,
          inactive:     s.inactive     || 0,
          newThisMonth: s.newThisMonth || 0,
        });
      }

      // ── Loan stats ────────────────────────────────────────────
      if (loansData.success && loansData.stats) {
        setLoanStats({
          active:         loansData.stats.active         || 0,
          pending:        loansData.stats.pending        || 0,
          totalDisbursed: loansData.stats.totalDisbursed || 0,
        });
      }

      // ── Donation stats ────────────────────────────────────────
      if (donationsData.success && donationsData.stats) {
        setDonationStats({
          thisMonth: donationsData.stats.thisMonth || 0,
          total:     donationsData.stats.total     || 0,
        });
      }

      // ── Attendance stats ──────────────────────────────────────
      if (attendData.success && attendData.stats) {
        setAttendStats({
          thisWeek:      attendData.stats.thisWeek      || 0,
          avgPerService: attendData.stats.avgPerService || 0,
        });
      }

      // ── Build recent activities from real data ─────────────────
      const activities = [];

      // Latest donations
      if (donationsData.success && donationsData.donations?.length) {
        donationsData.donations.slice(0, 3).forEach(d => {
          activities.push({
            id:     d._id || d.donationId,
            type:   'donation',
            title:  'Donation received',
            member: `${d.member} • ${fmt(d.amount)}`,
            date:   new Date(d.createdAt || d.date),
          });
        });
      }

      // Latest members
      if (membersData.success && membersData.members?.length) {
        membersData.members.slice(0, 3).forEach(m => {
          activities.push({
            id:     m._id,
            type:   'member',
            title:  'New member registered',
            member: m.fullName,
            date:   new Date(m.createdAt),
          });
        });
      }

      // Latest attendance
      if (attendData.success && attendData.attendance?.length) {
        attendData.attendance.slice(0, 2).forEach(a => {
          activities.push({
            id:     a._id || a.recordId,
            type:   'attendance',
            title:  'Service attendance recorded',
            member: `${a.service} • ${a.branch}`,
            date:   new Date(a.createdAt),
          });
        });
      }

      // Sort by most recent
      activities.sort((a, b) => b.date - a.date);
      const withTime = activities.map(a => ({ ...a, time: fmtAgo(a.date) }));
      setAllActivities(withTime);
      setRecentActivities(withTime.slice(0, 5));

    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const dash = (v) => loading ? '—' : v;

  return (
    <div className="admin-dashboard-main">
      {/* Header */}
      <div className="admin-dashboard-header">
        <h1 className="admin-dashboard-title">Admin Dashboard</h1>
        <p className="admin-dashboard-subtitle">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-dashboard-stats-grid">
        {/* Total Members */}
        <div className="admin-dashboard-stat-card" style={{ background: '#eff6ff' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d={svgPaths.p1d820380} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p161d4800} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p2981fe00} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p13e20900} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">+{dash(memberStats.newThisMonth)} new</div>
          </div>
          <div className="admin-dashboard-stat-label">Total Members</div>
          <div className="admin-dashboard-stat-value">{dash(memberStats.total.toLocaleString())}</div>
        </div>

        {/* Active Loans */}
        <div className="admin-dashboard-stat-card" style={{ background: '#f0fdf4' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d={svgPaths.pb47f400}  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p17a13100} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 9H8"  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 13H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">{dash(loanStats.pending)} pending</div>
          </div>
          <div className="admin-dashboard-stat-label">Active Loans</div>
          <div className="admin-dashboard-stat-value">{dash(loanStats.active)}</div>
        </div>

        {/* This Month Donations */}
        <div className="admin-dashboard-stat-card" style={{ background: '#fdf2f8' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-pink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d={svgPaths.p1dff4600} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">this month</div>
          </div>
          <div className="admin-dashboard-stat-label">This Month Donations</div>
          <div className="admin-dashboard-stat-value">{dash(fmt(donationStats.thisMonth))}</div>
        </div>

        {/* Avg. Attendance */}
        <div className="admin-dashboard-stat-card" style={{ background: '#f3f4f6' }}>
          <div className="admin-dashboard-stat-icon-row">
            <div className="admin-dashboard-stat-icon admin-bg-darkblue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M8 2V6"              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 2V6"             stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={svgPaths.p32f12c00}  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 10H21"            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="admin-dashboard-stat-badge">{dash(attendStats.thisWeek)} this week</div>
          </div>
          <div className="admin-dashboard-stat-label">Avg. Per Service</div>
          <div className="admin-dashboard-stat-value">{dash(attendStats.avgPerService.toLocaleString())}</div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="admin-dashboard-activity-section-single">
        <div className="admin-dashboard-activity-card">
          <div className="admin-dashboard-activity-header">
            <h2 className="admin-dashboard-section-title" style={{ marginBottom: 0 }}>Recent Activities</h2>
            <button className="admin-dashboard-view-all-btn" onClick={() => { setModalPage(1); setShowModal(true); }}>View All</button>
          </div>

          <div>
            {loading ? (
              <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Loading…</p>
            ) : recentActivities.length === 0 ? (
              <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>No recent activity yet.</p>
            ) : (
              recentActivities.map((activity, idx) => (
                <div key={activity.id} className={`admin-dashboard-activity-item${idx === 0 ? ' first-item' : ''}`}>
                  <div className="admin-dashboard-activity-icon-container" style={{
                    background: activity.type === 'donation' ? '#fdf2f8'
                              : activity.type === 'member'   ? '#faf5ff'
                              : '#eff6ff'
                  }}>
                    {activity.type === 'donation' && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d={svgPaths.p2f84f400} stroke="#F6339A" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {activity.type === 'member' && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d={svgPaths.p25397b80} stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={svgPaths.p2c4f400}   stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={svgPaths.p2241fff0}  stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={svgPaths.pae3c380}   stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {activity.type === 'attendance' && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M6.66667 1.66667V5"   stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13.3333 1.66667V5"   stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d={svgPaths.p1da67b80}   stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2.5 8.33333H17.5"    stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="admin-dashboard-activity-title">{activity.title}</div>
                    <div className="admin-dashboard-activity-name">{activity.member}</div>
                  </div>
                  <div className="admin-dashboard-activity-time">{activity.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* View All Modal */}
      {showModal && (
        <div className="activity-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="activity-modal" onClick={e => e.stopPropagation()}>
            <div className="activity-modal-header">
              <h2 className="activity-modal-title">All Recent Activities</h2>
              <button className="activity-modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#6a7282" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="activity-modal-body">
              {allActivities.length === 0 ? (
                <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>No activities found.</p>
              ) : (
                allActivities
                  .slice((modalPage - 1) * MODAL_PER_PAGE, modalPage * MODAL_PER_PAGE)
                  .map((activity, idx) => (
                    <div key={activity.id} className={`admin-dashboard-activity-item${idx === 0 ? ' first-item' : ''}`}>
                      <div className="admin-dashboard-activity-icon-container" style={{
                        background: activity.type === 'donation' ? '#fdf2f8'
                                  : activity.type === 'member'   ? '#faf5ff'
                                  : '#eff6ff'
                      }}>
                        {activity.type === 'donation' && (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d={svgPaths.p2f84f400} stroke="#F6339A" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {activity.type === 'member' && (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d={svgPaths.p25397b80} stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={svgPaths.p2c4f400}   stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={svgPaths.p2241fff0}  stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={svgPaths.pae3c380}   stroke="#AD46FF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {activity.type === 'attendance' && (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M6.66667 1.66667V5"   stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M13.3333 1.66667V5"   stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={svgPaths.p1da67b80}   stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2.5 8.33333H17.5"    stroke="#2B7FFF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="admin-dashboard-activity-title">{activity.title}</div>
                        <div className="admin-dashboard-activity-name">{activity.member}</div>
                      </div>
                      <div className="admin-dashboard-activity-time">{activity.time}</div>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Pagination */}
            {allActivities.length > MODAL_PER_PAGE && (
              <div className="activity-modal-pagination">
                <span className="activity-modal-page-info">
                  Showing {(modalPage - 1) * MODAL_PER_PAGE + 1}–{Math.min(modalPage * MODAL_PER_PAGE, allActivities.length)} of {allActivities.length}
                </span>
                <div className="activity-modal-page-controls">
                  <button className="activity-page-btn" onClick={() => setModalPage(p => p - 1)} disabled={modalPage === 1}>‹</button>
                  {Array.from({ length: Math.ceil(allActivities.length / MODAL_PER_PAGE) }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`activity-page-btn${p === modalPage ? ' active' : ''}`} onClick={() => setModalPage(p)}>{p}</button>
                  ))}
                  <button className="activity-page-btn" onClick={() => setModalPage(p => p + 1)} disabled={modalPage === Math.ceil(allActivities.length / MODAL_PER_PAGE)}>›</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Stats */}
      <div className="admin-dashboard-bottom-stats">
        <div className="admin-dashboard-bottom-stat-card">
          <div className="admin-dashboard-bottom-stat-header">
            <div className="admin-dashboard-bottom-stat-label">Total Loans Disbursed</div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p3e47bd00} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3610fb80} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="admin-dashboard-bottom-stat-value">{dash(fmt(loanStats.totalDisbursed))}</div>
          <div className="admin-dashboard-bottom-stat-subtext" style={{ color: '#00a63e' }}>
            {dash(loanStats.active)} active · {dash(loanStats.pending)} pending
          </div>
        </div>

        <div className="admin-dashboard-bottom-stat-card">
          <div className="admin-dashboard-bottom-stat-header">
            <div className="admin-dashboard-bottom-stat-label">Total Donations Collected</div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p17cc7980} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p3fe63d80} stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="admin-dashboard-bottom-stat-value">{dash(fmt(donationStats.total))}</div>
          <div className="admin-dashboard-bottom-stat-subtext">All time total</div>
        </div>

        <div className="admin-dashboard-bottom-stat-card">
          <div className="admin-dashboard-bottom-stat-header">
            <div className="admin-dashboard-bottom-stat-label">Member Growth</div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d={svgPaths.p25397b80} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2c4f400}  stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.p2241fff0} stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={svgPaths.pae3c380}  stroke="#155DFC" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="admin-dashboard-bottom-stat-value">+{dash(memberStats.newThisMonth)}</div>
          <div className="admin-dashboard-bottom-stat-subtext">New members this month</div>
        </div>
      </div>
    </div>
  );
}