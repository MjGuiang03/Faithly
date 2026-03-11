import { useState } from 'react';
import '../styles/LoanApplicationModal.css';

export default function LoanApplicationModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    loanAmount: '',
    loanPurpose: '',
    repaymentPeriod: '',
    monthlyIncome: '',
    guarantorName: '',
    guarantorPhone: ''
  });
  const [selfieFile, setSelfieFile] = useState(null);
  const [idFile,     setIdFile]     = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData, { selfieFile, idFile });
    onClose();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="loan-application-overlay" onClick={onClose}>
      <div className="loan-application-content" onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="loan-application-header">
          <h2 className="loan-application-title">Apply for Loan</h2>
          <button className="loan-application-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} type="button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15" stroke="#0A0A0A" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5L15 15" stroke="#0A0A0A" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Modal Form */}
        <form className="loan-application-form" onSubmit={handleSubmit}>
          {/* Focus trap */}
          <input type="text" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} aria-hidden="true" readOnly />

          {/* Loan Amount */}
          <div className="loan-application-form-group">
            <label className="loan-application-label">Loan Amount (₱)</label>
            <div className="loan-application-input-wrapper">
              <span className="loan-application-input-icon">₱</span>
              <input
                type="number"
                name="loanAmount"
                className="loan-application-input"
                placeholder="Enter amount"
                value={formData.loanAmount}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Loan Purpose */}
          <div className="loan-application-form-group">
            <label className="loan-application-label">Loan Purpose</label>
            <div className="loan-application-input-wrapper">
              <select
                name="loanPurpose"
                className="loan-application-select"
                style={{ paddingLeft: '16px' }}
                value={formData.loanPurpose}
                onChange={handleChange}
                required
              >
                <option value="">Select purpose</option>
                <option value="Education">Education</option>
                <option value="Medical Emergency">Medical Emergency</option>
                <option value="Business Development">Business Development</option>
                <option value="Home Improvement">Home Improvement</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Repayment Period & Monthly Income */}
          <div className="loan-application-row">
            <div className="loan-application-group-half">
              <label className="loan-application-label">Repayment Period</label>
              <div className="loan-application-input-wrapper">
                <svg className="loan-application-input-icon-svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6.66667 1.66667V5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.3333 1.66667V5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="2.5" y="3.33333" width="15" height="14.1667" rx="2" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 8.33333H17.5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <select
                  name="repaymentPeriod"
                  className="loan-application-select"
                  style={{ paddingLeft: '40px' }}
                  value={formData.repaymentPeriod}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select period</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="18">18 months</option>
                  <option value="24">24 months</option>
                  <option value="36">36 months</option>
                </select>
              </div>
            </div>

            <div className="loan-application-group-half">
              <label className="loan-application-label">Monthly Income (₱)</label>
              <div className="loan-application-input-wrapper">
                <span className="loan-application-input-icon">₱</span>
                <input
                  type="number"
                  name="monthlyIncome"
                  className="loan-application-input"
                  placeholder="Enter income"
                  value={formData.monthlyIncome}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Guarantor Information */}
          <div className="loan-application-guarantor-section">
            <h3 className="loan-application-guarantor-title">Guarantor Information</h3>
            <div className="loan-application-row">
              <div className="loan-application-group-half">
                <label className="loan-application-label">Guarantor Name</label>
                <div className="loan-application-input-wrapper">
                  <svg className="loan-application-input-icon-svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.6667 17.5C16.6667 15.1988 13.6819 13.3333 10 13.3333C6.31812 13.3333 3.33334 15.1988 3.33334 17.5" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="10" cy="6.66667" r="3.33333" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="text"
                    name="guarantorName"
                    className="loan-application-input"
                    placeholder="Enter name"
                    value={formData.guarantorName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="loan-application-group-half">
                <label className="loan-application-label">Guarantor Phone</label>
                <div className="loan-application-input-wrapper">
                  <svg className="loan-application-input-icon-svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3.33334 3.33333H7.50001L9.16668 7.5L6.87501 8.75C7.93432 10.9028 9.59726 12.5657 11.75 13.625L13 11.3333L17.1667 13V17.1667C17.1667 17.6269 16.9824 18.0685 16.6542 18.3967C16.3261 18.7248 15.8845 18.9091 15.4243 18.9091C8.86193 18.5113 3.48875 13.1381 3.09093 6.57576C3.09093 6.11557 3.27519 5.67399 3.60334 5.34584C3.93148 5.01769 4.37306 4.83333 4.83334 4.83333" stroke="#99A1AF" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="tel"
                    name="guarantorPhone"
                    className="loan-application-input"
                    placeholder="Enter phone"
                    value={formData.guarantorPhone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upload Documents */}
          <div className="loan-application-upload-section">
            <h3 className="loan-application-guarantor-title">Upload Documents</h3>
            <div className="loan-application-row">

              {/* Selfie with ID & Date */}
              <div className="loan-application-group-half">
                <label className="loan-application-label">Selfie with ID &amp; Date</label>
                <label
                  htmlFor="loan-selfie-upload"
                  className={`loan-upload-box ${selfieFile ? 'loan-upload-box-done' : ''}`}
                >
                  {selfieFile ? (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="loan-upload-icon">
                        <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="loan-upload-text loan-upload-text-done">File selected</p>
                      <p className="loan-upload-subtext">{selfieFile.name}</p>
                    </>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="loan-upload-icon">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17 8 12 3 7 8" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="loan-upload-text">Click to upload or drag and drop</p>
                      <p className="loan-upload-subtext">PNG, JPG</p>
                    </>
                  )}
                  <input
                    type="file"
                    id="loan-selfie-upload"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setSelfieFile(e.target.files[0] || null)}
                    hidden
                  />
                </label>
              </div>

              {/* Valid Government ID */}
              <div className="loan-application-group-half">
                <label className="loan-application-label">Valid Government ID</label>
                <label
                  htmlFor="loan-id-upload"
                  className={`loan-upload-box ${idFile ? 'loan-upload-box-done' : ''}`}
                >
                  {idFile ? (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="loan-upload-icon">
                        <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="loan-upload-text loan-upload-text-done">File selected</p>
                      <p className="loan-upload-subtext">{idFile.name}</p>
                    </>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="loan-upload-icon">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17 8 12 3 7 8" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="#99A1AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="loan-upload-text">Click to upload or drag and drop</p>
                      <p className="loan-upload-subtext">PNG, JPG</p>
                    </>
                  )}
                  <input
                    type="file"
                    id="loan-id-upload"
                    accept="image/png, image/jpeg"
                    onChange={(e) => setIdFile(e.target.files[0] || null)}
                    hidden
                  />
                </label>
              </div>

            </div>
          </div>

          {/* Note */}
          <div className="loan-application-note-box">
            <p className="loan-application-note-text">
              <strong>Note:</strong> Your application will be reviewed within 2-3 business days. You will be notified via email about the status.
            </p>
          </div>

          {/* Form Actions */}
          <div className="loan-application-actions">
            <button type="submit" className="loan-application-submit-btn">Submit Application</button>
            <button type="button" className="loan-application-cancel-btn" onClick={onClose}>Cancel</button>
          </div>

        </form>
      </div>
    </div>
  );
}