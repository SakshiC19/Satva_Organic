import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCategories } from '../../contexts/CategoryContext';
import { FiSave, FiEye, FiEyeOff } from 'react-icons/fi';
import ImageUpload from '../../components/admin/ImageUpload';
import './SpecialOffer.css';

const SpecialOffer = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Data for selection dropdowns
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);

  const [offerData, setOfferData] = useState({
    badge: 'SPECIAL OFFER',
    title: 'Get 30% Off on First Order',
    description: 'Download our app and get exclusive deals',
    buttonText: 'Shop Now',
    buttonLink: '/shop',
    isActive: true,
    scope: 'all', // 'all', 'category', 'product'
    targetId: '', // ID of the selected category or product
    backgroundImage: '' // URL of the background image
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch Offer Settings
      const offerRef = doc(db, 'settings', 'specialOffer');
      const offerSnap = await getDoc(offerRef);
      if (offerSnap.exists()) {
        const data = offerSnap.data();
        setOfferData(prev => ({ ...prev, ...data }));
      }

      // Fetch Products
      const productsSnap = await getDocs(collection(db, 'products'));
      const prods = productsSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setProducts(prods);

    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
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

  const handleImagesSelected = (files) => {
    if (files.length > 0) {
      setSelectedImage(files[0]);
    } else {
      setSelectedImage(null);
    }
  };

  const handleRemoveImage = () => {
    setOfferData(prev => ({ ...prev, backgroundImage: '' }));
    setSelectedImage(null);
    setUploadKey(prev => prev + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      setMessage({ type: '', text: '' });

      let imageUrl = offerData.backgroundImage;

      // Upload image if selected
      if (selectedImage) {
        const { uploadImage } = await import('../../services/storageService');
        const uploadResult = await uploadImage(selectedImage, 'special-offer');
        imageUrl = uploadResult.url;
      }

      const updatedOfferData = {
        ...offerData,
        backgroundImage: imageUrl
      };

      const offerRef = doc(db, 'settings', 'specialOffer');
      await setDoc(offerRef, updatedOfferData);
      
      setOfferData(updatedOfferData);
      setSelectedImage(null);
      setUploadKey(prev => prev + 1);

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
        <div className="header-title-section">
          <h1 className="admin-page-title">Manage Special Offer</h1>
          <p className="header-subtitle">Update the promotional banner displayed on the homepage</p>
        </div>
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

            <div className="form-section-divider"></div>

            <div className="form-group">
              <label>Background Image (Optional)</label>
              <ImageUpload 
                key={uploadKey}
                onImagesSelected={handleImagesSelected}
                maxImages={1}
                label="Select Background Image"
                existingImages={offerData.backgroundImage ? [{ url: offerData.backgroundImage }] : []}
                onRemoveExisting={handleRemoveImage}
              />
              <small className="form-help-text">
                Recommended size: 1200x400px. If not set, default gradient will be used.
                Clear text fields to create an image-only banner.
              </small>
            </div>

            <div className="form-section-divider"></div>

            {/* Target Selection */}
            <div className="form-group">
              <label htmlFor="scope">Apply Offer To</label>
              <select
                id="scope"
                name="scope"
                value={offerData.scope}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="all">Global (All Products - Link Manually)</option>
                <option value="category">Specific Category</option>
                <option value="product">Specific Product</option>
              </select>
            </div>

            {offerData.scope === 'category' && (
              <div className="form-group">
                <label htmlFor="targetId">Select Category</label>
                <select
                  id="targetId"
                  name="targetId"
                  value={offerData.targetId}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">-- Choose a Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            {offerData.scope === 'product' && (
              <div className="form-group">
                <label htmlFor="targetId">Select Product</label>
                <select
                  id="targetId"
                  name="targetId"
                  value={offerData.targetId}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">-- Choose a Product --</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                  ))}
                </select>
              </div>
            )}

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
                />
              </div>

              <div className="form-group">
                <label htmlFor="buttonLink">Button Link (Auto-generated for Category/Product)</label>
                <input
                  type="text"
                  id="buttonLink"
                  name="buttonLink"
                  value={
                    offerData.scope === 'category'
                      ? `/shop?category=${categories.find(c => c.id === offerData.targetId)?.name || ''}`
                      : offerData.scope === 'product'
                        ? `/product/${offerData.targetId}`
                        : offerData.buttonLink
                  }
                  onChange={handleInputChange}
                  placeholder="e.g. /shop"
                  required
                  readOnly={offerData.scope !== 'all'}
                  className={offerData.scope !== 'all' ? 'read-only-input' : ''}
                />
                {offerData.scope !== 'all' && (
                  <small className="form-help-text">Link is automatically set based on your selection.</small>
                )}
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
          <div 
            className="promo-banner-modern" 
            style={{ 
              opacity: offerData.isActive ? 1 : 0.5,
              backgroundImage: selectedImage 
                ? `url(${URL.createObjectURL(selectedImage)})` 
                : offerData.backgroundImage 
                  ? `url(${offerData.backgroundImage})` 
                  : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {(selectedImage || offerData.backgroundImage) && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                zIndex: 1,
                borderRadius: '16px'
              }}></div>
            )}
            {!offerData.isActive && (
              <div className="preview-overlay">
                <span>Section Hidden</span>
              </div>
            )}
            <div className="promo-content">
              {offerData.badge && <span className="promo-badge">{offerData.badge}</span>}
              {offerData.title && <h3 className="promo-title">{offerData.title}</h3>}
              {offerData.description && <p className="promo-text">{offerData.description}</p>}
              {offerData.buttonText && <button className="promo-btn">{offerData.buttonText}</button>}
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
