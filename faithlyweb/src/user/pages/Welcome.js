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
    <div className="user-welcome-container-new">
      {/* Header */}
      <header className="user-welcome-header-new">
        <div className="user-header-content-new">
          <div className="user-logo-section-new">
            <img src={puacLogo} alt="PUAC Logo" className="user-logo-image-new" />
            <div>
              <h1 className="user-logo-title-new">FaithLy</h1>
              <p className="user-logo-subtitle-new">Loan Management Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="user-hero-section-new">
        <div className="user-hero-grid-new">
          {/* Left Content */}
          <div className="user-hero-left-new">
            <div className="user-trust-badge-new">
              <span className="user-pulse-dot-new"></span>
              <span className="user-trust-text-new">Trusted by 2,340+ members</span>
            </div>

            <h1 className="user-hero-title-new">
              Philippine United Apostolic Church
              <span className="user-hero-title-gradient-new">
                Church Portal
              </span>
            </h1>

            <p className="user-hero-description-new">
              Access loans, make donations, track attendance, and stay connected with your church community—all in one secure platform.
            </p>

            <div className="user-hero-buttons-new">
              <button onClick={handleOpenSignup} className="user-btn-primary-new">
                Get Started 
              </button>
            </div>

            {/* Stats */}
            <div className="user-stats-grid-new">
              <div className="user-stat-item-new">
                <p className="user-stat-number-new">2,340+</p>
                <p className="user-stat-label-new">Active Members</p>
              </div>
              <div className="user-stat-item-new">
                <p className="user-stat-number-new">₱2.5M+</p>
                <p className="user-stat-label-new">Loans Processed</p>
              </div>
              <div className="user-stat-item-new">
                <p className="user-stat-number-new">25</p>
                <p className="user-stat-label-new">Branch Locations</p>
              </div>
            </div>
          </div>

          {/* Right Content - Embedded Login/Reset Form */}
          <div className="user-login-card-container">
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
      <div className="user-benefits-section-new">
        <div className="user-benefits-content-new">
          <div className="user-benefits-header-new">
            <h2 className="user-benefits-title-new">Everything You Need in One Place</h2>
            <p className="user-benefits-description-new">
              Our comprehensive platform provides all the tools you need to manage your church finances and stay connected.
            </p>
          </div>

          <div className="user-benefits-grid-new">
            {benefits.map((benefit, index) => (
              <div key={index} className="user-benefit-item-new">
                <CheckCircle className="user-benefit-icon-new" />
                <p className="user-benefit-text-new">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="user-cta-section-new">
        <div className="user-cta-card-new">
          <h2 className="user-cta-title-new">Ready to Get Started?</h2>
          <p className="user-cta-description-new">
            Join thousands of members already using our platform to manage their church finances and stay connected.
          </p>
          <button onClick={handleOpenSignup} className="user-cta-button-new">
            Create Your Account
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="user-welcome-footer-new">
        <div className="user-footer-content-new">
          <p className="user-footer-text-new">
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