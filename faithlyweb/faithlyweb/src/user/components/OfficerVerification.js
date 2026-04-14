import { useState } from "react";
import { X, Camera, CreditCard, Info, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import "../styles/OfficerVerification.css";

const API = process.env.REACT_APP_API_URL;

export default function VerificationModal({ isOpen, onClose }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [churchId,   setChurchId]   = useState("");
  const [position,   setPosition]   = useState("");
  const [occupation, setOccupation] = useState("");
  const [salary,     setSalary]     = useState("");
  const [selfieFile, setSelfieFile] = useState(null);
  const [idFile,     setIdFile]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState("");

  const isModal = typeof isOpen !== "undefined";

  const resetForm = () => {
    setShowConfirmation(false);
    setSelfieFile(null);
    setIdFile(null);
    setChurchId("");
    setPosition("");
    setOccupation("");
    setSalary("");
    setApiError("");
  };

  const handleClose = () => {
    resetForm();
    if (isModal && onClose) onClose();
  };

  const handleSelfieUpload = (e) => {
    const file = e.target.files[0];
    if (file) setSelfieFile(file);
  };

  const handleIdUpload = (e) => {
    const file = e.target.files[0];
    if (file) setIdFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!selfieFile || !idFile || !churchId || !position || !occupation || !salary) {
      setApiError("Please fill in all required fields and upload both photos.");
      return;
    }

    if (isNaN(Number(salary)) || Number(salary) <= 0) {
      setApiError("Please enter a valid monthly salary.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/verification/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ churchId, position, occupation, salary: Number(salary) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.message || "Submission failed. Please try again.");
        return;
      }

      setShowConfirmation(true);
    } catch (err) {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Confirmation screen ── */
  const renderConfirmation = () => (
    <div className="vm-confirmation">
      {/* X close top-right */}
      <button className="vm-close-btn vm-close-top" onClick={handleClose} type="button">
        <X size={20} />
      </button>

      {/* Green check circle */}
      <div className="vm-check-circle">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h2 className="vm-confirm-title">Verification Submitted!</h2>

      <p className="vm-confirm-text">
        Your officer verification request has been successfully submitted. You will receive
        the results within <strong>3–5 business days</strong>.
      </p>

      <div className="vm-timeline-box">
        <Clock size={18} className="vm-timeline-icon" />
        <div>
          <p className="vm-timeline-title">Processing Timeline</p>
          <p className="vm-timeline-text">
            Our administrators will review your documents and notify you once your access
            has been approved.
          </p>
        </div>
      </div>

      <button className="vm-submit-btn vm-gotit-btn" onClick={handleClose}>
        Got it, Thanks!
      </button>
    </div>
  );

  /* ── Verification form ── */
  const renderForm = () => (
    <>
      <div className="vm-header">
        <h1 className="vm-title">Officer Verification</h1>
        <p className="vm-subtitle">
          To access the Loan module, members must verify their officer status. Please submit
          the required information below for approval.
        </p>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="vm-error-banner">
          <AlertTriangle size={16} className="vm-error-icon" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="vm-form">
        {/* Selfie upload */}
        <div className="vm-form-group">
          <label className="vm-label">Upload Selfie Verification</label>
          <label htmlFor="selfie-upload" className={`vm-upload-box ${selfieFile ? "vm-upload-box-done" : ""}`}>
            <div className="vm-upload-icon-wrapper">
              <Camera size={32} strokeWidth={2} className="vm-upload-icon" />
            </div>
            <p className="vm-upload-text">{selfieFile ? "✓ File selected" : "Tap to upload"}</p>
            <p className="vm-upload-subtext">
              {selfieFile
                ? selfieFile.name
                : "Upload a selfie holding your ID and the written date of application"}
            </p>
            <input type="file" id="selfie-upload" accept="image/*" onChange={handleSelfieUpload} hidden />
          </label>
        </div>

        {/* ID upload */}
        <div className="vm-form-group">
          <label className="vm-label">Upload Valid ID</label>
          <label htmlFor="id-upload" className={`vm-upload-box vm-upload-box-small ${idFile ? "vm-upload-box-done" : ""}`}>
            <div className="vm-upload-icon-wrapper">
              <CreditCard size={32} strokeWidth={2} className="vm-upload-icon" />
            </div>
            <p className="vm-upload-text">{idFile ? "✓ File selected" : "Tap to upload"}</p>
            <p className="vm-upload-subtext">
              {idFile ? idFile.name : "Upload a clear photo of any valid government-issued ID"}
            </p>
            <input type="file" id="id-upload" accept="image/*" onChange={handleIdUpload} hidden />
          </label>
        </div>

        {/* Church ID */}
        <div className="vm-form-group">
          <label className="vm-label">Church ID Number</label>
          <input
            type="text"
            className="vm-input"
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            placeholder="Enter your Church ID"
            required
            disabled={loading}
          />
        </div>

        {/* Position */}
        <div className="vm-form-group">
          <label className="vm-label">Church Position</label>
          <select
            className="vm-input"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">Select your position</option>
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
        </div>

        {/* Occupation */}
        <div className="vm-form-group">
          <label className="vm-label">Occupation / Job</label>
          <input
            type="text"
            className="vm-input"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Enter your occupation"
            required
            disabled={loading}
          />
        </div>

        {/* Salary */}
        <div className="vm-form-group">
          <label className="vm-label">Monthly Income / Salary (₱)</label>
          <input
            type="number"
            min="1"
            className="vm-input"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="e.g. 25000"
            required
            disabled={loading}
          />
        </div>

        <button type="submit" className="vm-submit-btn" disabled={loading}>
          {loading ? "Submitting…" : "Submit Verification"}
        </button>

        <button type="button" className="vm-cancel-btn" onClick={handleClose} disabled={loading}>
          Cancel
        </button>

        {/* Info box */}
        <div className="vm-info-box">
          <Info size={20} className="vm-info-icon" />
          <p>
            Your verification request will be reviewed by church administrators. You'll receive
            a notification once your Officer Access has been approved.
          </p>
        </div>
      </form>
    </>
  );

  /* ── Card container ── */
  const card = (
    <div className="vm-container" onClick={(e) => e.stopPropagation()}>
      {/* Form mode: show X at top right */}
      {isModal && !showConfirmation && (
        <button className="vm-close-btn vm-close-top" onClick={handleClose} type="button">
          <X size={20} />
        </button>
      )}

      {showConfirmation
        ? renderConfirmation()
        : <div className="vm-main">{renderForm()}</div>
      }
    </div>
  );

  if (isModal) {
    if (!isOpen) return null;
    return (
      <div className="vm-overlay" onClick={handleClose}>
        {card}
      </div>
    );
  }

  return <div className="vm-page">{card}</div>;
}