import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FiUser, 
  FiShoppingBag, 
  FiHeart, 
  FiMapPin, 
  FiCreditCard, 
  FiLogOut 
} from 'react-icons/fi';
import './Account.css';

const AccountLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const navItems = [
    { path: 'profile', icon: <FiUser />, label: 'My Profile' },
    { path: 'orders', icon: <FiShoppingBag />, label: 'My Orders' },
    { path: 'wishlist', icon: <FiHeart />, label: 'Wishlist' },
    { path: 'addresses', icon: <FiMapPin />, label: 'Addresses' },
    { path: 'payments', icon: <FiCreditCard />, label: 'Payments' },
  ];

  const isWishlistPage = location.pathname.includes('/wishlist');
  const pageClass = location.pathname.split('/').pop();

  const isOrderDetailsPage = location.pathname.match(/\/account\/orders\/.+/);

  const isOrdersPage = pageClass === 'orders';

  return (
    <div className={`account-layout container ${isWishlistPage || isOrderDetailsPage || isOrdersPage ? 'full-width-layout' : ''} page-${pageClass}`}>
      {!isWishlistPage && !location.pathname.match(/\/account\/orders\/.+/) && !isOrdersPage && (
        <aside className="account-sidebar">
          <nav className="account-nav">
            {navItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path} 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
            <button onClick={handleLogout} className="nav-item logout-btn">
              <span className="nav-icon"><FiLogOut /></span>
              <span className="nav-label">Logout</span>
            </button>
          </nav>
        </aside>
      )}
      <div className={`account-content ${isWishlistPage ? 'full-width' : ''}`}>
        <Outlet />
      </div>
    </div>
  );
};

export default AccountLayout;
