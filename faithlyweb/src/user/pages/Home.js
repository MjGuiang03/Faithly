import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

import API from '../../utils/api';
import '../styles/Home.css';
import { Banknote, CalendarDays, CheckCircle, ChevronRight, Heart, MapPin, PiggyBank, Wallet, FileText, Megaphone, ArrowRight } from 'lucide-react';
import { isOfficerPosition } from '../../utils/officerPositions';


export default function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();

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
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

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
          const timeLabel = ann.eventDate ? new Date(ann.eventDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
          return {
            ...ann,
            day: d.getDate().toString(),
            month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            title: ann.title,
            body: text.length > 80 ? text.substring(0, 80) + '...' : text,
            fullBody: text,
            dateObj: d,
            time: timeLabel,
            category: ann.category || 'General',
            branch: branchLabel,
            tag: ann.category || 'General',
          };
        });
        list.sort((a, b) => b.dateObj - a.dateObj);
        setAllAnnouncements(list);
        setUpcomingEvents(list.slice(0, 4));
      }

      const activities = [];

      if (loansData.success && loansData.loans?.length) {
        const STATUS_TEXT = {
          pending:    'Pending review',
          approved:   'Approved',
          active:     'Active',
          completed:  'Completed',
          rejected:   'Rejected',
          overdue:    'Overdue',
          awaiting_member_approval: 'Review requested',
        };

        loansData.loans.slice(0, 5).forEach(loan => {
          activities.push({
            type: 'loan',
            title: `Loan ${STATUS_TEXT[loan.status] || loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}`,
            loanId: loan.loanId,
            amount: `₱${Number(loan.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
              amount: `₱${Number(donation.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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

  // Auto-swipe for Events Carousel
  useEffect(() => {
    if (upcomingEvents.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentEventIndex(prev => (prev + 1) % upcomingEvents.length);
    }, 5000 * (1 + currentEventIndex / 10)); // Slight variation to feel more natural
    return () => clearInterval(timer);
  }, [upcomingEvents.length, currentEventIndex]);

  const isOfficer = isOfficerPosition(profile?.position);

  const renderActivityIcon = (activity) => {
    if (activity.type === 'loan') return <Banknote size={16} />;
    if (activity.type === 'donation') return <Heart size={16} />;
    if (activity.type === 'attendance') return <CalendarDays size={16} />;
    return <CheckCircle size={16} />;
  };

  const formatTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const quickActions = [
    {
      title: 'Make a Donation',
      description: 'Support the church today',
      className: 'uh-action--donate',
      action: () => navigate('/donation'),
      icon: <Heart size={18} />
    },
    {
      title: 'Check Attendance',
      description: 'View your attendance record',
      className: 'uh-action--attendance',
      action: () => navigate('/attendance'),
      icon: <CalendarDays size={18} />
    },
    ...(isOfficer ? [
      {
        title: 'Manage Savings',
        description: 'View and save for your goals',
        className: 'uh-action--savings',
        action: () => navigate('/savings'),
        icon: <Wallet size={18} />
      },
      {
        title: 'Loan Services',
        description: 'See history and apply for loans',
        className: 'uh-action--loans',
        action: () => navigate('/loans'),
        icon: <FileText size={18} />
      }
    ] : [])
  ];

  const formatCurrency = (val) =>
    `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="user-home-content-wrapper">

        {/* Stats */}
        <div className="uh-stats-grid">

          {isOfficer && (
          <div className="uh-stat-card uh-stat-card--savings uh-stat-card--clickable" onClick={() => navigate('/savings')}>
            <div className="uh-stat-card__bar" />
            <div className="uh-stat-card__body">
              <div className="uh-stat-icon-box">
                <PiggyBank size={20} />
              </div>
              <div className="uh-stat-text">
                <span className="uh-stat-label">Total Savings</span>
                {loading
                  ? <div className="user-skeleton uh-stat-skel" />
                  : <span className="uh-stat-value user-fade-in">{formatCurrency(savingsStats.totalSavings)}</span>
                }
                {!loading && (
                  <span className="uh-stat-sub uh-stat-sub--positive">+{formatCurrency(savingsStats.thisMonth)} this month</span>
                )}
              </div>
            </div>
            {/* Hover tooltip */}
            {!loading && savingsGoalsList.length > 0 && (
              <div className="uh-tooltip">
                <p className="uh-tooltip__title">Active Goals</p>
                {savingsGoalsList.slice(0, 3).map(goal => (
                  <div key={goal._id} className="uh-tooltip__row">
                    <span className="uh-tooltip__label">{goal.name}</span>
                    <span className="uh-tooltip__value">{formatCurrency(goal.savedAmount)}</span>
                  </div>
                ))}
                {savingsGoalsList.length > 3 && (
                  <p className="uh-tooltip__more">+{savingsGoalsList.length - 3} more</p>
                )}
                <p className="uh-tooltip__cta">Click to manage goals</p>
              </div>
            )}
          </div>
          )}

          {isOfficer && (
          <div className="uh-stat-card uh-stat-card--loans uh-stat-card--clickable" onClick={() => navigate('/loans')}>
            <div className="uh-stat-card__bar" />
            <div className="uh-stat-card__body">
              <div className="uh-stat-icon-box">
                <Banknote size={20} />
              </div>
              <div className="uh-stat-text">
                <span className="uh-stat-label">Active Loans</span>
                {loading
                  ? <div className="user-skeleton uh-stat-skel" />
                  : <span className="uh-stat-value user-fade-in">{loanStats.activeCount}</span>
                }
                {!loading && (
                  <span className={`uh-stat-sub ${rejectedLoansCount > 0 ? 'uh-stat-sub--negative' : ''}`}>
                    {rejectedLoansCount > 0 ? `${rejectedLoansCount} rejected` : 'No rejected'}
                  </span>
                )}
              </div>
            </div>
            {!loading && activeLoansList.length > 0 && (
              <div className="uh-tooltip">
                <p className="uh-tooltip__title">Active Loans</p>
                {activeLoansList.slice(0, 1).map(loan => (
                  <div key={loan._id} className="uh-tooltip__row">
                    <span className="uh-tooltip__label">{loan.loanId}</span>
                    <span className="uh-tooltip__value">{formatCurrency(loan.amount)}</span>
                  </div>
                ))}
                {activeLoansList.length > 1 && (
                  <p className="uh-tooltip__more">+{activeLoansList.length - 1} more</p>
                )}
                <p className="uh-tooltip__cta">Click to view details</p>
              </div>
            )}
          </div>
          )}

          <div className="uh-stat-card uh-stat-card--donations uh-stat-card--clickable" onClick={() => navigate('/donation')}>
            <div className="uh-stat-card__bar" />
            <div className="uh-stat-card__body">
              <div className="uh-stat-icon-box">
                <Heart size={20} />
              </div>
              <div className="uh-stat-text">
                <span className="uh-stat-label">Total Donated</span>
                {loading
                  ? <div className="user-skeleton uh-stat-skel" />
                  : <span className="uh-stat-value user-fade-in">{formatCurrency(donationStats.totalDonated)}</span>
                }
                {!loading && (
                  <span className="uh-stat-sub">{monthlyDonationCount} contribution{monthlyDonationCount !== 1 ? 's' : ''} this month</span>
                )}
              </div>
            </div>
          </div>

          <div className="uh-stat-card uh-stat-card--attendance uh-stat-card--clickable" onClick={() => navigate('/attendance')}>
            <div className="uh-stat-card__bar" />
            <div className="uh-stat-card__body">
              <div className="uh-stat-icon-box">
                <CalendarDays size={20} />
              </div>
              <div className="uh-stat-text">
                <span className="uh-stat-label">Services Attended</span>
                {loading
                  ? <div className="user-skeleton uh-stat-skel" />
                  : <span className="uh-stat-value user-fade-in">{attendanceStats.total}</span>
                }
                {!loading && (
                  <span className="uh-stat-sub">{monthlyAttendanceCount} this month</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Main grid */}
        <div className="uh-grid-main">

          {/* Quick Actions */}
          <div className="uh-card">
            <h2 className="uh-card__heading">Quick Actions</h2>
            <div className="uh-actions">
              {quickActions.map((action, i) => (
                <button key={i} onClick={action.action} className={`uh-action ${action.className}`}>
                  <div className="uh-action__icon">{action.icon}</div>
                  <div className="uh-action__text">
                    <span className="uh-action__title">{action.title}</span>
                    <span className="uh-action__desc">{action.description}</span>
                  </div>
                  <ChevronRight size={16} className="uh-action__arrow" />
                </button>
              ))}
            </div>
          </div>

          {/* Prayer Wall */}
          <div className="uh-card uh-card--prayer">
            <div className="uh-card__header-row">
              <h2 className="uh-card__heading">Prayer Wall</h2>
              <span className="uh-badge">Community</span>
            </div>
            <div className="uh-prayer-list">
              <div className="uh-prayer-item">
                <div className="uh-prayer-item__bar" />
                <div className="uh-prayer-item__body">
                  <p className="uh-prayer-item__text">"Please pray for my mother's fast recovery from her illness."</p>
                  <div className="uh-prayer-item__meta">
                    <span className="uh-prayer-item__author">Maria S.</span>
                    <span className="uh-prayer-item__time">2h ago</span>
                  </div>
                </div>
              </div>
              <div className="uh-prayer-item">
                <div className="uh-prayer-item__bar" />
                <div className="uh-prayer-item__body">
                  <p className="uh-prayer-item__text">"Praying for guidance and peace of mind on my upcoming board exams."</p>
                  <div className="uh-prayer-item__meta">
                    <span className="uh-prayer-item__author">John D.</span>
                    <span className="uh-prayer-item__time">5h ago</span>
                  </div>
                </div>
              </div>
              <div className="uh-prayer-item">
                <div className="uh-prayer-item__bar" />
                <div className="uh-prayer-item__body">
                  <p className="uh-prayer-item__text">"Lord, bless our community with unity and love."</p>
                  <div className="uh-prayer-item__meta">
                    <span className="uh-prayer-item__author">Sarah L.</span>
                    <span className="uh-prayer-item__time">1d ago</span>
                  </div>
                </div>
              </div>
            </div>
            <button className="uh-cta" onClick={() => navigate('/prayer-wall')}>
              <span>View Prayer Wall</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Events Carousel */}
          <div className="uh-card uh-card--events">
            <div className="uh-card__header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="uh-card__heading">Church Events</h2>
                {upcomingEvents.length > 0 && (
                  <span className="uh-events-count-badge">{upcomingEvents.length}</span>
                )}
              </div>
              <button className="uh-text-btn" onClick={() => setShowAllEvents(true)}>
                <span>See all</span>
                <ArrowRight size={12} style={{ marginLeft: '4px' }} />
              </button>
            </div>

            <div className="uh-carousel-viewport">
              {upcomingEvents.length === 0 ? (
                <div className="uh-empty">
                  <CalendarDays size={28} strokeWidth={1.5} />
                  <p>No upcoming events yet.</p>
                </div>
              ) : (
                <div
                  className="uh-carousel-track"
                  style={{ transform: `translateX(-${currentEventIndex * 100}%)` }}
                >
                  {upcomingEvents.map((evt, i) => {
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
                      <div
                        key={i}
                        className="uh-carousel-slide"
                        onClick={() => setSelectedEvent(evt)}
                      >
                        <div className="uh-event-hero" style={{ background: c.bg }}>
                          <div className="uh-event-hero__badge" style={{ color: c.color, background: 'white' }}>{evt.category}</div>
                          <div className="uh-event-hero__date">
                            <span className="uh-event-hero__day">{evt.day}</span>
                            <span className="uh-event-hero__month">{evt.month}</span>
                          </div>
                          <h3 className="uh-event-hero__title">{evt.title}</h3>
                          <p className="uh-event-hero__body">{evt.body}</p>
                          <div className="uh-event-hero__footer">
                            <MapPin size={12} />
                            <span>{evt.branch.split(',')[0]}</span>
                            <span className="uh-dot-sep">·</span>
                            <span>{evt.time || 'All Day'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="uh-carousel-dots">
              {upcomingEvents.map((_, i) => (
                <button
                  key={i}
                  className={`uh-carousel-dot ${i === currentEventIndex ? 'uh-carousel-dot--active' : ''}`}
                  onClick={() => setCurrentEventIndex(i)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="uh-grid-bottom">

          {/* Activity */}
          <div className="uh-card uh-card--activity">
            <div className="uh-card__header-row">
              <h2 className="uh-card__heading">Recent Activity</h2>
              {!loading && <span className="uh-badge">{recentActivity.length}</span>}
            </div>
            {loading ? (
              <div className="uh-activity-scroll">
                {[1,2,3,4].map(i => (
                  <div key={i} className="uh-activity-card uh-activity-card--skel">
                    <div className="user-skeleton" style={{ width: 30, height: 30, borderRadius: 8 }} />
                    <div style={{ flex: 1 }}>
                      <div className="user-skeleton" style={{ height: 12, width: '70%', marginBottom: 6, borderRadius: 4 }} />
                      <div className="user-skeleton" style={{ height: 10, width: '50%', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="uh-empty">
                <CalendarDays size={28} strokeWidth={1.5} />
                <p>No recent activity yet.</p>
              </div>
            ) : (
              <div className="uh-activity-scroll user-fade-in">
                {recentActivity.map((activity, index) => (
                  <div key={index} className={`uh-activity-card uh-activity-card--${activity.type}`}>
                    <div className={`uh-activity-card__icon uh-activity-card__icon--${activity.status || activity.type}`}>
                      {renderActivityIcon(activity)}
                    </div>
                    <div className="uh-activity-card__content">
                      <span className="uh-activity-card__title">{activity.title}</span>
                      <span className="uh-activity-card__sub">{activity.loanId || activity.category || ''}</span>
                      {activity.amount && <span className="uh-activity-card__amount">{activity.amount}</span>}
                    </div>
                    <span className="uh-activity-card__time">{formatTimeAgo(activity.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community */}
          <div className="uh-card uh-card--community">
            <h2 className="uh-card__heading">
              Your Community
              {profile?.branch && (
                <span className="uh-heading-sub"> · {profile.branch.replace(/\s*Community\s*/gi, '')}</span>
              )}
            </h2>
            <div className="uh-map-wrap">
              <iframe
                title="Community Map"
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(profile?.branch || 'Meycauayan City, Bulacan')},Philippines&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
            <p className="uh-community-text">Stay updated with your local branch and upcoming events in your area.</p>
            <button className="uh-cta" onClick={() => navigate('/branches')}>
              <span>Explore Branches</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="uh-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="uh-modal uh-modal--detail" onClick={e => e.stopPropagation()}>
            <button className="uh-modal__close" onClick={() => setSelectedEvent(null)}>×</button>

            <div className={`ann-card ann-card-modal ann-card-${selectedEvent.template || 'banner'}`}>
              {(selectedEvent.template === 'banner' || !selectedEvent.template) && (
                <div className="ann-banner">
                  {selectedEvent.images && selectedEvent.images.length > 0 ? (
                    <div className="ann-slider">
                      {selectedEvent.images.map((img, i) => (
                        <img key={i} src={img} alt="" onClick={() => window.open(img, '_blank')} title="Click to view full image" />
                      ))}
                    </div>
                  ) : selectedEvent.image ? (
                    <img src={selectedEvent.image} alt="" onClick={() => window.open(selectedEvent.image, '_blank')} title="Click to view full image" />
                  ) : (
                    <div className="ann-banner-placeholder"><Megaphone size={32} color="#1E3A8A" /></div>
                  )}
                  {selectedEvent.images?.length > 1 && (
                    <div className="ann-slider-count">{selectedEvent.images.length} photos</div>
                  )}
                </div>
              )}

              {selectedEvent.template === 'side' && (
                <div className="ann-side-img">
                  {selectedEvent.images && selectedEvent.images.length > 0 ? (
                    <div className="ann-slider">
                      {selectedEvent.images.map((img, i) => (
                        <img key={i} src={img} alt="" onClick={() => window.open(img, '_blank')} title="Click to view full image" />
                      ))}
                    </div>
                  ) : selectedEvent.image ? (
                    <img src={selectedEvent.image} alt="" onClick={() => window.open(selectedEvent.image, '_blank')} title="Click to view full image" />
                  ) : (
                    <div className="ann-banner-placeholder"><Megaphone size={24} color="#1E3A8A" /></div>
                  )}
                </div>
              )}

              <div className="ann-body ann-body-modal">
                <div className="ann-header-row">
                  <span className="ann-cat">{selectedEvent.category}</span>
                </div>
                <h2 className="ann-title ann-title-modal">{selectedEvent.title}</h2>
                <div className="ann-msg ann-msg-modal">{selectedEvent.fullBody}</div>
                <div className="ann-meta ann-meta-modal">
                  <span><CalendarDays size={14} /> {selectedEvent.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{selectedEvent.time && ` at ${selectedEvent.time}`}</span>
                  <span><MapPin size={14} /> {selectedEvent.branch}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Events Modal */}
      {showAllEvents && (
        <div className="uh-overlay" onClick={() => setShowAllEvents(false)}>
          <div className="uh-modal uh-modal--list" onClick={e => e.stopPropagation()}>
            <div className="uh-modal__header">
              <h2 className="uh-modal__title">All Upcoming Events</h2>
              <button className="uh-modal__close-sm" onClick={() => setShowAllEvents(false)}>×</button>
            </div>
            <div className="uh-modal__body">
              {allAnnouncements.length === 0 ? (
                <div className="uh-empty"><p>No upcoming events are currently scheduled.</p></div>
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
                    <div key={i} className="uh-event" onClick={() => { setShowAllEvents(false); setSelectedEvent(evt); }}>
                      <div className="uh-event__accent" style={{ background: c.color }} />
                      <div className="uh-event__date">
                        <span className="uh-event__day">{evt.day}</span>
                        <span className="uh-event__month">{evt.month}</span>
                      </div>
                      <div className="uh-event__info">
                        <div className="uh-event__top">
                          <span className="uh-event__title">{evt.title}</span>
                          <span className="uh-event__tag" style={{ color: c.color, background: c.bg }}>{evt.category}</span>
                        </div>
                        <p className="uh-event__body">{evt.body}</p>
                        <span className="uh-event__branch"><MapPin size={11} />{evt.branch}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}