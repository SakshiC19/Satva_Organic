import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FiCamera, 
  FiLock, 
  FiMapPin, 
  FiShield,
  FiCheckCircle,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX
} from 'react-icons/fi';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
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

  // Address Management States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    pincode: '',
    locality: '',
    address: '',
    city: '',
    state: ''
  });
  const [localities, setLocalities] = useState([]);
  const [loadingPincode, setLoadingPincode] = useState(false);

  // Mock data for summary sections
  const [summaryData] = useState({
    lastLogin: 'Today, 10:30 AM'
  });

  useEffect(() => {
    if (currentUser) {
      fetchSavedAddresses();
    }
  }, [currentUser]);

  const fetchSavedAddresses = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().addresses) {
        setSavedAddresses(userDoc.data().addresses);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

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

  // Address Functions
  const handlePincodeChange = async (e) => {
    const newPincode = e.target.value.replace(/\D/g, '');
    if (newPincode.length > 6) return;

    setAddressForm(prev => ({ ...prev, pincode: newPincode }));

    if (newPincode.length === 6) {
      setLoadingPincode(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${newPincode}`);
        const data = await response.json();
        
        if (data[0].Status === "Success") {
          const postOffices = data[0].PostOffice;
          const state = postOffices[0].State;
          const district = postOffices[0].District;
          const localityOptions = [...new Set(postOffices.map(po => po.Name))].sort();
          
          setAddressForm(prev => ({
            ...prev,
            state: state,
            city: district,
            locality: ''
          }));
          setLocalities(localityOptions);
        } else {
           setLocalities([]);
        }
      } catch (error) {
        console.error("Error fetching pincode details:", error);
        setLocalities([]);
      } finally {
        setLoadingPincode(false);
      }
    } else {
      setLocalities([]);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      let updatedAddresses = [...savedAddresses];

      if (editingAddressIndex !== null) {
        updatedAddresses[editingAddressIndex] = addressForm;
        await updateDoc(userRef, { addresses: updatedAddresses });
        setMessage('Address updated successfully');
      } else {
        updatedAddresses.push(addressForm);
        await updateDoc(userRef, { addresses: arrayUnion(addressForm) });
        setMessage('Address added successfully');
      }

      setSavedAddresses(updatedAddresses);
      setIsAddingAddress(false);
      setEditingAddressIndex(null);
      setAddressForm({
        name: '', phone: '', pincode: '', locality: '',
        address: '', city: '', state: ''
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error saving address:", error);
      setError('Failed to save address');
    }
  };

  const handleEditAddress = (index) => {
    setAddressForm(savedAddresses[index]);
    setEditingAddressIndex(index);
    setIsAddingAddress(true);
  };

  const handleDeleteAddress = async (index) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updatedAddresses = savedAddresses.filter((_, i) => i !== index);
      await updateDoc(userRef, { addresses: updatedAddresses });
      setSavedAddresses(updatedAddresses);
      setMessage('Address deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error deleting address:", error);
      setError('Failed to delete address');
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

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>

      {/* Address Management Section */}
      <div className="section-header" style={{ marginTop: '40px' }}>
        <h3><FiMapPin /> Address Management</h3>
      </div>
      
      <div className="address-management-container">
        {!isAddingAddress ? (
          <div className="saved-addresses-grid">
            {savedAddresses.map((addr, index) => (
              <div key={index} className="saved-address-card">
                <div className="address-header">
                  <span className="address-name">{addr.name}</span>
                  <span className="address-type">{addr.locality}</span>
                </div>
                <p className="address-text">
                  {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                </p>
                <p className="address-phone">Phone: {addr.phone}</p>
                <div className="address-actions">
                  <button 
                    className="edit-address-btn"
                    onClick={() => handleEditAddress(index)}
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button 
                    className="delete-address-btn"
                    onClick={() => handleDeleteAddress(index)}
                    style={{ color: '#ef4444', marginLeft: '10px' }}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            ))}
            <button 
              className="add-new-address-card-btn"
              onClick={() => {
                setAddressForm({
                  name: '', phone: '', pincode: '', locality: '',
                  address: '', city: '', state: ''
                });
                setEditingAddressIndex(null);
                setIsAddingAddress(true);
              }}
            >
              <FiPlus size={24} />
              <span>Add New Address</span>
            </button>
          </div>
        ) : (
          <div className="address-form-container">
             <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4>{editingAddressIndex !== null ? 'Edit Address' : 'Add New Address'}</h4>
                <button onClick={() => setIsAddingAddress(false)} className="close-btn"><FiX /></button>
             </div>
             <form onSubmit={handleAddressSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={addressForm.name}
                      onChange={e => setAddressForm({...addressForm, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={addressForm.phone}
                      onChange={e => setAddressForm({...addressForm, phone: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Pincode</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={addressForm.pincode}
                      onChange={handlePincodeChange}
                      maxLength={6}
                    />
                    {loadingPincode && (
                      <span style={{ position: 'absolute', right: '10px', top: '38px', fontSize: '12px', color: '#666' }}>Checking...</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Locality</label>
                    {localities.length > 0 ? (
                      <select
                        className="form-input"
                        value={addressForm.locality}
                        onChange={e => setAddressForm({...addressForm, locality: e.target.value})}
                        required
                      >
                        <option value="">Select Locality</option>
                        {localities.map((loc, index) => (
                          <option key={index} value={loc}>{loc}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        value={addressForm.locality}
                        onChange={e => setAddressForm({...addressForm, locality: e.target.value})}
                      />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address (Area and Street)</label>
                  <textarea 
                    className="form-input" 
                    rows="3" 
                    required
                    value={addressForm.address}
                    onChange={e => setAddressForm({...addressForm, address: e.target.value})}
                  ></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City/District/Town</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={addressForm.city}
                      onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={addressForm.state}
                      onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '20px' }}>
                  <button type="submit" className="save-btn">
                    {editingAddressIndex !== null ? 'Update Address' : 'Save Address'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setIsAddingAddress(false)}
                    style={{ marginLeft: '10px', padding: '10px 20px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
             </form>
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="section-header" style={{ marginTop: '40px' }}>
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
    </div>
  );
};

export default Profile;


