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
  const [existingSizeConfig, setExistingSizeConfig] = useState(null);

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
        });
        
        // Store existing size config to merge after auto-generation
        setExistingSizeConfig({
            packingSizes: data.packingSizes || [],
            sizePrices: data.sizePrices || {}
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
              const customPrice = existingSizeConfig.sizePrices[s.size] || '';
              return { ...s, enabled: isEnabled, customPrice };
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
                     customPrice: existingSizeConfig.sizePrices[size] || '',
                     enabled: true
                 };
            });
            
          currentSizes = [...mergedDefaults, ...savedCustomSizes];
          // Clear config so we don't re-merge
          setExistingSizeConfig(null);
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

  }, [formData.basePrice, formData.productForm, existingSizeConfig]);

  const addCustomSize = () => {
    const size = prompt("Enter custom size (e.g., 750g):");
    if (!size) return;
    
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
        { size, autoPrice, customPrice: '', enabled: true }
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
        stock: parseInt(formData.stock) || 0,
        unit: formData.productForm === 'liquid' ? 'ml' : (formData.productForm === 'powder' ? 'g' : 'piece'),
        productForm: formData.productForm,
        packingSizes: activeSizes.map(s => s.size),
        sizePrices: sizePrices,
        productType: formData.productType,
        organic: formData.productType === 'organic',
        codAvailable: formData.codAvailable,
        refundPolicyAvailable: formData.refundPolicyAvailable,
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

            <div className="form-group">
              <label>Product Form *</label>
              <select
                name="productForm"
                value={formData.productForm}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="powder">Powder (Weight)</option>
                <option value="liquid">Liquid (Volume)</option>
                <option value="pack">Pack / Piece</option>
              </select>
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

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="form-group" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <h3 className="form-section-title" style={{ fontSize: '1.1rem', borderBottom: 'none', marginBottom: '15px', paddingBottom: 0 }}>Current Images</h3>
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
            <div className="form-group" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
              <h3 className="form-section-title" style={{ fontSize: '1.1rem', borderBottom: 'none', marginBottom: '15px', paddingBottom: 0 }}>Add New Images</h3>
              <ImageUpload
                onImagesSelected={handleImagesSelected}
                maxImages={5 - existingImages.length}
                label="Upload Additional Images"
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
          </div>

          {/* Pricing & Inventory */}
          <div className="form-section">
            <h3 className="form-section-title">Pricing & Inventory</h3>

            <div className="form-row">
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
                <label>Total Stock Quantity</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Package Sizes Table */}
            {formData.basePrice && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label>Package Sizes & Pricing</label>
                  <button type="button" onClick={addCustomSize} className="btn-text" style={{ fontSize: '13px', color: '#2563eb' }}>
                    + Add Custom Size
                  </button>
                </div>
                
                <div className="pricing-table-container" style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Enable</th>
                        <th>Size</th>
                        <th>Auto Price (₹)</th>
                        <th>Custom Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.generatedSizes.map((item, index) => (
                        <tr key={index}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) => updateSizeField(index, 'enabled', e.target.checked)}
                            />
                          </td>
                          <td>{item.size}</td>
                          <td style={{ color: '#6b7280' }}>{item.autoPrice}</td>
                          <td>
                            <input
                              type="number"
                              value={item.customPrice}
                              onChange={(e) => updateSizeField(index, 'customPrice', e.target.value)}
                              placeholder=""
                              style={{ width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="form-checkboxes">
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
