import React from 'react';
import './Input.css';

const Input = ({ 
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  required = false,
  icon,
  name,
  id,
  className = '',
  ...rest
}) => {
  const inputId = id || name;

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          type={type}
          id={inputId}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={`input ${icon ? 'input-with-icon' : ''} ${error ? 'input-error' : ''}`}
          {...rest}
        />
      </div>
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;
