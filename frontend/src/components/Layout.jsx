import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, BarChart3, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { manager, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <ListOrdered size={28} />
          <div>
            <h1>QueueFlow</h1>
            <span>Queue Management</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <LayoutDashboard size={20} />
            Queues
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <BarChart3 size={20} />
            Analytics
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <User size={18} />
            <span>{manager?.username}</span>
          </div>
          <button className="btn-icon" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}