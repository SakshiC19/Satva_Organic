import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadMultipleImages } from '../../services/storageService';
import ImageUpload from '../../components/admin/ImageUpload';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { useCategories } from '../../contexts/CategoryContext';
import './EditProduct.css';

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    productType: 'organic', // organic/inorganic
    featured: false,
    codAvailable: false,
    refundPolicyAvailable: false,
    
    // Pricing & Inventory
    productForm: 'powder', // powder, liquid, pack
    basePrice: '', // Price per 100g/ml or per piece
    stock: '',
    unit: 'g', // Default unit
    
    // Advanced Pricing
    generatedSizes: [], // { size: '250g', autoPrice: 125, customPrice: '', enabled: true }
  });

  const { categories: contextCategories } = useCategories();
  const categories = contextCategories.map(cat => cat.name);

  // Auto-generate sizes when form/basePrice changes
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
      // Pack/Piece - no auto generation by default, user adds manually
      defaults = []; 
    }

    // Merge with existing if possible, or reset if form changed
    // For simplicity, we regenerate if the list is empty or form changed
    // But we want to preserve custom prices if sizes match.
    
    setFormData(prev => {
      const newSizes = defaults.map(def => {
        const autoPrice = (def.val / 100) * basePrice;
        // Check if this size already exists to preserve custom price
        const existing = prev.generatedSizes.find(s => s.size === def.size);
        return {
          size: def.size,
          autoPrice: Math.round(autoPrice),
          customPrice: existing ? existing.customPrice : '',
          enabled: existing ? existing.enabled : true
        };
      });
      
      // Keep custom added sizes that are not in defaults
      const customAdded = prev.generatedSizes.filter(s => !defaults.find(d => d.size === s.size));
      
      // Recalculate auto price for custom added sizes too
      const updatedCustomAdded = customAdded.map(s => {
        // Try to parse value from size string for auto-calc
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

      return {
        ...prev,
        generatedSizes: [...newSizes, ...updatedCustomAdded]
      };
    });

  }, [formData.basePrice, formData.productForm]);

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



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.basePrice || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedImages.length === 0) {
      alert('Please upload at least one product image');
      return;
    }

    try {
      setLoading(true);

      const uploadedImages = await uploadMultipleImages(
        selectedImages,
        'products',
        (index, progress) => {
          setUploadProgress(prev => ({ ...prev, [index]: progress }));
        }
      );

      // Construct final data
      // Map generatedSizes to packingSizes string and sizePrices object
      const activeSizes = formData.generatedSizes.filter(s => s.enabled);
      
      // Create a map of size -> price (use custom if set, else auto)
      const sizePrices = {};
      
      activeSizes.forEach(s => {
        if (s.customPrice) {
          sizePrices[s.size] = parseFloat(s.customPrice);
          // Calculate discount percentage for display if needed
          // discount = ((auto - custom) / auto) * 100
        }
      });

      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory || null,
        productType: formData.productType,
        featured: formData.featured,
        codAvailable: formData.codAvailable,
        refundPolicyAvailable: formData.refundPolicyAvailable,
        
        // Pricing
        price: parseFloat(formData.basePrice), // Base price per 100g/ml
        unit: formData.productForm === 'liquid' ? 'ml' : (formData.productForm === 'powder' ? 'g' : 'piece'),
        productForm: formData.productForm,
        stock: parseInt(formData.stock) || 0,
        
        packingSizes: activeSizes.map(s => s.size), // Array of strings
        sizePrices: sizePrices, // Explicit overrides
        
        // Slabs - Removed
        slabPricing: [],
        
        // Discounts - Removed (Default 0)
        discount: 0,
        
        // Deals - Removed
        deal: null,

        images: uploadedImages.map(img => ({ url: img.url, path: img.path })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

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
        <div className="header-title-section">
          <h1 className="admin-page-title">Add New Product</h1>
          <p className="header-subtitle">Create a new product with details, pricing and images</p>
        </div>
        <button onClick={() => navigate('/admin/products')} className="btn btn-secondary">
          <FiArrowLeft /> Back to Products
        </button>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          {/* Basic Information & Images */}
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
                className="form-select"
              >
                <option value="powder">Powder (Weight)</option>
                <option value="liquid">Liquid (Volume)</option>
                <option value="pack">Pack / Piece</option>
              </select>
            </div>



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

            {/* Image Upload Moved Here */}
            <div className="form-group" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
              <h3 className="form-section-title" style={{ fontSize: '1.1rem', borderBottom: 'none', marginBottom: '15px', paddingBottom: 0 }}>Product Images *</h3>
              <ImageUpload
                onImagesSelected={handleImagesSelected}
                maxImages={5}
                label="Upload Product Images"
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



            {/* Step 2: Base Price */}
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

            {/* Step 3: Package Sizes Table */}
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
                              className="size-price-input"
                            />
                          </td>
                        </tr>
                      ))}
                      {formData.generatedSizes.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: '#999' }}>No sizes generated. Add custom size or check Base Price.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}






          </div>


        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/admin/products')} className="btn btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner-small"></div> Uploading...</> : <><FiSave /> Save Product</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
