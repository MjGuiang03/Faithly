import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bold, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import svgPaths from "../../imports/svg-icons";
import imgPuacLogo from "../../assets/puaclogo.png";
import '../styles/Signup.css';
import VerifyEmailModal from '../components/VerifyEmail';

const nameRegex = /^[A-Za-z\s]*$/;
const phoneRegex = /^\d{10}$/;
const passwordUppercase = /[A-Z]/;
const passwordNumber = /[0-9]/;
const passwordSymbol = /[^A-Za-z0-9]/;
const validDomains = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','live.com','msn.com','aol.com','protonmail.com','zoho.com','mail.com','yandex.com'];
const MIN_AGE = 18;
const MAX_AGE = 100;
const today = new Date();
today.setHours(0,0,0,0);
const maxBirthDate = new Date(today.getFullYear() - MIN_AGE,today.getMonth(),today.getDate());
const minBirthDate = new Date(today.getFullYear() - MAX_AGE,today.getMonth(),today.getDate());

const validateEmailAdvanced = (email) => {
  if (!email) return 'Email is required';
  if (/\s/.test(email)) return 'Email cannot contain spaces';
  if (!email.includes('@')) return 'Email must contain @';
  const parts = email.split('@');
  if (parts.length !== 2) return 'Email must have exactly one @';
  const [localPart, domain] = parts;
  if (!localPart || localPart.length === 0) return 'Email must have a local part before @';
  if (!/^[a-zA-Z0-9._-]+$/.test(localPart)) return 'Local part contains invalid characters';
  if (localPart.startsWith('.') || localPart.endsWith('.')) return 'Local part cannot start or end with a dot';
  if (/\.\./.test(localPart)) return 'Local part cannot have consecutive dots';
  if (!domain || domain.length === 0) return 'Email must have a domain after @';
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Domain cannot start or end with a dot';
  if (!domain.includes('.')) return 'Domain must contain at least one dot';
  const domainParts = domain.split('.');
  if (domainParts.some(part => part.length === 0)) return 'Invalid domain format';
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return 'Invalid domain extension';
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return 'Domain contains invalid characters';
  if (domainParts.length < 2) return 'Please use a complete domain (e.g., example.com)';
  const isKnownDomain = validDomains.includes(domain.toLowerCase());
  const hasValidFormat = domainParts.length >= 2 && tld.length >= 2 && !/^\d+$/.test(tld);
  if (!isKnownDomain && !hasValidFormat) return 'Please use a valid email domain';
  return '';
};

