import { useState } from "react";
import { X, Info, Clock, AlertTriangle } from "lucide-react";
import "../styles/OfficerVerification.css";

const API = process.env.REACT_APP_API_URL;

export default function VerificationModal({ isOpen, onClose }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [churchId,   setChurchId]   = useState("");
  const [position,   setPosition]   = useState("");
  const [occupation, setOccupation] = useState("");
  const [salary,     setSalary]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState("");

  const isModal = typeof isOpen !== "undefined";

  const resetForm = () => {
    setShowConfirmation(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!churchId || !position || !occupation || !salary) {
      setApiError("Please fill in all required fields.");
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
      <button className="vm-close-btn vm-close-top" onClick={handleClose} type="button">
        <X size={20} />
      </button>

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
            Our administrators will review your information and notify you once your access
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

      {apiError && (
        <div className="vm-error-banner">
          <AlertTriangle size={16} className="vm-error-icon" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="vm-form">
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
          <select
            className="vm-input"
            value={occupation.startsWith("Others: ") ? "Others" : occupation}
            onChange={(e) => {
              if (e.target.value === "Others") {
                setOccupation("Others: ");
              } else {
                setOccupation(e.target.value);
              }
            }}
            required
            disabled={loading}
          >
            <option value="">Select your occupation</option>
            <optgroup label="Government & Public Service">
              <option>Government Employee</option>
              <option>Public School Teacher</option>
              <option>Police Officer</option>
              <option>Military Personnel</option>
              <option>Barangay Official</option>
              <option>Postal Worker</option>
            </optgroup>
            <optgroup label="Healthcare">
              <option>Doctor / Physician</option>
              <option>Nurse</option>
              <option>Midwife</option>
              <option>Pharmacist</option>
              <option>Medical Technologist</option>
              <option>Dentist</option>
              <option>Caregiver</option>
            </optgroup>
            <optgroup label="Education">
              <option>Private School Teacher</option>
              <option>Professor / Instructor</option>
              <option>Tutor</option>
            </optgroup>
            <optgroup label="Business & Finance">
              <option>Business Owner / Entrepreneur</option>
              <option>Accountant</option>
              <option>Bank Employee</option>
              <option>Insurance Agent</option>
              <option>Real Estate Agent</option>
              <option>Sales Representative</option>
            </optgroup>
            <optgroup label="Technology">
              <option>Software Developer / Engineer</option>
              <option>IT Support Specialist</option>
              <option>Graphic Designer</option>
              <option>BPO / Call Center Agent</option>
              <option>Data Analyst</option>
            </optgroup>
            <optgroup label="Skilled Trades & Labor">
              <option>Construction Worker / Mason</option>
              <option>Electrician</option>
              <option>Plumber</option>
              <option>Carpenter</option>
              <option>Mechanic</option>
              <option>Welder</option>
              <option>Factory Worker</option>
            </optgroup>
            <optgroup label="Transport & Logistics">
              <option>Driver (Jeepney / Tricycle / Bus)</option>
              <option>Delivery Rider</option>
              <option>Seaman / Seafarer</option>
              <option>Logistics Staff</option>
            </optgroup>
            <optgroup label="Agriculture & Fishing">
              <option>Farmer</option>
              <option>Fisher / Fisherman</option>
              <option>Farm Worker</option>
            </optgroup>
            <optgroup label="Retail & Food Service">
              <option>Sari-sari Store Owner</option>
              <option>Market Vendor</option>
              <option>Restaurant / Food Service Staff</option>
              <option>Cashier / Retail Staff</option>
            </optgroup>
            <optgroup label="Domestic & Personal Services">
              <option>Household Helper / Kasambahay</option>
              <option>Laundry Service Worker</option>
              <option>Beautician / Barber</option>
              <option>Dressmaker / Tailor</option>
            </optgroup>
            <optgroup label="OFW & Freelance">
              <option>OFW (Overseas Filipino Worker)</option>
              <option>Freelancer / Online Worker</option>
              <option>Content Creator / Influencer</option>
            </optgroup>
            <optgroup label="Other">
              <option value="Others">Others — please specify</option>
            </optgroup>
          </select>

          {/* Show text input when "Others" is selected */}
          {occupation.startsWith("Others") && (
            <input
              type="text"
              className="vm-input"
              value={occupation.replace("Others: ", "")}
              onChange={(e) => setOccupation(`Others: ${e.target.value}`)}
              placeholder="Please specify your occupation"
              required
              disabled={loading}
              style={{ marginTop: "8px" }}
            />
          )}
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