import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../contexts/CategoryContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiChevronDown, FiEye, FiImage, FiRefreshCw } from 'react-icons/fi';
import ImageUpload from '../../components/admin/ImageUpload';
import { uploadImage } from '../../services/storageService';
import './Categories.css';

const Categories = () => {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory, fetchCategories, syncProducts } = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [productCounts, setProductCounts] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchProductCounts = async () => {
      try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const counts = {};
        
        // Mapping for old category names to new ones for accurate counting
        const nameMapping = {
          'Organic Exotic Products': 'Vegetable Basket',
          'Organic Wood Cold Press Oils Products': 'Satva Pure Oils',
          'Organic Powder': 'Healthy Life Powders',
          'Organic Woodcold press Oils products': 'Satva Pure Oils',
          'Organic Iteams': 'Organic Items'
        };

        productsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          let cat = data.category;
          
          if (!cat) return;

          // Normalize: trim and handle mapping
          cat = cat.trim();
          if (nameMapping[cat]) {
            cat = nameMapping[cat];
          }

          // Count using normalized name as key
          // We'll also store a lowercase version to match flexibly
          const normalizedKey = cat.toLowerCase();
          counts[normalizedKey] = (counts[normalizedKey] || 0) + 1;
        });

        // Map the counts back to the actual category names
        const finalCounts = {};
        categories.forEach(category => {
          const key = category.name.trim().toLowerCase();
          finalCounts[category.name] = counts[key] || 0;
        });

        setProductCounts(finalCounts);
      } catch (error) {
        console.error("Error fetching product counts:", error);
      }
    };
    fetchProductCounts();
  }, [categories]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    image: '',
    subcategories: []
  });
  const [newSubcategory, setNewSubcategory] = useState('');

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        image: category.image || '',
        subcategories: category.subcategories || []
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        image: '',
        subcategories: []
      });
    }
    setSelectedImage(null);
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setNewSubcategory('');
    setSelectedImage(null);
    setUploadProgress(0);
  };

  const handleAddSubcategory = () => {
    if (newSubcategory.trim()) {
      setFormData({
        ...formData,
        subcategories: [...formData.subcategories, newSubcategory.trim()]
      });
      setNewSubcategory('');
    }
  };

  const handleRemoveSubcategory = (index) => {
    const newSubs = [...formData.subcategories];
    newSubs.splice(index, 1);
    setFormData({
      ...formData,
      subcategories: newSubs
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting category form...");
    try {
      setIsSyncing(true);
      let imageUrl = formData.image;

      if (selectedImage) {
        console.log("Uploading new image...");
        const uploadResult = await uploadImage(
          selectedImage, 
          'categories', 
          (progress) => setUploadProgress(progress)
        );
        imageUrl = uploadResult.url;
        console.log("Image uploaded:", imageUrl);
      }

      const categoryData = {
        name: formData.name,
        slug: formData.slug,
        image: imageUrl,
        subcategories: formData.subcategories
      };

      if (editingCategory) {
        console.log("Updating existing category:", editingCategory.id);
        await updateCategory(editingCategory.id, categoryData);
      } else {
        console.log("Adding new category...");
        await addCategory(categoryData);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    console.log("Delete requested for category ID:", id);
    if (window.confirm("Are you sure you want to delete this category? This will move its products to 'Uncategorized'.")) {
      try {
        await deleteCategory(id);
        console.log("Delete successful");
      } catch (error) {
        console.error("Error deleting category:", error);
        alert("Failed to delete category: " + error.message);
      }
    }
  };

  const handleManualSync = async () => {
    if (window.confirm("This will scan all products and update their category names to match the current categories. Continue?")) {
      setIsSyncing(true);
      try {
        // Run sync for each category to be safe
        for (const cat of categories) {
          await syncProducts(cat.name, cat.name);
        }
        alert("Sync completed successfully!");
      } catch (error) {
        console.error("Manual sync failed:", error);
        alert("Sync failed: " + error.message);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    if (!editingCategory) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData({ ...formData, name, slug });
    } else {
      setFormData({ ...formData, name });
    }
  };

  return (
    <div className="admin-categories">
      <div className="categories-header">
        <div className="header-title-section">
          <h1>Categories Management</h1>
          <p className="header-subtitle">Manage your product categories and subcategories</p>
        </div>
        <div className="header-actions-group">
          <button className="add-category-btn" onClick={() => handleOpenModal()}>
            <FiPlus /> Add New Category
          </button>
        </div>
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div key={category.id} className="category-card">
            <div className="category-image-wrapper">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="category-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                  }}
                />
              ) : (
                <div className="category-placeholder">
                  <FiImage size={48} color="#94a3b8" />
                </div>
              )}
              <div className="category-overlay">
                <button
                  className="action-btn"
                  onClick={() => handleOpenModal(category)}
                  title="Edit Category"
                >
                  <FiEdit2 size={18} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(category.id)}
                  title="Delete Category"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
            <div className="category-content">
              <div className="category-card-header">
                <h3 className="category-title">{category.name}</h3>
              </div>

              <div className="category-stats">
                <div 
                  className="stat-item clickable" 
                  onClick={() => navigate(`/admin/products?category=${category.name}`)}
                  title="View Products in this Category"
                >
                  <span className="stat-label">Products</span>
                  <span className="stat-value">{productCounts[category.name] || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status</span>
                  <span className={`stat-badge ${(productCounts[category.name] || 0) > 0 ? 'active' : 'inactive'}`}>
                    {(productCounts[category.name] || 0) > 0 ? 'Active' : 'In Use'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button className="close-modal-btn" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={handleNameChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Slug (URL Path)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <ImageUpload
                    onImagesSelected={(files) => setSelectedImage(files[0])}
                    maxImages={1}
                    existingImages={formData.image ? [{ url: formData.image }] : []}
                    label="Category Image"
                  />
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="upload-progress-bar">
                      <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
                <div className="form-group full-width">
                  <label>Subcategories</label>
                  <div className="subcategory-input-group">
                    <input
                      type="text"
                      className="form-input"
                      value={newSubcategory}
                      onChange={(e) => setNewSubcategory(e.target.value)}
                      placeholder="Add subcategory..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubcategory())}
                    />
                    <button type="button" className="add-sub-btn" onClick={handleAddSubcategory}>
                      <FiPlus />
                    </button>
                  </div>
                  <div className="subcategories-list-edit">
                    {formData.subcategories.map((sub, index) => (
                      <span key={index} className="subcategory-item">
                        {sub}
                        <button type="button" className="remove-sub-btn" onClick={() => handleRemoveSubcategory(index)}>
                          <FiX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-save" disabled={isSyncing}>
                  {isSyncing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
