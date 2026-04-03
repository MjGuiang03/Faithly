import { useState } from 'react';
import puacLogo from '../../assets/puaclogo.png';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ResetPassword from '../components/ResetPassword';
import '../styles/Welcome.css';
import { Banknote, CalendarDays, Heart, MapPin, User } from 'lucide-react';


const features = [
  {
    icon: (
      <Banknote size={20} />
    ),
    title: 'Loan Management',
    desc: 'Apply for loans instantly and monitor status, due dates, and repayment milestones in real-time.',
  },
  {
    icon: (
      <CalendarDays size={20} />
    ),
    title: 'Savings Goals',
    desc: 'Set, track, and achieve your personal savings goals with a clear visual progress tracker.',
  },
  {
    icon: (
      <Heart size={20} />
    ),
    title: 'Donations & Payments',
    desc: 'Seamless giving with multiple payment channels. Submit proof and track every donation effortlessly.',
    badges: ['GCash', 'Bank', 'Cash'],
  },
  {
    icon: (
      <CalendarDays size={20} />
    ),
    title: 'Attendance Tracking',
    desc: 'Real-time digital attendance recording. View your full history anytime, from anywhere.',
  },
  {
    icon: (
      <CalendarDays size={20} />
    ),
    title: 'Branch Announcements',
    desc: 'Stay updated with real-time, branch-specific church announcements and upcoming events.',
  },
  {
    icon: (
      <User size={20} />
    ),
    title: 'Member Profiles',
    desc: 'Comprehensive personal profiles with church records, account details, and full history.',
  },
  {
    icon: (
      <User size={20} />
    ),
    title: 'Church Branches',
    desc: 'View all branches and locations with maps, contact details, and service schedules.',
  },
  {
    icon: (
      <CalendarDays size={20} />
    ),
    title: 'Chatbot Assistant',
    desc: 'Our built-in chatbot provides instant support for questions about loans, donations, and services — anytime, day or night.',
  },
  {
    icon: (
      <CalendarDays size={20} />
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

      </section>

      {/* ── STATS BAND ── */}
      <div className="fl-stats-band">
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">2,340+</span>
          <span className="fl-stat-band-label">Active Members</span>
        </div>
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">9</span>
          <span className="fl-stat-band-label">Church Branches</span>
        </div>
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">100%</span>
          <span className="fl-stat-band-label">Secure &amp; Encrypted</span>
        </div>
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">24/7</span>
          <span className="fl-stat-band-label">AI Support</span>
        </div>
      </div>

      {/* ── HERO LOGIN CARD ── */}
      <section className="fl-hero-bottom">
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
                    <Banknote size={20} />
                  </div>
                  Real-time loan tracking &amp; repayment status
                </div>
                <div className="fl-perk">
                  <div className="fl-perk-icon">
                    <Heart size={20} />
                  </div>
                  GCash &amp; bank transfer donations
                </div>
                <div className="fl-perk">
                  <div className="fl-perk-icon">
                    <CalendarDays size={20} />
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
          <MapPin size={20} />
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