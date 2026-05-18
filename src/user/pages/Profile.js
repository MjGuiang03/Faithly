import { useEffect, useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import '../styles/Profile.css';
import {
  Heart, CalendarDays, PiggyBank, Banknote, FileText, Award,
  MapPin, Mail, Phone, Clock, Shield, TrendingUp,
  CheckCircle, Star, Flame, Target, Edit2, XCircle, Edit
} from 'lucide-react';
import VerifyEmailModal from '../components/VerifyEmail';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { isOfficerPosition } from '../../utils/officerPositions';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Profile() {
  const navigate = useNavigate();
  const { profile, user, updateProfile, requestEmailChange, verifyEmailChange } = useAuth();
  const token = localStorage.getItem('token');
  const isOfficer = profile?.position && isOfficerPosition(profile.position);

  /* ── Personal Info State ── */
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  const [editForm, setEditForm] = useState({
    fullName: profile?.fullName || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    community: profile?.branch || profile?.community || '',
    photoFile: null,
  });

  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  
  const [activityPage, setActivityPage] = useState(1);
  const [activityList, setActivityList] = useState([]);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);

  const [dynamicBranches, setDynamicBranches] = useState([]);
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await fetch(`${API}/api/public/branches`);
        const data = await res.json();
        if (data.success) setDynamicBranches(data.branches || []);
      } catch (e) { console.error('Failed to load branches', e); }
    };
    loadBranches();
  }, []);

  const groupedBranches = dynamicBranches.reduce((acc, b) => {
    let province = b.province;
    if (!province && b.address) {
      const parts = b.address.split(', ');
      if (parts.length > 0) province = parts[0];
    }
    province = province || 'Other Provinces';
    if (!acc[province]) acc[province] = [];
    acc[province].push(b.name);
    return acc;
  }, {});
  const provinceOrder = Object.keys(groupedBranches).sort();

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditForm(prev => ({ ...prev, photoFile: file }));
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    setFormError('');
    if (!editForm.fullName.trim()) { setFormError('Full name is required.'); return; }
    setIsSaving(true);
    try {
      let uploadedPhotoUrl = null;
      if (editForm.photoFile && photoPreview) {
        const token = localStorage.getItem('token');
        const photoRes = await fetch(`${API}/api/upload-photo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photoBase64: photoPreview })
        });
        const photoData = await photoRes.json();
        if (!photoRes.ok) throw new Error(photoData.message || 'Failed to upload photo');
        uploadedPhotoUrl = photoData.photoUrl;
      }

      const emailChanged = editForm.email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase();
      if (emailChanged) {
        if (!editForm.email.includes('@') || !editForm.email.includes('.')) {
          setFormError('Please enter a valid email address.'); return;
        }
        const reqResult = await requestEmailChange(editForm.email.trim());
        if (!reqResult.success) { setFormError(reqResult.message || 'Failed to send verification email.'); return; }
        setPendingEmail(editForm.email.trim());
        setShowEmailOtp(true);
        return;
      }
      const result = await updateProfile({
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        branch: editForm.community,
        photoUrl: uploadedPhotoUrl || profile?.photoUrl,
      });
      if (!result.success) { setFormError(result.message || 'Failed to update profile.'); return; }
      setIsEditing(false);
    } catch (err) {
      setFormError(err.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyEmailOtp = async (otp) => {
    const verifyResult = await verifyEmailChange(pendingEmail, otp);
    if (!verifyResult.success) return { success: false, message: verifyResult.message };
    await updateProfile({ fullName: editForm.fullName.trim(), phone: editForm.phone.trim(), branch: editForm.community });
    setShowEmailOtp(false);
    setIsEditing(false);
    return { success: true };
  };

  const handleResendEmailOtp = async () => await requestEmailChange(pendingEmail);
  const handleCancelEmailOtp = () => { setShowEmailOtp(false); setPendingEmail(''); setIsSaving(false); };

  const handleCancelEdit = () => {
    setEditForm({ fullName: profile?.fullName || '', email: user?.email || '', phone: profile?.phone || '', community: profile?.branch || profile?.community || '', photoFile: null });
    setPhotoPreview(null);
    setFormError('');
    setIsEditing(false);
  };
  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.ok ? res.json() : { success: false });

  const { data: dData, isValidating: dValidating } = useSWR(token ? `${API}/api/donations/my-donations` : null, fetcherSingle, { revalidateOnFocus: false });
  const { data: attData, isValidating: attValidating } = useSWR(token ? `${API}/api/attendance/my-attendance` : null, fetcherSingle, { revalidateOnFocus: false });
  const { data: loanData, isValidating: loanValidating } = useSWR(token ? `${API}/api/loans/my-loans` : null, fetcherSingle, { revalidateOnFocus: false });
  const { data: savData, isValidating: savValidating } = useSWR(token ? `${API}/api/savings/stats` : null, fetcherSingle, { revalidateOnFocus: false });
  const { data: savGoalsData, isValidating: savGoalsValidating } = useSWR(token ? `${API}/api/savings/goals` : null, fetcherSingle, { revalidateOnFocus: false });

  const loading = (!dData && dValidating) || (!attData && attValidating) || (!loanData && loanValidating) || (!savData && savValidating) || (!savGoalsData && savGoalsValidating) || activityLoading;

  const donations = useMemo(() => dData?.donations?.filter(d => d.status === 'confirmed') || [], [dData]);
  const attendance = useMemo(() => attData?.attendance || [], [attData]);
  const loanStats = useMemo(() => {
    const loans = loanData?.loans || [];
    return {
      completed: loans.filter(l => l.status === 'completed').length,
      active: loans.filter(l => l.status === 'active').length,
      total: loans.length
    };
  }, [loanData]);
  const savingsStats = useMemo(() => {
    const goals = savGoalsData?.success ? (savGoalsData.goals || []) : [];
    return {
      totalSavings: savData?.stats?.totalSavings || 0,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      activeGoals: goals.filter(g => g.status === 'active').length,
    };
  }, [savData, savGoalsData]);
  
  useEffect(() => {
    const fetchActivity = async () => {
      setActivityLoading(true);
      try {
        const res = await fetch(`${API}/api/profile/activity?page=${activityPage}&limit=5`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) {
          if (activityPage === 1) {
            setActivityList(data.activities);
          } else {
            setActivityList(prev => [...prev, ...data.activities]);
          }
          setHasMoreActivity(data.hasMore);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setActivityLoading(false);
      }
    };
    if (token) fetchActivity();
  }, [activityPage, token]);

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
  const avatarSrc = photoPreview || profile?.photoUrl || null;
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
      {showEmailOtp && (
        <VerifyEmailModal
          isOpen={showEmailOtp}
          onClose={handleCancelEmailOtp}
          email={pendingEmail}
          onVerify={handleVerifyEmailOtp}
          onResend={handleResendEmailOtp}
        />
      )}
      {/* ── Hero Header ── */}
      <div className="up-hero">
        <div className="up-hero__bg" />
        <div className="up-hero__content">
          <div className="up-hero__avatar" onClick={() => isEditing && document.getElementById('up-hero-photo-input').click()} style={{ cursor: isEditing ? 'pointer' : 'default' }}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile" />
            ) : (
              <span className="up-hero__avatar-text">
                {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            )}
            {isEditing ? (
              <div className="up-hero__avatar-edit" title="Change Photo">
                <Edit size={14} />
              </div>
            ) : (
              <button className="up-hero__avatar-edit" onClick={() => setIsEditing(true)} title="Edit Profile">
                <Edit2 size={14} />
              </button>
            )}
            <input id="up-hero-photo-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
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
              {!isEditing && (
                <button className="up-card__edit-btn" onClick={() => setIsEditing(true)}>
                  <Edit2 size={13} />
                  Edit
                </button>
              )}
            </div>
            
            {formError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <XCircle size={16} color="#F04438" />
                <span style={{ fontSize: 13, color: '#B91C1C' }}>{formError}</span>
              </div>
            )}

            {isEditing ? (
              <div className="up-info-form">
                <div className="up-info-item-edit">
                  <label className="up-info-label">Full Name</label>
                  <input type="text" className="up-info-input" value={editForm.fullName} disabled={true} />
                </div>
                <div className="up-info-item-edit">
                  <label className="up-info-label">Email address</label>
                  <input type="email" className="up-info-input" value={editForm.email} onChange={e => handleEditChange('email', e.target.value)} />
                </div>
                <div className="up-info-item-edit">
                  <label className="up-info-label">Phone number</label>
                  <input type="tel" className="up-info-input" value={editForm.phone} onChange={e => handleEditChange('phone', e.target.value)} />
                </div>
                <div className="up-info-item-edit">
                  <label className="up-info-label">Community</label>
                  <select className="up-info-input" value={editForm.community} onChange={e => handleEditChange('community', e.target.value)}>
                    <option value="">— Select Community —</option>
                    {provinceOrder.map(prov => (
                      <optgroup key={prov} label={prov}>
                        {groupedBranches[prov].map(p => <option key={p}>{p}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="up-info-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button onClick={handleCancelEdit} disabled={isSaving} style={{ padding: '8px 16px', background: '#F3F4F6', color: '#374151', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>Cancel</button>
                  <button onClick={handleSaveChanges} disabled={isSaving} style={{ padding: '8px 16px', background: '#155DFC', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {/* Recent Activity */}
          <div className="up-card">
            <div className="up-card__header">
              <h2 className="up-card__title">
                <Clock size={16} />
                Recent Activity
              </h2>
            </div>
            {activityLoading && activityPage === 1 ? (
              <div className="up-activity-skel">
                {[1, 2, 3].map(i => <div key={i} className="up-skel-row" />)}
              </div>
            ) : activityList.length === 0 ? (
              <div className="up-empty">
                <Clock size={28} strokeWidth={1.5} />
                <p>No recent activity yet.</p>
              </div>
            ) : (
              <div className="up-activity-list">
                {activityList.map((a, i) => (
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
                {hasMoreActivity && (
                  <button 
                    className="up-view-more-btn" 
                    onClick={() => setActivityPage(prev => prev + 1)}
                    disabled={activityLoading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'transparent',
                      border: '1px dashed var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-muted)',
                      cursor: activityLoading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      marginTop: '8px',
                      transition: 'all 0.2s',
                      opacity: activityLoading ? 0.5 : 1
                    }}
                    onMouseOver={(e) => { if (!activityLoading) { e.target.style.background = 'var(--bg)'; e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; } }}
                    onMouseOut={(e) => { if (!activityLoading) { e.target.style.background = 'transparent'; e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; } }}
                  >
                    {activityLoading ? 'Loading...' : 'View More'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
