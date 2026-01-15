import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FiPhone, FiArrowLeft, FiCheck } from "react-icons/fi";
import './Auth.css';

export default function LoginWithOTP() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path if available
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    // Cleanup recaptcha on unmount
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 
        "recaptcha-container",
        { 
          size: "invisible",
          callback: (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
            // onSignInSubmit();
          }
        }
      );
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Check if it already has country code (assuming 10 digit number + code)
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }
    // Default to India +91 if just 10 digits
    return `+91${cleaned}`;
  };

  const sendOTP = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = formatPhoneNumber(phone);
      
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );
      window.confirmationResult = confirmation;
      setStep(2);
      // alert("OTP sent successfully");
    } catch (error) {
      console.error(error);
      setError(error.message || "Failed to send OTP. Please try again.");
      // Reset recaptcha if failed
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
    setError("");
    setLoading(true);

    try {
      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;
      console.log("Logged in user:", user);

      // Check if user document exists in Firestore, if not create it
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

      // alert("Login successful");
      navigate(redirect ? `/${redirect}` : '/');
    } catch (error) {
      console.error(error);
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
                ? "Enter your phone number to receive a verification code" 
                : `Enter the code sent to ${phone}`
              }
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {step === 1 && (
            <form onSubmit={sendOTP} className="auth-form">
              <div className="form-group">
                <label htmlFor="phone" className="form-label">Phone Number</label>
                <div className="input-wrapper">
                  <FiPhone className="input-icon" />
                  <input
                    type="tel"
                    id="phone"
                    className="form-input"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <small className="form-help">We'll send a 6-digit code to this number.</small>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
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
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                  />
                </div>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </form>
          )}

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}