const calculateAge = (birthDate) => {
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

export default function SignupModal({ isOpen, onClose, onSwitchToLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({firstName:'',lastName:'',email:'',phone:'',gender:'',birthday:'',community:'',position:'',churchId:'',password:'',confirmPassword:''});
  const [errors, setErrors] = useState({});
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

  const validateField = (name,value) => {
    let error='';
    switch(name){
      case 'firstName':
      case 'lastName':
        if(!value) error='This field is required';
        else if(!nameRegex.test(value)) error='Letters only';
        else if(value.length>15) error='Max 15 characters';
        break;
      case 'email':
        error = validateEmailAdvanced(value);
        break;
      case 'phone':
        if(!phoneRegex.test(value)) error='10 digits required';
        break;
      case 'birthday':
        if(!value) error='Birthdate is required';
        else { const age = calculateAge(value); if(age<MIN_AGE) error='You must be at least 18 years old'; else if(age>MAX_AGE) error='Age must not exceed 100 years'; }
        break;
      case 'password': {
        const passwordErrors=[];
        if(value.length<8) passwordErrors.push('At least 8 characters');
        if(!passwordUppercase.test(value)) passwordErrors.push('At least one uppercase letter');
        if(!passwordNumber.test(value)) passwordErrors.push('At least one number');
        if(!passwordSymbol.test(value)) passwordErrors.push('At least one symbol');
        error=passwordErrors;
        break;
      }
      case 'confirmPassword':
        if(!value) error='Confirm password is required';
        else if(value!==formData.password) error='Passwords do not match';
        break;
      default: break;
    }
    setErrors(prev=>({...prev,[name]:error}));
  };

  const handleChange = (e) => {
    const {name,value} = e.target;
    let sanitized=value;
    if(name==='firstName'||name==='lastName') sanitized=value.replace(/[^A-Za-z\s]/g,'').slice(0,15);
    if(name==='phone'){let phoneValue=value.replace(/^\+63/,''); sanitized=phoneValue.replace(/\D/g,'').slice(0,10);}
    if(name==='birthday'&&sanitized){const age=calculateAge(sanitized); setCalculatedAge(age>=0?age:null);}
    setFormData(prev=>{const updated={...prev,[name]:sanitized}; if(name==='password'&&prev.confirmPassword) validateField('confirmPassword',prev.confirmPassword); return updated;});
    validateField(name,sanitized);
  };

  const handlePhoneFocus=(e)=>{if(!formData.phone){e.target.setSelectionRange(3,3);}}

  const handleSubmit=async(e)=>{
    e.preventDefault();
    if(!isFormValid) return;
    setLoading(true);
    try{
      const fullName=`${formData.firstName} ${formData.lastName}`;
      const submitData={fullName,email:formData.email,phone:`+63${formData.phone}`,birthday:formData.birthday,gender:formData.gender,branch:formData.community,position:formData.position,churchId:formData.churchId,password:formData.password};
      const response=await fetch(`${process.env.REACT_APP_API_URL}/api/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(submitData)});
      const data=await response.json();
      if(!response.ok){toast.error(data.message||'Registration failed'); return;}
      setRegisteredEmail(formData.email);
      setShowVerifyModal(true);
      toast.success('Registration successful! Please verify your email.');
      onClose();
    }catch(err){console.error(err); toast.error('Server error. Please try again.');}finally{setLoading(false);}
  };

  const isFormValid=formData.firstName&&formData.lastName&&formData.email&&formData.phone&&formData.birthday&&formData.password&&formData.confirmPassword&&Object.values(errors).every(err=>Array.isArray(err)?err.length===0:!err)&&isAllAgreed;

  return(
    <div className="signup-modal-overlay" >
      <div className="signup-modal-card" onClick={(e)=>e.stopPropagation()}>

        {/* BACK BUTTON */}
        <button onClick={onClose} className="signup-back-btn" type="button">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.p203476e0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M12.6667 8H3.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>

        {/* HEADER WITH LOGO */}
        <div className="signup-header">
          <img src={imgPuacLogo} alt="Logo" className="signup-logo" />
          <h1 className="signup-title">Create Your Account</h1>
          <p className="signup-subtitle">Join our church community today</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="signup-form">

          {/* ROW: FIRST NAME + LAST NAME */}
          <div className="signup-form-row">
            <div className="signup-form-group">
              <label className="signup-form-label">First Name:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`signup-form-input ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="Enter your first name"
                />
              </div>
              {errors.firstName && <span className="signup-error-text">{errors.firstName}</span>}
            </div>

            <div className="signup-form-group">
              <label className="signup-form-label">Last Name:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`signup-form-input ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="Enter your last name"
                />
              </div>
              {errors.lastName && <span className="signup-error-text">{errors.lastName}</span>}
            </div>
          </div>

          {/* ROW: EMAIL + PHONE */}
          <div className="signup-form-row">
            <div className="signup-form-group">
              <label className="signup-form-label">Email:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p24d83580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.pd919a80} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`signup-form-input ${errors.email ? 'input-error' : ''}`}
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && <span className="signup-error-text">{errors.email}</span>}
            </div>

            <div className="signup-form-group">
              <label className="signup-form-label">Phone Number: (e.g +639123456789)</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p24c7c480} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  name="phone"
                  value={`+63${formData.phone}`}
                  onChange={handleChange}
                  onFocus={handlePhoneFocus}
                  className={`signup-form-input ${errors.phone ? 'input-error' : ''}`}
                  placeholder="+639123456789"
                />
              </div>
              {errors.phone && <span className="signup-error-text">{errors.phone}</span>}
            </div>
          </div>

          {/* ROW: GENDER + BIRTHDAY + CHURCH ID */}
          <div className="signup-form-row-3">
            <div className="signup-form-group">
              <label className="signup-form-label">Gender:</label>
              <div className="signup-select-wrapper">
                <svg className="signup-select-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="signup-form-select"
                >
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
              <label className="signup-form-label">Birthday:
                {calculatedAge !== null && (
                  <span style={{ marginLeft: '8px', fontWeight: 'Bold', color: "#00bc2c" }}>
                    (Age: {calculatedAge})
                  </span>
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
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  min={minBirthDate.toISOString().split('T')[0]}
                  max={maxBirthDate.toISOString().split('T')[0]}
                  className={`signup-form-input ${errors.birthday ? 'input-error' : ''}`}
                  placeholder="MM-DD-YYYY"
                />
              </div>
              {errors.birthday && <span className="signup-error-text">{errors.birthday}</span>}
            </div>

            <div className="signup-form-group">
              <label className="signup-form-label">Church ID:</label>
              <div className="signup-input-wrapper">
                <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <input
                  name="churchId"
                  value={formData.churchId}
                  onChange={handleChange}
                  className="signup-form-input"
                  placeholder="Church ID number"
                />
              </div>
            </div>
          </div>

          {/* ROW: COMMUNITY + POSITION */}
          <div className="signup-form-row">
            <div className="signup-form-group">
              <label className="signup-form-label">Community:</label>
              <div className="signup-select-wrapper">
                <svg className="signup-select-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <select
                  name="community"
                  value={formData.branch}
                  onChange={handleChange}
                  className="signup-form-select"
                >
                  <option value="">Select your Community</option>
                  <option value="Main Branch">Main Branch</option>
                  <option value="Northside Branch">Northside Branch</option>
                  <option value="Southside Branch">Southside Branch</option>
                  <option value="Downside Branch">Downside Branch</option>
                </select>
                <svg className="signup-select-dropdown" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1ae0b780} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
            </div>

            <div className="signup-form-group">
              <label className="signup-form-label">Position:</label>
              <div className="signup-select-wrapper">
                <svg className="signup-select-icon" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1beb9580} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p32ab0300} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="signup-form-select"
                >
                  <option value="">Select Position</option>
                  <option value="Deacon">Deacon</option>
                  <option value="Local Evangelist">Local Evangelist</option>
                  <option value="District Evangelist">District Evangelist</option>
                  <option value="National Evangelist">National Evangelist</option>
                  <option value="Assistant Priest">Assistant Priest</option>
                  <option value="Priest">Priest</option>
                  <option value="Elder">Elder</option>
                  <option value="District Elder">District Elder</option>
                  <option value="Bishop">Bishop</option>
                  <option value="District Bishop">District Bishop</option>
                  <option value="National Bishop">National Bishop</option>
                  <option value="Apostle">Apostle</option>
                </select>
                <svg className="signup-select-dropdown" fill="none" viewBox="0 0 20 20">
                  <path d={svgPaths.p1ae0b780} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </svg>
              </div>
            </div>
          </div>

          {/* PASSWORD SECTION */}
          <div className="password-section">
            <div className="password-fields">
              <div className="signup-form-group">
                <label className="signup-form-label">Password:</label>
                <div className="signup-input-wrapper">
                  <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p2566d000} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p1bf79e00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`signup-form-input ${
                      Array.isArray(errors.password)
                        ? errors.password.length > 0 ? 'input-error' : ''
                        : errors.password ? 'input-error' : ''
                    }`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="signup-password-toggle"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="signup-form-group">
                <label className="signup-form-label">Confirm Password:</label>
                <div className="signup-input-wrapper">
                  <svg className="signup-input-icon" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p2566d000} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p1bf79e00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`signup-form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="signup-password-toggle"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* PASSWORD REQUIREMENTS BOX */}
            <div className="password-requirements-box">
              <p className="password-requirements-title">Password must contain:</p>
              {(Array.isArray(errors.password) && errors.password.length > 0) || errors.confirmPassword ? (
                <div className="password-error-message">
                  {errors.email && <p className="error-item">{errors.email}</p>}
                  {errors.password && (
                    <div className="password-error-message">
                      {errors.password.map((err, index) => (
                        <p key={index} className="error-item">{err}</p>
                      ))}
                    </div>
                  )}
                  {errors.confirmPassword && <p className="error-item">{errors.confirmPassword}</p>}
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

          {/* TERMS CHECKBOX — only checks when both modals are agreed */}
          <div className="signup-checkbox-wrapper">
            <input
              type="checkbox"
              checked={isAllAgreed}
              onChange={() => {}}
              onClick={(e) => e.preventDefault()}
              className="signup-checkbox"
            />
            <label className="signup-checkbox-label">
              I agree to the{' '}
              <button type="button" onClick={() => setShowTerms(true)} className="signup-link">
                Terms and Conditions
              </button>
              {' and '}
              <button type="button" onClick={() => setShowPrivacy(true)} className="signup-link">
                Privacy Policy
              </button>
            </label>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="signup-submit-button"
            disabled={!isFormValid || loading}
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        {/* TERMS MODAL */}
        {showTerms && (
          <div className="policy-modal-overlay" onClick={() => setShowTerms(false)}>
            <div className="policy-modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Terms & Conditions</h3>
              <p>Please read and agree to the terms and conditions...</p>
              <button
                onClick={() => { setAgreeTerms(true); setShowTerms(false); }}
                className="policy-modal-button"
              >
                Agree
              </button>
            </div>
          </div>
        )}

        {/* PRIVACY MODAL */}
        {showPrivacy && (
          <div className="policy-modal-overlay" onClick={() => setShowPrivacy(false)}>
            <div className="policy-modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Privacy Policy</h3>
              <p>Please read and agree to the privacy policy...</p>
              <button
                onClick={() => { setAgreePrivacy(true); setShowPrivacy(false); }}
                className="policy-modal-button"
              >
                Agree
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VERIFY EMAIL MODAL */}
            {showVerifyModal && <VerifyEmailModal isOpen={showVerifyModal} onClose={()=>setShowVerifyModal(false)} email={registeredEmail}/>}
    </div>
  );
}