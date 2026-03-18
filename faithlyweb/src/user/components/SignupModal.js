import { useState } from 'react';
import API from '../../utils/api';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import svgPaths from "../../imports/svg-icons";
import imgPuacLogo from "../../assets/puaclogo.png";
import '../styles/Signup.css';
import VerifyEmailModal from '../components/VerifyEmail';

/* ─── Regex / Constants ─────────────────────────────────────── */
const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
const phoneRegex = /^\d{10}$/;
const emailLocalRegex = /^[a-zA-Z0-9._+-]+$/;
const passwordUppercase = /[A-Z]/;
const passwordLowercase = /[a-z]/;
const passwordNumber = /[0-9]/;
const passwordSymbol = /[^A-Za-z0-9]/;

const disposableDomains = [
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'throwaway.email', 'yopmail.com', 'trashmail.com', 'sharklasers.com'
];
const validDomains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'zoho.com', 'mail.com', 'yandex.com'
];

const MIN_AGE = 18;
const MAX_AGE = 100;
const today = new Date();
today.setHours(0, 0, 0, 0);
const maxBirthDate = new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate());
const minBirthDate = new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate());

/* ─── Helpers ───────────────────────────────────────────────── */
const calculateAge = (birthDate) => {
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

/* ─── Email Validator ───────────────────────────────────────── */
const validateEmailAdvanced = (email) => {
  if (!email) return 'Email is required';
  if (/\s/.test(email)) return 'Email cannot contain spaces';
  if (!email.includes('@')) return 'Email must contain @';
  const parts = email.split('@');
  if (parts.length !== 2) return 'Email must have exactly one @';
  const [localPart, domain] = parts;
  if (!localPart) return 'Email must have a local part before @';
  if (!emailLocalRegex.test(localPart)) return 'Local part contains invalid characters';
  if (localPart.startsWith('.') || localPart.endsWith('.')) return 'Local part cannot start or end with a dot';
  if (/\.\./.test(localPart)) return 'Local part cannot have consecutive dots';
  if (localPart.length > 64) return 'Local part is too long (max 64 characters)';
  if (!domain) return 'Email must have a domain after @';
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Domain cannot start or end with a dot';
  if (domain.startsWith('-') || domain.endsWith('-')) return 'Domain cannot start or end with a hyphen';
  if (!domain.includes('.')) return 'Domain must contain at least one dot';
  const domainParts = domain.split('.');
  if (domainParts.some(p => p.length === 0)) return 'Invalid domain format';
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return 'Invalid domain extension';
  if (/^\d+$/.test(tld)) return 'TLD cannot be all numbers';
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return 'Domain contains invalid characters';
  const lowerDomain = domain.toLowerCase();
  if (disposableDomains.includes(lowerDomain)) return 'Disposable email addresses are not allowed';
  const isKnown = validDomains.includes(lowerDomain);
  const hasValidFormat = domainParts.length >= 2 && tld.length >= 2 && !/^\d+$/.test(tld);
  if (!isKnown && !hasValidFormat) return 'Please use a valid email domain';
  return '';
};

/* ─── Field Validators ──────────────────────────────────────── */
const validators = {
  name(value, fieldLabel) {
    if (!value?.trim()) return `${fieldLabel} is required`;
    if (value.trim().length < 2) return 'At least 2 characters required';
    if (value.length > 30) return 'Max 30 characters';
    if (!nameRegex.test(value)) return 'Letters, spaces, hyphens, or apostrophes only';
    if (/\s{2,}/.test(value)) return 'No consecutive spaces allowed';
    return '';
  },
  email: validateEmailAdvanced,
  phone(value) {
    if (!value) return 'Phone number is required';
    if (!phoneRegex.test(value)) return 'Exactly 10 digits required (e.g. 9171234567)';
    if (!/^9/.test(value)) return 'Philippine mobile numbers must start with 9';
    if (value.startsWith('0')) return 'Enter 10 digits after +63 (no leading 0)';
    return '';
  },
  gender(value) {
    if (!value) return 'Please select a gender';
    return '';
  },
  birthday(value) {
    if (!value) return 'Birthdate is required';
    const age = calculateAge(value);
    if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old`;
    if (age > MAX_AGE) return `Age must not exceed ${MAX_AGE} years`;
    return '';
  },
  community(value) {
    if (!value) return 'Please select your community';
    return '';
  },
  password(value) {
    const errs = [];
    if (!value) return ['Password is required'];
    if (value.length < 8) errs.push('At least 8 characters');
    if (value.length > 72) errs.push('Maximum 72 characters');
    if (!passwordUppercase.test(value)) errs.push('At least one uppercase letter');
    if (!passwordLowercase.test(value)) errs.push('At least one lowercase letter');
    if (!passwordNumber.test(value)) errs.push('At least one number');
    if (!passwordSymbol.test(value)) errs.push('At least one symbol (@#$%^&*)');
    return errs;
  },
  confirmPassword(value, password) {
    if (!value) return 'Confirm password is required';
    if (value !== password) return 'Passwords do not match';
    return '';
  }
};

/* ─── Communities ───────────────────────────────────────────── */
const CommunitySelect = ({ value, onChange }) => (
  <select name="community" value={value} onChange={onChange} className="user-signup-form-select">
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

/* ─── Component ─────────────────────────────────────────────── */
export default function SignupModal({ isOpen, onClose, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    gender: '', birthday: '', community: '',
    password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const isAllAgreed = agreeTerms && agreePrivacy;

  if (!isOpen) return null;

  /* ── Validate single field ── */
  const validateField = (name, value, password = formData.password) => {
    let error = '';
    if (name === 'password') {
      error = validators.password(value);
    } else if (name === 'confirmPassword') {
      error = validators.confirmPassword(value, password);
    } else if (name === 'firstName' || name === 'lastName') {
      error = validators.name(value, name === 'firstName' ? 'First name' : 'Last name');
    } else if (validators[name]) {
      error = validators[name](value);
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  /* ── Handle input change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitized = value;

    if (name === 'firstName' || name === 'lastName') {
      sanitized = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '').slice(0, 30);
    }
    if (name === 'phone') {
      sanitized = value.replace(/\D/g, '').slice(0, 10);
    }
    if (name === 'birthday' && sanitized) {
      const age = calculateAge(sanitized);
      setCalculatedAge(age >= 0 && age <= MAX_AGE ? age : null);
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: sanitized };
      if (name === 'password' && prev.confirmPassword) {
        validateField('confirmPassword', prev.confirmPassword, sanitized);
      }
      return updated;
    });

    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, sanitized);
  };

  /* ── Handle blur ── */
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const submitData = {
        fullName,
        email: formData.email.trim().toLowerCase(),
        phone: `+63${formData.phone}`,
        birthday: formData.birthday,
        gender: formData.gender,
        branch: formData.community,
        password: formData.password
      };
      const response = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || 'Registration failed'); return; }
      setRegisteredEmail(formData.email.trim().toLowerCase());
      setShowVerifyModal(true);
      toast.success('Registration successful! Please verify your email.');
    } catch (err) {
      console.error(err);
      toast.error('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasPasswordErrors = Array.isArray(errors.password) && errors.password.length > 0;

  const isFormValid =
    formData.firstName && formData.lastName && formData.email &&
    formData.phone && formData.birthday && formData.gender &&
    formData.community && formData.password && formData.confirmPassword &&
    Object.values(errors).every(err => Array.isArray(err) ? err.length === 0 : !err) &&
    isAllAgreed;

  return (
    <div className="user-signup-modal-overlay">
      <div className="user-signup-modal-card" onClick={e => e.stopPropagation()}>

        {/* BACK BUTTON */}
        <button onClick={onClose} className="user-signup-back-btn" type="button">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.p203476e0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M12.6667 8H3.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>

        {/* HEADER */}
        <div className="user-signup-header">
          <img src={imgPuacLogo} alt="Logo" className="user-signup-logo" />
          <h1 className="user-signup-title">Create Your Account</h1>
          <p className="user-signup-subtitle">Join our church community today</p>
        </div>

        <form onSubmit={handleSubmit} className="user-signup-form" noValidate>

          {/* ROW 1: First Name + Last Name */}
          <div className="user-signup-form-row">
            <div className="user-signup-form-group">
              <label htmlFor="firstName" className="user-signup-form-label">First Name:</label>
              <div className="user-signup-input-wrapper">
                <svg className="user-signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  id="firstName" name="firstName"
                  value={formData.firstName}
                  onChange={handleChange} onBlur={handleBlur}
                  className={`user-signup-form-input${touched.firstName && errors.firstName ? ' user-input-error' : (touched.firstName && !errors.firstName ? ' user-input-success' : '')}`}
                  placeholder="Enter your first name"
                  autoComplete="given-name"
                />
              </div>
              {touched.firstName && errors.firstName && (
                <span className="user-signup-error-text">{errors.firstName}</span>
              )}
            </div>

            <div className="user-signup-form-group">
              <label htmlFor="lastName" className="user-signup-form-label">Last Name:</label>
              <div className="user-signup-input-wrapper">
                <svg className="user-signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  id="lastName" name="lastName"
                  value={formData.lastName}
                  onChange={handleChange} onBlur={handleBlur}
                  className={`user-signup-form-input${touched.lastName && errors.lastName ? ' user-input-error' : (touched.lastName && !errors.lastName ? ' user-input-success' : '')}`}
                  placeholder="Enter your last name"
                  autoComplete="family-name"
                />
              </div>
              {touched.lastName && errors.lastName && (
                <span className="user-signup-error-text">{errors.lastName}</span>
              )}
            </div>
          </div>

          {/* ROW 2: Email + Phone */}
          <div className="user-signup-form-row">
            <div className="user-signup-form-group">
              <label htmlFor="email" className="user-signup-form-label">Email:</label>
              <div className="user-signup-input-wrapper">
                <svg className="user-signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p24d83580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.pd919a80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  id="email" name="email" type="email"
                  value={formData.email}
                  onChange={handleChange} onBlur={handleBlur}
                  className={`user-signup-form-input${touched.email && errors.email ? ' user-input-error' : (touched.email && !errors.email ? ' user-input-success' : '')}`}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
              </div>
              {touched.email && errors.email && (
                <span className="user-signup-error-text">{errors.email}</span>
              )}
            </div>

            <div className="user-signup-form-group">
              <label htmlFor="phone" className="user-signup-form-label">Phone Number:</label>
              <div className="user-signup-input-wrapper">
                <svg className="user-signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p24c7c480} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <div className="user-signup-phone-input-container">
                  <span className="user-signup-phone-prefix">+63</span>
                  <input
                    id="phone" name="phone" type="tel"
                    value={formData.phone}
                    onChange={handleChange} onBlur={handleBlur}
                    className={`user-signup-form-input user-signup-phone-input${touched.phone && errors.phone ? ' user-input-error' : (touched.phone && !errors.phone ? ' user-input-success' : '')}`}
                    placeholder="917 123 4567"
                    autoComplete="tel"
                  />
                </div>
              </div>
              {touched.phone && errors.phone && (
                <span className="user-signup-error-text">{errors.phone}</span>
              )}
            </div>
          </div>

          {/* ROW 3: Gender + Birthday + Community */}
          <div className="user-signup-form-row-3">

            {/* GENDER — radio buttons */}
            <div className="user-signup-form-group">
              <label className="user-signup-form-label">Gender:</label>
              <div className="user-gender-radio-group">
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`user-gender-radio-card${formData.gender === value ? ' user-gender-radio-card--selected' : ''}${touched.gender && errors.gender ? ' user-input-error' : ''}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={value}
                      checked={formData.gender === value}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="user-gender-radio-input"
                    />
                    <span className="user-gender-radio-dot" />
                    <span className="user-gender-radio-text">{label}</span>
                  </label>
                ))}
              </div>
              {touched.gender && !errors.gender && <span className="user-signup-success-icon">✓ Valid</span>}
              {touched.gender && errors.gender && (
                <span className="user-signup-error-text">{errors.gender}</span>
              )}
            </div>

            {/* BIRTHDAY */}
            <div className="user-signup-form-group">
              <label htmlFor="birthday" className="user-signup-form-label">
                Birthday:
              </label>
              <div className="user-signup-input-wrapper">
                <svg className="user-signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d="M6.66667 1.66667V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M13.3333 1.66667V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p1da67b80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d="M2.5 8.33333H17.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  id="birthday" type="date" name="birthday"
                  value={formData.birthday}
                  onChange={handleChange} onBlur={handleBlur}
                  onKeyDown={e => e.preventDefault()}
                  min={minBirthDate.toISOString().split('T')[0]}
                  max={maxBirthDate.toISOString().split('T')[0]}
                  className={`user-signup-form-input${touched.birthday && errors.birthday ? ' user-input-error' : (touched.birthday && !errors.birthday ? ' user-input-success' : '')}`}
                  placeholder="MM-DD-YYYY"
                  autoComplete="bday"
                />
              </div>
              {touched.birthday && errors.birthday && (
                <span className="user-signup-error-text">{errors.birthday}</span>
              )}
              {touched.birthday && !errors.birthday && calculatedAge !== null && (
                <span className="user-signup-success-icon">✓ Age: {calculatedAge}</span>
              )}
            </div>

            {/* COMMUNITY */}
            <div className="user-signup-form-group">
              <label className="user-signup-form-label">Community:</label>
              <div className="user-signup-select-wrapper">
                <svg className="user-signup-select-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <CommunitySelect value={formData.community} onChange={handleChange} />
                <svg className="user-signup-select-dropdown" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1ae0b780} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
              {touched.community && errors.community && (
                <span className="user-signup-error-text">{errors.community}</span>
              )}
            </div>
          </div>

          {/* Password Requirements Box */}
          <div className="user-password-requirements-box">
            <p className="user-password-requirements-title">Password must include:</p>
            <ul className="user-password-requirements-list-v2">
              <li className={!formData.password ? 'user-req-default' : (formData.password.length >= 8 ? 'user-req-met' : 'user-req-unmet')}>
                Minimum 8 characters
              </li>
              <li className={!formData.password ? 'user-req-default' : (passwordUppercase.test(formData.password) ? 'user-req-met' : 'user-req-unmet')}>
                At least 1 uppercase letter (A–Z)
              </li>
              <li className={!formData.password ? 'user-req-default' : (passwordLowercase.test(formData.password) ? 'user-req-met' : 'user-req-unmet')}>
                At least 1 lowercase letter (a–z)
              </li>
              <li className={!formData.password ? 'user-req-default' : (passwordNumber.test(formData.password) ? 'user-req-met' : 'user-req-unmet')}>
                At least 1 number
              </li>
              <li className={!formData.password ? 'user-req-default' : (passwordSymbol.test(formData.password) ? 'user-req-met' : 'user-req-unmet')}>
                At least 1 symbol (@ # $ % * _)
              </li>
            </ul>
          </div>

          {/* ROW 4: Password + Confirm Password side-by-side */}
          <div className="user-signup-form-row">
            <div className="user-signup-form-group">
              <label htmlFor="password" className="user-signup-form-label">Password:</label>
              <div className="user-signup-input-wrapper">
                <svg className="user-signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p2566d000} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p1bf79e00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange} onBlur={handleBlur}
                  className={`user-signup-form-input${touched.password && hasPasswordErrors ? ' user-input-error' : (touched.password && !hasPasswordErrors && formData.password ? ' user-input-success' : '')}`}
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="user-signup-password-toggle">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="user-signup-form-group">
              <label htmlFor="confirmPassword" className="user-signup-form-label">Confirm Password:</label>
              <div className="user-signup-input-wrapper">
                <svg className="user-signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p2566d000} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p1bf79e00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange} onBlur={handleBlur}
                  className={`user-signup-form-input${touched.confirmPassword && errors.confirmPassword ? ' user-input-error' : (touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword ? ' user-input-success' : '')}`}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="user-signup-password-toggle">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <span className="user-signup-error-text">{errors.confirmPassword}</span>
              )}
            </div>
          </div>

          {/* TERMS */}
          <div className="user-signup-checkbox-wrapper">
            <input
              type="checkbox"
              checked={isAllAgreed}
              onChange={() => { }}
              onClick={(e) => {
                e.preventDefault();
                if (!isAllAgreed) {
                  toast.info('Please read and agree to the Terms and Privacy Policy below to proceed.');
                }
              }}
              className="user-signup-checkbox"
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            />
            <label className="user-signup-checkbox-label">
              I agree to the{' '}
              <button type="button" onClick={() => setShowTerms(true)} className="user-signup-link">Terms and Conditions</button>
              {' and '}
              <button type="button" onClick={() => setShowPrivacy(true)} className="user-signup-link">Privacy Policy</button>
            </label>
          </div>

          {/* SUBMIT */}
          <button type="submit" className="user-signup-submit-button" disabled={!isFormValid || loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        {/* TERMS MODAL */}
        {showTerms && (
          <div className="user-policy-modal-overlay" onClick={() => setShowTerms(false)}>
            <div className="user-policy-modal-content" onClick={e => e.stopPropagation()}>
              <div className="user-policy-modal-header">
                <h3>Terms & Conditions</h3>
                <button className="user-policy-close-x" onClick={() => setShowTerms(false)}>&times;</button>
              </div>
              <div className="user-policy-modal-body">
                <ol className="user-policy-list">
                  <li><strong>Acceptance of Terms</strong><br />By accessing and using FaithLy, a loan management system developed for the Philippine United Apostolic Church, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, you must discontinue use of the system.</li>
                  <li><strong>Purpose of the System</strong><br />FaithLy is designed to facilitate transparent and accountable management of church-related loan applications, approvals, payments, and member records in support of responsible financial stewardship.</li>
                  <li><strong>Authorized Users</strong><br />Only registered and approved church members, officers, and administrators are permitted to access FaithLy. Access rights are assigned based on user roles defined by church authorities.</li>
                  <li><strong>User Responsibilities</strong><br />Users are responsible for maintaining the confidentiality of their login credentials and for all activities performed under their accounts. Any unauthorized use must be reported immediately.</li>
                  <li><strong>Loan Application and Approval</strong><br />Submitting a loan application through FaithLy does not guarantee approval. All loan requests are subject to review, verification, and approval by authorized church officers in accordance with church policies.</li>
                  <li><strong>Loan Terms, Interest, and Penalties</strong><br />Approved loans are governed by agreed terms, including loan amount, repayment schedule, interest rates, and applicable penalties for late payments. These details are displayed within the system and serve as the official reference.</li>
                  <li><strong>Payments and Monitoring</strong><br />Borrowers are responsible for making payments on or before the due dates shown in FaithLy. The system provides automated monitoring of balances, payment history, and loan status for reference purposes.</li>
                  <li><strong>AI Assistance Disclaimer</strong><br />FaithLy may include an AI-powered chatbot (GuideLy) to assist with inquiries related to loan status, payment schedules, and system navigation. The chatbot provides informational support only and does not replace official decisions made by church authorities.</li>
                  <li><strong>Prohibited Use</strong><br />Users shall not misuse the system, attempt unauthorized access, manipulate records, or engage in activities that compromise the security or integrity of FaithLy.</li>
                  <li><strong>Termination of Access</strong><br />The church reserves the right to suspend or terminate access to FaithLy for violations of these Terms and Conditions or other valid administrative reasons.</li>
                  <li><strong>Limitation of Liability</strong><br />FaithLy is provided for administrative support purposes only. The church shall not be held liable for any direct or indirect damages arising from the use or inability to use the system.</li>
                  <li><strong>Governing Principles</strong><br />FaithLy operates under the principles of faith, integrity, transparency, accountability, and responsible stewardship in alignment with church values.</li>
                </ol>
              </div>
              <button onClick={() => { setAgreeTerms(true); setShowTerms(false); }} className="user-policy-modal-button">Agree</button>
            </div>
          </div>
        )}

        {/* PRIVACY MODAL */}
        {showPrivacy && (
          <div className="user-policy-modal-overlay" onClick={() => setShowPrivacy(false)}>
            <div className="user-policy-modal-content" onClick={e => e.stopPropagation()}>
              <div className="user-policy-modal-header">
                <h3>Privacy Policy</h3>
                <button className="user-policy-close-x" onClick={() => setShowPrivacy(false)}>&times;</button>
              </div>
              <div className="user-policy-modal-body">
                <ol className="user-policy-list">
                  <li><strong>Data Collection</strong><br />FaithLy collects personal information such as names, contact details, loan records, payment history, and system usage data necessary for loan management and administrative purposes.</li>
                  <li><strong>Use of Information</strong><br />Collected information is used solely to process loan applications, monitor payments, maintain records, provide system support, and improve FaithLy services.</li>
                  <li><strong>Data Protection and Security</strong><br />FaithLy implements reasonable administrative, technical, and organizational measures to protect personal data against unauthorized access, alteration, disclosure, or loss.</li>
                  <li><strong>Data Privacy Compliance</strong><br />All personal data is processed in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules and regulations.</li>
                  <li><strong>Data Sharing</strong><br />Personal information shall not be shared with third parties except when required by law or authorized by church administration for official purposes.</li>
                  <li><strong>User Rights</strong><br />Users have the right to access, correct, and request updates to their personal information in accordance with applicable data privacy laws.</li>
                  <li><strong>Data Retention</strong><br />Personal data is retained only for as long as necessary to fulfill the purposes of the system or as required by church policy and applicable laws.</li>
                  <li><strong>Changes to the Privacy Policy</strong><br />The church reserves the right to update this Privacy Policy as needed. Users will be informed of significant changes, and continued use of FaithLy constitutes acceptance of the updated policy.</li>
                  <li><strong>Contact Information</strong><br />For questions or concerns regarding these Terms and Conditions or the Privacy Policy, users may contact the church administration through official communication channels.</li>
                </ol>
              </div>
              <button onClick={() => { setAgreePrivacy(true); setShowPrivacy(false); }} className="user-policy-modal-button">Agree</button>
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