/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ResetPassword from '../components/ResetPassword';
import DonationInfoModal from '../components/DonationInfoModal';
import puacLogo from '../../assets/puaclogo.png';
import puacCongregation from '../../assets/IMG_8437.JPG';
import puacPastor from '../../assets/IMG_8439.JPG';
import puacCommunity from '../../assets/IMG_8443.JPG';
import thanksgiving from '../../assets/events/thanksgiving.png';
import summerYouthCamp from '../../assets/events/summer youth camp.png';
import womenFellowship from '../../assets/events/women_fellowship.png';
import youthFellowship from '../../assets/events/youth_fellowship.png';
import divineService from '../../assets/events/divine_service.png';
import '../styles/WelcomePage.css';

export default function WelcomePage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Auth Modals State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);

  useEffect(() => {
    if (location.pathname === '/reset-password') {
      setShowResetModal(true);
    } else {
      setShowResetModal(false);
    }
  }, [location.pathname]);

  const handleOpenLogin = () => setShowLoginModal(true);
  const handleCloseLogin = () => setShowLoginModal(false);
  
  const handleOpenSignup = () => setShowSignupModal(true);
  const handleCloseSignup = () => setShowSignupModal(false);

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };
  const handleSwitchToReset = () => {
    setShowLoginModal(false);
    setShowResetModal(true);
  };
  const handleSwitchToLoginFromSignup = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };

  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);

  const revealRefs = useRef([]);
  const trackRef = useRef(null);

  const slidesCount = 5;
  const visibleSlides = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2;
  const maxIndex = slidesCount - visibleSlides;

  useEffect(() => {
    // Loader
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // Navbar Scroll
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Scroll Reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('wpt-visible');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });

    // Auto Carousel
    const autoSlide = setInterval(() => {
      setCurrentSlide(prev => prev < maxIndex ? prev + 1 : 0);
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      clearInterval(autoSlide);
    };
  }, [maxIndex]);

  useEffect(() => {
    const updateWidth = () => {
      if (trackRef.current && trackRef.current.children[0]) {
        setSlideWidth(trackRef.current.children[0].offsetWidth + 20);
      }
    };

    updateWidth(); // initial
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const addToRefs = el => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  const handlePrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));
  const handleNext = () => setCurrentSlide(prev => Math.min(maxIndex, prev + 1));
  const goTo = (index) => setCurrentSlide(Math.max(0, Math.min(index, maxIndex)));

  return (
    <>
    <div className="wpt-wrapper">
      {/* LOADER */}
      <div id="wpt-loader" className={`wpt-loader ${!loading ? 'wpt-done' : ''}`}>
        <img src={puacLogo} alt="PUAC Logo" className="wpt-loader-logo" />
        <div className="wpt-loader-text">Philippine United Apostolic Church</div>
        <div className="wpt-loader-bar"><div className="wpt-loader-fill"></div></div>
      </div>

      {/* TICKER */}
      <div className="wpt-ticker-wrap">
        <div className="wpt-ticker-inner">
          <span className="wpt-ticker-label">📢 Announcements</span>
          <div className="wpt-ticker-track" id="wpt-tickerTrack">
            <span className="wpt-ticker-item">Sunday Service — 9:00 AM &amp; 6:00 PM<span className="wpt-ticker-sep">✦</span>Youth Gathering — Every Friday 7:00 PM<span className="wpt-ticker-sep">✦</span>Monthly Thanksgiving Offering — 3rd Sunday<span className="wpt-ticker-sep">✦</span>Prayer &amp; Fasting Week — July 14–18<span className="wpt-ticker-sep">✦</span>New Branch Opening — Caloocan District<span className="wpt-ticker-sep">✦</span>Online Giving now available via GCash &amp; Maya<span className="wpt-ticker-sep">✦</span>Sunday Service — 9:00 AM &amp; 6:00 PM<span className="wpt-ticker-sep">✦</span>Youth Gathering — Every Friday 7:00 PM<span className="wpt-ticker-sep">✦</span>Monthly Thanksgiving Offering — 3rd Sunday<span className="wpt-ticker-sep">✦</span>Prayer &amp; Fasting Week — July 14–18<span className="wpt-ticker-sep">✦</span>New Branch Opening — Caloocan District<span className="wpt-ticker-sep">✦</span>Online Giving now available via GCash &amp; Maya</span>
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav id="wpt-navbar" className={`wpt-nav ${scrolled ? 'wpt-scrolled' : ''}`}>
        <a href="#home" className="wpt-nav-logo">
          <img src={puacLogo} alt="PUAC Logo" className="wpt-logo-img" />
          <div className="wpt-nav-name">
            PUAC
          </div>
        </a>
        <ul className="wpt-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#gallery">Gallery</a></li>
          <li><a href="#/" onClick={(e) => { e.preventDefault(); setShowDonationModal(true); }}>Give</a></li>
          <li><a href="#/" className="wpt-nav-cta" onClick={(e) => { e.preventDefault(); handleOpenLogin(); }}>Log In</a></li>
        </ul>
      </nav>

      {/* WELCOME SECTION */}
      <section className="wpt-welcome-section">
        <div className="wpt-welcome-bg">
          <div className="wpt-welcome-bg-left"></div>
          <div className="wpt-welcome-bg-right"></div>
          <div className="wpt-welcome-cross-watermark"></div>
          <div className="wpt-welcome-ring wpt-welcome-ring-1"></div>
          <div className="wpt-welcome-ring wpt-welcome-ring-2"></div>
          <div className="wpt-welcome-ring wpt-welcome-ring-3"></div>
        </div>

        <div className="wpt-welcome-inner">
          <div className="wpt-welcome-left">
            <div className="wpt-welcome-divider">
              <div className="wpt-welcome-divider-line"></div>
              <div className="wpt-welcome-divider-cross">✦</div>
              <div className="wpt-welcome-divider-line"></div>
            </div>

            <h1 className="wpt-welcome-headline">
              Philippine United Apostolic Church
            </h1>

            <p className="wpt-welcome-body">
              We are a community of believers committed to transforming lives across the Philippines through faith, fellowship, and digital empowerment.
            </p>

          </div>

          <div className="wpt-welcome-right">
            <div className="wpt-welcome-photo-grid">
              <div className="wpt-welcome-photo wpt-welcome-photo-main wpt-reveal" ref={addToRefs}>
                <img src={puacPastor} alt="PUAC Congregation Worship" />
              </div>
              <div className="wpt-welcome-photo wpt-reveal wpt-delay-10" ref={addToRefs}>
                <img src={puacCongregation} alt="PUAC Pastor Preaching" />
              </div>
              <div className="wpt-welcome-photo wpt-reveal wpt-delay-20" ref={addToRefs}>
                <img src={puacCommunity} alt="PUAC Community Gathering" />
              </div>
            </div>
          </div>
        </div>

        <div className="wpt-welcome-scroll-cue">
          <span className="wpt-scroll-label">Scroll to Explore</span>
          <span className="wpt-scroll-arrow">↓</span>
        </div>
      </section>

      {/* HERO */}
      <section className="wpt-hero" id="home">
        <div className="wpt-hero-bg">
          <div className="wpt-hero-bg-arc"></div>
          <div className="wpt-hero-bg-dot"></div>
          <div className="wpt-hero-bg-dot2"></div>
          <div className="wpt-hero-cross-bg"></div>
        </div>
        <div className="wpt-hero-inner">
          <div className="wpt-hero-content">
            {/* <div className="wpt-hero-eyebrow"><span></span>Philippine United Apostolic Church</div> */}
            <h1 className="wpt-hero-title">Built on <em>Faith,</em><br />Serving with <em>Purpose</em></h1>
            <p className="wpt-hero-sub">A community of believers united in worship, empowered through digital tools to manage savings, give faithfully, and grow together as one body in Christ.</p>
            <div className="wpt-hero-actions">
              <a href="#features" className="wpt-btn-primary">Explore Features →</a>
              <a href="#/" className="wpt-btn-secondary" onClick={(e) => { e.preventDefault(); setShowDonationModal(true); }}>Give Offering</a>
            </div>
            <div className="wpt-hero-stats">
              <div>
                <div className="wpt-hero-stat-num">68</div>
                <div className="wpt-hero-stat-label">Active Branches</div>
              </div>
              <div>
                <div className="wpt-hero-stat-num">3,400+</div>
                <div className="wpt-hero-stat-label">Church Members</div>
              </div>
              <div>
                <div className="wpt-hero-stat-num">24/7</div>
                <div className="wpt-hero-stat-label">Chatbot Support</div>
              </div>
            </div>

          </div>
          <div className="wpt-hero-visual">
            <div className="wpt-hero-card-stack">
              <div className="wpt-hero-card wpt-hero-card-main">
                <div className="wpt-card-cross"></div>
                <div className="wpt-hero-card-main-inner">
                  <h3>Member Dashboard</h3>
                  <p>Loans · Savings · Attendance · Giving</p>
                </div>
              </div>
              <div className="wpt-hero-card wpt-hero-card-float">
                <div className="wpt-float-tag">This Month</div>
                <div>
                  <div className="wpt-float-value">₱84,200</div>
                  <div className="wpt-float-label">Total Donations Received</div>
                </div>
              </div>
              <div className="wpt-hero-gold-bar"></div>
            </div>
          </div>
        </div>
      </section>



      {/* CAROUSEL */}
      <div className="wpt-carousel-section" id="events">
        <div className="wpt-carousel-header wpt-reveal" ref={addToRefs}>
          <div>
            <div className="wpt-section-eyebrow">Church Events</div>
            <div className="wpt-section-title wpt-mb-0">Moments That<br />Move Us</div>
          </div>
          <div className="wpt-carousel-controls">
            <button className="wpt-carousel-btn" onClick={handlePrev}>←</button>
            <button className="wpt-carousel-btn" onClick={handleNext}>→</button>
          </div>
        </div>
        <div className="wpt-carousel-track-wrap">
          <div className="wpt-carousel-track" ref={trackRef} style={{ transform: slideWidth ? `translateX(-${currentSlide * slideWidth}px)` : 'none' }}>
            <div className="wpt-carousel-slide">
              <img src={thanksgiving} alt="Annual Convention" className="wpt-carousel-img-placeholder" style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '12px' }} />
              <div className="wpt-carousel-overlay">
                <div className="wpt-carousel-tag">Annual Convention</div>
                <div className="wpt-carousel-slide-title">National Apostolic Convention 2025</div>
              </div>
            </div>
            <div className="wpt-carousel-slide">
              <img src={summerYouthCamp} alt="Youth Ministry" className="wpt-carousel-img-placeholder" style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '12px' }} />
              <div className="wpt-carousel-overlay">
                <div className="wpt-carousel-tag">Youth Ministry</div>
                <div className="wpt-carousel-slide-title">Youth Leadership Summit — Cebu</div>
              </div>
            </div>
            <div className="wpt-carousel-slide">
              <img src={womenFellowship} alt="Outreach" className="wpt-carousel-img-placeholder" style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '12px' }} />
              <div className="wpt-carousel-overlay">
                <div className="wpt-carousel-tag">Outreach</div>
                <div className="wpt-carousel-slide-title">Community Feeding &amp; Medical Mission</div>
              </div>
            </div>
            <div className="wpt-carousel-slide">
              <img src={youthFellowship} alt="Worship Night" className="wpt-carousel-img-placeholder" style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '12px' }} />
              <div className="wpt-carousel-overlay">
                <div className="wpt-carousel-tag">Worship Night</div>
                <div className="wpt-carousel-slide-title">All-Night Prayer &amp; Praise — Main Sanctuary</div>
              </div>
            </div>
            <div className="wpt-carousel-slide">
              <img src={divineService} alt="Baptism Sunday" className="wpt-carousel-img-placeholder" style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '12px' }} />
              <div className="wpt-carousel-overlay">
                <div className="wpt-carousel-tag">Baptism Sunday</div>
                <div className="wpt-carousel-slide-title">Water Baptism — 47 New Believers</div>
              </div>
            </div>
          </div>
        </div>
        <div className="wpt-carousel-dots">
          {[...Array(maxIndex + 1)].map((_, i) => (
            <div key={i} className={`wpt-dot ${currentSlide === i ? 'wpt-active' : ''}`} onClick={() => goTo(i)}></div>
          ))}
        </div>
      </div>

      {/* VERSE BANNER */}
      <div className="wpt-verse-banner wpt-reveal" ref={addToRefs}>
        <div className="wpt-verse-cross-bg"></div>
        <div className="wpt-verse-text">"For where two or three are gathered in my name, there am I among them."</div>
        <div className="wpt-verse-ref">Matthew 18:20 · ESV</div>
      </div>

      {/* FEATURES */}
      <section className="wpt-features-section" id="features">
        <div className="wpt-section-inner">
          <div className="wpt-features-header">
            <div className="wpt-reveal-left" ref={addToRefs}>
              <div className="wpt-section-eyebrow">System Features</div>
              <div className="wpt-section-title">Everything Your<br />Church Needs</div>
            </div>
            <p className="wpt-section-sub wpt-reveal-right" ref={addToRefs}>A complete digital platform built for Filipino apostolic churches — from financial tools to member management, all in one place.</p>
          </div>
          <div className="wpt-features-grid">
            <div className="wpt-feature-card wpt-reveal wpt-delay-05" ref={addToRefs}>
              <div className="wpt-feature-icon">💳</div>
              <h3>Loan Management &amp; Repayment</h3>
              <p>Track church loans, set repayment schedules, and receive automated reminders for members and leadership.</p>
              <div className="wpt-feature-tag">Finance</div>
            </div>
            <div className="wpt-feature-card wpt-reveal wpt-delay-10" ref={addToRefs}>
              <div className="wpt-feature-icon">🎯</div>
              <h3>Savings Goals</h3>
              <p>Set personal and group savings targets, monitor progress, and celebrate milestones together as a congregation.</p>
              <div className="wpt-feature-tag">Savings</div>
            </div>
            <div className="wpt-feature-card wpt-reveal wpt-delay-15" ref={addToRefs}>
              <div className="wpt-feature-icon">🙏</div>
              <h3>Donations &amp; Payments</h3>
              <p>Accept tithes and offerings via GCash, Maya, bank transfer, or cash — all recorded automatically.</p>
              <div className="wpt-feature-tag">Giving</div>
            </div>
            <div className="wpt-feature-card wpt-reveal wpt-delay-20" ref={addToRefs}>
              <div className="wpt-feature-icon">📋</div>
              <h3>Attendance Tracking</h3>
              <p>Maintain digital member profiles, log service attendance, and generate attendance reports per branch.</p>
              <div className="wpt-feature-tag">Members</div>
            </div>
            <div className="wpt-feature-card wpt-reveal wpt-delay-25" ref={addToRefs}>
              <div className="wpt-feature-icon">📢</div>
              <h3>Branch Announcements</h3>
              <p>Broadcast updates, post event schedules, and maintain a live branch directory across all locations.</p>
              <div className="wpt-feature-tag">Communication</div>
            </div>
            <div className="wpt-feature-card wpt-reveal wpt-delay-30" ref={addToRefs}>
              <div className="wpt-feature-icon">🤖</div>
              <h3>24/7 Chatbot Assistant</h3>
              <p>Answer member queries, guide new visitors, and provide support around the clock — always available.</p>
              <div className="wpt-feature-tag">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO GRID */}
      <section className="wpt-bento-section" id="gallery">
        <div className="wpt-section-inner">
          <div className="wpt-bento-header wpt-reveal" ref={addToRefs}>
            <div>
              <div className="wpt-section-eyebrow">Giving &amp; Community</div>
              <div className="wpt-section-title wpt-mb-0">One Body,<br />Many Ways to Give</div>
            </div>
            <a href="#/" className="wpt-btn-primary wpt-shrink-0" onClick={(e) => { e.preventDefault(); setShowDonationModal(true); }}>Start Giving →</a>
          </div>
          <div className="wpt-bento-grid" id="donate">
            {/* Big left tile */}
            <div className="wpt-bento-item wpt-bento-navy wpt-reveal wpt-delay-05" ref={addToRefs}>
              <div className="wpt-bento-cross"></div>
              <div className="wpt-bento-donation-card">
                <div>
                  <div className="wpt-bento-label-gold">Church Giving</div>
                  <h3>Give Faithfully,<br />Give Freely</h3>
                  <p>Your generosity fuels outreach, missions, and community programs. Every peso honors God.</p>
                </div>
                <div>
                  <div className="wpt-mb-12">
                    <div className="wpt-bento-label-faint">Accept via</div>
                    <div className="wpt-bento-donation-methods">
                      <span className="wpt-donation-method">GCash</span>
                      <span className="wpt-donation-method">Maya</span>
                      <span className="wpt-donation-method">BPI / BDO</span>
                      <span className="wpt-donation-method">Cash</span>
                    </div>
                  </div>
                  <a href="#/" className="wpt-btn-gold wpt-btn-inline-mt" onClick={(e) => { e.preventDefault(); setShowDonationModal(true); }}>Give Now →</a>
                </div>
              </div>
            </div>

            {/* Top middle */}
            <div className="wpt-bento-item wpt-bento-light wpt-reveal wpt-delay-10" ref={addToRefs}>
              <div className="wpt-bento-ph wpt-gradient-bento-1"></div>
              <div className="wpt-bento-ph-overlay">
                <div className="wpt-bento-ph-label">Community</div>
                <div className="wpt-bento-ph-title">Sunday Worship Service</div>
              </div>
            </div>

            {/* Top right */}
            <div className="wpt-bento-item wpt-bento-mid wpt-reveal wpt-delay-15" ref={addToRefs}>
              <div className="wpt-bento-cross"></div>
              <div className="wpt-bento-content-card">
                <div className="wpt-bento-label-gold-sm">Mission Fund</div>
                <div className="wpt-bento-title-serif">Outreach &amp; Missions</div>
              </div>
            </div>

            {/* Bottom row 3 items */}
            <div className="wpt-bento-item wpt-bento-pale wpt-reveal wpt-delay-20" ref={addToRefs}>
              <div className="wpt-bento-content-card">
                <div className="wpt-bento-stat wpt-text-navy">₱1.2M</div>
                <div className="wpt-bento-stat-label wpt-text-muted-color">Raised This Year</div>
              </div>
            </div>

            <div className="wpt-bento-item wpt-bento-light wpt-reveal wpt-delay-25" ref={addToRefs}>
              <div className="wpt-bento-ph wpt-gradient-bento-2"></div>
              <div className="wpt-bento-ph-overlay">
                <div className="wpt-bento-ph-label">Outreach</div>
                <div className="wpt-bento-ph-title">Medical Mission 2025</div>
              </div>
            </div>

            <div className="wpt-bento-item wpt-bento-navy wpt-reveal wpt-delay-30 wpt-min-h-180" ref={addToRefs}>
              <div className="wpt-bento-cross"></div>
              <div className="wpt-bento-content-card">
                <div className="wpt-bento-label-gold-md">Donation Categories</div>
                <div className="wpt-flex-wrap-gap">
                  <span className="wpt-donation-method">General Fund</span>
                  <span className="wpt-donation-method">Children's Department</span>
                  <span className="wpt-donation-method">Men's Department</span>
                  <span className="wpt-donation-method">Women's Department</span>
                  <span className="wpt-donation-method">Youth Department</span>
                  <span className="wpt-donation-method">Mission Fund</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="wpt-cta-strip">
        <div className="wpt-section-inner">
          <div className="wpt-cta-inner wpt-reveal" ref={addToRefs}>
            <div className="wpt-relative-z1">
              <div className="wpt-cta-text-label">Get Started Today</div>
              <div className="wpt-cta-title">Join the PUAC Digital Community</div>
              <p className="wpt-cta-sub">Register as a member, access your profile, manage your savings goals, and stay connected with your branch — all from one platform.</p>
            </div>
            <div className="wpt-cta-actions wpt-relative-z1">
              <a href="#/" className="wpt-btn-gold" onClick={(e) => { e.preventDefault(); handleOpenSignup(); }}>Register Now →</a>
            </div>
            <div className="wpt-cta-cross"></div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="wpt-footer">
        <div className="wpt-footer-inner">
          <div className="wpt-footer-top">
            <div className="wpt-footer-brand">
              <a href="#" className="wpt-nav-logo wpt-no-underline">
                <img src={puacLogo} alt="PUAC Logo" className="wpt-logo-img" />
                <div className="wpt-nav-name wpt-text-white wpt-footer-logo-text">
                  Philippine United Apostolic Church
                </div>
              </a>
              <p>A church rooted in apostolic doctrine, committed to transforming communities across the Philippines through faith, fellowship, and digital empowerment.</p>
            </div>
            <div className="wpt-footer-col">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Branches</a></li>
                <li><a href="#">Events</a></li>
                <li><a href="#">Sermons</a></li>
              </ul>
            </div>
            <div className="wpt-footer-col">
              <h4>Member Tools</h4>
              <ul>
                <li><a href="#">Member Login</a></li>
                <li><a href="#">Savings Goals</a></li>
                <li><a href="#">Loan Tracking</a></li>
                <li><a href="#">Attendance</a></li>
              </ul>
            </div>
            <div className="wpt-footer-col">
              <h4>Giving</h4>
              <ul>
                <li><a href="#">General Fund</a></li>
                <li><a href="#">Children's Dept.</a></li>
                <li><a href="#">Men's Dept.</a></li>
                <li><a href="#">Women's Dept.</a></li>
                <li><a href="#">Youth Dept.</a></li>
                <li><a href="#">Mission Fund</a></li>
              </ul>
            </div>
          </div>
          <div className="wpt-footer-bottom">
            <span>© 2026 Philippine United Apostolic Church. All rights reserved.</span>
            <span>Glorifying God · Serving People</span>
          </div>
        </div>
      </footer>
    </div>

      {/* MODALS */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={handleCloseLogin} 
        onSwitchToSignup={handleSwitchToSignup}
        onSwitchToReset={handleSwitchToReset}
      />
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={handleCloseSignup} 
        onSwitchToLogin={handleSwitchToLoginFromSignup}
      />
      <ResetPassword 
        isOpen={showResetModal} 
        onClose={() => {
          setShowResetModal(false);
          if (location.pathname === '/reset-password') {
            navigate('/', { replace: true });
          }
        }} 
      />
      <DonationInfoModal 
        isOpen={showDonationModal} 
        onClose={() => setShowDonationModal(false)} 
      />

    </>
  );
}
