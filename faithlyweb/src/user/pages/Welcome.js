import { useState } from 'react';
import puacLogo from '../../assets/puaclogo.png';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ResetPassword from '../components/ResetPassword';
import '../styles/Welcome.css';

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    ),
    title: 'Loan Management',
    desc: 'Apply for loans instantly and monitor status, due dates, and repayment milestones in real-time.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
    ),
    title: 'Savings Goals',
    desc: 'Set, track, and achieve your personal savings goals with a clear visual progress tracker.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
    ),
    title: 'Donations & Payments',
    desc: 'Seamless giving with multiple payment channels. Submit proof and track every donation effortlessly.',
    badges: ['GCash', 'Bank', 'Cash'],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
    ),
    title: 'Attendance Tracking',
    desc: 'Real-time digital attendance recording. View your full history anytime, from anywhere.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
    ),
    title: 'Branch Announcements',
    desc: 'Stay updated with real-time, branch-specific church announcements and upcoming events.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
    ),
    title: 'Member Profiles',
    desc: 'Comprehensive personal profiles with church records, account details, and full history.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
    ),
    title: 'Church Branches',
    desc: 'View all branches and locations with maps, contact details, and service schedules.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
    ),
    title: 'Chatbot Assistant',
    desc: 'Our built-in chatbot provides instant support for questions about loans, donations, and services — anytime, day or night.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
    ),
    title: 'Repayment Tracking',
    desc: 'Submit payment proofs and track loan repayment status in real-time with a clean dashboard.',
  },
];

export default function Welcome() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'reset'

  const handleOpenSignup = () => setShowSignupModal(true);
  const handleCloseSignup = () => setShowSignupModal(false);
  const handleSwitchToReset = () => setAuthView('reset');
  const handleBackToLogin = () => setAuthView('login');

  const scrollToLogin = () => {
    setAuthView('login');
    document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = (e) => {
    e.preventDefault();
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fl-page">

      {/* ── NAV ── */}
      <nav className="fl-nav">
        <div className="fl-nav-brand">
          <div className="fl-nav-logo">
            <img src={puacLogo} alt="PUAC Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="fl-nav-brand-name">FaithLy</span>
        </div>
        <ul className="fl-nav-links">
          <li><a href="#features" onClick={scrollToFeatures}>Features</a></li>
          <li><a href="#about">About</a></li>
          <li>
            <button className="fl-nav-btn" onClick={scrollToLogin}>Sign In</button>
          </li>
        </ul>
      </nav>

      {/* ── HERO ── */}
      <section className="fl-hero">
        <div className="fl-hero-pill">
          <span className="fl-live-dot"></span>
          PHILIPPINE UNITED APOSTOLIC CHURCH
        </div>
        <h1 className="fl-hero-title">
          Your Church,&nbsp;<br /><em>Closer</em> Than Ever
        </h1>
        <p className="fl-hero-church">Church Portal &amp; Community Platform</p>
        <p className="fl-hero-desc">
          Access loans, make donations, track attendance, and stay connected with your church community — all in one secure platform built for faith.
        </p>

        <div className="fl-hero-btns">
          <button className="fl-hero-btn-primary" onClick={scrollToLogin}>
            Sign In to Portal
          </button>
          <a href="#features" className="fl-hero-btn-outline" onClick={scrollToFeatures}>
            Explore Features
          </a>
        </div>

        {/* ── HERO LOGIN CARD ── */}
        <div className="fl-hero-card-wrap" id="login-section">
          <div className="fl-hero-split">

            {/* Left copy */}
            <div className="fl-hero-left">
              <p className="fl-eyebrow">Member Access</p>
              <h2 className="fl-section-heading">Welcome to <em>FaithLy</em></h2>
              <p className="fl-section-body">
                Sign in to your personalized church portal. Everything you need — loans, donations, attendance, and announcements — is just one login away.
              </p>
              <div className="fl-perks">
                <div className="fl-perk">
                  <div className="fl-perk-icon">
                    <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                  </div>
                  Real-time loan tracking &amp; repayment status
                </div>
                <div className="fl-perk">
                  <div className="fl-perk-icon">
                    <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                  </div>
                  GCash &amp; bank transfer donations
                </div>
                <div className="fl-perk">
                  <div className="fl-perk-icon">
                    <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
                  </div>
                  Branch-specific announcements &amp; updates
                </div>
              </div>
            </div>

            {/* Right — embedded form */}
            <div className="fl-login-right">
              {authView === 'login' ? (
                <LoginModal
                  embedded={true}
                  onSwitchToSignup={handleOpenSignup}
                  onSwitchToReset={handleSwitchToReset}
                />
              ) : (
                <ResetPassword
                  embedded={true}
                  onBackToLogin={handleBackToLogin}
                />
              )}
            </div>

          </div>
        </div>

      </section>

      {/* ── STATS BAND ── */}
      <div className="fl-stats-band">
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">2,340+</span>
          <span className="fl-stat-band-label">Active Members</span>
        </div>
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">68</span>
          <span className="fl-stat-band-label">Church Branches</span>
        </div>
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">100%</span>
          <span className="fl-stat-band-label">Secure &amp; Encrypted</span>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="fl-features" id="features">
        <div className="fl-section-center">
          <p className="fl-eyebrow fl-eyebrow-center">Everything You Need</p>
          <h2 className="fl-section-heading fl-text-center">All in <em>One Place</em></h2>
          <p className="fl-section-body fl-text-center fl-mx-auto">
            Our platform gives every church member the tools to manage finances and stay connected — designed to be simple for all ages.
          </p>
        </div>
        <div className="fl-features-grid">
          {features.map((f, i) => (
            <div className="fl-feature-card" key={i}>
              <div className="fl-feat-icon-wrap">{f.icon}</div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
              {f.badges && (
                <div className="fl-payment-badges">
                  {f.badges.map(b => <span className="fl-badge" key={b}>{b}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="fl-cta">
        <p className="fl-cta-eyebrow">Get Started Today</p>
        <h2 className="fl-cta-title">Join Our <em>Growing Community</em> Today</h2>
        <p className="fl-cta-body">
          Create your account and access everything your church community has to offer — all in one secure place.
        </p>
        <button className="fl-btn-gold" onClick={handleOpenSignup}>Create Your Account</button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="fl-footer">
        <div className="fl-footer-left">
          <div className="fl-footer-logo">
            <img src={puacLogo} alt="PUAC Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="fl-footer-name">FaithLy</span>
        </div>
        <p className="fl-footer-copy">
          © 2026 FaithLy. All rights reserved.<br />Philippine United Apostolic Church Portal
        </p>
        <div className="fl-footer-secure">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Secure &amp; Trusted Platform
        </div>
      </footer>

      {/* ── SIGNUP MODAL ── */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={handleCloseSignup}
        onSwitchToLogin={handleCloseSignup}
      />
    </div>
  );
}