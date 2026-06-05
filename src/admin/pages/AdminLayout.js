import { Outlet } from 'react-router-dom';
import AdminSidebar from '../pages/AdminSidebar';
import LoanAdminSidebar from '../../loanAdmin/pages/loanAdminSidebar';
import SecretaryAdminSidebar from '../../secretaryAdmin/components/secretaryAdminSidebar';
import NotificationPrompt from '../../components/NotificationPrompt';
import '../styles/AdminSidebar.css';
import '../styles/AdminLayout.css';
import '../styles/adminDark.css';

export default function AdminLayout() {
  const role = localStorage.getItem('adminRole');

  const renderSidebar = () => {
    if (role === 'loanAdmin') return <LoanAdminSidebar />;
    if (role === 'secretaryAdmin') return <SecretaryAdminSidebar />;
    return <AdminSidebar />;
  };

  return (
    <div className="admin-shell">
      {renderSidebar()}
      <main className="admin-main">
        <div className="admin-main-inner">
          <Outlet />
        </div>
      </main>
      <NotificationPrompt />
    </div>
  );
}