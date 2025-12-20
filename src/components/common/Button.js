import React from 'react';
import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  disabled = false, 
  loading = false,
  type = 'button',
  fullWidth = false,
  icon,
  className = ''
}) => {
  const buttonClasses = `
    btn 
    btn-${variant} 
    btn-${size} 
    ${fullWidth ? 'btn-full-width' : ''}
    ${disabled || loading ? 'btn-disabled' : ''}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="spinner"></span>
          Loading...
        </>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
