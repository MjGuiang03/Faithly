import { useNavigate } from 'react-router-dom';
import { Heart, Users, TrendingUp, Shield, CheckCircle } from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: TrendingUp,
      title: 'Quick Loans',
      description: 'Apply for church loans with easy approval process'
    },
    {
      icon: Heart,
      title: 'Easy Donations',
      description: 'Support the church with secure online giving'
    },
    {
      icon: Users,
      title: 'Track Attendance',
      description: 'Check in to services with QR or RFID'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is protected with bank-level security'
    }
  ];

  const benefits = [
    'Instant loan application and tracking',
    'Multiple donation options and recurring giving',
    'Digital attendance with QR and RFID scanning',
    'View all church branches and locations',
    'AI-powered chatbot assistance',
    'Comprehensive member profile management'
  ];

  return (
    <div className="welcome-container">
      {/* Header */}
      <header className="welcome-header">
        <div className="header-content">
          <div className="logo-section">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image" />
            <div>
              <h1 className="logo-title">FaithLy</h1>
              <p className="logo-subtitle">Loan Management Portal</p>
            </div>
          </div>
          <button onClick={() => navigate('/login')} className="sign-in-btn">
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-grid">
          {/* Left Content */}
          <div className="hero-left">
            <div className="trust-badge">
              <span className="pulse-dot"></span>
              <span className="trust-text">Trusted by 2,340+ members</span>
            </div>

            <h1 className="hero-title">
              Your Church
              <span className="hero-title-gradient">
                Financial Partner
              </span>
            </h1>

            <p className="hero-description">
              Access loans, make donations, track attendance, and stay connected with your church community—all in one secure platform.
            </p>

            <div className="hero-buttons">
              <button onClick={() => navigate('/signup')} className="btn-primary">
                Get Started Free
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary">
                Sign In
              </button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-item">
                <p className="stat-number">2,340+</p>
                <p className="stat-label">Active Members</p>
              </div>
              <div className="stat-item">
                <p className="stat-number">₱2.5M+</p>
                <p className="stat-label">Loans Processed</p>
              </div>
              <div className="stat-item">
                <p className="stat-number">68</p>
                <p className="stat-label">Branch Locations</p>
              </div>
            </div>
          </div>

          {/* Right Content - Features Grid */}
          <div className="features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="feature-card">
                  <div className="feature-icon-box">
                    <Icon className="feature-icon" />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="benefits-section">
        <div className="benefits-content">
          <div className="benefits-header">
            <h2 className="benefits-title">Everything You Need in One Place</h2>
            <p className="benefits-description">
              Our comprehensive platform provides all the tools you need to manage your church finances and stay connected.
            </p>
          </div>

          <div className="benefits-grid">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-item">
                <CheckCircle className="benefit-icon" />
                <p className="benefit-text">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-card">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-description">
            Join thousands of members already using our platform to manage their church finances and stay connected.
          </p>
          <button onClick={() => navigate('/signup')} className="cta-button">
            Create Your Account
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="footer-content">
          <p className="footer-text">
            © 2026 FaithLy. All rights reserved. | Secure & Trusted Church Management Platform
          </p>
        </div>
      </footer>
    </div>
  );
}