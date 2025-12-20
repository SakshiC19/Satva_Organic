import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Account.css';

const Profile = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      console.log('Updating profile with:', { displayName });
      await updateUserProfile({ 
        displayName,
        photoURL: currentUser?.photoURL || null 
      });
      setMessage('Profile updated successfully');
      console.log('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-section">
      <div className="account-header">
        <h2 className="account-title">My Profile</h2>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="account-form">
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input 
            type="email" 
            className="form-input" 
            value={currentUser?.email} 
            disabled 
            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
          <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
            Email cannot be changed
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input 
            type="text" 
            className="form-input" 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
