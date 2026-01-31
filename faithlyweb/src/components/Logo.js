import puacLogo from '../assets/puaclogo.png';
import '../styles/Logo.css';

export default function Logo({ subtitle = 'Member Portal' }) {
  return (
    <div className="app-logo">
      <img src={puacLogo} alt="PUAC Logo" className="app-logo-image" />
      <div className="app-logo-text">
        <h1 className="app-logo-title">FaithLy</h1>
        <p className="app-logo-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
