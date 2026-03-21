import { useState } from "react";
import { X, Info, Clock, AlertTriangle } from "lucide-react";
import "../styles/OfficerVerification.css";

import API from '../../utils/api';

export default function VerificationModal({ isOpen, onClose }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [churchId,   setChurchId]   = useState("");
  const [position,   setPosition]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState("");

  const isModal = typeof isOpen !== "undefined";

  const resetForm = () => {
    setShowConfirmation(false);
    setChurchId("");
    setPosition("");
    setApiError("");
  };

  const handleClose = () => {
    resetForm();
    if (isModal && onClose) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!churchId || !position) {
      setApiError("Please fill in all required fields.");
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
        body: JSON.stringify({ churchId, position }),
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
    <div className="user-verification-confirmation">
      <button className="user-verification-close-btn user-verification-close-top" onClick={handleClose} type="button">
        <X size={20} />
      </button>

      <div className="user-verification-check-circle">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h2 className="user-verification-confirm-title">Verification Submitted!</h2>

      <p className="user-verification-confirm-text">
        Your officer verification request has been successfully submitted. You will receive
        the results within <strong>3–5 business days</strong>.
      </p>

      <div className="user-verification-timeline-box">
        <Clock size={18} className="user-verification-timeline-icon" />
        <div>
          <p className="user-verification-timeline-title">Processing Timeline</p>
          <p className="user-verification-timeline-text">
            Our administrators will review your information and notify you once your access
            has been approved.
          </p>
        </div>
      </div>

      <button className="user-verification-submit-btn user-verification-gotit-btn" onClick={handleClose}>
        Got it, Thanks!
      </button>
    </div>
  );

  /* ── Verification form ── */
  const renderForm = () => (
    <>
      <div className="user-verification-header">
        <h1 className="user-verification-title">Officer Verification</h1>
        <p className="user-verification-subtitle">
          To access the Loan module, members must verify their officer status. Please submit
          the required information below for approval.
        </p>
      </div>

      {apiError && (
        <div className="user-verification-error-banner">
          <AlertTriangle size={16} className="user-verification-error-icon" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="user-verification-form">


        {/* Church ID */}
        <div className="user-verification-form-group">
          <label className="user-verification-label">Church ID Number</label>
          <input
            type="text"
            className="user-verification-input"
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            placeholder="Enter your Church ID"
            required
            disabled={loading}
          />
        </div>

        {/* Position */}
        <div className="user-verification-form-group">
          <label className="user-verification-label">Church Position</label>
          <select
            className="user-verification-input"
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

        <button type="submit" className="user-verification-submit-btn" disabled={loading}>
          {loading ? "Submitting…" : "Submit Verification"}
        </button>

        <button type="button" className="user-verification-cancel-btn" onClick={handleClose} disabled={loading}>
          Cancel
        </button>

        {/* Info box */}
        <div className="user-verification-info-box">
          <Info size={20} className="user-verification-info-icon" />
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
    <div className="user-verification-container" onClick={(e) => e.stopPropagation()}>
      {isModal && !showConfirmation && (
        <button className="user-verification-close-btn user-verification-close-top" onClick={handleClose} type="button">
          <X size={20} />
        </button>
      )}

      {showConfirmation
        ? renderConfirmation()
        : <div className="user-verification-main">{renderForm()}</div>
      }
    </div>
  );

  if (isModal) {
    if (!isOpen) return null;
    return (
      <div className="user-verification-overlay" onClick={handleClose}>
        {card}
      </div>
    );
  }

  return <div className="user-verification-page">{card}</div>;
}