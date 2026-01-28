import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff, Building2, Briefcase, Users as UsersIcon, Calendar, X } from 'lucide-react';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Signup.css';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    branch: '',
    position: '',
    gender: '',
    birthday: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors.length > 0) setErrors([]);
  };

  const validateForm = () => {
    const newErrors = [];
    if (!formData.fullName.trim()) newErrors.push('Full name is required');
    if (!formData.email.trim()) newErrors.push('Email is required');
    if (!formData.phone.trim()) newErrors.push('Phone number is required');
    if (!formData.branch) newErrors.push('Home branch is required');
    if (!formData.position) newErrors.push('Position in church is required');
    if (!formData.gender) newErrors.push('Gender is required');
    if (!formData.birthday) newErrors.push('Date of birth is required');
    if (!formData.password) newErrors.push('Password is required');
    if (!formData.confirmPassword) newErrors.push('Confirm password is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) newErrors.push('Please enter a valid email address');

    const phoneRegex = /^[0-9+\s()-]+$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) newErrors.push('Phone number must contain only numbers');

    if (formData.password) {
      if (formData.password.length < 8) newErrors.push('Password must be at least 8 characters');
      if (!/[A-Z]/.test(formData.password)) newErrors.push('Password must contain one uppercase letter');
      if (!/[a-z]/.test(formData.password)) newErrors.push('Password must contain one lowercase letter');
      if (!/[0-9]/.test(formData.password)) newErrors.push('Password must contain one number');
    }

    if (formData.password !== formData.confirmPassword) newErrors.push('Passwords do not match');
    if (!agreeToTerms) newErrors.push('You must agree to the Terms and Conditions');

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);
    const result = await signUp(formData);

    if (result.success) {
      // Pass email to VerifyEmail page
      navigate('/verify-email', { state: { email: formData.email } });
    } else {
      setErrors([result.error?.message || 'An error occurred during signup']);
    }
    setLoading(false);
  };

  const handleTermsClick = () => setShowTermsModal(true);
  const handlePrivacyClick = () => setShowPrivacyModal(true);
  const handleAgreeTerms = () => { setTermsAgreed(true); setShowTermsModal(false); };
  const handleAgreePrivacy = () => { setPrivacyAgreed(true); setShowPrivacyModal(false); };
  const handleCheckboxChange = (e) => {
    if (e.target.checked && (!termsAgreed || !privacyAgreed)) {
      alert('Please read and agree to the Terms & Conditions and Privacy Policy first');
      return;
    }
    setAgreeToTerms(e.target.checked);
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        <button onClick={() => navigate('/')} className="back-button">
          <ArrowLeft className="back-icon" /> Back to Home
        </button>

        <div className="signup-card">
          <div className="signup-header">
            <img src={puacLogo} alt="PUAC Logo" className="signup-logo-image" />
            <h1 className="signup-title">Create Your Account</h1>
            <p className="signup-subtitle">Join our church community today</p>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-wrapper">
                <User className="input-icon" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" className="form-input"/>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your.email@example.com" className="form-input"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-wrapper">
                  <Phone className="input-icon" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className="form-input"/>
                </div>
              </div>
            </div>

            {/* Branch & Position */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Home Branch</label>
                <div className="input-wrapper">
                  <Building2 className="input-icon" />
                  <select name="branch" value={formData.branch} onChange={handleChange} className="form-select">
                    <option value="">Select your branch</option>
                    <option value="Main Branch">Main Branch</option>
                    <option value="Downtown Branch">Downtown Branch</option>
                    <option value="Northside Branch">Northside Branch</option>
                    <option value="Southside Branch">Southside Branch</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Position in Church</label>
                <div className="input-wrapper">
                  <Briefcase className="input-icon" />
                  <select name="position" value={formData.position} onChange={handleChange} className="form-select">
                    <option value="">Select your position</option>
                    <option value="Member">Member</option>
                    <option value="Deacon">Deacon</option>
                    <option value="Elder">Elder</option>
                    <option value="Pastor">Pastor</option>
                    <option value="Youth Leader">Youth Leader</option>
                    <option value="Worship Leader">Worship Leader</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Gender & Birthday */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gender</label>
                <div className="input-wrapper">
                  <UsersIcon className="input-icon" />
                  <select name="gender" value={formData.gender} onChange={handleChange} className="form-select">
                    <option value="">Select your gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div className="input-wrapper">
                  <Calendar className="input-icon" />
                  <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className="form-input"/>
                </div>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" className="form-input password-input"/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">{showPassword ? <EyeOff className="toggle-icon"/> : <Eye className="toggle-icon"/>}</button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" className="form-input password-input"/>
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle">{showConfirmPassword ? <EyeOff className="toggle-icon"/> : <Eye className="toggle-icon"/>}</button>
                </div>
              </div>
            </div>

            {/* Errors */}
            <div className={`password-requirements ${errors.length > 0 ? 'has-errors' : ''}`}>
              {errors.length > 0 ? (
                <>
                  <p className="requirements-title error-title">Please fix the following errors:</p>
                  <ul className="requirements-list error-list">{errors.map((error, i) => <li key={i}>• {error}</li>)}</ul>
                </>
              ) : (
                <>
                  <p className="requirements-title">Password must contain:</p>
                  <ul className="requirements-list">
                    <li>• At least 8 characters</li>
                    <li>• One uppercase letter</li>
                    <li>• One lowercase letter</li>
                    <li>• One number</li>
                  </ul>
                </>
              )}
            </div>

            {/* Terms */}
            <div className="terms-group">
              <label className="terms-label">
                <input type="checkbox" checked={agreeToTerms} onChange={handleCheckboxChange} className="terms-checkbox"/>
                <span className="terms-text">I agree to the{' '}
                  <button type="button" onClick={handleTermsClick} className="terms-link">Terms and Conditions</button> and{' '}
                  <button type="button" onClick={handlePrivacyClick} className="terms-link">Privacy Policy</button>
                </span>
              </label>
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="login-link">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="login-button">Sign In</button>
          </p>
        </div>
      </div>

      {/* Terms & Privacy Modals */}
      {showTermsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Terms and Conditions</h2>
              <button onClick={() => setShowTermsModal(false)} className="modal-close"><X className="close-icon"/></button>
            </div>
            <div className="modal-body"> {/* Your Terms text here */} </div>
            <div className="modal-footer"><button onClick={handleAgreeTerms} className="modal-agree-button">Agree</button></div>
          </div>
        </div>
      )}

      {showPrivacyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Privacy Policy</h2>
              <button onClick={() => setShowPrivacyModal(false)} className="modal-close"><X className="close-icon"/></button>
            </div>
            <div className="modal-body"> {/* Your Privacy text here */} </div>
            <div className="modal-footer"><button onClick={handleAgreePrivacy} className="modal-agree-button">Agree</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
