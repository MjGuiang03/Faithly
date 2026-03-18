import puacLogo from '../assets/puaclogo.png';
import '../styles/Logo.css';

export default function Logo({ subtitle = 'Member Portal' }) {
  return (
    <div className="user-logo">
      <img src={puacLogo} alt="PUAC Logo" className="user-logo-image" />
      <div className="user-logo-text">
        <h1 className="user-logo-title">FaithLy</h1>
        <p className="user-logo-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
