import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FiCamera, 
  FiLock, 
  FiMapPin, 
  FiShield,
  FiCheckCircle
} from 'react-icons/fi';
import './Account.css';

const Profile = () => {
  const { currentUser, updateUserProfile, resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form States
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    phoneNumber: '',
    gender: '',
    dob: ''
  });

  // Mock data for summary sections
  const [summaryData] = useState({
    defaultAddress: '123 Green Valley, Organic Lane, Mumbai - 400001',
    lastLogin: 'Today, 10:30 AM'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await updateUserProfile({ 
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        dob: formData.dob
      });
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await resetPassword(currentUser.email);
      setMessage('Password reset email sent!');
    } catch (err) {
      setError('Failed to send reset email');
    }
  };

  return (
    <div className="account-section">
      <div className="account-header">
        <h2 className="account-title">My Profile</h2>
      </div>

      {message && (
        <div className="alert alert-success">
          <FiCheckCircle /> {message}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Profile Picture Section */}
      <div className="profile-pic-section">
        <div className="profile-avatar-wrapper">
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="Profile" className="profile-avatar" />
          ) : (
            <div className="avatar-placeholder">
              {formData.displayName?.charAt(0) || currentUser?.email?.charAt(0)}
            </div>
          )}
          <button className="change-photo-btn" title="Change Photo">
            <FiCamera />
          </button>
        </div>
        <div className="profile-pic-info">
          <h3>Profile Picture</h3>
          <p>PNG, JPG or GIF. Max 2MB.</p>
          <button className="change-photo-btn">Change Photo</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="account-form">
        {/* Personal Information */}
        <div className="section-header">
          <h3><FiShield /> Personal Information</h3>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              name="displayName"
              type="text" 
              className="form-input" 
              value={formData.displayName} 
              onChange={handleChange}
              placeholder="Enter your full name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={currentUser?.email} 
              disabled 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input 
              name="phoneNumber"
              type="tel" 
              className="form-input" 
              value={formData.phoneNumber} 
              onChange={handleChange}
              placeholder="+91 00000 00000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Gender (Optional)</label>
            <select 
              name="gender"
              className="form-input"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Date of Birth (Optional)</label>
          <input 
            name="dob"
            type="date" 
            className="form-input" 
            value={formData.dob} 
            onChange={handleChange}
          />
        </div>

        {/* Address Summary */}
        <div className="section-header">
          <h3><FiMapPin /> Address Management</h3>
        </div>
        <div className="summary-card">
          <h4>Default Delivery Address</h4>
          <p>{summaryData.defaultAddress}</p>
          <button type="button" className="change-photo-btn" style={{ marginTop: '12px' }}>
            Manage Addresses
          </button>
        </div>

        {/* Security Section */}
        <div className="section-header">
          <h3><FiLock /> Password & Security</h3>
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <h4>Last Login</h4>
            <p>{summaryData.lastLogin}</p>
          </div>
          <div className="summary-card">
            <h4>Security Status</h4>
            <p style={{ color: '#27ae60' }}>Secure</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" onClick={handlePasswordReset} className="change-photo-btn">
            Change Password
          </button>
          <button type="button" className="change-photo-btn" style={{ color: '#ef4444' }}>
            Logout from all devices
          </button>
        </div>

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default Profile;


