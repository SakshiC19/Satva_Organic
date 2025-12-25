import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiSave, FiInfo, FiEye, FiEyeOff } from 'react-icons/fi';
import './Admin.css';

const SpecialOffer = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [offerData, setOfferData] = useState({
    badge: 'SPECIAL OFFER',
    title: 'Get 30% Off on First Order',
    description: 'Download our app and get exclusive deals',
    buttonText: 'Shop Now',
    buttonLink: '/shop',
    isActive: true
  });

  useEffect(() => {
    fetchOfferData();
  }, []);

  const fetchOfferData = async () => {
    try {
      setLoading(true);
      const offerRef = doc(db, 'settings', 'specialOffer');
      const offerSnap = await getDoc(offerRef);
      
      if (offerSnap.exists()) {
        setOfferData(offerSnap.data());
      }
    } catch (error) {
      console.error('Error fetching offer data:', error);
      setMessage({ type: 'error', text: 'Failed to load offer data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOfferData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const offerRef = doc(db, 'settings', 'specialOffer');
      await setDoc(offerRef, offerData);
      
      setMessage({ type: 'success', text: 'Special offer updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving offer data:', error);
      setMessage({ type: 'error', text: 'Failed to save offer data' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading offer settings...</p>
      </div>
    );
  }

  return (
    <div className="admin-special-offer">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Manage Special Offer</h1>
        <p className="admin-page-subtitle">Update the promotional banner displayed on the homepage</p>
      </div>

      {message.text && (
        <div className={`admin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="admin-card">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-section">
            <h3 className="section-title">Banner Content</h3>
            
            <div className="form-group">
              <label>Status</label>
              <div className="toggle-container">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    name="isActive" 
                    checked={offerData.isActive} 
                    onChange={handleInputChange} 
                  />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label">
                  {offerData.isActive ? (
                    <><FiEye className="icon-visible" /> Visible on Website</>
                  ) : (
                    <><FiEyeOff className="icon-hidden" /> Hidden from Website</>
                  )}
                </span>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="badge">Badge Text</label>
                <input
                  type="text"
                  id="badge"
                  name="badge"
                  value={offerData.badge}
                  onChange={handleInputChange}
                  placeholder="e.g. SPECIAL OFFER"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Main Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={offerData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Get 30% Off on First Order"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description / Subtitle</label>
              <textarea
                id="description"
                name="description"
                value={offerData.description}
                onChange={handleInputChange}
                placeholder="e.g. Download our app and get exclusive deals"
                rows="3"
                required
              ></textarea>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="buttonText">Button Text</label>
                <input
                  type="text"
                  id="buttonText"
                  name="buttonText"
                  value={offerData.buttonText}
                  onChange={handleInputChange}
                  placeholder="e.g. Shop Now"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="buttonLink">Button Link</label>
                <input
                  type="text"
                  id="buttonLink"
                  name="buttonLink"
                  value={offerData.buttonLink}
                  onChange={handleInputChange}
                  placeholder="e.g. /shop"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="spinner-small"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card preview-card">
        <h3 className="section-title">Live Preview</h3>
        <div className="promo-banner-preview">
          <div className="promo-banner-modern" style={{ opacity: offerData.isActive ? 1 : 0.5 }}>
            {!offerData.isActive && (
              <div className="preview-overlay">
                <span>Section Hidden</span>
              </div>
            )}
            <div className="promo-content">
              <span className="promo-badge">{offerData.badge}</span>
              <h3 className="promo-title">{offerData.title}</h3>
              <p className="promo-text">{offerData.description}</p>
              <button className="promo-btn">{offerData.buttonText}</button>
            </div>
            <div className="promo-visual">
              <div className="promo-circle"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialOffer;
