import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FiPhone, FiArrowLeft, FiCheck, FiLoader } from "react-icons/fi";
import './Auth.css';

export default function LoginWithOTP() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 
          "recaptcha-container",
          { 
            size: "normal",
            callback: (response) => {
              console.log("reCAPTCHA solved");
            }
          }
        );
      }
    } catch (err) {
      console.error("Recaptcha setup error:", err);
      setError("Security check failed to load. Please refresh.");
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }
    return null;
  };

  const sendOTP = async (e) => {
    if (e) e.preventDefault();
    setError("");
    
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );
      window.confirmationResult = confirmation;
      setStep(2);
    } catch (error) {
      console.error("SMS Error:", error);
      if (error.code === 'auth/captcha-check-failed') {
        setError("Security check failed. Please refresh and try again.");
      } else if (error.code === 'auth/too-many-requests') {
        setError("Too many attempts. Please try again later.");
      } else if (error.code === 'auth/billing-not-enabled') {
        setError("SMS service is currently unavailable (Billing issue).");
      } else {
        setError("Failed to send OTP. Make sure the number is correct.");
      }
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          email: user.email || "",
          displayName: user.displayName || "User",
          role: 'user',
          createdAt: new Date(),
          wishlist: [],
          addresses: []
        });
      }

      navigate(redirect ? `/${redirect}` : '/');
    } catch (error) {
      console.error("Verify Error:", error);
      setError("Invalid OTP. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <button className="back-button" onClick={() => step === 1 ? navigate('/login') : setStep(1)}>
            <FiArrowLeft /> {step === 1 ? 'Back to Login' : 'Change Phone Number'}
          </button>

          <div className="auth-header">
            <h1 className="auth-title">Login with OTP</h1>
            <p className="auth-subtitle">
              {step === 1 
                ? "Enter your phone number to receive a real verification code" 
                : `Enter the 6-digit code sent to +91 ${phone.slice(-10)}`
              }
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {step === 1 && (
            <form onSubmit={sendOTP} className="auth-form">
              <div className="form-group">
                <label htmlFor="phone" className="form-label">Phone Number</label>
                <div className="input-wrapper">
                  <span className="country-code">+91</span>
                  <input
                    type="tel"
                    id="phone"
                    className="form-input phone-input"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                  />
                </div>
                <small className="form-help">We'll send a real SMS to this number.</small>
              </div>

              <button type="submit" className="auth-button" disabled={loading || phone.length < 10}>
                {loading ? <><FiLoader className="spin" /> Sending...</> : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyOTP} className="auth-form">
              <div className="form-group">
                <label htmlFor="otp" className="form-label">OTP Code</label>
                <div className="input-wrapper">
                  <FiCheck className="input-icon" />
                  <input
                    type="text"
                    id="otp"
                    className="form-input"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="auth-button" disabled={loading || otp.length < 6}>
                {loading ? <><FiLoader className="spin" /> Verifying...</> : 'Verify & Login'}
              </button>
              
              <div className="resend-container">
                <button type="button" className="resend-link" onClick={sendOTP} disabled={loading}>
                  Didn't receive code? Resend
                </button>
              </div>
            </form>
          )}

          {/* This is crucial for Firebase Phone Auth */}
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}
