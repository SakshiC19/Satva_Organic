/**
 * Login with OTP Component
 * 
 * IMPORTANT: To enable Phone Authentication, you need to configure it in Firebase Console:
 * 
 * 1. Go to Firebase Console (https://console.firebase.google.com)
 * 2. Select your project: satva-organics
 * 3. Go to Authentication > Sign-in method
 * 4. Enable "Phone" provider
 * 5. Add your domain to authorized domains (localhost, your-domain.com)
 * 6. For production: Set up App Check and reCAPTCHA Enterprise
 * 7. Enable Cloud Functions if using SMS verification
 * 
 * Note: Phone authentication may incur costs for SMS messages.
 * Consider using email/password authentication as an alternative.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FiArrowLeft, FiCheck, FiLoader } from "react-icons/fi";
import './Auth.css';

export default function LoginWithOTP() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

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
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          { 
            size: "normal",
            callback: (response) => {
              console.log("reCAPTCHA solved", response);
            },
            'expired-callback': () => {
              console.log("reCAPTCHA expired");
              if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
              }
            }
          }
        );
      }
    } catch (err) {
      console.error("Recaptcha setup error:", err);
      setError("Security check failed to load. Please refresh the page.");
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
      // Clear any existing verifier
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log("Error clearing verifier:", e);
        }
        window.recaptchaVerifier = null;
      }
      
      // Setup new verifier
      setupRecaptcha();
      
      // Wait a bit for the verifier to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!window.recaptchaVerifier) {
        throw new Error("Failed to initialize reCAPTCHA");
      }
      
      const appVerifier = window.recaptchaVerifier;
      
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );
      window.confirmationResult = confirmation;
      setStep(2);
      setResendTimer(30); // Start 30 second timer
      setError("");
    } catch (error) {
      console.error("SMS Error:", error);
      if (error.code === 'auth/invalid-app-credential') {
        setError("Phone authentication is not configured. Please contact support or use email login.");
      } else if (error.code === 'auth/captcha-check-failed') {
        setError("Security check failed. Please refresh and try again.");
      } else if (error.code === 'auth/too-many-requests') {
        setError("Too many attempts. Please try again later.");
      } else if (error.code === 'auth/invalid-phone-number') {
        setError("Invalid phone number format.");
      } else if (error.code === 'auth/argument-error') {
        setError("Authentication error. Please refresh the page and try again.");
      } else if (error.code === 'auth/quota-exceeded') {
        setError("SMS quota exceeded. Please try again later or use email login.");
      } else {
        setError(error.message || "Failed to send OTP. Please try email login instead.");
      }
      
      // Clean up on error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log("Error clearing verifier on error:", e);
        }
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
                : (
                  <>
                    OTP sent to <strong>+91 ****{phone.slice(-4)}</strong>
                  </>
                )
              }
            </p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
              {error.includes('not configured') && (
                <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
                  <strong>Note:</strong> Phone authentication requires Firebase configuration. 
                  <br />
                  <a href="/login" style={{ color: '#059669', textDecoration: 'underline' }}>
                    Use Email Login instead
                  </a>
                </div>
              )}
            </div>
          )}

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
                    inputMode="numeric"
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
                    onPaste={(e) => {
                      // Support paste for mobile
                      const pastedData = e.clipboardData.getData('text');
                      const digits = pastedData.replace(/\D/g, '').slice(0, 6);
                      setOtp(digits);
                      e.preventDefault();
                    }}
                    required
                    autoFocus
                    inputMode="numeric"
                  />
                </div>
              </div>

              <button type="submit" className="auth-button" disabled={loading || otp.length < 6}>
                {loading ? <><FiLoader className="spin" /> Verifying...</> : 'Verify & Login'}
              </button>
              
              <div className="resend-container">
                {resendTimer > 0 ? (
                  <span className="resend-timer">Resend OTP in {resendTimer}s</span>
                ) : (
                  <button 
                    type="button" 
                    className="resend-link" 
                    onClick={sendOTP} 
                    disabled={loading}
                  >
                    Didn't receive code? Resend
                  </button>
                )}
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
