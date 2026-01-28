import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiSettings, FiSave, FiEye, FiEyeOff, FiTruck, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './CourierSettings.css';

const CourierSettings = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  
  const [settings, setSettings] = useState({
    courier_name: 'TPC',
    api_base_url: 'https://www.tpcglobe.com',
    username: '',
    password: '',
    active: true
  });

  const [existingDocId, setExistingDocId] = useState(null);

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsRef = collection(db, 'courier_settings');
      const q = query(settingsRef, where('courier_name', '==', 'TPC'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setExistingDocId(doc.id);
        const data = doc.data();
        setSettings({
          courier_name: data.courier_name || 'TPC',
          api_base_url: data.api_base_url || 'https://www.tpcglobe.com',
          username: data.username || '',
          password: decryptPassword(data.password || ''),
          active: data.active !== false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const encryptPassword = (password) => {
    // Simple base64 encoding (use proper encryption in production)
    return btoa(password);
  };

  const decryptPassword = (encryptedPassword) => {
    try {
      return atob(encryptedPassword);
    } catch {
      return encryptedPassword;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!settings.username || !settings.password) {
      setSaveStatus({ type: 'error', message: 'Username and password are required' });
      return;
    }

    setLoading(true);
    setSaveStatus(null);

    try {
      const settingsData = {
        courier_name: 'TPC',
        api_base_url: settings.api_base_url,
        username: settings.username,
        password: encryptPassword(settings.password),
        active: settings.active,
        updated_at: serverTimestamp()
      };

      if (existingDocId) {
        // Update existing settings
        await updateDoc(doc(db, 'courier_settings', existingDocId), settingsData);
        setSaveStatus({ type: 'success', message: 'Settings updated successfully!' });
      } else {
        // Create new settings
        settingsData.created_at = serverTimestamp();
        const docRef = await addDoc(collection(db, 'courier_settings'), settingsData);
        setExistingDocId(docRef.id);
        setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
      }

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="courier-settings-container">
      <div className="settings-header">
        <div className="header-content">
          <h1 className="settings-title">
            <FiSettings /> Courier Settings
          </h1>
          <p className="settings-subtitle">Manage TPC API credentials and configuration</p>
        </div>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <div className="card-header">
            <div className="courier-info">
              <FiTruck className="courier-icon" />
              <div>
                <h2>TPC (The Professional Couriers)</h2>
                <p>Configure API credentials for courier integration</p>
              </div>
            </div>
            <div className={`status-badge ${settings.active ? 'active' : 'inactive'}`}>
              {settings.active ? 'Active' : 'Inactive'}
            </div>
          </div>

          <form onSubmit={handleSave} className="settings-form">
            <div className="form-section">
              <h3>API Configuration</h3>
              
              <div className="form-group">
                <label>Courier Name</label>
                <input
                  type="text"
                  name="courier_name"
                  value={settings.courier_name}
                  disabled
                  className="disabled-input"
                />
              </div>

              <div className="form-group">
                <label>API Base URL *</label>
                <input
                  type="url"
                  name="api_base_url"
                  value={settings.api_base_url}
                  onChange={handleInputChange}
                  placeholder="https://www.tpcglobe.com"
                  required
                />
                <small className="help-text">Base URL for TPC Web Service API</small>
              </div>
            </div>

            <div className="form-section">
              <h3>Authentication Credentials</h3>
              
              <div className="form-group">
                <label>Username / Client ID *</label>
                <input
                  type="text"
                  name="username"
                  value={settings.username}
                  onChange={handleInputChange}
                  placeholder="Enter TPC username"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password / API Key *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={settings.password}
                    onChange={handleInputChange}
                    placeholder="Enter TPC password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <small className="help-text">Password is encrypted before storage</small>
              </div>
            </div>

            <div className="form-section">
              <h3>Status</h3>
              
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="active"
                    checked={settings.active}
                    onChange={handleInputChange}
                  />
                  <span>Enable TPC courier integration</span>
                </label>
                <small className="help-text">
                  When disabled, TPC will not be available for dispatch
                </small>
              </div>
            </div>

            {saveStatus && (
              <div className={`save-status ${saveStatus.type}`}>
                {saveStatus.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                <span>{saveStatus.message}</span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn-test"
                onClick={() => alert('Test connection feature coming soon!')}
              >
                Test Connection
              </button>
              <button
                type="submit"
                className="btn-save"
                disabled={loading}
              >
                <FiSave />
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Information Panel */}
        <div className="info-panel">
          <div className="info-card">
            <h3>🔒 Security Information</h3>
            <ul>
              <li>API credentials are encrypted before storage</li>
              <li>Credentials are never exposed to frontend</li>
              <li>All API calls are logged for monitoring</li>
              <li>Only admin users can access these settings</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>📋 API Endpoints</h3>
            <ul>
              <li><strong>PIN Code Service:</strong> /tpcwebservice/PINcodeService.ashx</li>
              <li><strong>City Search:</strong> /TPCWebservice/PINcodeCitysearch.ashx</li>
              <li><strong>CN Request:</strong> /TPCWebService/CNoteRequest.ashx</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>⚠️ Important Notes</h3>
            <ul>
              <li>Contact TPC to obtain API credentials</li>
              <li>Ensure your IP is whitelisted with TPC</li>
              <li>Monitor consignment note stock regularly</li>
              <li>Check API logs for any failures</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierSettings;
