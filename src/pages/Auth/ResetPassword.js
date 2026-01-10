import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth(); // We'll use login to get access after reset

  const { email } = location.state || {};

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // MOCK PASSWORD RESET
      // In a real app, you would call an API to update the password in Firebase/DB
      console.log(`Resetting password for ${email} to ${password}`);
      
      setSuccess(true);
      
      // Auto-login after 2 seconds
      setTimeout(async () => {
        try {
          await login(email, password);
          navigate('/');
        } catch (err) {
          navigate('/login');
        }
      }, 2000);

    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="otp-icon-wrapper" style={{ background: '#f0fdf4' }}>
              <FiCheckCircle style={{ color: '#27ae60', fontSize: '32px' }} />
            </div>
            <h1 className="auth-title">Password Reset!</h1>
            <p className="auth-subtitle">
              Your password has been successfully updated. <br />
              Logging you in now...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">
              Create a new strong password for your account.
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input no-icon"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input no-icon"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Updating...' : 'Reset Password & Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
