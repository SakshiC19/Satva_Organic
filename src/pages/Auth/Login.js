import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiEye, FiEyeOff, FiPhone } from 'react-icons/fi';
import { BsEnvelope, BsTelephone, BsLock } from 'react-icons/bs';
import { FaGoogle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { logoBase64 } from '../../utils/logo';
import './Auth.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputType, setInputType] = useState('text'); // 'email' or 'phone'
  const { login, logout, loginWithGoogle, findUserByPhone } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');

  // Auto-detect input type (email vs phone)
  useEffect(() => {
    const trimmed = identifier.trim();
    if (trimmed === '') {
      setInputType('text');
    } else if (/^\d+$/.test(trimmed)) {
      setInputType('phone');
    } else if (trimmed.includes('@') || /[a-zA-Z]/.test(trimmed)) {
      setInputType('email');
    }
  }, [identifier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      let loginEmail = identifier;
      
      // Check if identifier is a phone number (10 digits)
      if (/^\d{10}$/.test(identifier)) {
        const userData = await findUserByPhone(identifier);
        if (userData && userData.email) {
          loginEmail = userData.email;
        } else {
          setError('No account found with this phone number');
          setLoading(false);
          return;
        }
      }

      const userCredential = await login(loginEmail, password);

      // Check if 2FA is enabled for this user
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (userData?.is2FAEnabled) {
        // If 2FA is enabled, sign out for now and redirect to OTP
        // We pass the credentials to OTP page to sign in again after verification
        await logout(); 
        navigate('/verify-otp', { 
          state: { 
            email: loginEmail, 
            password: password,
            identifier: identifier,
            type: '2fa'
          } 
        });
        return;
      }

      // If 2FA is not enabled, proceed with normal login
      // Update login history and details
      const loginData = {
        lastLogin: new Date(),
        lastIp: 'Local',
        loginHistory: arrayUnion({
          timestamp: new Date(),
          device: navigator.userAgent,
          type: 'email/phone'
        })
      };

      await updateDoc(userRef, loginData);

      if (userData?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(redirect ? `/${redirect}` : '/');
      }
    } catch (error) {
      setError('Failed to log in. Please check your credentials.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const userCredential = await loginWithGoogle();
      
      // Check user role
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
      
      if (userData?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(redirect ? `/${redirect}` : '/');
      }
    } catch (error) {
      setError('Failed to log in with Google');
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
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Login to your account</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="identifier" className="form-label">Email or Phone Number</label>
              <div className="input-wrapper">
                {inputType === 'email' ? <BsEnvelope className="input-icon" /> : inputType === 'phone' ? <BsTelephone className="input-icon" /> : <BsEnvelope className="input-icon" />}
                {inputType === 'phone' && <span className="country-code">+91</span>}
                <input
                  type={inputType === 'email' ? 'email' : 'tel'}
                  id="identifier"
                  className={inputType === 'phone' ? 'form-input phone-input' : 'form-input'}
                  placeholder={inputType === 'phone' ? '98765 43210' : 'Enter email or phone'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  inputMode={inputType === 'phone' ? 'numeric' : 'text'}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-wrapper">
                <BsLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input"
                  placeholder="Enter your password"
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

            <div className="form-footer-row">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="remember-me-checkbox"
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button onClick={() => navigate('/login-otp')} className="google-button" style={{ marginBottom: '12px' }}>
            <FiPhone style={{ marginRight: '10px' }} />
            <span>Login with OTP</span>
          </button>

          <button onClick={handleGoogleLogin} className="google-button" disabled={loading}>
            <FaGoogle />
            <span>Continue with Google</span>
          </button>

          <div className="auth-footer">
            <p>
              New here?{' '}
              <Link to="/signup" className="auth-link">Create your account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
