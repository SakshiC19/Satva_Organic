import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../contexts/CategoryContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiChevronDown, FiEye } from 'react-icons/fi';
import './Categories.css';

const Categories = () => {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory, fetchCategories } = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [productCounts, setProductCounts] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    const fetchProductCounts = async () => {
      try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const counts = {};
        productsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const cat = data.category;
          if (cat) {
            counts[cat] = (counts[cat] || 0) + 1;
          }
        });
        setProductCounts(counts);
      } catch (error) {
        console.error("Error fetching product counts:", error);
      }
    };
    fetchProductCounts();
  }, [categories]);

  const handleResetToDefaults = async () => {
    if (window.confirm("This will delete all current categories and restore default ones with new high-quality images. Are you sure?")) {
      try {
        setIsResetting(true);
        // Delete all current categories
        for (const cat of categories) {
          await deleteCategory(cat.id);
        }
        // Re-fetch will trigger seeding in CategoryContext
        await fetchCategories();
        alert("Categories reset to defaults successfully!");
      } catch (error) {
        console.error("Error resetting categories:", error);
        alert("Failed to reset categories");
      } finally {
        setIsResetting(false);
      }
    }
  };

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
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setNewSubcategory('');
  };

  const toggleCategory = (index) => {
    setExpandedCategories(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
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
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await addCategory(formData);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteCategory(id);
      } catch (error) {
        console.error("Error deleting category:", error);
        alert("Failed to delete category");
      }
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const name = e.target.value;
    if (!editingCategory) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData({ ...formData, name, slug });
    } else {
      setFormData({ ...formData, name });
    }
  };

  const getBadgeColor = (index) => {
    const colors = ['green', 'orange', 'brown', 'teal', 'purple', 'blue'];
    return colors[index % colors.length];
  };

  return (
    <div className="admin-categories">
      <div className="categories-header">
        <h1>Categories</h1>
        <div className="header-actions-group">
          <button
            className="btn-reset"
            onClick={handleResetToDefaults}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset to Defaults'}
          </button>
          <button className="add-category-btn" onClick={() => handleOpenModal()}>
            <FiPlus /> Add Category
          </button>
        </div>
      </div>

      <div className="categories-grid">
        {categories.map((category, index) => (
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
                <div className="category-placeholder">📦</div>
              )}
            </div>
            <div className="category-content">
              <div className="category-card-header">
                <h3 className="category-title">{category.name}</h3>
                <div className="category-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleOpenModal(category)}
                    title="Edit Category"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(category.id)}
                    title="Delete Category"
                  >
                    <FiTrash2 size={16} />
                  </button>
                  <button
                    className="action-btn view"
                    onClick={() => navigate(`/shop?category=${category.slug}`)}
                    title="View Products"
                  >
                    <FiEye size={16} />
                  </button>
                </div>
              </div>

              {/* Category Health Stats */}
              <div className="category-stats">
                <div className="stat-item">
                  <span className="stat-label">Products:</span>
                  <span className="stat-value">{productCounts[category.name] || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status:</span>
                  <span className={`stat-badge ${(productCounts[category.name] || 0) > 0 ? 'active' : 'inactive'}`}>
                    {(productCounts[category.name] || 0) > 0 ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="category-card-footer">
                <button
                  className="footer-badge-container green"
                  onClick={() => toggleCategory(index)}
                >
                  <FiChevronDown
                    size={14}
                    style={{
                      transform: expandedCategories[index] ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                  <span>{category.subcategories?.length || 0} Subcategories</span>
                </button>
                <span className="product-count-text">
                  {productCounts[category.name] || 0} Products
                </span>
              </div>

              {/* Collapsible Subcategories Section */}
              {expandedCategories[index] && (
                <div className="subcategories-section expanded">
                  <div className="subcategories-list">
                    {category.subcategories?.map((sub, idx) => (
                      <span key={idx} className="subcategory-tag">{sub}</span>
                    ))}
                  </div>
                </div>
              )}
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
                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group">
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
                  <div className="added-subcategories">
                    {formData.subcategories.map((sub, index) => (
                      <span key={index} className="added-subcategory-tag">
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
                <button type="submit" className="btn-save">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
