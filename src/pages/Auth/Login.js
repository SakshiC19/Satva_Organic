import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiEye, FiEyeOff, FiUser, FiLock } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout, loginWithGoogle, findUserByPhone } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');

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
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Login to your account</p>
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

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input no-icon"
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

            <div className="form-footer">
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

          <button onClick={handleGoogleLogin} className="google-button" disabled={loading}>
            <FaGoogle />
            <span>Continue with Google</span>
          </button>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="auth-link">Sign Up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
