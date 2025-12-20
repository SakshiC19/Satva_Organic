import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiUser, FiPackage, FiHeart, FiMapPin, FiLogOut } from 'react-icons/fi';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import './Account.css';

const AccountLayout = () => {
  const { logout } = useAuth();
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
    { path: '/account/profile', icon: <FiUser />, label: 'Profile' },
    { path: '/account/orders', icon: <FiPackage />, label: 'Orders' },
    { path: '/account/wishlist', icon: <FiHeart />, label: 'Wishlist' },
    { path: '/account/addresses', icon: <FiMapPin />, label: 'Addresses' },
  ];

  return (
    <>
      <Breadcrumbs />
      <div className="account-page">
        <div className="container">
        <div className="account-layout">
          {/* Sidebar */}
          <aside className="account-sidebar">
            <div className="account-menu">
              {menuItems.map((item) => (
                <NavLink 
                  key={item.path} 
                  to={item.path} 
                  className={({ isActive }) => `account-menu-item ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <button onClick={handleLogout} className="account-menu-item logout-btn">
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* Content Area */}
          <main className="account-content">
            <Outlet />
          </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountLayout;
