import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import '../styles/Profile.css';
import {
  Heart, CalendarDays, PiggyBank, Banknote, FileText, Award,
  MapPin, Mail, Phone, Clock, Shield, TrendingUp,
  CheckCircle, Star, Flame, Target, Edit2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { isOfficerPosition } from '../../utils/officerPositions';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Profile() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loanStats, setLoanStats] = useState({ completed: 0, active: 0, total: 0 });
  const [savingsStats, setSavingsStats] = useState({ totalSavings: 0, completedGoals: 0, activeGoals: 0 });
  const [recentActivity, setRecentActivity] = useState([]);

  const isOfficer = isOfficerPosition(profile?.position);

  const fetchProfileData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [donRes, attRes, loanRes, savRes, savGoalsRes, savTxnRes, loanPayRes] = await Promise.all([
        fetch(`${API}/api/donations/my-donations`, { headers }),
        fetch(`${API}/api/attendance/my-attendance`, { headers }),
        fetch(`${API}/api/loans/my-loans`, { headers }),
        fetch(`${API}/api/savings/stats`, { headers }),
        fetch(`${API}/api/savings/goals`, { headers }),
        fetch(`${API}/api/savings/transactions?limit=5`, { headers }),
        fetch(`${API}/api/loans/my-payments`, { headers }),
      ]);

      const [donData, attData, loanData, savData, savGoalsData, savTxnData, loanPayData] = await Promise.all([
        donRes.ok ? donRes.json() : { success: false },
        attRes.ok ? attRes.json() : { success: false },
        loanRes.ok ? loanRes.json() : { success: false },
        savRes.ok ? savRes.json() : { success: false },
        savGoalsRes.ok ? savGoalsRes.json() : { success: false },
        savTxnRes.ok ? savTxnRes.json() : { success: false },
        loanPayRes.ok ? loanPayRes.json() : { success: false },
      ]);

      if (donData.success) {
        setDonations(donData.donations?.filter(d => d.status === 'confirmed') || []);
      }
      if (attData.success) {
        setAttendance(attData.attendance || []);
      }
      if (loanData.success) {
        const loans = loanData.loans || [];
        setLoanStats({
          completed: loans.filter(l => l.status === 'completed').length,
          active: loans.filter(l => l.status === 'active').length,
          total: loans.length
        });
      }
      if (savData.success) {
        const goals = savGoalsData.success ? (savGoalsData.goals || []) : [];
        setSavingsStats({
          totalSavings: savData.stats?.totalSavings || 0,
          completedGoals: goals.filter(g => g.status === 'completed').length,
          activeGoals: goals.filter(g => g.status === 'active').length,
        });
      }

      // Build recent activity
      const activities = [];
      if (donData.success && donData.donations) {
        donData.donations.filter(d => d.status === 'confirmed').slice(0, 5).forEach(d => {
          activities.push({ type: 'donation', title: 'Donation Made', sub: d.category || 'General Fund', amount: d.amount, date: new Date(d.createdAt) });
        });
      }
      if (attData.success && attData.attendance) {
        attData.attendance.slice(0, 3).forEach(a => {
          activities.push({ type: 'attendance', title: 'Service Attended', sub: a.service || a.branch, date: new Date(a.createdAt) });
        });
      }
      if (loanPayData.success && loanPayData.payments) {
        loanPayData.payments.filter(p => p.status === 'confirmed').slice(0, 3).forEach(p => {
          activities.push({ type: 'loan', title: 'Loan Payment', sub: p.loanId, amount: p.amount, date: new Date(p.submittedAt || p.createdAt) });
        });
      }
      if (savTxnData.success && savTxnData.transactions) {
        savTxnData.transactions.filter(t => t.type === 'deposit' && t.status === 'confirmed').slice(0, 3).forEach(t => {
          activities.push({ type: 'savings', title: 'Savings Deposit', sub: t.goalName || 'General', amount: t.amount, date: new Date(t.date) });
        });
      }
      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 8));

    } catch (err) {
      console.error('Profile data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // 12-month donation trend
  const donationTrend = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthData = MONTHS_SHORT.map((label, i) => ({ label, amount: 0, month: i }));
    donations.forEach(d => {
      const dt = new Date(d.createdAt);
      if (dt.getFullYear() === year) {
        monthData[dt.getMonth()].amount += Number(d.amount) || 0;
      }
    });
    return monthData;
  }, [donations]);

  const totalDonated = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  // Attendance heatmap data (last 12 months)
  const attendanceByMonth = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthCounts = MONTHS_SHORT.map((label, i) => ({ label, count: 0, month: i }));
    attendance.forEach(a => {
      const dt = new Date(a.createdAt);
      if (dt.getFullYear() === year) {
        monthCounts[dt.getMonth()].count += 1;
      }
    });
    return monthCounts;
  }, [attendance]);

  // Achievements logic
  const achievements = useMemo(() => {
    const list = [];
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Faithful Giver — donated at least 3 different months this year
    const donMonths = new Set();
    donations.forEach(d => {
      const dt = new Date(d.createdAt);
      if (dt.getFullYear() === thisYear) donMonths.add(dt.getMonth());
    });
    if (donMonths.size >= 3) {
      list.push({ icon: <Heart size={18} />, title: 'Faithful Giver', desc: `Donated in ${donMonths.size} months this year`, color: '#E11D48' });
    }

    // Active Attendee — attended 5+ services this year
    const thisYearAtt = attendance.filter(a => new Date(a.createdAt).getFullYear() === thisYear);
    if (thisYearAtt.length >= 5) {
      list.push({ icon: <Flame size={18} />, title: 'Active Attendee', desc: `${thisYearAtt.length} services attended this year`, color: '#F59E0B' });
    }

    // Savings Champion — completed at least 1 goal
    if (savingsStats.completedGoals > 0) {
      list.push({ icon: <Target size={18} />, title: 'Savings Champion', desc: `${savingsStats.completedGoals} goal${savingsStats.completedGoals > 1 ? 's' : ''} completed`, color: '#10B981' });
    }

    // Community Pillar — is an officer
    if (isOfficer) {
      list.push({ icon: <Shield size={18} />, title: 'Community Pillar', desc: `Officer: ${profile?.position}`, color: '#2563EB' });
    }

    // This Month Donor
    const thisMonthDonations = donations.filter(d => {
      const dt = new Date(d.createdAt);
      return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    });
    if (thisMonthDonations.length > 0) {
      list.push({ icon: <Star size={18} />, title: 'Monthly Contributor', desc: `${thisMonthDonations.length} donation${thisMonthDonations.length > 1 ? 's' : ''} this month`, color: '#8B5CF6' });
    }

    return list;
  }, [donations, attendance, savingsStats.completedGoals, isOfficer, profile?.position]);

  const fmt = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const displayName = profile?.fullName || 'Member';
  const avatarSrc = profile?.photoUrl || null;
  const memberSince = user?.created_at || user?.createdAt
    ? new Date(user.created_at || user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const activityIcon = (type) => {
    if (type === 'donation') return <Heart size={14} />;
    if (type === 'attendance') return <CalendarDays size={14} />;
    if (type === 'loan') return <Banknote size={14} />;
    if (type === 'savings') return <PiggyBank size={14} />;
    return <CheckCircle size={14} />;
  };

  const getMaxHeatmap = () => Math.max(1, ...attendanceByMonth.map(m => m.count));
  const maxAtt = getMaxHeatmap();

  return (
    <div className="up-page">
      {/* ── Hero Header ── */}
      <div className="up-hero">
        <div className="up-hero__bg" />
        <div className="up-hero__content">
          <div className="up-hero__avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile" />
            ) : (
              <span className="up-hero__avatar-text">
                {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            )}
            <button className="up-hero__avatar-edit" onClick={() => navigate('/settings')} title="Edit Profile">
              <Edit2 size={14} />
            </button>
          </div>
          <div className="up-hero__info">
            <h1 className="up-hero__name">{displayName}</h1>
            <div className="up-hero__meta">
              {profile?.branch && (
                <span className="up-hero__meta-item">
                  <MapPin size={13} /> {profile.branch}
                </span>
              )}
              {memberSince && (
                <span className="up-hero__meta-item">
                  <Clock size={13} /> Member since {memberSince}
                </span>
              )}
            </div>
            <div className="up-hero__badges">
              <span className={`up-badge ${isOfficer ? 'up-badge--officer' : 'up-badge--member'}`}>
                <Shield size={12} />
                {isOfficer ? `Officer · ${profile?.position}` : 'Member'}
              </span>
              {profile?.gender && (
                <span className="up-badge up-badge--info">{profile.gender}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Membership Stats ── */}
      <div className="up-stats">
        <div className="up-stat up-stat--donations" onClick={() => navigate('/donation')}>
          <div className="up-stat__icon"><Heart size={18} /></div>
          <div className="up-stat__body">
            <span className="up-stat__value">{loading ? '—' : fmt(totalDonated)}</span>
            <span className="up-stat__label">Total Donated</span>
          </div>
        </div>
        <div className="up-stat up-stat--attendance" onClick={() => navigate('/attendance')}>
          <div className="up-stat__icon"><CalendarDays size={18} /></div>
          <div className="up-stat__body">
            <span className="up-stat__value">{loading ? '—' : attendance.length}</span>
            <span className="up-stat__label">Services Attended</span>
          </div>
        </div>
        <div className="up-stat up-stat--savings" onClick={() => navigate('/savings')}>
          <div className="up-stat__icon"><PiggyBank size={18} /></div>
          <div className="up-stat__body">
            <span className="up-stat__value">{loading ? '—' : fmt(savingsStats.totalSavings)}</span>
            <span className="up-stat__label">Total Savings</span>
          </div>
        </div>
        {isOfficer && (
          <div className="up-stat up-stat--loans" onClick={() => navigate('/loans')}>
            <div className="up-stat__icon"><FileText size={18} /></div>
            <div className="up-stat__body">
              <span className="up-stat__value">{loading ? '—' : loanStats.completed}</span>
              <span className="up-stat__label">Loans Completed</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="up-grid">

        {/* Left Column */}
        <div className="up-col-left">

          {/* Donation Trend */}
          <div className="up-card">
            <div className="up-card__header">
              <h2 className="up-card__title">
                <TrendingUp size={16} />
                Giving Trend
              </h2>
              <span className="up-card__sub">{new Date().getFullYear()}</span>
            </div>
            <div className="up-chart-wrap">
              {loading ? (
                <div className="up-skeleton-chart" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={donationTrend} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `₱${(v / 1000).toFixed(0)}k` : '0'} />
                    <Tooltip
                      formatter={(v) => [fmt(v), 'Donated']}
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="amount" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Attendance Heatmap */}
          <div className="up-card">
            <div className="up-card__header">
              <h2 className="up-card__title">
                <CalendarDays size={16} />
                Attendance Overview
              </h2>
              <span className="up-card__sub">{attendance.length} total</span>
            </div>
            <div className="up-heatmap">
              {attendanceByMonth.map((m, i) => {
                const intensity = m.count / maxAtt;
                return (
                  <div key={i} className="up-heatmap__cell" title={`${m.label}: ${m.count} service${m.count !== 1 ? 's' : ''}`}>
                    <div
                      className="up-heatmap__bar"
                      style={{
                        height: `${Math.max(4, intensity * 100)}%`,
                        opacity: m.count > 0 ? 0.3 + intensity * 0.7 : 0.1,
                      }}
                    />
                    <span className="up-heatmap__count">{m.count}</span>
                    <span className="up-heatmap__label">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="up-col-right">

          {/* Achievements */}
          <div className="up-card">
            <div className="up-card__header">
              <h2 className="up-card__title">
                <Award size={16} />
                Achievements
              </h2>
              <span className="up-card__sub">{achievements.length} earned</span>
            </div>
            {achievements.length === 0 ? (
              <div className="up-empty">
                <Award size={28} strokeWidth={1.5} />
                <p>Keep participating to earn achievements!</p>
              </div>
            ) : (
              <div className="up-achievements">
                {achievements.map((a, i) => (
                  <div key={i} className="up-achievement" style={{ '--accent': a.color }}>
                    <div className="up-achievement__icon">{a.icon}</div>
                    <div className="up-achievement__text">
                      <span className="up-achievement__title">{a.title}</span>
                      <span className="up-achievement__desc">{a.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Info */}
          <div className="up-card">
            <div className="up-card__header">
              <h2 className="up-card__title">
                <Shield size={16} />
                Personal Information
              </h2>
              <button className="up-card__edit-btn" onClick={() => navigate('/settings')}>
                <Edit2 size={13} />
                Edit
              </button>
            </div>
            <div className="up-info-list">
              <div className="up-info-item">
                <Mail size={15} />
                <div>
                  <span className="up-info-label">Email</span>
                  <span className="up-info-value">{user?.email || '—'}</span>
                </div>
              </div>
              <div className="up-info-item">
                <Phone size={15} />
                <div>
                  <span className="up-info-label">Phone</span>
                  <span className="up-info-value">{profile?.phone || 'Not set'}</span>
                </div>
              </div>
              <div className="up-info-item">
                <MapPin size={15} />
                <div>
                  <span className="up-info-label">Community</span>
                  <span className="up-info-value">{profile?.branch || 'Not assigned'}</span>
                </div>
              </div>
              <div className="up-info-item">
                <CalendarDays size={15} />
                <div>
                  <span className="up-info-label">Birthday</span>
                  <span className="up-info-value">
                    {profile?.birthday || profile?.dateOfBirth
                      ? new Date(profile.birthday || profile.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="up-card">
            <div className="up-card__header">
              <h2 className="up-card__title">
                <Clock size={16} />
                Recent Activity
              </h2>
            </div>
            {loading ? (
              <div className="up-activity-skel">
                {[1, 2, 3].map(i => <div key={i} className="up-skel-row" />)}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="up-empty">
                <Clock size={28} strokeWidth={1.5} />
                <p>No recent activity yet.</p>
              </div>
            ) : (
              <div className="up-activity-list">
                {recentActivity.map((a, i) => (
                  <div key={i} className={`up-activity up-activity--${a.type}`}>
                    <div className="up-activity__icon">{activityIcon(a.type)}</div>
                    <div className="up-activity__body">
                      <span className="up-activity__title">{a.title}</span>
                      <span className="up-activity__sub">{a.sub}</span>
                    </div>
                    <div className="up-activity__right">
                      {a.amount && <span className="up-activity__amount">{fmt(a.amount)}</span>}
                      <span className="up-activity__time">{formatTimeAgo(a.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
