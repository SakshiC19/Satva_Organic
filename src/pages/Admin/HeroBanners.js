import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiTrash2 } from 'react-icons/fi';
import ImageUpload from '../../components/admin/ImageUpload';
import './HeroBanners.css';

const HeroBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newBanner, setNewBanner] = useState({
    image: '',
    alt: '',
    link: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const bannersRef = collection(db, 'heroBanners');
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

      // Import uploadImage from storageService
      const { uploadImage } = await import('../../services/storageService');
      
      // Upload image
      const uploadResult = await uploadImage(selectedImage, 'banners');
      
      await addDoc(collection(db, 'heroBanners'), {
        ...newBanner,
        image: uploadResult.url,
        imagePath: uploadResult.path,
        createdAt: new Date().toISOString(),
        type: 'image'
      });
      
      setNewBanner({ image: '', alt: '', link: '' });
      setSelectedImage(null);
      fetchBanners();
      alert('Banner added successfully!');
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
      await deleteDoc(doc(db, 'heroBanners', id));
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Hero Banners</h1>
      </div>

      <div className="admin-content">
        {/* Add New Banner Section */}
        <div className="add-banner-section card">
          <h3>Add New Banner</h3>
          <form onSubmit={handleAddBanner} className="add-banner-form">
            <div className="form-group">
              <label>Banner Image</label>
              <ImageUpload 
                onImagesSelected={handleImagesSelected}
                maxImages={1}
                label="Select Banner Image"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Alt Text (Description)</label>
                <input
                  type="text"
                  value={newBanner.alt}
                  onChange={(e) => setNewBanner({ ...newBanner, alt: e.target.value })}
                  placeholder="e.g., Big Sale on Organic Fruits"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Link (Optional)</label>
                <input
                  type="text"
                  value={newBanner.link}
                  onChange={(e) => setNewBanner({ ...newBanner, link: e.target.value })}
                  placeholder="e.g., /shop?category=fruits"
                  className="form-input"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={uploading || !selectedImage}
            >
              {uploading ? 'Adding...' : 'Add Banner'}
            </button>
          </form>
        </div>

        {/* Banners List */}
        <div className="banners-list-section">
          <h3>Current Banners</h3>
          {loading ? (
            <p>Loading banners...</p>
          ) : banners.length === 0 ? (
            <p className="no-data">No banners added yet.</p>
          ) : (
            <div className="banners-grid">
              {banners.map(banner => (
                <div key={banner.id} className="banner-card">
                  <div className="banner-preview">
                    <img src={banner.image} alt={banner.alt} />
                  </div>
                  <div className="banner-info">
                    <p className="banner-alt">{banner.alt || 'No description'}</p>
                    <button 
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="btn-icon delete"
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
  );
};

export default HeroBanners;
