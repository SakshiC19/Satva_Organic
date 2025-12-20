import React from 'react';
import './Badge.css';

const Badge = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  icon,
  className = ''
}) => {
  const badgeClasses = `
    badge 
    badge-${variant}
    badge-${size}
    ${className}
  `.trim();

  return (
    <span className={badgeClasses}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
