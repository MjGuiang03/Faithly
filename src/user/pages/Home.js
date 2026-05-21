import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

import API from '../../utils/api';
import '../styles/Home.css';
import { Banknote, CalendarDays, CheckCircle, ChevronRight, ChevronLeft, Clock, Heart, MapPin, PiggyBank, Wallet, FileText, Megaphone, ArrowRight, BookOpen, Target, AlertCircle, X } from 'lucide-react';
import { isOfficerPosition } from '../../utils/officerPositions';

const CAT_COLORS = {
  Events: { bg: '#FFF7ED', color: '#C2410C' },
  General: { bg: '#EFF6FF', color: '#1E40AF' },
  Prayer: { bg: '#F5F3FF', color: '#6D28D9' },
  Services: { bg: '#F0FDF4', color: '#15803D' },
  Donations: { bg: '#FDF2F8', color: '#9D174D' },
  Urgent: { bg: '#FFF1F2', color: '#BE123C' },
};

export default function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loanStats, setLoanStats] = useState({ activeCount: 0, remainingBalance: 0 });
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [rejectedLoansCount, setRejectedLoansCount] = useState(0);

  const [donationStats, setDonationStats] = useState({ totalDonated: 0 });
  const [monthlyDonationCount, setMonthlyDonationCount] = useState(0);

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
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(null);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [prayers, setPrayers] = useState([]);
  const [newPrayer, setNewPrayer] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const token = localStorage.getItem('token');

  const branch = profile?.branch || '';
  const urls = useMemo(() => {
    if (!token) return null;
    return [
      `${API}/api/loans/my-loans`,
      `${API}/api/donations/my-donations`,
      `${API}/api/attendance/my-attendance`,
      `${API}/api/admin/announcements${branch ? `?branch=${encodeURIComponent(branch)}` : ''}`,
      `${API}/api/savings/stats`,
      `${API}/api/savings/goals`,
      `${API}/api/prayers`,
      `${API}/api/savings/transactions?limit=5`,
      `${API}/api/loans/my-payments`,
    ];
  }, [token, branch]);

  const fetcher = async (urlsToFetch) => {
    const headers = { Authorization: `Bearer ${token}` };
    const responses = await Promise.all(urlsToFetch.map(url => fetch(url, { headers })));
    return Promise.all(responses.map(res => res.ok ? res.json() : { success: false }));
  };

  const { data, isValidating } = useSWR(urls, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: true
  });

  useEffect(() => {
    if (!data) return;
    setLoading(isValidating && !data); // Only show loading spinner if we don't have cached data
    try {
      const [loansData, donationsData, attendanceData, annData, savingsData, savingsGoalsData, prayersData, savingsTxnData, loanPaymentsData] = data;

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      if (loansData && loansData.success) {
        setLoanStats(loansData.stats || { activeCount: 0, remainingBalance: 0 });
        const activeList = (loansData.loans || []).filter(l => l.status === 'active');
        setActiveLoansList(activeList);
        const rejected = (loansData.loans || []).filter(l => l.status === 'rejected').length;
        setRejectedLoansCount(rejected);
      }
      if (donationsData && donationsData.success) {
        setDonationStats(donationsData.stats || { totalDonated: 0 });
        const monthlyDons = (donationsData.donations || []).filter(d => {
          const dt = new Date(d.createdAt);
          return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
        });
        setMonthlyDonationCount(monthlyDons.length);
      }

      if (savingsData && savingsData.success) {
        setSavingsStats(savingsData.stats || { totalSavings: 0, thisMonth: 0 });
      }

      if (savingsGoalsData && savingsGoalsData.success) {
        setSavingsGoalsList((savingsGoalsData.goals || []).filter(g => g.status !== 'completed'));
      }

      if (annData && annData.success) {
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

      if (prayersData && prayersData.success) {
        setPrayers(prayersData.prayers || []);
      }

      const activities = [];

      if (loansData.success && loansData.loans?.length) {
        const STATUS_TEXT = {
          pending: 'Pending review',
          approved: 'Approved',
          active: 'Active',
          completed: 'Completed',
          rejected: 'Rejected',
          overdue: 'Overdue',
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

      if (loanPaymentsData.success && loanPaymentsData.payments?.length) {
        loanPaymentsData.payments.slice(0, 5).forEach(payment => {
          activities.push({
            type: 'loan',
            title: payment.status === 'confirmed' ? 'Loan Payment Confirmed' : 'Loan Payment Pending',
            loanId: payment.loanId,
            amount: `₱${Number(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            date: new Date(payment.submittedAt || payment.createdAt),
            status: payment.status,
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

      if (savingsTxnData.success && savingsTxnData.transactions?.length) {
        savingsTxnData.transactions
          .filter(txn => txn.type === 'deposit')
          .slice(0, 5)
          .forEach(txn => {
            activities.push({
              type: 'savings',
              title: txn.status === 'confirmed' ? 'Savings Validated' : 'Savings Deposit',
              category: txn.goalName || 'General Savings',
              amount: `₱${Number(txn.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              date: new Date(txn.date),
              status: txn.status
            });
          });
      }

      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 3));

    } catch (err) {
      console.error('Failed to parse dashboard data:', err);
    } finally {
      if (data) setLoading(false);
    }
  }, [data, isValidating, profile?.branch]);

  // Auto-swipe for Events Carousel
  useEffect(() => {
    if (upcomingEvents.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentEventIndex(prev => (prev + 1) % upcomingEvents.length);
    }, 5000 * (1 + currentEventIndex / 10)); // Slight variation to feel more natural
    return () => clearInterval(timer);
  }, [upcomingEvents.length, currentEventIndex]);

  const isOfficer = isOfficerPosition(profile?.position);
  
  // Robust frontend check for late loans (in case backend misses it)
  const processedLoans = activeLoansList.map(l => {
    let isLate = l.isLate === true;
    if (!isLate && l.status === 'active' && l.disbursementDate) {
      const term = l.termMonths || 12;
      const paidMonths = l.paidMonths || 0;
      if (paidMonths < term) {
        const startDate = new Date(l.disbursementDate);
        const nextDue = new Date(startDate);
        nextDue.setMonth(startDate.getMonth() + paidMonths + 1);
        const cutoffDate = new Date(nextDue);
        cutoffDate.setDate(nextDue.getDate() + 3);
        cutoffDate.setHours(23, 59, 59, 999);
        if (Date.now() > cutoffDate.getTime()) {
          isLate = true;
        }
      }
    }
    return { ...l, isLate };
  });

  const lateLoansCount = processedLoans.filter(l => l.isLate).length;

  const renderActivityIcon = (activity) => {
    if (activity.type === 'loan') return <Banknote size={16} />;
    if (activity.type === 'donation') return <Heart size={16} />;
    if (activity.type === 'attendance') return <CalendarDays size={16} />;
    if (activity.type === 'savings') return <PiggyBank size={16} />;
    return <CheckCircle size={16} />;
  };

  const formatTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 0) {
      if (diff > -60000) return 'Just now';
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
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
    {
      title: 'Manage Savings',
      description: 'View and save for your goals',
      className: 'uh-action--savings',
      action: () => navigate('/savings'),
      icon: <Wallet size={18} />
    },
    ...(isOfficer ? [
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

  // ── Daily Verse ──
  const DAILY_VERSES = useMemo(() => [
    { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
    { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to Him, and He will make your paths straight.", ref: "Proverbs 3:5-6" },
    { text: "I can do all this through Him who gives me strength.", ref: "Philippians 4:13" },
    { text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, He leads me beside quiet waters, He refreshes my soul.", ref: "Psalm 23:1-3" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
    { text: "And we know that in all things God works for the good of those who love Him, who have been called according to His purpose.", ref: "Romans 8:28" },
    { text: "The Lord bless you and keep you; the Lord make His face shine on you and be gracious to you.", ref: "Numbers 6:24-25" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
    { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary.", ref: "Isaiah 40:31" },
    { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", ref: "Philippians 4:6" },
    { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" },
    { text: "For God so loved the world that He gave His one and only Son, that whoever believes in Him shall not perish but have eternal life.", ref: "John 3:16" },
    { text: "He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.", ref: "Micah 6:8" },
    { text: "Delight yourself in the Lord, and He will give you the desires of your heart.", ref: "Psalm 37:4" },
    { text: "Cast all your anxiety on Him because He cares for you.", ref: "1 Peter 5:7" },
    { text: "The Lord is my light and my salvation — whom shall I fear? The Lord is the stronghold of my life — of whom shall I be afraid?", ref: "Psalm 27:1" },
    { text: "Give thanks to the Lord, for He is good; His love endures forever.", ref: "Psalm 107:1" },
    { text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.", ref: "Galatians 5:22-23" },
    { text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!", ref: "2 Corinthians 5:17" },
    { text: "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.", ref: "2 Corinthians 9:7" },
    { text: "Commit to the Lord whatever you do, and He will establish your plans.", ref: "Proverbs 16:3" },
    { text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.", ref: "Isaiah 41:10" },
    { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" },
    { text: "Every good and perfect gift is from above, coming down from the Father of the heavenly lights.", ref: "James 1:17" },
    { text: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up.", ref: "Galatians 6:9" },
    { text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", ref: "Proverbs 18:10" },
    { text: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" },
    { text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.", ref: "1 Corinthians 13:4" },
    { text: "Let everything that has breath praise the Lord.", ref: "Psalm 150:6" },
    { text: "Above all, love each other deeply, because love covers over a multitude of sins.", ref: "1 Peter 4:8" },
    { text: "A cheerful heart is good medicine, but a crushed spirit dries up the bones.", ref: "Proverbs 17:22" },
  ], []);

  const dailyVerse = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  }, [DAILY_VERSES]);

  // ── Next Payment Info (for officers with active loans) ──
  const nextPaymentInfo = useMemo(() => {
    if (!isOfficer || processedLoans.length === 0) return null;
    const activeLoans = processedLoans.filter(l => l.status === 'active' && l.disbursementDate);
    if (activeLoans.length === 0) return null;

    let soonest = null;
    activeLoans.forEach(l => {
      const paidMonths = l.paidMonths || 0;
      const term = l.termMonths || 12;
      if (paidMonths >= term) return;
      const start = new Date(l.disbursementDate);
      const nextDue = new Date(start);
      nextDue.setMonth(start.getMonth() + paidMonths + 1);
      if (!soonest || nextDue < soonest.dueDate) {
        soonest = {
          loanId: l.loanId,
          dueDate: nextDue,
          monthlyPayment: l.monthlyPayment || (l.amount / (l.termMonths || 12)),
          remainingBalance: l.remainingBalance != null ? l.remainingBalance : l.amount,
          isLate: l.isLate,
        };
      }
    });
    return soonest;
  }, [isOfficer, processedLoans]);

  // ── Top Savings Goal ──
  const topSavingsGoal = useMemo(() => {
    if (savingsGoalsList.length === 0) return null;
    // Pick the goal with the highest progress percentage
    return savingsGoalsList.reduce((best, g) => {
      const pct = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) : 0;
      const bestPct = best.targetAmount > 0 ? (best.savedAmount / best.targetAmount) : 0;
      return pct > bestPct ? g : best;
    }, savingsGoalsList[0]);
  }, [savingsGoalsList]);

  const formatAuthorName = (name) => {
    if (!name) return 'Anonymous';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    const firstNames = parts.slice(0, -1).join(' ');
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstNames} ${lastInitial}.`;
  };

  const handlePostPrayer = async () => {
    if (!newPrayer.trim()) return;
    try {
      const author = formatAuthorName(profile?.fullName);
      const res = await fetch(`${API}/api/prayers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: newPrayer.trim(), author })
      });
      const data = await res.json();
      if (data.success) {
        setPrayers([data.prayer, ...prayers]);
        setNewPrayer("");
      }
    } catch (err) {
      console.error('Error posting prayer:', err);
    }
  };

  return (
    <div className="user-home-content-wrapper">

      {/* Welcome Header */}
      <div className="uh-welcome-header" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', fontFamily: "'Cormorant Garamond', serif" }}>
          Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}!
        </h1>
        <p style={{ fontSize: '16px', color: '#64748b', margin: 0, fontFamily: "'Inter', sans-serif", lineHeight: '1.5' }}>
          Here's your personal overview and the latest updates from your community.
        </p>
      </div>

      {/* Stats */}
      <div className="uh-stats-grid">

        {/* Savings Stat Card */}
        <div className="uh-stat-card uh-stat-card--savings uh-stat-card--clickable" onClick={() => navigate('/savings')}>
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
                {loading && (
                  <div className="user-skeleton" style={{ width: '60%', height: 10, borderRadius: 4, marginTop: 4 }} />
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
        {/* End Savings Stat Card */}

        {isOfficer && (
          <div className="uh-stat-card uh-stat-card--loans uh-stat-card--clickable" onClick={() => navigate('/loans')}>
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
                  <span className={`uh-stat-sub ${lateLoansCount > 0 ? 'uh-stat-sub--negative' : rejectedLoansCount > 0 ? 'uh-stat-sub--negative' : ''}`}>
                    {lateLoansCount > 0 ? `${lateLoansCount} late payment${lateLoansCount > 1 ? 's' : ''}` : rejectedLoansCount > 0 ? `${rejectedLoansCount} rejected` : 'No rejected'}
                  </span>
                )}
                {loading && (
                  <div className="user-skeleton" style={{ width: '60%', height: 10, borderRadius: 4, marginTop: 4 }} />
                )}
              </div>
            </div>
            {!loading && activeLoansList.length > 0 && (
              <div className="uh-tooltip" style={lateLoansCount > 0 ? { border: '1px solid #EF4444' } : {}}>
                <p className="uh-tooltip__title" style={lateLoansCount > 0 ? { color: '#DC2626', fontWeight: '700' } : {}}>
                  {lateLoansCount > 0 ? 'OVERDUE LOANS' : 'Active Loans'}
                </p>
                {processedLoans.slice(0, 3).map(loan => (
                  <div key={loan._id} className="uh-tooltip__row" style={loan.isLate ? { backgroundColor: '#FEF2F2', padding: '6px 8px', borderRadius: '4px', margin: '-4px -8px 4px -8px' } : {}}>
                    <span className="uh-tooltip__label" style={loan.isLate ? { color: '#991B1B', fontWeight: '600' } : {}}>
                      {loan.loanId}
                      {loan.isLate && <span style={{ backgroundColor: '#EF4444', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontSize: '10px', fontWeight: 'bold' }}>LATE</span>}
                    </span>
                    <span className="uh-tooltip__value" style={loan.isLate ? { color: '#991B1B', fontWeight: '600' } : {}}>{formatCurrency(loan.remainingBalance ?? loan.amount)}</span>
                  </div>
                ))}
                {processedLoans.length > 3 && (
                  <p className="uh-tooltip__more">+{processedLoans.length - 3} more</p>
                )}
                <p className="uh-tooltip__cta" style={lateLoansCount > 0 ? { color: '#DC2626' } : {}}>Click to view details</p>
              </div>
            )}
          </div>
        )}

        <div className="uh-stat-card uh-stat-card--donations uh-stat-card--clickable" onClick={() => navigate('/donation')}>
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
              {loading && (
                <div className="user-skeleton" style={{ width: '60%', height: 10, borderRadius: 4, marginTop: 4 }} />
              )}
            </div>
          </div>
        </div>

        <div className="uh-stat-card uh-stat-card--verse-mini">
          <div className="uh-stat-card__body">
            <div className="uh-stat-icon-box">
              <BookOpen size={20} />
            </div>
            <div className="uh-stat-text">
              <span className="uh-stat-label">Today's Verse</span>
              <span className="uh-stat-verse-text">"{dailyVerse.text.length > 60 ? dailyVerse.text.slice(0, 60) + '…' : dailyVerse.text}"</span>
              <span className="uh-stat-sub uh-stat-sub--gold">— {dailyVerse.ref}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main grid */}
      <div className="uh-grid-main">

        {/* Quick Actions */}
        <div className="uh-card uh-card--quick-actions">
          <h2 className="uh-card__heading">Quick Actions</h2>
          <div className={`uh-actions ${isOfficer ? 'uh-actions--grid' : ''}`}>
            {loading ? (
              [1, 2, 3, 4].slice(0, isOfficer ? 4 : 3).map(i => (
                <button key={i} className={`uh-action ${i % 2 === 0 ? 'uh-action--blue' : 'uh-action--purple'}`} style={{ pointerEvents: 'none', backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <div className="user-skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="uh-action__text" style={{ flex: 1, width: '100%', alignItems: 'flex-start' }}>
                    <div className="user-skeleton" style={{ height: 12, width: '50%', marginBottom: 6, borderRadius: 4 }} />
                    <div className="user-skeleton" style={{ height: 10, width: '70%', borderRadius: 4 }} />
                  </div>
                </button>
              ))
            ) : (
              quickActions.map((action, i) => (
                <button key={i} onClick={action.action} className={`uh-action ${action.className} user-fade-in`}>
                  <div className="uh-action__icon">{action.icon}</div>
                  <div className="uh-action__text">
                    <span className="uh-action__title">{action.title}</span>
                    <span className="uh-action__desc">{action.description}</span>
                  </div>
                  <ChevronRight size={16} className="uh-action__arrow" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Savings Goal + Payment Reminder */}
        <div className="uh-card uh-card--insights">
          <div className="uh-insights-header">
            <h2 className="uh-card__heading">My Overview</h2>
          </div>

          {/* Savings Goal Progress */}
          <div className="uh-insight-block" style={{ flex: 1 }}>
            <div className="uh-insight-header">
              <div className="uh-insight-icon uh-insight-icon--savings"><Target size={16} /></div>
              <h3 className="uh-insight-title">Savings Goal</h3>
            </div>
            {loading ? (
              <div className="uh-savings-goal">
                <div className="uh-savings-goal__info">
                  <div className="user-skeleton" style={{ height: 13, width: '55%', borderRadius: 4 }} />
                </div>
                <div className="uh-progress-bar">
                  <div className="user-skeleton" style={{ height: 10, width: '100%', borderRadius: 100 }} />
                </div>
                <div className="uh-savings-goal__amounts">
                  <div className="user-skeleton" style={{ height: 12, width: 60, borderRadius: 4 }} />
                  <div className="user-skeleton" style={{ height: 12, width: 80, borderRadius: 4 }} />
                </div>
              </div>
            ) : topSavingsGoal ? (() => {
              const pct = topSavingsGoal.targetAmount > 0
                ? Math.min(100, Math.round((topSavingsGoal.savedAmount / topSavingsGoal.targetAmount) * 100))
                : 0;
              return (
                <div className="uh-savings-goal user-fade-in">
                  <div className="uh-savings-goal__info">
                    <span className="uh-savings-goal__name">{topSavingsGoal.name}</span>
                    <span className="uh-savings-goal__pct">{pct}%</span>
                  </div>
                  <div className="uh-progress-bar">
                    <div className="uh-progress-bar__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="uh-savings-goal__amounts">
                    <span>{formatCurrency(topSavingsGoal.savedAmount)}</span>
                    <span className="uh-savings-goal__target">of {formatCurrency(topSavingsGoal.targetAmount)}</span>
                  </div>
                </div>
              );
            })() : (
              <div className="uh-insight-empty uh-insight-empty--savings">
                <div className="uh-insight-empty__icon">
                  <Target size={22} />
                </div>
                <div className="uh-insight-empty__text">
                  <h4>No Active Goals</h4>
                  <p>Start saving for your future.</p>
                </div>
                <button className="uh-insight-empty__btn" onClick={() => navigate('/savings')}>
                  Create a Goal
                </button>
              </div>
            )}
          </div>

          {isOfficer && (
            <>
              {/* Upcoming Payment Reminder */}
              <div className="uh-insight-block">
                <div className="uh-insight-header">
                  <div className={`uh-insight-icon ${nextPaymentInfo?.isLate ? 'uh-insight-icon--late' : 'uh-insight-icon--loan'}`}>
                    {nextPaymentInfo?.isLate ? <AlertCircle size={16} /> : <Banknote size={16} />}
                  </div>
                  <h3 className="uh-insight-title">Next Payment</h3>
                </div>
                {loading ? (
                  <div className="uh-payment-reminder">
                    <div className="uh-payment-reminder__row">
                      <div className="user-skeleton" style={{ height: 12, width: 80, borderRadius: 4 }} />
                      <div className="user-skeleton" style={{ height: 12, width: 60, borderRadius: 4 }} />
                    </div>
                    <div className="uh-payment-reminder__row">
                      <div className="user-skeleton" style={{ height: 12, width: 70, borderRadius: 4 }} />
                      <div className="user-skeleton" style={{ height: 12, width: 90, borderRadius: 4 }} />
                    </div>
                    <div className="uh-payment-reminder__row">
                      <div className="user-skeleton" style={{ height: 12, width: 50, borderRadius: 4 }} />
                      <div className="user-skeleton" style={{ height: 12, width: 40, borderRadius: 4 }} />
                    </div>
                  </div>
                ) : nextPaymentInfo ? (() => {
                  const now = new Date();
                  const due = new Date(nextPaymentInfo.dueDate);
                  const diffDays = Math.ceil((due - now) / 86400000);
                  const isOverdue = diffDays < 0;
                  return (
                    <div className={`uh-payment-reminder user-fade-in ${isOverdue ? 'uh-payment-reminder--overdue' : ''}`}>
                      <div className="uh-payment-reminder__row">
                        <span className="uh-payment-reminder__label">{nextPaymentInfo.remainingBalance < nextPaymentInfo.monthlyPayment ? 'Remaining Balance' : 'Amount Due'}</span>
                        <span className="uh-payment-reminder__value">{formatCurrency(nextPaymentInfo.remainingBalance < nextPaymentInfo.monthlyPayment ? nextPaymentInfo.remainingBalance : nextPaymentInfo.monthlyPayment)}</span>
                      </div>
                      <div className="uh-payment-reminder__row">
                        <span className="uh-payment-reminder__label">Due Date</span>
                        <span className={`uh-payment-reminder__value ${isOverdue ? 'uh-payment-reminder__value--late' : ''}`}>
                          {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="uh-payment-reminder__badge-row">
                        <span className={`uh-payment-reminder__badge ${isOverdue ? 'uh-payment-reminder__badge--late' : 'uh-payment-reminder__badge--ok'}`}>
                          {isOverdue ? `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} overdue` : `${diffDays} day${diffDays > 1 ? 's' : ''} left`}
                        </span>
                      </div>
                      <button className="uh-insight-cta" onClick={() => navigate('/loans')}>
                        View Loan <ArrowRight size={12} />
                      </button>
                    </div>
                  );
                })() : (
                  <div className="uh-insight-empty uh-insight-empty--savings uh-insight-empty--loan user-fade-in">
                    <div className="uh-insight-empty__icon uh-insight-empty__icon--loan">
                      <CheckCircle size={18} />
                    </div>
                    <div className="uh-insight-empty__text">
                      <h4>All Caught Up</h4>
                      <p>You have no upcoming payments.</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Prayer Wall mini trigger */}
          <div style={{ padding: '0 20px 16px', marginTop: 'auto' }}>
            <button className="uh-prayer-trigger" onClick={() => setShowPrayerModal(true)}>
              <Heart size={16} />
              <div className="uh-prayer-trigger__text">
                <span className="uh-prayer-trigger__title">Prayer Wall</span>
                <span className="uh-prayer-trigger__count">{prayers.length} prayer{prayers.length !== 1 ? 's' : ''}</span>
              </div>
              <ChevronRight size={14} className="uh-prayer-trigger__arrow" />
            </button>
          </div>
        </div>

        {/* Events Carousel */}
        <div className="uh-card uh-card--events">

          <div className="uh-carousel-viewport">
            {loading ? (
              <div className="user-skeleton" style={{ height: '100%', width: '100%', borderRadius: 0 }} />
            ) : upcomingEvents.length === 0 ? (
              <div className="uh-empty user-fade-in">
                <CalendarDays size={28} strokeWidth={1.5} />
                <p>No announcements yet.</p>
              </div>
            ) : (
              <div
                className="uh-carousel-track"
                style={{ transform: `translateX(-${currentEventIndex * 100}%)` }}
              >
                {upcomingEvents.map((evt, i) => {
                  const hasImage = !!(evt.images?.[0] || evt.image);
                  const imageUrl = evt.images?.[0] || evt.image;
                  return (
                    <div
                      key={i}
                      className="uh-carousel-slide"
                      onClick={() => { setSelectedEvent(evt); setModalImageIndex(0); }}
                    >
                      <div className="uh-slide-hero">
                        {hasImage && (
                          <img className="uh-slide-hero__img" src={imageUrl} alt="" />
                        )}
                        <div className="uh-slide-hero__overlay" />
                        {/* Top pills */}
                        <div className="uh-slide-hero__top">
                          <div className="uh-slide-pill uh-slide-pill--date">
                            <span className="uh-slide-pill__day">{evt.day}</span>
                            <span className="uh-slide-pill__month">{evt.month}</span>
                          </div>
                          <div className="uh-slide-pill uh-slide-pill--cat">
                            {evt.category}
                          </div>
                        </div>
                        {/* Bottom content */}
                        <div className="uh-slide-hero__bottom">
                          <h3 className="uh-slide-hero__title">{evt.title}</h3>
                          <div className="uh-slide-hero__meta">
                            <span><Clock size={11} /> {evt.time || 'All Day'}</span>
                            <span><MapPin size={11} /> {evt.branch?.split(',')[0]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="uh-carousel-footer">
            <div className="uh-carousel-dots">
              {upcomingEvents.map((_, i) => (
                <button
                  key={i}
                  className={`uh-carousel-dot ${i === currentEventIndex ? 'uh-carousel-dot--active' : ''}`}
                  onClick={() => setCurrentEventIndex(i)}
                />
              ))}
            </div>
            <button className="uh-text-btn uh-text-btn--sm" onClick={() => setShowAllEvents(true)}>
              See all <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="uh-grid-bottom">

        {/* Activity */}
        <div className="uh-card uh-card--activity">
          <div className="uh-card__header-row">
            <h2 className="uh-card__heading">Recent Activity</h2>
          </div>
          {loading ? (
            <div className="uh-activity-scroll">
              {[1, 2, 3].map(i => (
                <div key={i} className="uh-activity-card uh-activity-card--skel">
                  <div className="user-skeleton" style={{ width: 30, height: 30, borderRadius: 7 }} />
                  <div style={{ flex: 1 }}>
                    <div className="user-skeleton" style={{ height: 12, width: '70%', marginBottom: 6, borderRadius: 4 }} />
                    <div className="user-skeleton" style={{ height: 10, width: '50%', marginBottom: 6, borderRadius: 4 }} />
                    <div className="user-skeleton" style={{ height: 11, width: '35%', borderRadius: 4 }} />
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

        {/* Monthly Calendar */}
        {(() => {
          const year = calendarDate.getFullYear();
          const month = calendarDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
          const daysInMonth = lastDay.getDate();
          
          const now = new Date();
          const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
          const today = isCurrentMonth ? now.getDate() : -1;

          // Get event days this month
          const eventDays = {};
          allAnnouncements.forEach(evt => {
            if (evt.dateObj) {
              const d = new Date(evt.dateObj);
              if (d.getMonth() === month && d.getFullYear() === year) {
                const day = d.getDate();
                if (!eventDays[day]) eventDays[day] = [];
                eventDays[day].push(evt);
              }
            }
          });

          const cells = [];
          for (let i = 0; i < startWeekday; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);

          return (
            <div className="uh-card uh-card--calendar">
              <div className="uh-cal-header">
                <h2 className="uh-cal-title" style={{ margin: 0, textAlign: 'left' }}>
                  {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    className="uh-cal-nav" 
                    onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    className="uh-cal-nav" 
                    onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="uh-cal-body">
                <div className="uh-cal-grid">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                    <div key={d} className="uh-cal-weekday">{d}</div>
                  ))}
                  {loading ? (
                    Array(35).fill(0).map((_, i) => (
                      <div key={`skel-${i}`} className="uh-cal-cell uh-cal-cell--empty">
                        <div className="user-skeleton" style={{ width: 28, height: 28, borderRadius: 8, margin: 'auto' }} />
                      </div>
                    ))
                  ) : (
                    cells.map((day, i) => (
                      <div
                        key={i}
                        className={`uh-cal-cell ${!day ? 'uh-cal-cell--empty' : ''} ${day === today ? 'uh-cal-cell--today' : ''} ${day && eventDays[day] ? 'uh-cal-cell--event user-fade-in' : ''} ${day && !eventDays[day] ? 'user-fade-in' : ''}`}
                        onClick={() => {
                          if (day && eventDays[day]) {
                            setSelectedEvent(eventDays[day][0]);
                            setModalImageIndex(0);
                          }
                        }}
                        title={day && eventDays[day] ? eventDays[day].map(e => e.title).join(', ') : ''}
                      >
                        {day && <span>{day}</span>}
                        {day && eventDays[day] && <div className="uh-cal-cell__dot" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Prayer Wall Modal */}
      {showPrayerModal && (
        <div className="uh-overlay" onClick={() => setShowPrayerModal(false)}>
          <div className="uh-modal uh-modal--list uh-modal--prayer-wall" onClick={e => e.stopPropagation()}>
            <div className="uh-modal__header">
              <h2 className="uh-modal__title">Community Prayer Wall</h2>
              <button className="uh-modal__close-sm" onClick={() => setShowPrayerModal(false)}>×</button>
            </div>
            <div className="uh-modal__body uh-modal__body--sticky-input">
              <div className="uh-prayer-input-container">
                <input
                  type="text"
                  className="uh-prayer-input"
                  placeholder="Share your prayer request..."
                  value={newPrayer}
                  onChange={(e) => setNewPrayer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePostPrayer();
                  }}
                />
                <button
                  className="uh-cta uh-prayer-post-btn"
                  onClick={handlePostPrayer}
                >
                  Post
                </button>
              </div>
              <div className="uh-prayer-list-scroll">
                {prayers.length === 0 ? (
                  <div className="uh-empty-state uh-empty-state--modal">
                    <div className="uh-empty-state__icon-wrap">
                      <Heart size={32} strokeWidth={1} className="uh-empty-state__icon" />
                      <div className="uh-empty-state__pulse" />
                    </div>
                    <p className="uh-empty-state__text">No prayers posted yet. Join the community by sharing your first prayer above.</p>
                  </div>
                ) : (
                  prayers.map((prayer) => (
                    <div key={prayer._id || prayer.id} className="uh-prayer-item--new">
                      <div className="uh-prayer-item__body--new">
                        <p className="uh-prayer-item__text--new">"{prayer.text}"</p>
                        <div className="uh-prayer-item__meta--new">
                          <span className="uh-prayer-item__author--new">{prayer.author}</span>
                          <span className="uh-prayer-item__time--new">{formatTimeAgo(prayer.createdAt || prayer.date)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="uh-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="uh-edm" onClick={e => e.stopPropagation()}>
            {/* Left side: Hero Image Zone */}
            <div className="uh-edm__hero">
              {selectedEvent.images && selectedEvent.images.length > 0 ? (
                <>
                  <img
                    src={selectedEvent.images[modalImageIndex]}
                    alt=""
                    className="uh-edm__hero-img"
                    onClick={() => setLightboxImageIndex(modalImageIndex)}
                    title="Click to view full screen"
                  />
                  {selectedEvent.images.length > 1 && (
                    <>
                      <button
                        className="uh-edm__nav uh-edm__nav--prev"
                        onClick={(e) => { e.stopPropagation(); setModalImageIndex(prev => prev === 0 ? selectedEvent.images.length - 1 : prev - 1); }}
                      ><ChevronLeft size={18} /></button>
                      <button
                        className="uh-edm__nav uh-edm__nav--next"
                        onClick={(e) => { e.stopPropagation(); setModalImageIndex(prev => (prev + 1) % selectedEvent.images.length); }}
                      ><ChevronRight size={18} /></button>
                    </>
                  )}
                </>
              ) : selectedEvent.image ? (
                <img src={selectedEvent.image} alt="" className="uh-edm__hero-img" onClick={() => setLightboxImageIndex(0)} title="Click to view full screen" />
              ) : (
                <div className="uh-edm__hero-empty"><Megaphone size={36} /></div>
              )}

              {/* Image dots */}
              {selectedEvent.images?.length > 1 && (
                <div className="uh-edm__dots">
                  {selectedEvent.images.map((_, i) => (
                    <button
                      key={i}
                      className={`uh-edm__dot ${i === modalImageIndex ? 'uh-edm__dot--active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setModalImageIndex(i); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right side: Content Details */}
            <div className="uh-edm__content-side">
              {/* Top row */}
              <div className="uh-edm__header-row">
                <span className="uh-edm__cat-pill">{selectedEvent.category}</span>
                <button className="uh-edm__close" onClick={() => setSelectedEvent(null)}>
                  <X size={16} />
                </button>
              </div>

              {/* Title */}
              <h2 className="uh-edm__title">{selectedEvent.title}</h2>
              <div className="uh-edm__meta-row">
                <span><CalendarDays size={13} /> {selectedEvent.dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                {selectedEvent.time && <span><Clock size={13} /> {selectedEvent.time}</span>}
                <span><MapPin size={13} /> {selectedEvent.branch}</span>
              </div>

              {/* Scrollable Body */}
              <div className="uh-edm__body-scroll">
                {selectedEvent.fullBody && (
                  <div className="uh-edm__desc">
                    <p>{selectedEvent.fullBody}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Image Viewer */}
      {selectedEvent && lightboxImageIndex !== null && (() => {
        const imagesList = selectedEvent.images && selectedEvent.images.length > 0
          ? selectedEvent.images
          : (selectedEvent.image ? [selectedEvent.image] : []);
        const currentImg = imagesList[lightboxImageIndex] || selectedEvent.image;

        return (
          <div className="uh-lightbox-overlay" onClick={() => setLightboxImageIndex(null)}>
            <div className="uh-lightbox-content" onClick={e => e.stopPropagation()}>
              <img src={currentImg} alt="" className="uh-lightbox-img" />
              
              {/* Close Button */}
              <button className="uh-lightbox-close" onClick={() => setLightboxImageIndex(null)}>
                <X size={24} />
              </button>

              {/* Navigation Arrows for Lightbox */}
              {imagesList.length > 1 && (
                <>
                  <button
                    className="uh-lightbox-nav uh-lightbox-nav--prev"
                    onClick={() => setLightboxImageIndex(prev => prev === 0 ? imagesList.length - 1 : prev - 1)}
                  >
                    <ChevronLeft size={30} />
                  </button>
                  <button
                    className="uh-lightbox-nav uh-lightbox-nav--next"
                    onClick={() => setLightboxImageIndex(prev => (prev + 1) % imagesList.length)}
                  >
                    <ChevronRight size={30} />
                  </button>
                  <div className="uh-lightbox-counter">
                    {lightboxImageIndex + 1} / {imagesList.length}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* All Events Modal */}
      {showAllEvents && (
        <div className="uh-overlay" onClick={() => setShowAllEvents(false)}>
          <div className="uh-modal uh-modal--list" onClick={e => e.stopPropagation()}>
            <div className="uh-modal__header">
              <h2 className="uh-modal__title">All Announcements</h2>
              <button className="uh-modal__close-sm" onClick={() => setShowAllEvents(false)}>×</button>
            </div>
            <div className="uh-modal__body">
              {allAnnouncements.length === 0 ? (
                <div className="uh-empty"><p>No announcements are currently posted.</p></div>
              ) : (
                allAnnouncements.map((evt, i) => {
                  const catStyle = CAT_COLORS[evt.category] || CAT_COLORS.General;
                  return (
                    <div key={i} className="uh-event" onClick={() => { setShowAllEvents(false); setSelectedEvent(evt); setModalImageIndex(0); }}>
                      <div className="uh-event__date">
                        <span className="uh-event__day">{evt.day}</span>
                        <span className="uh-event__month">{evt.month}</span>
                      </div>
                      <div className="uh-event__info">
                        <div className="uh-event__top">
                          <span className="uh-event__title">{evt.title}</span>
                          <div className="uh-event__meta-right">
                            <span className="uh-event__tag" style={{ color: catStyle.color, background: catStyle.bg }}>{evt.category}</span>
                            <span className="uh-event__branch"><MapPin size={11} />{evt.branch}</span>
                          </div>
                        </div>
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