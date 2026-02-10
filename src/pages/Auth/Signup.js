import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { logoBase64 } from '../../utils/logo';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: '' };
    
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    };
    
    if (checks.length) score += 33;
    if (checks.uppercase) score += 33;
    if (checks.number) score += 34;
    
    let label = 'Weak';
    let color = '#ef4444';
    if (score >= 67) {
      label = 'Strong';
      color = '#22c55e';
    } else if (score >= 34) {
      label = 'Medium';
      color = '#f59e0b';
    }
    
    return { score, label, color, checks };
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.displayName.trim().length < 3) {
      setError('Full Name must be at least 3 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!/^\d{10}$/.test(formData.phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      // MOCK SEND OTP
      // In a real app, you would call an API to send OTP to email/phone
      console.log(`Sending Signup OTP to ${formData.email} and ${formData.phoneNumber}`);

      // Redirect to OTP verification with signup data
      navigate('/verify-otp', {
        state: {
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          phoneNumber: formData.phoneNumber,
          identifier: formData.email, // Use email as primary identifier for display
          type: 'signup'
        }
      });
    } catch (error) {
      setError('Failed to process signup. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      setError('Failed to sign up with Google');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Brand Identity Section */}
          <div className="auth-brand">
            <img src={logoBase64} alt="Satva Organics" className="auth-brand-logo" />
            <p className="auth-brand-tagline">Fresh & Organic - Premium Quality Products</p>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Sign up to get started</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="displayName" className="form-label">Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  className="form-input no-icon"
                  placeholder="Enter your full name"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input no-icon"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  className="form-input no-icon"
                  placeholder="Enter 10-digit phone number"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  maxLength="10"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="form-input no-icon"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
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
              {formData.password && (
                <div className="password-strength-container">
                  <div className="password-strength-bar">
                    <div 
                      className="password-strength-fill" 
                      style={{ 
                        width: `${passwordStrength.score}%`,
                        backgroundColor: passwordStrength.color 
                      }}
                    />
                  </div>
                  <div className="password-requirements">
                    <span className={passwordStrength.checks.length ? 'requirement-met' : 'requirement-unmet'}>
                      {passwordStrength.checks.length ? '✓' : '○'} Min 8 characters
                    </span>
                    <span className={passwordStrength.checks.uppercase ? 'requirement-met' : 'requirement-unmet'}>
                      {passwordStrength.checks.uppercase ? '✓' : '○'} 1 uppercase
                    </span>
                    <span className={passwordStrength.checks.number ? 'requirement-met' : 'requirement-unmet'}>
                      {passwordStrength.checks.number ? '✓' : '○'} 1 number
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-input no-icon"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
            <p className="terms-agreement">
              By signing up, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button onClick={handleGoogleSignup} className="google-button" disabled={loading}>
            <FaGoogle />
            <span>Continue with Google</span>
          </button>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
