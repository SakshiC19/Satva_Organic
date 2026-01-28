import React, { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import './MakeAdmin.css';

/**
 * Temporary component to make a user an admin
 * This should be used once to set up the first admin user
 * After that, admins can manage other users through the admin panel
 */
const MakeAdmin = () => {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Check current user's role
  const checkCurrentUserRole = async () => {
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setCurrentUserRole(userDoc.data().role);
        }
      } catch (error) {
        console.error('Error checking role:', error);
      }
    }
  };

  // Make current user admin
  const makeCurrentUserAdmin = async () => {
    if (!currentUser) {
      setMessage('Please login first');
      return;
    }

    try {
      setLoading(true);
      await setDoc(doc(db, 'users', currentUser.uid), {
        role: 'admin'
      }, { merge: true });

      setMessage('✅ Success! You are now an admin. Please refresh the page.');
      await checkCurrentUserRole();
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
      console.error('Error making admin:', error);
    } finally {
      setLoading(false);
    }
  };

  // Make user admin by email
  const makeUserAdminByEmail = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Please enter an email');
      return;
    }

    try {
      setLoading(true);
      
      // This is a simplified version - in production, you'd need to:
      // 1. Search for user by email in Firestore
      // 2. Update their role
      // For now, we'll just show instructions
      
      setMessage('⚠️ To make a user admin by email, you need to:\n1. Find their UID in Firebase Console\n2. Update their role in Firestore manually\n\nOr use the "Make Me Admin" button if you\'re logged in.');
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkCurrentUserRole();
  }, [currentUser, checkCurrentUserRole]);

  return (
    <div className="make-admin-container">
      <div className="make-admin-card">
        <h2>🔧 Admin Setup Utility</h2>
        <p className="make-admin-description">
          Use this tool to grant admin access. This is typically used once to set up the first admin user.
        </p>

        {currentUser && (
          <div className="current-user-info">
            <h3>Current User</h3>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Role:</strong> {currentUserRole || 'Loading...'}</p>
            
            {currentUserRole === 'admin' ? (
              <div className="success-message">
                ✅ You are already an admin! 
                <br />
                <a href="/admin/dashboard">Go to Admin Dashboard →</a>
              </div>
            ) : (
              <button 
                onClick={makeCurrentUserAdmin}
                disabled={loading}
                className="btn-make-admin"
              >
                {loading ? 'Processing...' : '🔑 Make Me Admin'}
              </button>
            )}
          </div>
        )}

        {!currentUser && (
          <div className="warning-message">
            ⚠️ Please <a href="/login">login</a> first to use this tool.
          </div>
        )}

        <div className="divider">OR</div>

        <form onSubmit={makeUserAdminByEmail} className="email-form">
          <h3>Make User Admin by Email</h3>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="email-input"
          />
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Processing...' : 'Grant Admin Access'}
          </button>
        </form>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
            {message}
          </div>
        )}

        <div className="instructions">
          <h3>📝 Manual Setup Instructions</h3>
          <ol>
            <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
            <li>Select your project: <strong>satva-organics</strong></li>
            <li>Navigate to <strong>Firestore Database</strong></li>
            <li>Find the <strong>users</strong> collection</li>
            <li>Find your user document (by email or UID)</li>
            <li>Edit the document and set <code>role: "admin"</code></li>
            <li>Save and refresh this page</li>
          </ol>
        </div>

        <div className="warning-box">
          <strong>⚠️ Security Note:</strong> Remove this component from your app after setting up admin users in production!
        </div>
      </div>
    </div>
  );
};

export default MakeAdmin;
