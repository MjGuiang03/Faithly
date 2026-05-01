import React, { useState, useEffect } from 'react';
import './WelcomePage.css';

import imgDivineService from '../../assets/events/divine_service.png';
import imgSummerCamp from '../../assets/events/summer youth camp.png';
import imgThanksgiving from '../../assets/events/thanksgiving.png';
import imgWomenFellowship from '../../assets/events/women_fellowship.png';
import imgYouthFellowship from '../../assets/events/youth_fellowship.png';

const HERO_SLIDES = [
  { id: 0, image: imgDivineService, caption: "Divine Service" },
  { id: 1, image: imgSummerCamp, caption: "27th Summer Youth Camp" },
  { id: 2, image: imgThanksgiving, caption: "Thanksgiving Celebration" },
  { id: 3, image: imgWomenFellowship, caption: "Women's Fellowship" },
  { id: 4, image: imgYouthFellowship, caption: "Youth Fellowship" },
];

export default function WelcomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="welcome-page-wrapper">
      {/* SECTION 1 — NAVIGATION BAR */}
      <nav>
        <div className="nav-logo">
          FaithLy<span>by PUAC</span>
        </div>
        <ul className="nav-links">
          <li><a href="#/">Home</a></li>
          <li><a href="#/">Features</a></li>
          <li><a href="#/">Branches</a></li>
          <li><a href="#/">Contact</a></li>
        </ul>
        <button className="nav-signin">Sign In</button>
      </nav>

      {/* SECTION 2 — HERO */}
      <section className="hero">
        {/* Slideshow Backgrounds */}
        <div className="hero-slideshow">
          {HERO_SLIDES.map((slide, index) => (
            <div 
              key={slide.id}
              className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url("${slide.image}")` }}
            ></div>
          ))}
        </div>

        {/* Dark Overlays */}
        <div className="hero-overlay-gradient"></div>
        <div className="hero-overlay-vignette"></div>

        <svg className="hero-arch" viewBox="0 0 700 700" aria-hidden="true">
          <defs>
            <radialGradient id="archGlow" cx="50%" cy="55%" r="45%">
              <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="350" cy="560" rx="300" ry="240" fill="url(#archGlow)" />
          
          <line x1="350" y1="560" x2="350" y2="20" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="200" y2="30" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="80" y2="90" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="10" y2="220" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="500" y2="30" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="620" y2="90" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="690" y2="220" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="120" y2="160" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="580" y2="160" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="40" y2="370" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
          <line x1="350" y1="560" x2="660" y2="370" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />

          <path d="M 100 560 Q 100 180 350 60 Q 600 180 600 560" fill="none" stroke="#C9A84C" strokeWidth="0.75" opacity="0.5" />
          <path d="M 150 560 Q 150 220 350 120 Q 550 220 550 560" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.25" />

          <line x1="350" y1="100" x2="350" y2="220" stroke="#C9A84C" strokeWidth="1.2" opacity="0.65" />
          <line x1="305" y1="145" x2="395" y2="145" stroke="#C9A84C" strokeWidth="1.2" opacity="0.65" />
        </svg>

        <div className="hero-content">
          <p className="hero-eyebrow">Philippine United Apostolic Church</p>
          <h1 className="hero-display-logo">Faith<em>Ly</em></h1>
          <p className="hero-church-sub">Your Church. Your Community. One Platform.</p>
          <p className="hero-tagline">Where faith is organized, community is strengthened, and every member is seen.</p>
          <div className="hero-actions">
            <button className="btn-primary">Get Started</button>
            <button className="btn-ghost">Explore Features</button>
          </div>
        </div>

        <div className="hero-footer">
          <div className="hero-dots">
            {HERO_SLIDES.map((_, index) => (
              <button 
                key={index} 
                className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              ></button>
            ))}
          </div>
          <div className="hero-caption">
            {HERO_SLIDES[currentSlide].caption}
          </div>
        </div>
      </section>

      {/* DECORATIVE DIVIDER */}
      <div className="divider">
        <div className="divider-line"></div>
        <div className="divider-icon">✦</div>
        <div className="divider-line"></div>
      </div>

      {/* SECTION 3 — FEATURES */}
      <section className="features">
        <p className="section-label">Everything you need</p>
        <h2 className="section-title">Built for the <em>faithful</em></h2>
        <p className="section-subtitle">Ten powerful tools, one unified platform — designed for the Philippine United Apostolic Church community.</p>

        <div className="features-grid">
          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <rect x="4" y="8" width="28" height="20" rx="2" strokeWidth="1" />
              <line x1="4" y1="14" x2="32" y2="14" strokeWidth="0.75" />
              <circle cx="10" cy="22" r="2.5" strokeWidth="0.75" />
              <line x1="16" y1="21" x2="28" y2="21" strokeWidth="0.75" />
              <line x1="16" y1="24" x2="24" y2="24" strokeWidth="0.75" />
            </svg>
            <h3 className="feature-name">Loan Management</h3>
            <p className="feature-desc">Apply for loans instantly and monitor status, due dates, and repayment milestones in real-time.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <circle cx="18" cy="18" r="13" strokeWidth="1" />
              <path d="M 8 18 Q 13 10 18 10 Q 23 10 28 18" strokeWidth="0.75" fill="none" />
              <line x1="18" y1="10" x2="18" y2="26" strokeWidth="0.75" />
              <circle cx="18" cy="18" r="3" fill="#C9A84C" opacity="0.4" stroke="none" />
            </svg>
            <h3 className="feature-name">Savings Goals</h3>
            <p className="feature-desc">Set, track, and achieve your personal savings goals with a clear visual progress tracker.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <path d="M 18 6 L 30 12 L 30 24 L 18 30 L 6 24 L 6 12 Z" strokeWidth="1" />
              <line x1="18" y1="12" x2="18" y2="24" strokeWidth="0.75" />
              <line x1="12" y1="18" x2="24" y2="18" strokeWidth="0.75" />
            </svg>
            <h3 className="feature-name">Donations & Payments</h3>
            <p className="feature-desc">Seamless giving via E-Wallet, Bank, or Cash. Submit proof and track every donation effortlessly.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <rect x="6" y="8" width="24" height="20" rx="1.5" strokeWidth="1" />
              <line x1="6" y1="14" x2="30" y2="14" strokeWidth="0.75" />
              <line x1="13" y1="6" x2="13" y2="11" strokeWidth="1.2" />
              <line x1="23" y1="6" x2="23" y2="11" strokeWidth="1.2" />
              <circle cx="13" cy="21" r="1.5" fill="#C9A84C" opacity="0.6" stroke="none" />
              <circle cx="18" cy="21" r="1.5" fill="#C9A84C" opacity="0.6" stroke="none" />
              <circle cx="23" cy="21" r="1.5" fill="#C9A84C" opacity="0.6" stroke="none" />
            </svg>
            <h3 className="feature-name">Attendance Tracking</h3>
            <p className="feature-desc">Real-time digital attendance recording. View your full history anytime, from anywhere.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <path d="M 6 8 L 30 8 L 30 26 L 20 26 L 18 30 L 16 26 L 6 26 Z" strokeWidth="1" />
              <line x1="10" y1="14" x2="26" y2="14" strokeWidth="0.75" />
              <line x1="10" y1="19" x2="22" y2="19" strokeWidth="0.75" />
            </svg>
            <h3 className="feature-name">Branch Announcements</h3>
            <p className="feature-desc">Stay updated with real-time, branch-specific church announcements and upcoming events.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <circle cx="18" cy="13" r="6" strokeWidth="1" />
              <path d="M 6 30 Q 6 22 18 22 Q 30 22 30 30" strokeWidth="1" fill="none" />
            </svg>
            <h3 className="feature-name">Member Profiles</h3>
            <p className="feature-desc">Comprehensive personal profiles with church records, account details, and full history.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <circle cx="18" cy="16" r="8" strokeWidth="1" />
              <circle cx="18" cy="16" r="2.5" fill="#C9A84C" opacity="0.5" stroke="none" />
              <path d="M 18 24 L 18 30" strokeWidth="1" />
              <path d="M 14 29 L 22 29" strokeWidth="0.75" />
              <circle cx="18" cy="8" r="1.2" fill="#C9A84C" opacity="0.6" stroke="none" />
              <circle cx="25" cy="11" r="1.2" fill="#C9A84C" opacity="0.6" stroke="none" />
              <circle cx="25" cy="21" r="1.2" fill="#C9A84C" opacity="0.6" stroke="none" />
            </svg>
            <h3 className="feature-name">Church Branches</h3>
            <p className="feature-desc">View all branches with maps, contact details, and service schedules across all locations.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <circle cx="14" cy="18" r="8" strokeWidth="1" />
              <path d="M 10 18 Q 14 13 18 18 Q 14 23 10 18" fill="#C9A84C" opacity="0.25" stroke="none" />
              <path d="M 22 12 Q 28 18 22 24" strokeWidth="0.75" fill="none" />
              <path d="M 25 9 Q 33 18 25 27" strokeWidth="0.5" fill="none" opacity="0.5" />
            </svg>
            <h3 className="feature-name">Chatbot Assistant</h3>
            <p className="feature-desc">Built-in chatbot for instant support on loans, donations, and services — available 24/7.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <rect x="5" y="22" width="26" height="8" rx="1" strokeWidth="1" />
              <rect x="5" y="22" width="16" height="8" rx="1" fill="#C9A84C" opacity="0.2" stroke="none" />
              <line x1="18" y1="8" x2="18" y2="22" strokeWidth="0.75" strokeDasharray="2 2" />
              <circle cx="18" cy="7" r="3" strokeWidth="0.75" />
            </svg>
            <h3 className="feature-name">Repayment Tracking</h3>
            <p className="feature-desc">Submit payment proofs and track loan repayment status in real-time with a clean dashboard.</p>
          </div>

          <div className="feature-card">
            <svg className="feature-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <rect x="4" y="10" width="28" height="18" rx="3" strokeWidth="1" />
              <circle cx="18" cy="19" r="4.5" strokeWidth="0.75" />
              <line x1="4" y1="15" x2="10" y2="15" strokeWidth="0.75" />
              <line x1="26" y1="15" x2="32" y2="15" strokeWidth="0.75" />
            </svg>
            <h3 className="feature-name">E-Wallet · Bank · Cash</h3>
            <p className="feature-desc">Flexible payment channels built for every member — whether digital or in-person.</p>
          </div>
        </div>
      </section>

      {/* DECORATIVE DIVIDER */}
      <div className="divider">
        <div className="divider-line"></div>
        <div className="divider-icon">✦</div>
        <div className="divider-line"></div>
      </div>

      {/* SECTION 3.5 — TRANSPARENCY (Donation Categories) */}
      <section className="transparency">
        <p className="section-label">Stewardship</p>
        <h2 className="section-title">Where your <em>giving</em> goes</h2>
        <p className="section-subtitle">We believe in complete transparency. Every contribution is allocated to specific funds that sustain our community and mission.</p>
        
        <div className="funds-grid">
          {/* General Fund */}
          <div className="fund-card">
            <svg className="fund-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <path d="M 18 6 L 30 14 L 30 28 L 6 28 L 6 14 Z" strokeWidth="1" />
              <rect x="14" y="20" width="8" height="8" strokeWidth="0.75" />
              <line x1="18" y1="20" x2="18" y2="28" strokeWidth="0.75" />
              <line x1="18" y1="1" x2="18" y2="6" strokeWidth="1" />
              <line x1="15" y1="3" x2="21" y2="3" strokeWidth="1" />
            </svg>
            <h3 className="fund-name">General Fund</h3>
            <p className="fund-desc">Church operations and ministry</p>
          </div>

          {/* Children's Department */}
          <div className="fund-card">
            <svg className="fund-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <path d="M 18 30 C 18 20 8 18 8 10 C 12 10 18 16 18 22" strokeWidth="1" />
              <path d="M 18 30 C 18 22 26 20 26 14 C 22 14 18 18 18 22" strokeWidth="1" />
              <circle cx="18" cy="8" r="2.5" fill="#C9A84C" opacity="0.4" stroke="none" />
            </svg>
            <h3 className="fund-name">Children's Department</h3>
            <p className="fund-desc">Children's programs and activities</p>
          </div>

          {/* Men's Department */}
          <div className="fund-card">
            <svg className="fund-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <path d="M 6 30 L 30 30" strokeWidth="1.2" />
              <path d="M 10 28 L 10 14" strokeWidth="1" />
              <path d="M 18 28 L 18 14" strokeWidth="1" />
              <path d="M 26 28 L 26 14" strokeWidth="1" />
              <path d="M 4 14 L 32 14 L 18 4 Z" strokeWidth="1" />
            </svg>
            <h3 className="fund-name">Men's Department</h3>
            <p className="fund-desc">Men's programs and activities</p>
          </div>

          {/* Women's Department */}
          <div className="fund-card">
            <svg className="fund-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <path d="M 18 6 L 30 14 L 30 28 L 6 28 L 6 14 Z" strokeWidth="1" />
              <rect x="14" y="20" width="8" height="8" strokeWidth="0.75" />
              <line x1="18" y1="20" x2="18" y2="28" strokeWidth="0.75" />
              <line x1="18" y1="1" x2="18" y2="6" strokeWidth="1" />
              <line x1="15" y1="3" x2="21" y2="3" strokeWidth="1" />
            </svg>
            <h3 className="fund-name">Women's Department</h3>
            <p className="fund-desc">Women's programs and activities</p>
          </div>

          {/* Youth Department */}
          <div className="fund-card">
            <svg className="fund-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <path d="M 18 30 C 10 30 10 18 18 6 C 26 18 26 30 18 30 Z" strokeWidth="1" />
              <path d="M 18 26 C 14 26 14 18 18 12 C 22 18 22 26 18 26 Z" fill="#C9A84C" opacity="0.3" stroke="none" />
            </svg>
            <h3 className="fund-name">Youth Department</h3>
            <p className="fund-desc">Youth programs and events</p>
          </div>

          {/* Mission Fund */}
          <div className="fund-card">
            <svg className="fund-glyph" viewBox="0 0 36 36" fill="none" stroke="#C9A84C">
              <circle cx="18" cy="18" r="12" strokeWidth="1" />
              <ellipse cx="18" cy="18" rx="5" ry="12" strokeWidth="0.75" />
              <line x1="6" y1="18" x2="30" y2="18" strokeWidth="0.75" />
              <path d="M 18 2 L 20 6 L 18 10 L 16 6 Z" fill="#C9A84C" stroke="none" />
            </svg>
            <h3 className="fund-name">Mission Fund</h3>
            <p className="fund-desc">Missionary work and outreach programs</p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHY FAITHLY */}
      <section className="why">
        <div className="why-bg-text">FaithLy</div>
        <div className="why-inner">
          <p className="section-label">Why FaithLy</p>
          <h2 className="section-title">Rooted in <em>faith,</em><br />built for the people</h2>
          
          <div className="why-pillars">
            <div className="pillar">
              <div className="pillar-num">I.</div>
              <h3 className="pillar-title">Transparent by Design</h3>
              <p className="pillar-text">Every peso, every loan, every donation — fully tracked and accessible. Trust isn't asked for; it's built in.</p>
            </div>
            <div className="pillar">
              <div className="pillar-num">II.</div>
              <h3 className="pillar-title">Community at the Center</h3>
              <p className="pillar-text">From Luzon to Mindanao, FaithLy connects every branch and every member under one digital home.</p>
            </div>
            <div className="pillar">
              <div className="pillar-num">III.</div>
              <h3 className="pillar-title">Always With You</h3>
              <p className="pillar-text">Announcements, records, and support — available day or night, whether you're in the pew or on the road.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DECORATIVE DIVIDER */}
      <div className="divider">
        <div className="divider-line"></div>
        <div className="divider-icon">✦</div>
        <div className="divider-line"></div>
      </div>

      {/* SECTION 5 — CTA BANNER */}
      <section className="cta-banner">
        <h2 className="cta-title">Your church is<br /><em>waiting for you.</em></h2>
        <p className="cta-sub">Be part of the new digital home for the PUAC community.</p>
        <div className="cta-actions">
          <button className="btn-primary">Create Account</button>
          <button className="cta-login">Already a member? Log in</button>
        </div>
      </section>

      {/* SECTION 6 — FOOTER */}
      <footer>
        <div className="footer-brand">
          FaithLy
          <small>Philippine United Apostolic Church</small>
        </div>
        <ul className="footer-links">
          <li><a href="#/">Home</a></li>
          <li><a href="#/">Features</a></li>
          <li><a href="#/">Login</a></li>
          <li><a href="#/">Contact</a></li>
        </ul>
        <div className="footer-copy">
          © 2026 FaithLy · PUAC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
