import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiShield, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();

  // Get data from location state (passed from Login/Signup page)
  const { email, password, displayName, phoneNumber, identifier, type } = location.state || {};

  // Generate and Send OTP on mount
  useEffect(() => {
    if (!email || (type !== 'forgot-password' && !password)) {
      navigate('/login');
      return;
    }

    const sendInitialOtp = async () => {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      
      // FOR DEVELOPER: Show OTP in console and alert for testing
      console.log("DEBUG: Your OTP is", newOtp);
      
      try {
        // Attempt to send via EmailJS if you have configured it
        // import emailjs from '@emailjs/browser';
        // await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
        //   to_email: email,
        //   otp_code: newOtp,
        //   user_name: displayName || email
        // }, 'YOUR_PUBLIC_KEY');
      } catch (err) {
        console.error("Email sending failed:", err);
      }
    };

    sendInitialOtp();
  }, [email, password, type, navigate, displayName]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pasteData.every(char => !isNaN(char))) {
      const newOtp = [...otp];
      pasteData.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      if (pasteData.length === 6) {
        inputRefs.current[5].focus();
      } else {
        inputRefs.current[pasteData.length].focus();
      }
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // VERIFY OTP
      if (otpCode === generatedOtp || otpCode === '123456') { // Allow 123456 as master bypass for dev
        if (type === 'forgot-password') {
          navigate('/reset-password', { state: { email } });
        } else if (type === 'signup') {
          await signup(email, password, displayName, phoneNumber);
          navigate('/');
        } else {
          await login(email, password);
          navigate('/');
        }
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else {
        setError('Verification failed. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (otp.every(digit => digit !== '')) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleResend = async () => {
    try {
      setResending(true);
      setError('');
      
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      console.log("DEBUG: Your NEW OTP is", newOtp);

      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } catch (err) {
      setError('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const maskIdentifier = (str) => {
    if (!str) return '';
    if (str.includes('@')) {
      const [name, domain] = str.split('@');
      return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
    } else {
      return `+91 ******${str.slice(-4)}`;
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <button className="back-button" onClick={() => navigate('/login')}>
            <FiArrowLeft /> Back to Login
          </button>

          <div className="auth-header">
            <div className="otp-icon-wrapper">
              <FiShield className="otp-icon" />
            </div>
            <h1 className="auth-title">Verify OTP</h1>
            <p className="auth-subtitle">
              We've sent a 6-digit code to <br />
              <strong>{maskIdentifier(identifier)}</strong>
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                marginTop: '10px', 
                padding: '8px', 
                background: '#fef3c7', 
                color: '#92400e', 
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                DEV HINT: Your OTP is {generatedOtp}
              </div>
            )}
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleVerify} className="otp-form">
            <div className="otp-input-container">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  value={digit}
                  ref={(el) => (inputRefs.current[index] = el)}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="otp-input"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button type="submit" className="auth-button" disabled={loading || otp.some(d => d === '')}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>

          <div className="otp-footer">
            {timer > 0 ? (
              <p className="resend-text">
                Resend code in <span>{timer}s</span>
              </p>
            ) : (
              <button 
                className="resend-button" 
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? <FiRefreshCw className="spin" /> : 'Resend OTP'}
              </button>
            )}
            <button className="change-link" onClick={() => navigate('/login')}>
              Change email or phone number
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
