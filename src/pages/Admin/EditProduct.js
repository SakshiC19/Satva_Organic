import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadMultipleImages, deleteImage, getPathFromURL } from '../../services/storageService';
import ImageUpload from '../../components/admin/ImageUpload';
import { useCategories } from '../../contexts/CategoryContext';
import { FiSave, FiX, FiTrash2 } from 'react-icons/fi';
import '../Admin/Admin.css';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

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
    refundPolicyAvailable: false,
    originalPrice: '',
    discountPercentage: ''
  });

  const { categories: contextCategories } = useCategories();
  const categories = contextCategories.map(cat => cat.name);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const productDoc = await getDoc(doc(db, 'products', id));
      if (productDoc.exists()) {
        const data = productDoc.data();
        setFormData({
          name: data.name || '',
          description: data.description || '',
          price: data.price || '',
          category: data.category || '',
          subcategory: data.subcategory || '',
          stock: data.stock || '',
          unit: data.unit || 'kg',
          packingSizes: data.packingSizes ? data.packingSizes.join(', ') : '',
          productType: data.productType || (data.organic ? 'organic' : 'inorganic'),
          featured: data.featured || false,
          codAvailable: data.codAvailable || false,
          refundPolicyAvailable: data.refundPolicyAvailable || false,
          originalPrice: data.originalPrice || '',
          discountPercentage: data.discount || (data.originalPrice && data.price ? (((data.originalPrice - data.price) / data.originalPrice) * 100).toFixed(2) : '')
        });
        setExistingImages(data.images || []);
      } else {
        alert('Product not found');
        navigate('/admin/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Discount Logic
      if (name === 'originalPrice' || name === 'discountPercentage' || name === 'price') {
        const orig = name === 'originalPrice' ? parseFloat(value) : parseFloat(prev.originalPrice);
        const disc = name === 'discountPercentage' ? parseFloat(value) : parseFloat(prev.discountPercentage);
        const sale = name === 'price' ? parseFloat(value) : parseFloat(prev.price);

        if (name === 'discountPercentage' && !isNaN(orig) && !isNaN(disc)) {
          newData.price = (orig * (1 - disc / 100)).toFixed(2);
        } else if (name === 'price' && !isNaN(orig) && !isNaN(sale) && orig > 0) {
          newData.discountPercentage = (((orig - sale) / orig) * 100).toFixed(2);
        } else if (name === 'originalPrice' && !isNaN(orig)) {
          if (!isNaN(disc)) {
            newData.price = (orig * (1 - disc / 100)).toFixed(2);
          } else if (!isNaN(sale)) {
            newData.discountPercentage = (((orig - sale) / orig) * 100).toFixed(2);
          }
        }
      }

      return newData;
    });
  };

  const handleImagesSelected = (files) => {
    setSelectedImages(files);
  };

  const categoryPackingSizes = {
    'organic exotic products': ['500g', '750g', '1kg'],
    'organic Woodcold press Oils products': ['250ml', '500ml', '750ml', '1L'],
    'Millets Of India': ['2kg', '5kg'],
    'Organic Iteams': ['500g', '1kg'],
    'Seeds And Nuts': ['100g', '250g', '500g'],
    'Organic Powder': ['250g', '500g', '1kg']
  };

  const handleRemoveExistingImage = (index) => {
    const imageToRemove = existingImages[index];
    setImagesToDelete([...imagesToDelete, imageToRemove]);
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.price || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    if (existingImages.length === 0 && selectedImages.length === 0) {
      alert('Product must have at least one image');
      return;
    }

    try {
      setSaving(true);

      // Upload new images if any
      let newUploadedImages = [];
      if (selectedImages.length > 0) {
        newUploadedImages = await uploadMultipleImages(
          selectedImages,
          'products',
          (index, progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [index]: progress
            }));
          }
        );
      }

      // Delete removed images from Storage
      if (imagesToDelete.length > 0) {
        const pathsToDelete = imagesToDelete
          .map(img => getPathFromURL(img.url || img))
          .filter(path => path !== null);

        for (const path of pathsToDelete) {
          try {
            await deleteImage(path);
          } catch (error) {
            console.error('Error deleting image:', error);
          }
        }
      }

      // Combine existing and new images
      const allImages = [
        ...existingImages,
        ...newUploadedImages.map(img => ({
          url: img.url,
          path: img.path
        }))
      ];

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
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        discount: formData.discountPercentage ? parseFloat(formData.discountPercentage) : 0,
        images: allImages,
        updatedAt: serverTimestamp()
      };

      // Update product in Firestore
      await updateDoc(doc(db, 'products', id), productData);

      alert('Product updated successfully!');
      navigate('/admin/products');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product: ' + error.message);
    } finally {
      setSaving(false);
      setUploadProgress({});
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading product...</p>
      </div>
    );
  }

  return (
    <div className="admin-edit-product">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Edit Product</h1>
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

            <div className="form-row price-row">
              <div className="form-group">
                <label htmlFor="originalPrice">Original Price (₹)</label>
                <input
                  type="number"
                  id="originalPrice"
                  name="originalPrice"
                  value={formData.originalPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="discountPercentage">Discount (%)</label>
                <input
                  type="number"
                  id="discountPercentage"
                  name="discountPercentage"
                  value={formData.discountPercentage}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">Sale Price (₹) *</label>
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
            </div>

            <div className="form-row">
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
              <div className="packing-suggestions">
                <span className="suggestion-label">Quick Add:</span>
                {(categoryPackingSizes[formData.category.toLowerCase()] || [
                  '100g', '250g', '500g', '750g', '1kg', '2kg', '5kg',
                  '250ml', '500ml', '750ml', '1L', '5L'
                ]).map(size => (
                  <button
                    key={size}
                    type="button"
                    className="suggestion-btn"
                    onClick={() => {
                      const current = formData.packingSizes ? formData.packingSizes.split(',').map(s => s.trim()) : [];
                      if (!current.includes(size)) {
                        const updated = [...current, size].join(', ');
                        setFormData(prev => ({ ...prev, packingSizes: updated }));
                      }
                    }}
                  >
                    +{size}
                  </button>
                ))}
              </div>
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

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="form-section full-width">
            <h3 className="form-section-title">Current Images</h3>
            <div className="existing-images-grid">
              {existingImages.map((image, index) => (
                <div key={index} className="existing-image-item">
                  <img src={image.url || image} alt={`Product ${index + 1}`} />
                  <button
                    type="button"
                    className="remove-existing-image-btn"
                    onClick={() => handleRemoveExistingImage(index)}
                    title="Remove image"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Images */}
        <div className="form-section full-width">
          <h3 className="form-section-title">Add New Images</h3>
          <ImageUpload
            onImagesSelected={handleImagesSelected}
            maxImages={5 - existingImages.length}
            label="Upload Additional Images"
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
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner-small"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave /> Update Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
