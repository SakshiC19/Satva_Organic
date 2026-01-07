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
    title: '',
    subtitle: '',
    buttonText: '',
    link: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [uploadKey, setUploadKey] = useState(0); // To force reset ImageUpload

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
      
      setNewBanner({ image: '', title: '', subtitle: '', buttonText: '', link: '' });
      setSelectedImage(null);
      setUploadKey(prev => prev + 1); // Reset ImageUpload
      fetchBanners();
      alert('Banner added successfully!');
    } catch (error) {
      console.error('Error adding banner:', error);
      alert('Failed to add banner: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditClick = (banner) => {
    setEditingId(banner.id);
    setNewBanner({
      image: banner.image,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      buttonText: banner.buttonText || '',
      link: banner.link || ''
    });
    setSelectedImage(null);
    setUploadKey(prev => prev + 1); // Reset upload component
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewBanner({ image: '', title: '', subtitle: '', buttonText: '', link: '' });
    setSelectedImage(null);
    setUploadKey(prev => prev + 1);
  };

  const handleUpdateBanner = async (e) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      setUploading(true);
      let imageUrl = newBanner.image;
      let imagePath = null;

      // If new image selected, upload it
      if (selectedImage) {
        const { uploadImage } = await import('../../services/storageService');
        const uploadResult = await uploadImage(selectedImage, 'banners');
        imageUrl = uploadResult.url;
        imagePath = uploadResult.path;
      }

      const updateData = {
        ...newBanner,
        image: imageUrl,
        updatedAt: new Date().toISOString()
      };

      if (imagePath) {
        updateData.imagePath = imagePath;
      }

      // Use updateDoc from firestore
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'heroBanners', editingId), updateData);
      
      setEditingId(null);
      setNewBanner({ image: '', title: '', subtitle: '', buttonText: '', link: '' });
      setSelectedImage(null);
      setUploadKey(prev => prev + 1);
      fetchBanners();
      alert('Banner updated successfully!');
    } catch (error) {
      console.error('Error updating banner:', error);
      alert('Failed to update banner: ' + error.message);
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
        {/* Add/Edit Banner Section */}
        <div className="add-banner-section card">
          <h3>{editingId ? 'Edit Banner' : 'Add New Banner'}</h3>
          <form className="add-banner-form">
            <div className="form-group">
              <label>Banner Image</label>
              <ImageUpload 
                key={uploadKey}
                onImagesSelected={handleImagesSelected}
                maxImages={1}
                label={editingId ? "Change Banner Image (Optional)" : "Select Banner Image"}
                existingImages={editingId && !selectedImage ? [{ url: newBanner.image }] : []}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  placeholder="e.g., Fresh & Organic"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Subtitle</label>
                <input
                  type="text"
                  value={newBanner.subtitle}
                  onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                  placeholder="e.g., Premium quality products..."
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Button Text</label>
                <input
                  type="text"
                  value={newBanner.buttonText}
                  onChange={(e) => setNewBanner({ ...newBanner, buttonText: e.target.value })}
                  placeholder="e.g., Shop Now"
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

            <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                onClick={editingId ? handleUpdateBanner : handleAddBanner}
                disabled={uploading || (!selectedImage && !editingId)}
              >
                {uploading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Banner' : 'Add Banner')}
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  disabled={uploading}
                >
                  Cancel Edit
                </button>
              )}
            </div>
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
                    <p className="banner-title" style={{ fontWeight: 'bold' }}>{banner.title || 'No Title'}</p>
                    <p className="banner-subtitle" style={{ fontSize: '0.9em', color: '#666' }}>{banner.subtitle}</p>
                    <button 
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="btn-icon delete"
                      title="Delete Banner"
                    >
                      <FiTrash2 />
                    </button>
                    <button 
                      onClick={() => handleEditClick(banner)}
                      className="btn-icon edit"
                      title="Edit Banner"
                      style={{ marginLeft: '8px', color: '#2563eb' }}
                    >
                      Edit
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
