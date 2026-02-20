import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadMultipleImages, deleteImage, getPathFromURL } from '../../services/storageService';
import ImageUpload from '../../components/admin/ImageUpload';
import { useCategories } from '../../contexts/CategoryContext';
import { FiSave, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import './EditProduct.css';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [existingSizeConfig, setExistingSizeConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    
    // Pricing & Inventory
    productForm: 'powder',
    basePrice: '',
    stock: '',
    unit: 'g',
    
    // Advanced Pricing
    generatedSizes: [],
    
    productType: 'organic',
    codAvailable: false,
    refundPolicyAvailable: false,
    
    // SEO
    metaTitle: '',
    metaDescription: '',
    metaKeywords: ''
  });

  const { categories: contextCategories } = useCategories();
  const categories = contextCategories.map(cat => cat.name);

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    try {
      const productDoc = await getDoc(doc(db, 'products', id));
      if (productDoc.exists()) {
        const data = productDoc.data();
        setFormData({
          name: data.name || '',
          description: data.description || '',
          category: data.category || '',
          subcategory: data.subcategory || '',
          
          productForm: data.productForm || 'powder',
          basePrice: data.price || '',
          stock: data.stock || '',
          unit: data.unit || 'g',
          
          // Reconstruct generatedSizes from packingSizes array and sizePrices map
          generatedSizes: [], // We'll let the useEffect handle initial generation, then merge
          
          productType: data.productType || (data.organic ? 'organic' : 'inorganic'),
          codAvailable: data.codAvailable || false,
          refundPolicyAvailable: data.refundPolicyAvailable || false,
          
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          metaKeywords: data.metaKeywords || ''
        });
        
        // Store existing size config to merge after auto-generation
        setExistingSizeConfig({
            packingSizes: data.packingSizes || [],
            sizePrices: data.sizePrices || {},
            sizeStocks: data.sizeStocks || {}
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Auto-generate sizes logic (copied from AddProduct)
  useEffect(() => {
    if (!formData.basePrice) return;

    const basePrice = parseFloat(formData.basePrice);
    if (isNaN(basePrice)) return;

    let defaults = [];
    if (formData.productForm === 'powder') {
      defaults = [
        { size: '100g', val: 100, unit: 'g' },
        { size: '250g', val: 250, unit: 'g' },
        { size: '500g', val: 500, unit: 'g' },
        { size: '1kg', val: 1000, unit: 'g' },
        { size: '2kg', val: 2000, unit: 'g' },
        { size: '5kg', val: 5000, unit: 'g' }
      ];
    } else if (formData.productForm === 'liquid') {
      defaults = [
        { size: '100ml', val: 100, unit: 'ml' },
        { size: '250ml', val: 250, unit: 'ml' },
        { size: '500ml', val: 500, unit: 'ml' },
        { size: '1L', val: 1000, unit: 'ml' },
        { size: '5L', val: 5000, unit: 'ml' }
      ];
    } else {
      defaults = []; 
    }

    setFormData(prev => {
      // 1. Generate default sizes with auto prices
      const newSizes = defaults.map(def => {
        const autoPrice = (def.val / 100) * basePrice;
        return {
          size: def.size,
          autoPrice: Math.round(autoPrice),
          customPrice: '',
          stock: '',
          enabled: true
        };
      });
      
      // 2. Merge with existing configuration (if loading for first time or if user edited)
      // If we have existingSizeConfig (from fetch), use that to set enabled/customPrice
      // If we have prev.generatedSizes (user interaction), preserve that.
      
      let currentSizes = prev.generatedSizes.length > 0 ? prev.generatedSizes : newSizes;
      
      // If we just loaded the product, we need to apply the saved config
      if (existingSizeConfig && prev.generatedSizes.length === 0) {
          // Map defaults to saved config
          const mergedDefaults = newSizes.map(s => {
              const isEnabled = existingSizeConfig.packingSizes.includes(s.size);
              const customPrice = existingSizeConfig.sizePrices[s.size] !== undefined ? String(existingSizeConfig.sizePrices[s.size]) : '';
              const stock = existingSizeConfig.sizeStocks && existingSizeConfig.sizeStocks[s.size] !== undefined 
                ? String(existingSizeConfig.sizeStocks[s.size]) 
                : '';
              return { ...s, enabled: isEnabled, customPrice, stock };
          });
          
          // Add any custom sizes that were saved but not in defaults
          const savedCustomSizes = existingSizeConfig.packingSizes
            .filter(size => !defaults.find(d => d.size === size))
            .map(size => {
                 // Calculate auto price for custom size
                 const match = size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
                 let autoPrice = 0;
                 if (match) {
                    const val = parseFloat(match[1]);
                    const unit = match[2].toLowerCase();
                    let multiplier = 0;
                    if (unit === 'g' || unit === 'ml') multiplier = val / 100;
                    if (unit === 'kg' || unit === 'l') multiplier = (val * 1000) / 100;
                    autoPrice = Math.round(multiplier * basePrice);
                 }
                  return {
                      size,
                      autoPrice: autoPrice || 0,
                      customPrice: existingSizeConfig.sizePrices[size] !== undefined ? String(existingSizeConfig.sizePrices[size]) : '',
                      stock: existingSizeConfig.sizeStocks && existingSizeConfig.sizeStocks[size] !== undefined 
                        ? String(existingSizeConfig.sizeStocks[size]) 
                        : '',
                      enabled: true
                  };
            });
            
          currentSizes = [...mergedDefaults, ...savedCustomSizes];
          return { ...prev, generatedSizes: currentSizes };
      }
      
      // Normal update (base price changed) - update auto prices, keep custom/enabled
      const updatedSizes = currentSizes.map(s => {
         // Recalculate auto price
         const match = s.size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
         let autoPrice = 0;
         if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            let multiplier = 0;
            if (unit === 'g' || unit === 'ml') multiplier = val / 100;
            if (unit === 'kg' || unit === 'l') multiplier = (val * 1000) / 100;
            autoPrice = Math.round(multiplier * basePrice);
         }
         return { ...s, autoPrice: autoPrice || s.autoPrice };
      });

       return { ...prev, generatedSizes: updatedSizes };
    });

    if (existingSizeConfig) {
        setExistingSizeConfig(null);
    }

  }, [formData.basePrice, formData.productForm, existingSizeConfig]);

  const addCustomSize = () => {
    const size = prompt("Enter custom size (e.g., 750g):");
    if (!size) return;
    
    // Simple validation/calculation
    const match = size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    let autoPrice = 0;
    if (match && formData.basePrice) {
        const val = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        let multiplier = 0;
        if (unit === 'g' || unit === 'ml') multiplier = val / 100;
        if (unit === 'kg' || unit === 'l') multiplier = (val * 1000) / 100;
        autoPrice = Math.round(multiplier * parseFloat(formData.basePrice));
    }

    setFormData(prev => ({
      ...prev,
      generatedSizes: [
        ...prev.generatedSizes,
        { size, autoPrice, customPrice: '', stock: '', enabled: true }
      ]
    }));
  };

  const updateSizeField = (index, field, value) => {
    setFormData(prev => {
      const newSizes = [...prev.generatedSizes];
      newSizes[index] = { ...newSizes[index], [field]: value };
      return { ...prev, generatedSizes: newSizes };
    });
  };

  const toggleSizeField = (index) => {
    updateSizeField(index, 'enabled', !formData.generatedSizes[index].enabled);
  };

  const handleImagesSelected = (files) => {
    setSelectedImages(files);
  };



  const handleRemoveExistingImage = (index) => {
    const imageToRemove = existingImages[index];
    setImagesToDelete([...imagesToDelete, imageToRemove]);
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.basePrice || !formData.category) {
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
      // Construct final data
      const activeSizes = formData.generatedSizes.filter(s => s.enabled);
      const sizePrices = {};
      activeSizes.forEach(s => {
        if (s.customPrice) {
          sizePrices[s.size] = parseFloat(s.customPrice);
        }
      });

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.basePrice),
        category: formData.category,
        subcategory: formData.subcategory || null,
        stock: activeSizes.reduce((sum, item) => sum + (parseInt(item.stock) || 0), 0),
        unit: formData.productForm === 'liquid' ? 'ml' : (formData.productForm === 'powder' ? 'g' : 'piece'),
        productForm: formData.productForm,
        packingSizes: activeSizes.map(s => s.size),
        sizePrices: sizePrices,
        sizeStocks: activeSizes.reduce((acc, s) => ({ ...acc, [s.size]: parseInt(s.stock) || 0 }), {}),
        productType: formData.productType,
        organic: formData.productType === 'organic',
        codAvailable: formData.codAvailable,
        refundPolicyAvailable: formData.refundPolicyAvailable,
        
        metaTitle: formData.metaTitle,
        metaDescription: formData.metaDescription,
        metaKeywords: formData.metaKeywords,
        
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
        <div className="header-title-section">
          <h1 className="admin-page-title">Edit Product</h1>
          <p className="header-subtitle">Update product details, pricing and images</p>
        </div>
        <button
          onClick={() => navigate('/admin/products')}
          className="btn btn-secondary"
        >
          <FiArrowLeft /> Back to Products
        </button>
      </div>
      <div className="form-tabs">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Info
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          Pricing & Inventory
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          Images
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'seo' ? 'active' : ''}`}
          onClick={() => setActiveTab('seo')}
        >
          SEO
        </button>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          {/* Basic Information */}
          {activeTab === 'basic' && (
            <div className="form-section">
              <div className="basic-info-grid">
                {/* Left Column */}
                <div className="info-left-col">
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

                  <div className="form-group">
                    <label>Product Form *</label>
                    <select
                      name="productForm"
                      value={formData.productForm}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="powder">Powder (Weight)</option>
                      <option value="liquid">Liquid (Volume)</option>
                      <option value="pack">Pack / Piece</option>
                    </select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="info-right-col">
                  <div className="form-group">
                    <label>Base Price (₹ per {formData.productForm === 'pack' ? 'piece' : '100g/ml'}) *</label>
                    <input
                      type="number"
                      name="basePrice"
                      value={formData.basePrice}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Short Description</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="description-textarea compact-textarea"
                      placeholder="Enter brief product description..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Inventory */}
          {activeTab === 'pricing' && (
            <div className="form-section">
              <div className="inventory-header">
                  <h3 className="form-section-title">Pricing & Inventory</h3>
                  <div className="total-stock-badge">
                      Total Stock: <span>{formData.generatedSizes.filter(s => s.enabled).reduce((sum, item) => sum + (parseInt(item.stock) || 0), 0)}</span>
                  </div>
              </div>
              
              {!formData.basePrice && (
                  <div className="no-base-price-warning">
                      Please set a Base Price in the <strong>Basic Info</strong> tab first.
                  </div>
              )}

              {/* Package Sizes Table */}
              {formData.basePrice && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label>Package Sizes & Pricing</label>
                    <button type="button" onClick={addCustomSize} className="btn-text">
                      + Add Custom Size
                    </button>
                  </div>
                  
                  <div className="pricing-table-container compact-table">
                    <table className="admin-table">
                      <thead className="sticky-header">
                        <tr>
                          <th style={{ width: '60px' }}>Enable</th>
                          <th>Size</th>
                          <th className="text-right">Auto (₹)</th>
                          <th className="text-right">Custom (₹)</th>
                          <th className="text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.generatedSizes.map((item, index) => (
                          <tr key={index} className={item.enabled ? 'row-enabled' : 'row-disabled'}>
                            <td style={{ textAlign: 'center' }}>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={item.enabled} 
                                        onChange={() => toggleSizeField(index)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </td>
                            <td>{item.size}</td>
                            <td className="text-right disabled-text">{item.autoPrice}</td>
                            <td className="text-right">
                              <input
                                type="number"
                                value={item.customPrice}
                                onChange={(e) => updateSizeField(index, 'customPrice', e.target.value)}
                                placeholder={item.autoPrice}
                                className="size-price-input compact-input"
                                disabled={!item.enabled}
                              />
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                value={item.stock}
                                onChange={(e) => updateSizeField(index, 'stock', e.target.value)}
                                placeholder="0"
                                className="size-price-input compact-input"
                                min="0"
                                disabled={!item.enabled}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="form-checkboxes compact-checkboxes">
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
          )}

          {activeTab === 'images' && (
            <div className="form-section">
              <h3 className="form-section-title">Product Images</h3>
              
              {/* Add New Images - Moved to Top */}
              <div className="form-group clean-upload-section">
                <ImageUpload
                  onImagesSelected={handleImagesSelected}
                  maxImages={5 - existingImages.length}
                  label="Upload Images"
                />
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="upload-progress-container">
                    {Object.entries(uploadProgress).map(([index, progress]) => (
                      <div key={index} className="upload-progress-item">
                        <span>Image {parseInt(index) + 1}</span>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span>{Math.round(progress)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Images - Grid Layout */}
              {existingImages.length > 0 && (
                <div className="form-group">
                  <label>Current Images ({existingImages.length})</label>
                  <div className="images-grid-3-col">
                    {existingImages.map((image, index) => (
                      <div key={index} className="image-card">
                        <img src={image.url || image} alt={`Product ${index + 1}`} />
                        <div className="image-overlay">
                            <button
                            type="button"
                            className="delete-image-btn"
                            onClick={() => handleRemoveExistingImage(index)}
                            title="Remove image"
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="form-section">
              <h3 className="form-section-title">Search Engine Optimization (SEO)</h3>
              
              <div className="form-group">
                <label htmlFor="metaTitle">Meta Title</label>
                <input
                  type="text"
                  id="metaTitle"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  placeholder="Enter meta title (max 60 chars)"
                  maxLength={60}
                />
                <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Recommended length: 50-60 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="metaDescription">Meta Description</label>
                <textarea
                  id="metaDescription"
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleInputChange}
                  rows="3"
                  className="description-textarea compact-textarea"
                  placeholder="Enter meta description (max 160 chars)"
                  maxLength={160}
                />
                <small style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Recommended length: 150-160 characters</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="metaKeywords">Keywords (comma separated)</label>
                <input
                  type="text"
                  id="metaKeywords"
                  name="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={handleInputChange}
                  placeholder="e.g. organic, turmeric, health, wellness"
                />
              </div>
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
