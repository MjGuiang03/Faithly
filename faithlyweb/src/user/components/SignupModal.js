import { useState } from 'react';
import API from '../../utils/api';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import svgPaths from "../../imports/svg-icons";
import imgPuacLogo from "../../assets/puaclogo.png";
import '../styles/Signup.css';
import VerifyEmailModal from '../components/VerifyEmail';

const nameRegex        = /^[A-Za-z\s]*$/;
const phoneRegex       = /^\d{10}$/;
const passwordUppercase = /[A-Z]/;
const passwordNumber   = /[0-9]/;
const passwordSymbol   = /[^A-Za-z0-9]/;
const validDomains     = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','live.com','msn.com','aol.com','protonmail.com','zoho.com','mail.com','yandex.com'];
const MIN_AGE = 18;
const MAX_AGE = 100;
const today = new Date();
today.setHours(0,0,0,0);
const maxBirthDate = new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate());
const minBirthDate = new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate());

const validateEmailAdvanced = (email) => {
  if (!email) return 'Email is required';
  if (/\s/.test(email)) return 'Email cannot contain spaces';
  if (!email.includes('@')) return 'Email must contain @';
  const parts = email.split('@');
  if (parts.length !== 2) return 'Email must have exactly one @';
  const [localPart, domain] = parts;
  if (!localPart) return 'Email must have a local part before @';
  if (!/^[a-zA-Z0-9._-]+$/.test(localPart)) return 'Local part contains invalid characters';
  if (localPart.startsWith('.') || localPart.endsWith('.')) return 'Local part cannot start or end with a dot';
  if (/\.\./.test(localPart)) return 'Local part cannot have consecutive dots';
  if (!domain) return 'Email must have a domain after @';
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Domain cannot start or end with a dot';
  if (!domain.includes('.')) return 'Domain must contain at least one dot';
  const domainParts = domain.split('.');
  if (domainParts.some(p => p.length === 0)) return 'Invalid domain format';
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return 'Invalid domain extension';
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return 'Domain contains invalid characters';
  const isKnownDomain  = validDomains.includes(domain.toLowerCase());
  const hasValidFormat = domainParts.length >= 2 && tld.length >= 2 && !/^\d+$/.test(tld);
  if (!isKnownDomain && !hasValidFormat) return 'Please use a valid email domain';
  return '';
};

