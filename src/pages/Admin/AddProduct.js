import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadMultipleImages } from '../../services/storageService';
import ImageUpload from '../../components/admin/ImageUpload';
import { FiSave, FiX } from 'react-icons/fi';
import { useCategories } from '../../contexts/CategoryContext';
import '../Admin/Admin.css';

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    stock: '',
    unit: 'kg',
    packingSizes: '',
    productType: 'organic',
    featured: false,
    codAvailable: false,
    refundPolicyAvailable: false
  });

  const { categories: contextCategories, loading: categoriesLoading } = useCategories();
  
  // Uses context categories if available, otherwise empty array (or handle loading)
  const categories = contextCategories.map(cat => cat.name);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImagesSelected = (files) => {
    setSelectedImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.price || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedImages.length === 0) {
      alert('Please upload at least one product image');
      return;
    }

    try {
      setLoading(true);

      // Upload images to Firebase Storage
      const uploadedImages = await uploadMultipleImages(
        selectedImages,
        'products',
        (index, progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [index]: progress
          }));
        }
      );

      // Prepare product data
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        subcategory: formData.subcategory || null,
        stock: parseInt(formData.stock) || 0,
        unit: formData.unit,
        packingSizes: formData.packingSizes ? formData.packingSizes.split(',').map(s => s.trim()) : [],
        productType: formData.productType,
        organic: formData.productType === 'organic', // Keep for backward compatibility
        featured: formData.featured,
        codAvailable: formData.codAvailable,
        refundPolicyAvailable: formData.refundPolicyAvailable,
        images: uploadedImages.map(img => ({
          url: img.url,
          path: img.path
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add product to Firestore
      await addDoc(collection(db, 'products'), productData);

      alert('Product added successfully!');
      navigate('/admin/products');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product: ' + error.message);
    } finally {
      setLoading(false);
      setUploadProgress({});
    }
  };

  return (
    <div className="admin-add-product">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Add New Product</h1>
        <button 
          onClick={() => navigate('/admin/products')}
          className="btn btn-secondary"
        >
          <FiX /> Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>

            <div className="form-group">
              <label htmlFor="name">Product Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Enter product description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subcategory">Subcategory</label>
                <input
                  type="text"
                  id="subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  placeholder="Enter subcategory"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="form-section">
            <h3 className="form-section-title">Pricing & Inventory</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Price (₹) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stock">Stock Quantity</label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="unit">Unit</label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="l">Liter (l)</option>
                  <option value="ml">Milliliter (ml)</option>
                  <option value="piece">Piece</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="packingSizes">Packing Sizes (comma separated)</label>
              <input
                type="text"
                id="packingSizes"
                name="packingSizes"
                value={formData.packingSizes}
                onChange={handleInputChange}
                placeholder="e.g., 500g, 1kg, 2kg"
              />
            </div>

            <div className="form-group">
              <label>Product Type *</label>
              <div className="form-radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="productType"
                    value="organic"
                    checked={formData.productType === 'organic'}
                    onChange={handleInputChange}
                  />
                  <span>Organic Product</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="productType"
                    value="inorganic"
                    checked={formData.productType === 'inorganic'}
                    onChange={handleInputChange}
                  />
                  <span>Inorganic Product</span>
                </label>
              </div>
            </div>

            <div className="form-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleInputChange}
                />
                <span>Featured Product</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="codAvailable"
                  checked={formData.codAvailable}
                  onChange={handleInputChange}
                />
                <span>Cash on Delivery Available</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="refundPolicyAvailable"
                  checked={formData.refundPolicyAvailable}
                  onChange={handleInputChange}
                />
                <span>Refund Policy Available</span>
              </label>
            </div>
          </div>
        </div>

        {/* Product Images */}
        <div className="form-section full-width">
          <h3 className="form-section-title">Product Images *</h3>
          <ImageUpload
            onImagesSelected={handleImagesSelected}
            maxImages={5}
            label="Upload Product Images"
          />

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="upload-progress-container">
              {Object.entries(uploadProgress).map(([index, progress]) => (
                <div key={index} className="upload-progress-item">
                  <span>Image {parseInt(index) + 1}</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span>{Math.round(progress)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Uploading...
              </>
            ) : (
              <>
                <FiSave /> Save Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
