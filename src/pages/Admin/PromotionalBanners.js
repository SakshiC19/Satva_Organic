import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import ImageUpload from '../../components/admin/ImageUpload';
import './Admin.css';

const PromotionalBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newBanner, setNewBanner] = useState({
    subtitle: 'Fresh',
    title: '',
    offer: '',
    link: '',
    bgColor: '#f0fdf4'
  });
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const bannersRef = collection(db, 'promotionalBanners');
      const q = query(bannersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const bannersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBanners(bannersList);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImagesSelected = (files) => {
    if (files.length > 0) {
      setSelectedImage(files[0]);
    } else {
      setSelectedImage(null);
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    try {
      setUploading(true);
      const { uploadImage } = await import('../../services/storageService');
      const uploadResult = await uploadImage(selectedImage, 'promo-banners');

      await addDoc(collection(db, 'promotionalBanners'), {
        ...newBanner,
        image: uploadResult.url,
        imagePath: uploadResult.path,
        createdAt: new Date().toISOString()
      });

      setNewBanner({
        subtitle: 'Fresh',
        title: '',
        offer: '',
        link: '',
        bgColor: '#f0fdf4'
      });
      setSelectedImage(null);
      fetchBanners();
      alert('Promotional banner added successfully!');
    } catch (error) {
      console.error('Error adding banner:', error);
      alert('Failed to add banner: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;

    try {
      await deleteDoc(doc(db, 'promotionalBanners', id));
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  return (
    <div className="admin-promotional-banners">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Promotional Banners</h1>
      </div>

      <div className="admin-content">
        <div className="product-form" style={{ marginBottom: '30px' }}>
          <h3 className="form-section-title">Add New Promotional Banner</h3>
          <form onSubmit={handleAddBanner}>
            <div className="form-grid">
              <div className="form-section">
                <div className="form-group">
                  <label>Subtitle</label>
                  <input
                    type="text"
                    value={newBanner.subtitle}
                    onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                    placeholder="e.g., Fresh"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={newBanner.title}
                    onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                    placeholder="e.g., Bread Products"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Offer Text</label>
                  <input
                    type="text"
                    value={newBanner.offer}
                    onChange={(e) => setNewBanner({ ...newBanner, offer: e.target.value })}
                    placeholder="e.g., SALE UP TO 40% OFF"
                    required
                  />
                </div>
              </div>
              <div className="form-section">
                <div className="form-group">
                  <label>Link (Optional)</label>
                  <input
                    type="text"
                    value={newBanner.link}
                    onChange={(e) => setNewBanner({ ...newBanner, link: e.target.value })}
                    placeholder="e.g., /shop?category=bread"
                  />
                </div>
                <div className="form-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={newBanner.bgColor}
                    onChange={(e) => setNewBanner({ ...newBanner, bgColor: e.target.value })}
                    style={{ height: '45px', padding: '5px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Banner Image</label>
                  <ImageUpload 
                    onImagesSelected={handleImagesSelected}
                    maxImages={1}
                    label="Select Promo Image"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={uploading || !selectedImage}
              style={{ width: '200px' }}
            >
              {uploading ? 'Adding...' : <><FiPlus /> Add Promo Banner</>}
            </button>
          </form>
        </div>

        <div className="admin-table-container">
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: 0 }}>Current Promotional Banners</h3>
          </div>
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : banners.length === 0 ? (
              <p className="no-data">No promotional banners added yet.</p>
            ) : (
              <div className="products-grid-admin">
                {banners.map(banner => (
                  <div key={banner.id} className="product-card-admin" style={{ backgroundColor: banner.bgColor }}>
                    <div className="product-image-admin">
                      <img src={banner.image} alt={banner.title} />
                    </div>
                    <div className="product-info-admin">
                      <span className="product-category">{banner.subtitle}</span>
                      <h3>{banner.title}</h3>
                      <p className="product-price" style={{ fontSize: '1rem' }}>{banner.offer}</p>
                    </div>
                    <div className="product-actions">
                      <button 
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="btn-icon btn-delete"
                        title="Delete Banner"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionalBanners;
