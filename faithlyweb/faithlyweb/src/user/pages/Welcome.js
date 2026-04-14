import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import puacLogo from '../../assets/puaclogo.png';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ResetPassword from '../components/ResetPassword';
import '../styles/Welcome.css';

export default function Welcome() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' or 'reset'

  const benefits = [
    'Instant loan application and tracking',
    'Multiple donation options and recurring giving',
    'Digital attendance with QR and RFID scanning',
    'View all church branches and locations',
    'AI-powered chatbot assistance',
    'Comprehensive member profile management'
  ];

  const handleOpenSignup = () => {
    setShowSignupModal(true);
  };

  const handleCloseSignup = () => {
    setShowSignupModal(false);
  };

  const handleSwitchToReset = () => {
    setAuthView('reset');
  };

  const handleBackToLogin = () => {
    setAuthView('login');
  };

  return (
    <div className="welcome-container-new">
      {/* Header */}
      <header className="welcome-header-new">
        <div className="header-content-new">
          <div className="logo-section-new">
            <img src={puacLogo} alt="PUAC Logo" className="logo-image-new" />
            <div>
              <h1 className="logo-title-new">FaithLy</h1>
              <p className="logo-subtitle-new">Loan Management Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="hero-section-new">
        <div className="hero-grid-new">
          {/* Left Content */}
          <div className="hero-left-new">
            <div className="trust-badge-new">
              <span className="pulse-dot-new"></span>
              <span className="trust-text-new">Trusted by 2,340+ members</span>
            </div>

            <h1 className="hero-title-new">
              Philippine United Apostolic Church
              <span className="hero-title-gradient-new">
                Church Portal
              </span>
            </h1>

            <p className="hero-description-new">
              Access loans, make donations, track attendance, and stay connected with your church community—all in one secure platform.
            </p>

            <div className="hero-buttons-new">
              <button onClick={handleOpenSignup} className="btn-primary-new">
                Get Started 
              </button>
            </div>

            {/* Stats */}
            <div className="stats-grid-new">
              <div className="stat-item-new">
                <p className="stat-number-new">2,340+</p>
                <p className="stat-label-new">Active Members</p>
              </div>
              <div className="stat-item-new">
                <p className="stat-number-new">₱2.5M+</p>
                <p className="stat-label-new">Loans Processed</p>
              </div>
              <div className="stat-item-new">
                <p className="stat-number-new">25</p>
                <p className="stat-label-new">Branch Locations</p>
              </div>
            </div>
          </div>

          {/* Right Content - Embedded Login/Reset Form */}
          <div className="login-card-container">
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

      {/* Benefits Section */}
      <div className="benefits-section-new">
        <div className="benefits-content-new">
          <div className="benefits-header-new">
            <h2 className="benefits-title-new">Everything You Need in One Place</h2>
            <p className="benefits-description-new">
              Our comprehensive platform provides all the tools you need to manage your church finances and stay connected.
            </p>
          </div>

          <div className="benefits-grid-new">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-item-new">
                <CheckCircle className="benefit-icon-new" />
                <p className="benefit-text-new">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section-new">
        <div className="cta-card-new">
          <h2 className="cta-title-new">Ready to Get Started?</h2>
          <p className="cta-description-new">
            Join thousands of members already using our platform to manage their church finances and stay connected.
          </p>
          <button onClick={handleOpenSignup} className="cta-button-new">
            Create Your Account
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="welcome-footer-new">
        <div className="footer-content-new">
          <p className="footer-text-new">
            © 2026 FaithLy. All rights reserved. | Secure & Trusted Church Management Platform
          </p>
        </div>
      </footer>

      {/* Signup Modal */}
      <SignupModal
        isOpen={showSignupModal}
        onClose={handleCloseSignup}
        onSwitchToLogin={() => {
          // Close signup modal - login is already visible on page
          handleCloseSignup();
        }}
      />
    </div>
  );
}