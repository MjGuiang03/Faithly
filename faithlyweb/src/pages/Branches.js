import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import svgPaths from '../imports/svg-kfi3zq3ims';
import puacLogo from '../assets/puaclogo.png';
import '../styles/Branches.css';
import Sidebar from '../components/Sidebar';

export default function Branches() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      navigate('/');
    }
  };

  const branches = [
    {
      name: 'Bulacan',
      leader: 'Rev. Johnny Soriano',
      distance: '0.5 miles away',
      members: 850,
      location: 'Bulacan',
      phone: '+63 90 000 0000',
      email: 'puac@gmail.com',
      serviceTimes: [
        { day: 'Sunday', time: '8:00 AM & 10:00 AM' },
        { day: 'Wednesday', time: '7:00 PM' },
        { day: 'Friday', time: '6:00 PM' }
      ]
    },
    {
      name: 'Valenzuela',
      leader: 'Rev. Rommel Javier',
      distance: '3.2 miles away',
      members: 620,
      location: 'Valenzuela',
      phone: '+63 90 000 0000',
      email: 'puac@gmail.com',
      serviceTimes: [
        { day: 'Sunday', time: '9:00 AM & 11:00 AM' },
        { day: 'Tuesday', time: '7:00 PM' }
      ]
    },
    {
      name: 'Pangasinan',
      leader: 'Rev. Delfin Cayabyab',
      distance: '5.8 miles away',
      members: 480,
      location: 'Pangasinan',
      phone: '+63 90 000 0000',
      email: 'puac@gmail.com',
      serviceTimes: [
        { day: 'Sunday', time: '10:00 AM' },
        { day: 'Wednesday', time: '7:30 PM' }
      ]
    },
    {
      name: 'Rizal',
      leader: 'Rev. Samuel Soriano',
      distance: '7.1 miles away',
      members: 390,
      location: 'Rizal',
      phone: '+63 90 000 0000',
      email: 'puac@gmail.com',
      serviceTimes: [
        { day: 'Sunday', time: '9:30 AM' },
        { day: 'Friday', time: '7:00 PM' }
      ]
    }
  ];

  const totalMembers = branches.reduce((sum, branch) => sum + branch.members, 0);
  const totalServices = branches.reduce((sum, branch) => sum + branch.serviceTimes.length, 0);

  return (
    <div className="home-layout">
     
     <Sidebar/>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="branches-header">
          <h1 className="page-title">Our Branches</h1>
          <p className="page-subtitle">Find a church location near you</p>
        </div>

        {/* Stats Cards */}
        <div className="branches-stats">
          <div className="branch-stat-card">
            <p className="branch-stat-label">Total Branches</p>
            <p className="branch-stat-value">{branches.length}</p>
          </div>
          <div className="branch-stat-card">
            <p className="branch-stat-label">Total Members</p>
            <p className="branch-stat-value">{totalMembers.toLocaleString()}</p>
          </div>
          <div className="branch-stat-card">
            <p className="branch-stat-label">Weekly Services</p>
            <p className="branch-stat-value">{totalServices}</p>
          </div>
          <div className="branch-stat-card">
            <p className="branch-stat-label">Nearest Branch</p>
            <p className="branch-stat-value">0.5 mi</p>
          </div>
        </div>

        {/* Branch Cards */}
        <div className="branches-grid">
          {branches.map((branch, index) => (
            <div key={index} className="branch-card">
              <div className="branch-card-header">
                <div className="branch-info">
                  <h3 className="branch-name">{branch.name}</h3>
                  <p className="branch-leader">Led by {branch.leader}</p>
                  <div className="branch-distance">
                    <svg className="distance-icon" fill="none" viewBox="0 0 16 16">
                      <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    </svg>
                    <span>{branch.distance}</span>
                  </div>
                </div>
                <div className="branch-members">
                  <p className="members-count">{branch.members}</p>
                  <p className="members-label">Members</p>
                </div>
              </div>

              <div className="branch-contact-info">
                <div className="contact-item">
                  <svg className="contact-icon" fill="none" viewBox="0 0 20 20">
                    <path d="M16.6667 8.33333C16.6667 14.1667 10 17.5 10 17.5S3.33333 14.1667 3.33333 8.33333C3.33333 6.56522 4.03571 4.86953 5.28595 3.61929C6.53619 2.36905 8.23189 1.66667 10 1.66667C11.7681 1.66667 13.4638 2.36905 14.714 3.61929C15.9643 4.86953 16.6667 6.56522 16.6667 8.33333Z" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M10 10.8333C11.3807 10.8333 12.5 9.714 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.714 8.61929 10.8333 10 10.8333Z" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <span>{branch.location}</span>
                </div>
                <div className="contact-item">
                  <svg className="contact-icon" fill="none" viewBox="0 0 20 20">
                    <path d="M18.3333 14.1V16.6C18.3343 16.8321 18.2867 17.0618 18.1937 17.2744C18.1008 17.487 17.9644 17.6779 17.7934 17.8349C17.6224 17.9919 17.4205 18.1112 17.2006 18.1855C16.9808 18.2597 16.7478 18.2875 16.5167 18.2667C13.9524 17.988 11.489 17.1118 9.32499 15.7083C7.31151 14.4289 5.60443 12.7218 4.32499 10.7083C2.91663 8.53434 2.04019 6.05919 1.76666 3.48333C1.74593 3.25281 1.77358 3.02055 1.84745 2.80127C1.92133 2.58199 2.04011 2.38049 2.19651 2.2096C2.35292 2.03871 2.54304 1.90218 2.75488 1.80869C2.96672 1.7152 3.1957 1.66679 3.42666 1.66667H5.92666C6.32435 1.66268 6.71057 1.80593 7.0113 2.06967C7.31203 2.3334 7.5 2.69959 7.54999 3.09167C7.64371 3.87501 7.83445 4.6458 8.11666 5.38333C8.2284 5.68344 8.2474 6.0101 8.17176 6.32105C8.09612 6.63199 7.92966 6.91334 7.69166 7.12917L6.64999 8.17083C7.8542 10.2589 9.57418 11.9788 11.6625 13.1833L12.7042 12.1417C12.92 11.9037 13.2013 11.7372 13.5123 11.6616C13.8232 11.5859 14.1499 11.6049 14.45 11.7167C15.1875 11.9989 15.9583 12.1896 16.7417 12.2833C17.1379 12.3338 17.5075 12.5254 17.7722 12.8312C18.0369 13.137 18.1787 13.5286 18.1708 13.9308L18.3333 14.1Z" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <span>{branch.phone}</span>
                </div>
                <div className="contact-item">
                  <svg className="contact-icon" fill="none" viewBox="0 0 20 20">
                    <path d="M3.33333 3.33333H16.6667C17.5833 3.33333 18.3333 4.08333 18.3333 5V15C18.3333 15.9167 17.5833 16.6667 16.6667 16.6667H3.33333C2.41667 16.6667 1.66667 15.9167 1.66667 15V5C1.66667 4.08333 2.41667 3.33333 3.33333 3.33333Z" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M18.3333 5L10 10.8333L1.66667 5" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <span>{branch.email}</span>
                </div>
              </div>

              <div className="branch-service-times">
                <div className="service-times-header">
                  <svg className="clock-icon" fill="none" viewBox="0 0 20 20">
                    <path d="M10 5V10L13.3333 11.6667" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                  <h4 className="service-times-title">Service Times</h4>
                </div>
                <div className="service-times-list">
                  {branch.serviceTimes.map((service, idx) => (
                    <div key={idx} className="service-time-item">
                      <span className="service-day">{service.day}</span>
                      <span className="service-time">{service.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="branch-card-actions">
                <button className="get-directions-btn">Get Directions</button>
                <button className="contact-btn">Contact</button>
              </div>
            </div>
          ))}
        </div>

        {/* Map Section */}
        <div className="map-section">
          <h2 className="section-title">Find Us on Map</h2>
          <div className="map-placeholder">
            <svg className="map-icon" fill="none" viewBox="0 0 48 48">
              <path d="M24 42C24 42 38 29 38 18C38 14.287 36.525 10.726 33.8995 8.1005C31.274 5.475 27.713 4 24 4C20.287 4 16.726 5.475 14.1005 8.1005C11.475 10.726 10 14.287 10 18C10 29 24 42 24 42Z" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 24C27.3137 24 30 21.3137 30 18C30 14.6863 27.3137 12 24 12C20.6863 12 18 14.6863 18 18C18 21.3137 20.6863 24 24 24Z" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="map-text">Interactive map would be displayed here</p>
            <p className="map-subtext">Showing all 4 branch locations</p>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button className="chat-button">
        <svg fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p261dfb00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
