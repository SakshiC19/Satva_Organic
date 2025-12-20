import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FiGrid, FiBox, FiPackage, FiImage, FiList, 
  FiUsers, FiHome, FiLogOut, FiSearch, FiBell 
} from 'react-icons/fi';
import './Admin.css';

const AdminLayout = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: <FiGrid />, label: 'Dashboard' },
    { path: '/admin/products', icon: <FiBox />, label: 'Products' },
    { path: '/admin/orders', icon: <FiPackage />, label: 'Orders' },
    { path: '/admin/banners', icon: <FiImage />, label: 'Hero Banners' },
    { path: '/admin/promo-banners', icon: <FiImage />, label: 'Promo Banners' },
    { path: '/admin/categories', icon: <FiList />, label: 'Categories' },
    { path: '/admin/users', icon: <FiUsers />, label: 'Users' },
  ];

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        
        <nav className="admin-nav">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          <div className="admin-nav-divider"></div>
          
          <Link to="/" className="admin-nav-item">
            <FiHome />
            <span>View Website</span>
          </Link>
          
          <button onClick={handleLogout} className="admin-nav-item logout-btn">
            <FiLogOut />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-search">
            <FiSearch />
            <input type="text" placeholder="Search users, orders, products..." />
          </div>

          <div className="topbar-actions">
            <button className="notification-btn">
              <FiBell />
              <span className="notification-badge"></span>
            </button>

            <div className="admin-profile-pill">
              <img 
                src={currentUser?.photoURL || "https://ui-avatars.com/api/?name=Admin+User&background=059669&color=fff"} 
                alt="Profile" 
                className="admin-avatar"
              />
              <div className="admin-profile-info">
                <span className="admin-profile-name">{currentUser?.displayName || 'Admin User'}</span>
                <span className="admin-profile-email">{currentUser?.email || 'admin@satva.com'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
