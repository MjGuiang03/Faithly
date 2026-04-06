import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

// import Sidebar from '../components/Sidebar'; // Moved to UserLayout
import VerificationModal from '../components/OfficerVerification';
import API from '../../utils/api';
import '../styles/Home.css';
import { Banknote, CalendarDays, CheckCircle, ChevronRight, Circle, Heart, MapPin, PiggyBank, User, X, XCircle } from 'lucide-react';


export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loanStats, setLoanStats] = useState({ activeCount: 0, remainingBalance: 0 });
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [rejectedLoansCount, setRejectedLoansCount] = useState(0);

  const [donationStats, setDonationStats] = useState({ totalDonated: 0 });
  const [monthlyDonationCount, setMonthlyDonationCount] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0 });
  const [monthlyAttendanceCount, setMonthlyAttendanceCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [savingsStats, setSavingsStats] = useState({ totalSavings: 0, thisMonth: 0 });
  const [savingsGoalsList, setSavingsGoalsList] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  /* User interaction modals */
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAllEvents, setShowAllEvents] = useState(false);

  /* Officer verification */
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [officerCardDismissed, setOfficerCardDismissed] = useState(
    () => localStorage.getItem('officer_card_dismissed') === 'true'
  );
  const [isDismissing, setIsDismissing] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showAskOfficerModal, setShowAskOfficerModal] = useState(false);

  const handleDismissOfficerCard = (e) => {
    e.stopPropagation();
    setIsDismissing(true);
    setTimeout(() => {
      localStorage.setItem('officer_card_dismissed', 'true');
      setOfficerCardDismissed(true);
    }, 300); // Wait for the 300ms CSS slide-out animation to finish
  };

  const token = localStorage.getItem('token');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const branch = profile?.branch || '';
      const [loansRes, donationsRes, attendanceRes, annRes, savingsRes, savingsGoalsRes] = await Promise.all([
        fetch(`${API}/api/loans/my-loans`, { headers }),
        fetch(`${API}/api/donations/my-donations`, { headers }),
        fetch(`${API}/api/attendance/my-attendance`, { headers }),
        fetch(`${API}/api/admin/announcements${branch ? `?branch=${encodeURIComponent(branch)}` : ''}`, { headers }),
        fetch(`${API}/api/savings/stats`, { headers }),
        fetch(`${API}/api/savings/goals`, { headers }),
      ]);

      const [loansData, donationsData, attendanceData, annData, savingsData, savingsGoalsData] = await Promise.all([
        loansRes.ok ? loansRes.json() : { success: false },
        donationsRes.ok ? donationsRes.json() : { success: false },
        attendanceRes.ok ? attendanceRes.json() : { success: false },
        annRes.ok ? annRes.json() : { success: false },
        savingsRes.ok ? savingsRes.json() : { success: false },
        savingsGoalsRes.ok ? savingsGoalsRes.json() : { success: false },
      ]);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      if (loansRes.ok && loansData.success) {
        setLoanStats(loansData.stats || { activeCount: 0, remainingBalance: 0 });
        const activeList = (loansData.loans || []).filter(l => l.status === 'active');
        setActiveLoansList(activeList);
        const rejected = (loansData.loans || []).filter(l => l.status === 'rejected').length;
        setRejectedLoansCount(rejected);
      }
      if (donationsRes.ok && donationsData.success) {
        setDonationStats(donationsData.stats || { totalDonated: 0 });
        const monthlyDons = (donationsData.donations || []).filter(d => {
          const dt = new Date(d.createdAt);
          return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
        });
        setMonthlyDonationCount(monthlyDons.length);
      }
      if (attendanceRes.ok && attendanceData.success) {
        setAttendanceStats(attendanceData.stats || { total: 0 });
        const monthlyAtt = (attendanceData.attendance || []).filter(a => {
          const dt = new Date(a.createdAt);
          return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
        });
        setMonthlyAttendanceCount(monthlyAtt.length);
      }

      if (savingsRes.ok && savingsData.success) {
        setSavingsStats(savingsData.stats || { totalSavings: 0, thisMonth: 0 });
      }

      if (savingsGoalsRes.ok && savingsGoalsData.success) {
        setSavingsGoalsList((savingsGoalsData.goals || []).filter(g => g.status !== 'completed'));
      }

      if (annRes.ok && annData.success) {
        const list = (annData.announcements || []).map(ann => {
          const d = ann.eventDate ? new Date(ann.eventDate) : new Date(ann.createdAt);
          const text = ann.content || ann.body || '';
          const vis = ann.visibility;
          const branches = ann.targetBranches;
          const branchLabel = (!vis || vis === 'all') ? 'All Branches'
            : (vis === 'branches' && Array.isArray(branches) && branches.length > 0)
              ? branches.join(', ')
              : vis;
          return {
            ...ann,
            day: d.getDate().toString(),
            month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            title: ann.title,
            body: text.length > 80 ? text.substring(0, 80) + '...' : text,
            fullBody: text,
            dateObj: d,
            category: ann.category || 'General',
            branch: branchLabel,
            tag: ann.category || 'General',
          };
        });
        // Sort events so latest ones appear first
        list.sort((a, b) => b.dateObj - a.dateObj);
        setAllAnnouncements(list);
        setUpcomingEvents(list.slice(0, 4));
      }

      const activities = [];

      if (loansData.success && loansData.loans?.length) {
        loansData.loans.slice(0, 5).forEach(loan => {
          activities.push({
            type: 'loan',
            title: `Loan ${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}`,
            loanId: loan.loanId,
            amount: `₱${loan.amount.toLocaleString()}`,
            date: new Date(loan.appliedDate),
            status: loan.status,
          });
        });
      }

      if (donationsData.success && donationsData.donations?.length) {
        donationsData.donations
          .filter(donation => donation.status === 'confirmed')
          .slice(0, 5)
          .forEach(donation => {
            activities.push({
              type: 'donation',
              title: 'Donation Made',
              category: donation.category,
              amount: `₱${donation.amount.toLocaleString()}`,
              date: new Date(donation.createdAt),
            });
        });
      }

      if (attendanceData.success && attendanceData.attendance?.length) {
        attendanceData.attendance.slice(0, 3).forEach(record => {
          activities.push({
            type: 'attendance',
            title: 'Service Attended',
            category: record.service || record.branch,
            amount: '',
            date: new Date(record.createdAt),
          });
        });
      }

      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 8));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, profile?.branch]);

  useEffect(() => {
    if (!token) return;
    fetchAllData();
  }, [token, fetchAllData]);

  /* Fetch officer verification status */
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/verification/status`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = await res.json();
        if (res.ok && data.success) setVerificationStatus(data.verificationStatus);
        else setVerificationStatus('unverified');
      } catch {
        setVerificationStatus('unverified');
      }
    })();
  }, []);

  const isOfficer = verificationStatus === 'verified';

  const handleVerifyModalClose = async () => {
    setShowVerifyModal(false);
    try {
      const t = localStorage.getItem('token');
      const res = await fetch(`${API}/api/verification/status`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setVerificationStatus(data.verificationStatus);
    } catch {}
  };

  const formatTimeAgo = (date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };


  const renderActivityIcon = (activity) => {
    if (activity.type === 'loan') return <Banknote size={16} />;
    if (activity.type === 'donation') return <Heart size={16} />;
    if (activity.type === 'attendance') return <CalendarDays size={16} />;
    return <CheckCircle size={16} />;
  };

  // Remove static upcomingEvents


  const quickActions = [
    {
      title: 'Make a Donation',
      description: 'Support the church today',
      className: 'user-action-btn-donate',
      action: () => navigate('/donation'),
      icon: <Heart size={20} color="#155DFC" />
    },
    {
      title: 'Check Attendance',
      description: 'View your attendance record',
      className: 'user-action-btn-attendance',
      action: () => navigate('/attendance'),
      icon: <CalendarDays size={20} color="#155DFC" />
    },
    {
      title: 'View Branches',
      description: 'Find a branch near you',
      className: 'user-action-btn-branches',
      action: () => navigate('/branches'),
      icon: <MapPin size={20} color="#155DFC" />
    },
  ];

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimePill = (date) => {
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} · ${timeStr}`;
  };

  return (
    <>
        <div className="user-home-header-container">
          <div className="user-home-header-left">
            <h1 className="user-home-page-title">Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!</h1>
          </div>

          <div className="user-home-header-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: `'Inter', sans-serif`, color: '#111827', fontSize: '22px', fontWeight: '700' }}>
              <span>{formatTimePill(currentTime)}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`user-stats-grid ${!isOfficer && officerCardDismissed ? 'user-stats-grid--half' : ''}`}>
          
          {/* Officer Prompt Card — shown for non-officers when not dismissed */}
          {!isOfficer && !officerCardDismissed && (
            <div className={`user-stat-card user-officer-prompt-card ${isDismissing ? 'user-officer-prompt-card-dismissing' : ''}`} style={{ gridColumn: 'span 2' }}>
              <button
                className="user-officer-prompt-close"
                onClick={handleDismissOfficerCard}
                title="Dismiss"
              >
                <X size={14} />
              </button>
              <div className="user-officer-prompt-body" onClick={() => setShowAskOfficerModal(true)} style={{ cursor: 'pointer' }}>
                <div className="user-stat-icon-box user-officer-prompt-icon-box">
                  <User className="user-stat-icon" size={20} color="#2563EB" />
                </div>
                <div className="user-stat-content">
                  <p className="user-stat-label" style={{ color: '#111827', fontWeight: 600 }}>Are you an officer?</p>
                  <p className="user-officer-prompt-text" style={{ color: '#4B5563' }}>Verify your officer status to unlock Savings & Loans features</p>
                  <span className="user-officer-prompt-link">Get Verified →</span>
                </div>
              </div>
            </div>
          )}

          {/* Savings — only for verified officers */}
          {isOfficer && (
          <div className="user-stat-card user-stat-purple user-stat-card-clickable" onClick={() => navigate('/savings')} style={{ cursor: 'pointer', position: 'relative' }}>
            <div className="user-stat-icon-box" style={{ background: 'rgba(21, 93, 252, 0.1)' }}>
              <PiggyBank className="user-stat-icon" size={20} color="#155DFC" />
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Total Savings</p>
              {loading ? <div className="user-skeleton" style={{ height: '24px', width: '80px', marginTop: '4px' }}></div> : <p className="user-stat-value user-fade-in">{`₱${(savingsStats.totalSavings || 0).toLocaleString()}`}</p>}
              {!loading && <p className="user-stat-subtext user-stat-subtext-green">+₱{(savingsStats.thisMonth || 0).toLocaleString()} this month</p>}
            </div>

            {/* Hover Tooltip */}
            {!loading && savingsGoalsList.length > 0 && (
              <div className="user-loan-hover-tooltip">
                <p className="user-loan-hover-title">Active Goals</p>
                {savingsGoalsList.slice(0, 3).map(goal => (
                  <div key={goal._id} className="user-loan-hover-item">
                    <span className="user-loan-hover-id">{goal.name}</span>
                    <span className="user-loan-hover-amount">₱{(goal.savedAmount || 0).toLocaleString()}</span>
                  </div>
                ))}
                {savingsGoalsList.length > 3 && (
                  <p className="user-loan-hover-more">+{savingsGoalsList.length - 3} more</p>
                )}
                <p className="user-loan-hover-cta">Click to manage goals</p>
              </div>
            )}
          </div>
          )}

          {/* Active Loans — only for verified officers */}
          {isOfficer && (
          <div className="user-stat-card user-stat-blue user-stat-card-clickable" onClick={() => navigate('/loans')} style={{ cursor: 'pointer', position: 'relative' }}>
            <div className="user-stat-icon-box" style={{ background: 'rgba(21, 93, 252, 0.1)' }}>
              <Banknote className="user-stat-icon" size={20} color="#155DFC" />
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Active Loans</p>
              {loading ? <div className="user-skeleton" style={{ height: '24px', width: '40px', marginTop: '4px' }}></div> : <p className="user-stat-value user-fade-in">{loanStats.activeCount}</p>}
              {!loading && <p className="user-stat-subtext user-stat-subtext-red">{rejectedLoansCount > 0 ? `${rejectedLoansCount} rejected` : 'No rejected'}</p>}
            </div>

            {/* Hover Tooltip */}
            {!loading && activeLoansList.length > 0 && (
              <div className="user-loan-hover-tooltip">
                <p className="user-loan-hover-title">Active Loans</p>
                {activeLoansList.slice(0, 1).map(loan => (
                  <div key={loan._id} className="user-loan-hover-item">
                    <span className="user-loan-hover-id">{loan.loanId}</span>
                    <span className="user-loan-hover-amount">₱{loan.amount.toLocaleString()}</span>
                  </div>
                ))}
                {activeLoansList.length > 1 && (
                  <p className="user-loan-hover-more">+{activeLoansList.length - 1} more</p>
                )}
                <p className="user-loan-hover-cta">Click to view details</p>
              </div>
            )}
          </div>
          )}

          {/* Total Donated */}
          <div className="user-stat-card user-stat-green user-stat-card-clickable" onClick={() => navigate('/donation')} style={{ cursor: 'pointer' }}>
            <div className="user-stat-icon-box" style={{ background: 'rgba(21, 93, 252, 0.1)' }}>
              <Heart className="user-stat-icon" size={20} color="#155DFC" />
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Total Donated</p>
              {loading ? <div className="user-skeleton" style={{ height: '24px', width: '80px', marginTop: '4px' }}></div> : <p className="user-stat-value user-fade-in">{`₱${(donationStats.totalDonated || 0).toLocaleString()}`}</p>}
              {!loading && <p className="user-stat-subtext">{monthlyDonationCount} contribution{monthlyDonationCount !== 1 ? 's' : ''} this month</p>}
            </div>
          </div>

          {/* Services Attended */}
          <div className="user-stat-card user-stat-navy user-stat-card-clickable" onClick={() => navigate('/attendance')} style={{ cursor: 'pointer' }}>
            <div className="user-stat-icon-box" style={{ background: 'rgba(21, 93, 252, 0.1)' }}>
              <CalendarDays className="user-stat-icon" size={20} color="#155DFC" />
            </div>
            <div className="user-stat-content">
              <p className="user-stat-label">Services Attended</p>
              {loading ? <div className="user-skeleton" style={{ height: '24px', width: '40px', marginTop: '4px' }}></div> : <p className="user-stat-value user-fade-in">{attendanceStats.total}</p>}
              {!loading && <p className="user-stat-subtext">{monthlyAttendanceCount} this month</p>}
            </div>
          </div>

          {/* Announcements Card Removed */}

        </div>

        {/* Dashboard Grid */}
        <div className="user-dashboard-grid">
          {/* Quick Actions */}
          <div className="user-home-card user-home-quick-actions-card">
            <h2 className="user-home-card-title">Quick Actions</h2>
            <div className="user-quick-actions-list">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`user-action-button ${action.className}`}
                >
                  <div className="user-action-icon-wrapper">
                    {action.icon}
                  </div>
                  <div className="user-action-content">
                    <h3 className="user-action-title">{action.title}</h3>
                    <p className="user-action-description">{action.description}</p>
                  </div>
                  <ChevronRight className="user-action-arrow" size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Community Section */}
          <div className="user-home-card user-home-community-card">
            <h2 className="user-home-card-title">
              Your Community
              {profile?.branch && (
                <span className="user-title-dot-wrap">
                  <span className="user-title-dot">·</span>
                  <span className="user-title-branch">{profile.branch.replace(/\s*Community\s*/gi, '')}</span>
                </span>
              )}
            </h2>

            <div className="user-community-map-container">
              <iframe
                title="Community Map"
                width="100%"
                style={{ border: 0, flex: 1 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(profile?.branch || 'Meycauayan City, Bulacan')},Philippines&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              ></iframe>
            </div>

            <div className="user-community-content">
              <p className="user-community-text">Stay updated with your local branch and upcoming events in your area.</p>
              <button className="user-community-action-btn" onClick={() => navigate('/branches')}>
                Explore Branches
              </button>
            </div>
          </div>

          <div className="user-home-card user-home-events-card">
            <div className="user-events-header">
              <h2 className="user-home-card-title" style={{ margin: 0 }}>Upcoming Events</h2>
              <button className="user-events-see-all" onClick={() => setShowAllEvents(true)}>See all</button>
            </div>
            <div className="user-events-list">
              {upcomingEvents.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9CA3AF', padding: '20px 0' }}>No upcoming events yet.</p>
              ) : upcomingEvents.map((evt, i) => {
                const catColors = {
                  Events: { bg: '#FFF7ED', color: '#C2410C' },
                  General: { bg: '#EFF6FF', color: '#1E40AF' },
                  Prayer: { bg: '#F5F3FF', color: '#6D28D9' },
                  Services: { bg: '#F0FDF4', color: '#15803D' },
                  Donations: { bg: '#FDF2F8', color: '#9D174D' },
                  Urgent: { bg: '#FFF1F2', color: '#BE123C' },
                };
                const c = catColors[evt.category] || catColors.General;
                return (
                  <div key={i} className="user-event-row user-clickable" onClick={() => setSelectedEvent(evt)}>
                    <div className="user-event-accent-bar" style={{ background: c.color }} />
                    <div className="user-event-date-block" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span className="user-event-day">{evt.day}</span>
                      <span className="user-event-month">{evt.month}</span>
                    </div>
                    <div className="user-event-info">
                      <div className="user-event-title-row">
                        <span className="user-event-title">{evt.title}</span>
                        <span className="user-event-tag" style={{ color: c.color, background: c.bg }}>{evt.category}</span>
                      </div>
                      <span className="user-event-time">{evt.body}</span>
                      <div className="user-event-meta-row">
                        <span className="user-event-branch">
                          <MapPin size={12} />
                          {evt.branch}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity — horizontal scroll feed */}
        <div className="user-home-card user-home-full-width-section" style={{ marginBottom: '16px', overflow: 'hidden' }}>
          <h2 className="user-home-card-title" style={{ marginBottom: '12px' }}>Recent Activity</h2>
          {loading ? (
            <div className="user-activity-hscroll">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="user-activity-hcard">
                  <div className="user-skeleton user-skeleton-circle" style={{ width: '32px', height: '32px' }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="user-skeleton user-skeleton-text" style={{ height: '12px', width: '70%', marginBottom: '6px' }}></div>
                    <div className="user-skeleton user-skeleton-text" style={{ height: '11px', width: '50%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="user-home-empty-text">No recent activity yet.</p>
          ) : (
            <div className="user-activity-hscroll user-fade-in">
              {recentActivity.map((activity, index) => (
                <div key={index} className={`user-activity-hcard user-activity-hcard-${activity.type}`}>
                  <div className="user-activity-hcard-header">
                    <div className={`user-activity-hcard-icon user-activity-hcard-icon-${activity.status || activity.type}`}>
                      {renderActivityIcon(activity)}
                    </div>
                    <span className="user-activity-hcard-title">{activity.title}</span>
                  </div>
                  <div className="user-activity-hcard-body">
                    <span className="user-activity-hcard-sub">{activity.loanId || activity.category || ''}</span>
                    {activity.amount && <span className="user-activity-hcard-amount">{activity.amount}</span>}
                  </div>
                  <span className="user-activity-hcard-time">{formatTimeAgo(activity.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* "Are you an officer?" Confirmation Modal */}
      {showAskOfficerModal && (
        <div className="user-logout-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="user-logout-modal-content" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Circle size={24} color="#2563eb" />
            </div>
            <h2 className="user-logout-modal-title" style={{ marginBottom: 8 }}>Are you an officer?</h2>
            <p className="user-logout-modal-message" style={{ marginBottom: 20 }}>
              Officer verification unlocks access to Savings &amp; Loans features. Only verified church officers may proceed.
            </p>
            <div className="user-logout-modal-actions">
              <button className="user-logout-modal-cancel" onClick={() => setShowAskOfficerModal(false)} style={{ whiteSpace: 'nowrap' }}>No, I'm a member</button>
              <button className="user-logout-modal-confirm" onClick={() => { setShowAskOfficerModal(false); setShowVerifyModal(true); }} style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>Yes, verify me</button>
            </div>
          </div>
        </div>
      )}

      {/* Officer Verification Modal */}
      <VerificationModal isOpen={showVerifyModal} onClose={handleVerifyModalClose} />

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (
        <div className="user-event-detail-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="user-event-detail-content" onClick={e => e.stopPropagation()}>
            <div className="user-event-detail-header">
              <span className="user-event-detail-tag">{selectedEvent.category}</span>
              <button className="user-event-close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <h2 className="user-event-detail-title">{selectedEvent.title}</h2>
            <div className="user-event-detail-meta">
              <div className="user-event-meta-item">
                <CalendarDays size={16} />
                {selectedEvent.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="user-event-meta-item">
                <CalendarDays size={16} />
                {selectedEvent.branch}
              </div>
            </div>
            {/* Admin-uploaded event image */}
            {selectedEvent.image && (
              <div style={{ borderRadius: '10px', overflow: 'hidden', margin: '12px 0', maxHeight: '280px' }}>
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
            <div className="user-event-detail-body">
              <p>{selectedEvent.fullBody}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── All Events Modal ── */}
      {showAllEvents && (
        <div className="user-event-all-overlay" onClick={() => setShowAllEvents(false)}>
          <div className="user-event-all-content" onClick={e => e.stopPropagation()}>
            <div className="user-event-all-header">
              <h2 className="user-event-all-title">All Upcoming Events</h2>
              <button className="user-event-close-btn" onClick={() => setShowAllEvents(false)}>×</button>
            </div>
            <div className="user-event-all-list">
              {allAnnouncements.length === 0 ? (
                <p className="user-event-empty-msg">No upcoming events are currently scheduled.</p>
              ) : (
                allAnnouncements.map((evt, i) => {
                  const catColors = {
                    Events: { bg: '#FFF7ED', color: '#C2410C' },
                    General: { bg: '#EFF6FF', color: '#1E40AF' },
                    Prayer: { bg: '#F5F3FF', color: '#6D28D9' },
                    Services: { bg: '#F0FDF4', color: '#15803D' },
                    Donations: { bg: '#FDF2F8', color: '#9D174D' },
                    Urgent: { bg: '#FFF1F2', color: '#BE123C' },
                  };
                  const c = catColors[evt.category] || catColors.General;
                  return (
                    <div key={i} className="user-event-row user-clickable" onClick={() => { setShowAllEvents(false); setSelectedEvent(evt); }}>
                      <div className="user-event-accent-bar" style={{ background: c.color }} />
                      <div className="user-event-date-block" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="user-event-day">{evt.day}</span>
                        <span className="user-event-month">{evt.month}</span>
                      </div>
                      <div className="user-event-info">
                        <div className="user-event-title-row">
                          <span className="user-event-title">{evt.title}</span>
                          <span className="user-event-tag" style={{ color: c.color, background: c.bg }}>{evt.category}</span>
                        </div>
                        <span className="user-event-time">{evt.body}</span>
                        <div className="user-event-meta-row">
                          <span className="user-event-branch">
                            <MapPin size={12} />
                            {evt.branch}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}