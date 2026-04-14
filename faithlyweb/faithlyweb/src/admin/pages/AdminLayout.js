import { Outlet } from 'react-router-dom';
import AdminSidebar from '../pages/AdminSidebar';
import '../styles/AdminSidebar.css';
import '../styles/AdminLayout.css';

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}