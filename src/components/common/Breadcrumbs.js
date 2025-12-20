import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';
import './Breadcrumbs.css';

const Breadcrumbs = ({ children }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on home page
  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      <div className="container">
        <div className="breadcrumbs-wrapper">
          <ol className="breadcrumb-list">
            <li className="breadcrumb-item">
              <Link to="/">
                <FiHome /> Home
              </Link>
            </li>
            {pathnames.map((value, index) => {
              const to = `/${pathnames.slice(0, index + 1).join('/')}`;
              const isLast = index === pathnames.length - 1;
              // Decode URI component to handle special characters and replace hyphens with spaces
              const name = decodeURIComponent(value).replace(/-/g, ' ');

              return (
                <li key={to} className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
                  <FiChevronRight className="breadcrumb-separator" />
                  {isLast ? (
                    <span className="breadcrumb-text">{name}</span>
                  ) : (
                    <Link to={to}>{name}</Link>
                  )}
                </li>
              );
            })}
          </ol>
          {children && <div className="breadcrumbs-actions">{children}</div>}
        </div>
      </div>
    </nav>
  );
};

export default Breadcrumbs;
