import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { findUserByPhone } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    try {
      setError('');
      setLoading(true);

      let email = identifier;
      let type = 'email';

      // Check if it's a phone number
      if (/^\d{10}$/.test(identifier)) {
        type = 'phone';
        const userData = await findUserByPhone(identifier);
        if (userData && userData.email) {
          email = userData.email;
          type = 'phone';
        } else {
          setError('No account found with this phone number');
          setLoading(false);
          return;
        }
      }

      // MOCK SEND OTP
      // In a real app, you would call an API to send OTP to email/phone
      console.log(`Sending OTP to ${identifier}`);

      // Redirect to OTP verification
      navigate('/verify-otp', {
        state: {
          email: email,
          identifier: identifier,
          type: 'forgot-password'
        }
      });

    } catch (err) {
      setError('Failed to process request. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <Link to="/login" className="back-button">
            <FiArrowLeft /> Back to Login
          </Link>

          <div className="auth-header">
            <h1 className="auth-title">Forgot Password?</h1>
            <p className="auth-subtitle">
              Enter your registered email or phone number to receive an OTP.
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="identifier" className="form-label">Email or Phone Number</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="identifier"
                  className="form-input no-icon"
                  placeholder="Enter email or 10-digit phone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Processing...' : 'Send OTP'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <Link to="/login" className="auth-link">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
