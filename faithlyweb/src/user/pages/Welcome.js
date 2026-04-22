import { useState, useEffect } from 'react';
import puacLogo from '../../assets/puaclogo.png';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ResetPassword from '../components/ResetPassword';
import '../styles/Welcome.css';
import {
  Banknote,
  PiggyBank,
  Heart,
  ClipboardCheck,
  Bell,
  UserCircle,
  MapPin,
  MessageCircle,
  FileText,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';

// Event Images
import divineServiceImg from '../../assets/events/divine_service.png';
import summerYouthCampImg from '../../assets/events/summer youth camp.png';
import womenFellowshipImg from '../../assets/events/women_fellowship.png';
import youthFellowshipImg from '../../assets/events/youth_fellowship.png';
import thanksgivingImg from '../../assets/events/thanksgiving.png';
import { useRef } from 'react';

const features = [
  {
    icon: <Banknote size={20} />,
    title: 'Loan Management',
    desc: 'Apply for loans instantly and monitor status, due dates, and repayment milestones in real-time.',
  },
  {
    icon: <PiggyBank size={20} />,
    title: 'Savings Goals',
    desc: 'Set, track, and achieve your personal savings goals with a clear visual progress tracker.',
  },
  {
    icon: <Heart size={20} />,
    title: 'Donations & Payments',
    desc: 'Seamless giving with multiple payment channels. Submit proof and track every donation effortlessly.',
    badges: ['GCash', 'Bank', 'Cash'],
  },
  {
    icon: <ClipboardCheck size={20} />,
    title: 'Attendance Tracking',
    desc: 'Real-time digital attendance recording. View your full history anytime, from anywhere.',
  },
  {
    icon: <Bell size={20} />,
    title: 'Branch Announcements',
    desc: 'Stay updated with real-time, branch-specific church announcements and upcoming events.',
  },
  {
    icon: <UserCircle size={20} />,
    title: 'Member Profiles',
    desc: 'Comprehensive personal profiles with church records, account details, and full history.',
  },
  {
    icon: <MapPin size={20} />,
    title: 'Church Branches',
    desc: 'View all branches and locations with maps, contact details, and service schedules.',
  },
  {
    icon: <MessageCircle size={20} />,
    title: 'Chatbot Assistant',
    desc: 'Our built-in chatbot provides instant support for questions about loans, donations, and services — anytime, day or night.',
  },
  {
    icon: <FileText size={20} />,
    title: 'Repayment Tracking',
    desc: 'Submit payment proofs and track loan repayment status in real-time with a clean dashboard.',
  },
];

const heroSlides = [
  { img: divineServiceImg, label: 'Morning Divine Service', sub: 'Every Sunday · All Branches' },
  { img: summerYouthCampImg, label: 'Youth Camp 2025', sub: 'Annual · Tagaytay' },
  { img: womenFellowshipImg, label: "Women's Fellowship", sub: 'Monthly · Main Branch' },
  { img: youthFellowshipImg, label: 'Youth Fellowship Night', sub: 'Monthly · All Branches' },
  { img: thanksgivingImg, label: 'Thanksgiving Anniversary', sub: 'Annual · Main Venue' },
];



export default function Welcome() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'reset'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Carousel States
  const [activeSlide, setActiveSlide] = useState(heroSlides.length);
  const [heroTransitionEnabled, setHeroTransitionEnabled] = useState(true);

  // Refined Logic States
  const [isScrolled, setIsScrolled] = useState(false);
  const statsRef = useRef(null);
  const [statsInView, setStatsInView] = useState(false);
  const [counts, setCounts] = useState({ members: 0, branches: 0, secure: 0, support: 0 });

  // Tripled sets for seamless infinite loop
  const tripledHeroSlides = [...heroSlides, ...heroSlides, ...heroSlides];

  // Hero carousel auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => prev + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, []);



  // Infinite loop snap — hero
  const handleHeroTransitionEnd = () => {
    if (activeSlide >= heroSlides.length * 2) {
      setHeroTransitionEnabled(false);
      setActiveSlide(heroSlides.length);
    }
  };



  // Re-enable transitions after snap
  useEffect(() => {
    if (!heroTransitionEnabled) {
      const t = setTimeout(() => setHeroTransitionEnabled(true), 50);
      return () => clearTimeout(t);
    }
  }, [heroTransitionEnabled]);



  // Refined: Scroll & Intersection Logic
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            if (entry.target.id === 'stats-band') setStatsInView(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll('.fl-reveal').forEach((el) => observer.observe(el));
    if (statsRef.current) observer.observe(statsRef.current);

    return () => observer.disconnect();
  }, []);

  // Animated Stats Counter
  useEffect(() => {
    if (!statsInView) return;

    const targets = { members: 2340, branches: 9, secure: 100, support: 24 };
    const duration = 2000; // 2 seconds
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easeOutQuad = (t) => t * (2 - t);
      
      setCounts({
        members: Math.floor(targets.members * easeOutQuad(progress)),
        branches: Math.floor(targets.branches * easeOutQuad(progress)),
        secure: Math.floor(targets.secure * easeOutQuad(progress)),
        support: Math.floor(targets.support * easeOutQuad(progress)),
      });

      if (frame === totalFrames) clearInterval(counter);
    }, frameDuration);

    return () => clearInterval(counter);
  }, [statsInView]);

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
    setMobileMenuOpen(false);
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };



  return (
    <div className="fl-page">

      {/* ── NAV ── */}
      <nav className={`fl-nav${isScrolled ? ' fl-nav--scrolled' : ''}`}>
        <div className="fl-nav-brand">
          <div className="fl-nav-logo">
            <img src={puacLogo} alt="PUAC Logo" />
          </div>
          {/* Gold dot appended via CSS ::after */}
          <span className="fl-nav-brand-name">FaithLy</span>
        </div>
        
        <ul className="fl-nav-links">
          <li><a href="#features" onClick={scrollToFeatures}>Features</a></li>
          <li><a href="#about">About</a></li>
          <li>
            <button className="fl-nav-btn" onClick={scrollToLogin}>Sign In</button>
          </li>
        </ul>
        <button 
          className="fl-nav-mobile-btn" 
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open Menu"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile Drawer Backdrop */}
      <div 
        className={`fl-drawer-backdrop${mobileMenuOpen ? ' visible' : ''}`} 
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Fullscreen Drawer — Moved outside nav to avoid backdrop-filter clipping */}
      <div className={`fl-mobile-drawer${mobileMenuOpen ? ' open' : ''}`}>
        <div className="fl-mobile-drawer-header">
          {/* Header empty or just for close — per user request to remove logo/name */}
          <div className="fl-sidebar-brand-spacer" />
          <button 
            className="fl-mobile-drawer-close" 
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={28} />
          </button>
        </div>

        <div className="fl-mobile-drawer-content">
          <ul className="fl-mobile-drawer-links">
            <li><a href="#features" onClick={scrollToFeatures}>Features</a></li>
            <li><a href="#about" onClick={() => setMobileMenuOpen(false)}>About Us</a></li>
            <li>
              <a 
                href="#login" 
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToLogin();
                }}
              >
                Sign In
              </a>
            </li>
          </ul>
        </div>

        <div className="fl-mobile-drawer-footer">
          <p className="fl-mobile-drawer-contact">
            puac.portal@church.com<br />
            Philippine United Apostolic Church
          </p>
        </div>
      </div>

      {/* ── HERO ── */}
      {/*
        Grid layout:
          col 1: fl-hero-left-content  (text, buttons, dots)
          col 2: fl-hero-carousel      (bleeds to right viewport edge)
          row 2: fl-events-carousel-section (spans full width)
      */}
      <section className="fl-hero">

        {/* ── Left Content ── */}
        <div className="fl-hero-left-content">
          {/* Pill — outside h1 to keep valid HTML */}
          <span className="fl-hero-pill-inline">
            <span className="fl-live-dot" />
            PHILIPPINE UNITED APOSTOLIC CHURCH
          </span>

          <h1 className="fl-hero-title">
            Your Church,<br /><em>Closer</em> Than Ever
          </h1>

          <div className="fl-hero-btns">
            <button className="fl-hero-btn-primary" onClick={scrollToLogin}>
              Sign In to Portal
            </button>
            <button className="fl-hero-btn-outline" onClick={scrollToFeatures}>
              Explore Features
            </button>
          </div>

          {/* Subtitle placed after buttons as a quiet footnote */}
          <p className="fl-hero-church-muted">Church Portal &amp; Community Platform</p>
          <p className="fl-hero-desc">
            Access loans, make donations, track attendance, and stay connected with your church community — all in one secure platform built for faith.
          </p>

          {/* Carousel dots live in left column */}
          <div className="fl-hero-carousel-dots">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                className={`fl-hero-dot ${activeSlide % heroSlides.length === i ? 'active' : ''}`}
                onClick={() => {
                  setHeroTransitionEnabled(true);
                  setActiveSlide(heroSlides.length + i);
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ── Right: Hero Carousel — flush right bleed ── */}
        <div className="fl-hero-carousel">
          <div
            className={`fl-hero-carousel-track${!heroTransitionEnabled ? ' no-transition' : ''}`}
            onTransitionEnd={handleHeroTransitionEnd}
            style={{ transform: `translateY(calc(-${activeSlide} * var(--hero-step, 100vh)))` }}
          >
            {tripledHeroSlides.map((slide, i) => (
              <div
                key={i}
                className="fl-hero-slide"
              >
                <img src={slide.img} alt={slide.label} className="fl-hero-slide-img" />
                {/* Large watermark number (01-05) */}
                <span className="fl-hero-slide-num">
                  {String((i % heroSlides.length) + 1).padStart(2, '0')}
                </span>
                <div className="fl-hero-slide-overlay" />
                <div className="fl-hero-slide-caption">
                  <div className="fl-slide-label">{slide.label}</div>
                  <div className="fl-slide-sub">{slide.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>



      </section>

      {/* ── STATS BAND ── */}
      <div className="fl-stats-band fl-reveal" id="stats-band" ref={statsRef}>
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">{counts.members.toLocaleString()}+</span>
          <span className="fl-stat-band-label">Active Members</span>
        </div>
        <div className="fl-stat-divider" />
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">{counts.branches}</span>
          <span className="fl-stat-band-label">Church Branches</span>
        </div>
        <div className="fl-stat-divider" />
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">{counts.secure}%</span>
          <span className="fl-stat-band-label">Secure &amp; Encrypted</span>
        </div>
        <div className="fl-stat-divider" />
        <div className="fl-stat-item">
          <span className="fl-stat-band-num">{counts.support}/7</span>
          <span className="fl-stat-band-label">AI Support</span>
        </div>
      </div>

      {/* ── LOGIN SECTION ── */}
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
                  <div className="fl-perk-icon"><Banknote size={16} /></div>
                  Real-time loan tracking &amp; repayment status
                </div>
                <div className="fl-perk">
                  <div className="fl-perk-icon"><Heart size={16} /></div>
                  GCash &amp; bank transfer donations
                </div>
                <div className="fl-perk">
                  <div className="fl-perk-icon"><Bell size={16} /></div>
                  Branch-specific announcements &amp; updates
                </div>
              </div>
            </div>

            {/* Right — embedded login/reset form */}
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
        <div className="fl-section-center fl-reveal">
          <p className="fl-eyebrow fl-eyebrow-center">Everything You Need</p>
          <h2 className="fl-section-heading fl-text-center">All in <em>One Place</em></h2>
          <p className="fl-section-body fl-text-center fl-mx-auto">
            Our platform gives every church member the tools to manage finances and stay connected — designed to be simple for all ages.
          </p>
        </div>
        <div className="fl-features-grid">
          {features.map((f, i) => (
            <div className="fl-feature-card" key={i} data-index={String(i + 1).padStart(2, '0')}>
              <div className="fl-feat-icon-wrap">{f.icon}</div>
              <h4>
                {f.title}
                <ArrowRight className="fl-feat-arrow" size={15} />
              </h4>
              <p>{f.desc}</p>
              {f.badges && (
                <div className="fl-payment-badges">
                  {f.badges.map((b) => (
                    <span className="fl-badge" key={b}>{b}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="fl-cta fl-reveal">
        <p className="fl-cta-eyebrow">Get Started Today</p>
        <h2 className="fl-cta-title">Join Our <em>Growing Community</em> Today</h2>
        <p className="fl-cta-body">
          Create your account and access everything your church community has to offer — all in one secure place.
        </p>
        <button className="fl-btn-gold" onClick={handleOpenSignup}>
          Create Your Account
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer className="fl-footer" id="about">
        <div className="fl-footer-content">
          <div className="fl-footer-info">
            <p className="fl-footer-copy">
              © 2026 FaithLy. All rights reserved.<br />
              Philippine United Apostolic Church Portal
            </p>
          </div>
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