const calculateAge = (birthDate) => {
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

const CommunitySelect = ({ value, onChange }) => (
  <select name="community" value={value} onChange={onChange} className="signup-form-select">
    <option value="">Select your Community</option>
    <optgroup label="Kalinga">
      <option>Tabuk</option><option>Zapote</option><option>Bliss</option>
      <option>Libanon</option><option>Batong Buhay</option><option>Balatoc</option><option>Lat-nog</option>
    </optgroup>
    <optgroup label="Isabela"><option>Santiago City</option></optgroup>
    <optgroup label="Abra">
      <option>Lamao</option><option>Lingey</option><option>Cabaruyan</option><option>Ducligan</option>
      <option>Gangal</option><option>Bila-Bila</option><option>Naguillian</option><option>Ud-udiao</option>
      <option>Villa Conchita</option><option>Ay-yeng Manabo</option><option>Dao-angan</option>
      <option>Kilong-olao</option><option>Bao-yan</option><option>Amti</option><option>Danac</option>
      <option>Bengued</option><option>Sappaac</option><option>Saccaang</option>
    </optgroup>
    <optgroup label="Benguet"><option>Baguio</option></optgroup>
    <optgroup label="Rizal"><option>Montalban</option></optgroup>
    <optgroup label="NCR">
      <option>Valenzuela City</option><option>Tandang Sora, Quezon City</option>
      <option>COA, Quezon City</option><option>Payatas, Quezon City</option><option>Malaria, Caloocan</option>
    </optgroup>
    <optgroup label="Bulacan">
      <option>Meycauayan City</option><option>Camalig</option><option>San Jose Del Monte</option>
    </optgroup>
    <optgroup label="Tarlac">
      <option>Pacpaco, San Manuel</option><option>Victoria</option>
    </optgroup>
    <optgroup label="Nueva Ecija"><option>Bambanaba, Cuyapo</option></optgroup>
    <optgroup label="Pangasinan">
      <option>Dagupan</option><option>Mangatarem</option><option>Laoak Langka</option>
      <option>Orbiztondo</option><option>Malasiqui, Bolaoit</option><option>Taloyan</option>
      <option>Binmaley</option><option>San Carlos</option><option>Manaoag</option>
      <option>Pozorrubio</option><option>Alcala</option>
    </optgroup>
    <optgroup label="Agusan Del Norte">
      <option>Butuan City</option><option>RTR</option><option>Jabonga, Bangonay</option>
      <option>Kasiklan</option><option>San Mateo</option><option>Fatima Kim.13</option>
      <option>Bayugan</option><option>Ibuan</option><option>Balubo</option>
    </optgroup>
    <optgroup label="Cebu">
      <option>Mandaue</option><option>Liloan</option><option>Calero</option><option>Compostela</option>
    </optgroup>
    <optgroup label="Surigao Del Norte">
      <option>Alegria</option><option>Bonifacio</option><option>Matin-ao</option><option>Ipil</option>
    </optgroup>
    <optgroup label="Surigao Del Sur"><option>Kinabigtasan, Tago</option></optgroup>
  </select>
);

export default function SignupModal({ isOpen, onClose, onSwitchToLogin }) {
  // const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    gender: '', birthday: '', community: '',
    password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [agreeTerms,   setAgreeTerms]   = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTerms,    setShowTerms]    = useState(false);
  const [showPrivacy,  setShowPrivacy]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [calculatedAge,       setCalculatedAge]       = useState(null);
  const [showVerifyModal,     setShowVerifyModal]     = useState(false);
  const [registeredEmail,     setRegisteredEmail]     = useState('');

  const isAllAgreed = agreeTerms && agreePrivacy;

  if (!isOpen) return null;

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value) error = 'This field is required';
        else if (!nameRegex.test(value)) error = 'Letters only';
        else if (value.length > 15) error = 'Max 15 characters';
        break;
      case 'email':
        error = validateEmailAdvanced(value);
        break;
      case 'phone':
        if (!phoneRegex.test(value)) error = '10 digits required';
        break;
      case 'birthday':
        if (!value) error = 'Birthdate is required';
        else {
          const age = calculateAge(value);
          if (age < MIN_AGE) error = 'You must be at least 18 years old';
          else if (age > MAX_AGE) error = 'Age must not exceed 100 years';
        }
        break;
      case 'password': {
        const errs = [];
        if (value.length < 8) errs.push('At least 8 characters');
        if (!passwordUppercase.test(value)) errs.push('At least one uppercase letter');
        if (!passwordNumber.test(value)) errs.push('At least one number');
        if (!passwordSymbol.test(value)) errs.push('At least one symbol');
        error = errs;
        break;
      }
      case 'confirmPassword':
        if (!value) error = 'Confirm password is required';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      default: break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'firstName' || name === 'lastName') sanitized = value.replace(/[^A-Za-z\s]/g, '').slice(0, 15);
    if (name === 'phone') { sanitized = value.replace(/^\+63/, '').replace(/\D/g, '').slice(0, 10); }
    if (name === 'birthday' && sanitized) { const age = calculateAge(sanitized); setCalculatedAge(age >= 0 ? age : null); }
    setFormData(prev => {
      const updated = { ...prev, [name]: sanitized };
      if (name === 'password' && prev.confirmPassword) validateField('confirmPassword', prev.confirmPassword);
      return updated;
    });
    validateField(name, sanitized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;
      const submitData = {
        fullName, email: formData.email,
        phone: `+63${formData.phone}`, birthday: formData.birthday,
        gender: formData.gender, branch: formData.community,
        password: formData.password
      };
      const response = await fetch(`${API}/api/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || 'Registration failed'); return; }
      setRegisteredEmail(formData.email);
      setShowVerifyModal(true);
      toast.success('Registration successful! Please verify your email.');
    } catch (err) {
      console.error(err);
      toast.error('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.firstName && formData.lastName && formData.email &&
    formData.phone && formData.birthday && formData.password && formData.confirmPassword &&
    Object.values(errors).every(err => Array.isArray(err) ? err.length === 0 : !err) &&
    isAllAgreed;

  const hasPasswordErrors = Array.isArray(errors.password) && errors.password.length > 0;

  return (
    <div className="signup-modal-overlay">
      <div className="signup-modal-card" onClick={e => e.stopPropagation()}>

        {/* BACK BUTTON */}
        <button onClick={onClose} className="signup-back-btn" type="button">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.p203476e0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M12.6667 8H3.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>

        {/* HEADER */}
        <div className="signup-header">
          <img src={imgPuacLogo} alt="Logo" className="signup-logo" />
          <h1 className="signup-title">Create Your Account</h1>
          <p className="signup-subtitle">Join our church community today</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">

          {/* ROW 1: First Name + Last Name */}
          <div className="signup-form-row">
            <div className="signup-form-group">
              <label htmlFor="firstName" className="signup-form-label">First Name:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input 
                  id="firstName"
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange}
                  className={`signup-form-input${errors.firstName ? ' input-error' : ''}`}
                  placeholder="Enter your first name" 
                  autoComplete="given-name"
                />
              </div>
              {errors.firstName && <span className="signup-error-text">{errors.firstName}</span>}
            </div>

            <div className="signup-form-group">
              <label htmlFor="lastName" className="signup-form-label">Last Name:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input 
                  id="lastName"
                  name="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange}
                  className={`signup-form-input${errors.lastName ? ' input-error' : ''}`}
                  placeholder="Enter your last name" 
                  autoComplete="family-name"
                />
              </div>
              {errors.lastName && <span className="signup-error-text">{errors.lastName}</span>}
            </div>
          </div>

          {/* ROW 2: Email + Phone */}
          <div className="signup-form-row">
            <div className="signup-form-group">
              <label htmlFor="email" className="signup-form-label">Email:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p24d83580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.pd919a80}  stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input 
                  id="email"
                  name="email" 
                  type="email"
                  value={formData.email} 
                  onChange={handleChange}
                  className={`signup-form-input${errors.email ? ' input-error' : ''}`}
                  placeholder="your.email@example.com" 
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="signup-error-text">{errors.email}</span>}
            </div>

            <div className="signup-form-group">
              <label htmlFor="phone" className="signup-form-label">Phone Number:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p24c7c480} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input 
                  id="phone"
                  name="phone" 
                  type="tel"
                  value={`+63${formData.phone}`} 
                  onChange={handleChange}
                  className={`signup-form-input${errors.phone ? ' input-error' : ''}`}
                  placeholder="+63 00 000 0000" 
                  autoComplete="tel"
                />
              </div>
              {errors.phone && <span className="signup-error-text">{errors.phone}</span>}
            </div>
          </div>

          {/* ROW 3: Gender + Birthday + Community */}
          <div className="signup-form-row-3">
            <div className="signup-form-group">
              <label className="signup-form-label">Gender:</label>
              <div className="signup-select-wrapper">
                <svg className="signup-select-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <select name="gender" value={formData.gender} onChange={handleChange} className="signup-form-select">
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <svg className="signup-select-dropdown" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1ae0b780} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
            </div>

            <div className="signup-form-group">
              <label htmlFor="birthday" className="signup-form-label">
                Birthday:
                {calculatedAge !== null && (
                  <span className="signup-age-badge">(Age: {calculatedAge})</span>
                )}
              </label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M6.66667 1.66667V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M13.3333 1.66667V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p1da67b80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M2.5 8.33333H17.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input 
                  id="birthday"
                  type="date" 
                  name="birthday" 
                  value={formData.birthday} 
                  onChange={handleChange}
                  onKeyDown={e => e.preventDefault()}
                  min={minBirthDate.toISOString().split('T')[0]}
                  max={maxBirthDate.toISOString().split('T')[0]}
                  className={`signup-form-input${errors.birthday ? ' input-error' : ''}`}
                  placeholder="MM-DD-YYYY" 
                  autoComplete="bday"
                />
              </div>
              {errors.birthday && <span className="signup-error-text">{errors.birthday}</span>}
            </div>

            <div className="signup-form-group">
              <label className="signup-form-label">Community:</label>
              <div className="signup-select-wrapper">
                <svg className="signup-select-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <CommunitySelect value={formData.community} onChange={handleChange} />
                <svg className="signup-select-dropdown" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1ae0b780} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
            </div>
          </div>

          {/* ROW 4: Password (left) + Requirements box (right) */}
          <div className="password-section">
            <div className="password-fields">
              <div className="signup-form-group">
                <label htmlFor="password" className="signup-form-label">Password:</label>
                <div className="signup-input-wrapper">
                  <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p2566d000} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p1bf79e00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <input 
                    id="password"
                    type={showPassword ? 'text' : 'password'} 
                    name="password"
                    value={formData.password} onChange={handleChange}
                    className={`signup-form-input${hasPasswordErrors ? ' input-error' : ''}`}
                    placeholder="Create a password" 
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="signup-password-toggle">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="signup-form-group">
                <div className="signup-input-wrapper">
                  <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p2566d000} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p1bf79e00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <input 
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'} 
                    name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange}
                    className={`signup-form-input${errors.confirmPassword ? ' input-error' : ''}`}
                    placeholder="Confirm your password" 
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="signup-password-toggle">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="signup-error-text">{errors.confirmPassword}</span>}
              </div>
            </div>

            {/* Requirements box */}
            <div className="password-requirements-box">
              <p className="password-requirements-title">Password must contain:</p>
              {hasPasswordErrors || errors.confirmPassword ? (
                <div className="password-error-message">
                  {hasPasswordErrors && errors.password.map((err, i) => (
                    <p key={i} className="error-item">• {err}</p>
                  ))}
                  {errors.confirmPassword && <p className="error-item">• {errors.confirmPassword}</p>}
                </div>
              ) : (
                <ul className="password-requirements-list">
                  <li>• At least 8 characters</li>
                  <li>• One uppercase letter</li>
                  <li>• At least 1 number or more</li>
                  <li>• At least 1 symbol (@#$%*_)</li>
                </ul>
              )}
            </div>
          </div>

          {/* TERMS */}
          <div className="signup-checkbox-wrapper">
            <input type="checkbox" checked={isAllAgreed} onChange={() => {}}
              onClick={e => e.preventDefault()} className="signup-checkbox" />
            <label className="signup-checkbox-label">
              I agree to the{' '}
              <button type="button" onClick={() => setShowTerms(true)} className="signup-link">Terms and Conditions</button>
              {' and '}
              <button type="button" onClick={() => setShowPrivacy(true)} className="signup-link">Privacy Policy</button>
            </label>
          </div>

          {/* SUBMIT */}
          <button type="submit" className="signup-submit-button" disabled={!isFormValid || loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        {/* TERMS MODAL */}
        {showTerms && (
          <div className="policy-modal-overlay" onClick={() => setShowTerms(false)}>
            <div className="policy-modal-content" onClick={e => e.stopPropagation()}>
              <h3>Terms & Conditions</h3>
              <p>Please read and agree to the terms and conditions...</p>
              <button onClick={() => { setAgreeTerms(true); setShowTerms(false); }} className="policy-modal-button">Agree</button>
            </div>
          </div>
        )}

        {/* PRIVACY MODAL */}
        {showPrivacy && (
          <div className="policy-modal-overlay" onClick={() => setShowPrivacy(false)}>
            <div className="policy-modal-content" onClick={e => e.stopPropagation()}>
              <h3>Privacy Policy</h3>
              <p>Please read and agree to the privacy policy...</p>
              <button onClick={() => { setAgreePrivacy(true); setShowPrivacy(false); }} className="policy-modal-button">Agree</button>
            </div>
          </div>
        )}
      </div>

      {showVerifyModal && (
        <VerifyEmailModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} email={registeredEmail} />
      )}
    </div>
  );
}