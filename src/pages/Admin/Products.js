import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { deleteMultipleImages, getPathFromURL } from '../../services/storageService';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPackage, FiX, FiStar } from 'react-icons/fi';
import '../Admin/Admin.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };


  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsCollection = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCollection);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId, productImages = []) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      // Delete product from Firestore
      await deleteDoc(doc(db, 'products', productId));

      // Delete associated images from Storage
      if (productImages && productImages.length > 0) {
        const imagePaths = productImages
          .map(img => getPathFromURL(img.url || img))
          .filter(path => path !== null);

        if (imagePaths.length > 0) {
          await deleteMultipleImages(imagePaths);
        }
      }

      // Update local state
      setProducts(products.filter(p => p.id !== productId));
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="admin-products">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Products</h1>
        <Link to="/admin/products/add" className="add-product-link">
          <FiPlus /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="filter-select"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <FiPackage size={64} />
          <h3>No products found</h3>
          <p>Start by adding your first product</p>
          <Link to="/admin/products/add" className="btn btn-primary">
            <FiPlus /> Add Product
          </Link>
        </div>
      ) : (
        <div className="products-grid-admin">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="product-card-admin"
              onClick={() => handleProductClick(product)}
              style={{ cursor: 'pointer' }}
            >
              <div className="product-image-admin">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0].url || product.images[0]}
                    alt={product.name}
                  />
                ) : (
                  <div className="no-image">
                    <FiPackage size={48} />
                  </div>
                )}
              </div>

              <div className="product-info-admin">
                <h3>{product.name}</h3>
                <p className="product-description-preview">
                  {product.description || 'No description available'}
                </p>
                <p className="product-category">{product.category}</p>
                <div className="product-price-group">
                  <span className="product-price">₹{product.price}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="product-discount" style={{ color: '#dc2626', fontSize: '12px', marginLeft: '8px', fontWeight: '600' }}>
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  )}
                </div>
                {product.stock !== undefined && (
                  <p className={`product-stock ${product.stock === 0 ? 'out-of-stock' : ''}`}>
                    {product.stock === 0 ? 'Out of Stock' : `Stock: ${product.stock}`}
                  </p>
                )}
              </div>

              <div className="product-actions" onClick={(e) => e.stopPropagation()}>
                <Link
                  to={`/admin/products/edit/${product.id}`}
                  className="btn-icon btn-edit"
                  title="Edit"
                >
                  <FiEdit2 />
                </Link>
                <button
                  onClick={() => handleDelete(product.id, product.images)}
                  className="btn-icon btn-delete"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}



      {
        selectedProduct && (
          <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
            <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="product-modal-header">
                <h2>Product Details</h2>
                <button className="product-modal-close" onClick={() => setSelectedProduct(null)}>
                  <FiX size={24} />
                </button>
              </div>
              <div className="product-modal-body">
                <div className="modal-product-image">
                  <img
                    src={selectedProduct.images?.[0]?.url || selectedProduct.images?.[0] || 'https://via.placeholder.com/300'}
                    alt={selectedProduct.name}
                  />
                </div>
                <div className="modal-product-details">
                  <div className="modal-product-meta">
                    <span className="modal-product-price">₹{selectedProduct.price}</span>
                    <span className="modal-product-category">{selectedProduct.category}</span>
                    <span className={`modal-product-stock ${selectedProduct.stock === 0 ? 'out-of-stock' : ''}`}>
                      {selectedProduct.stock === 0 ? 'Out of Stock' : `Stock: ${selectedProduct.stock}`}
                    </span>
                  </div>

                  <h2>{selectedProduct.name}</h2>

                  <div className="modal-product-description">
                    <h3>Description</h3>
                    <p>{selectedProduct.description || "No detailed description available for this product."}</p>
                  </div>

                  <div className="modal-product-reviews">
                    <h3>Customer Reviews</h3>
                    {/* Mock reviews for now as backend integration is pending */}
                    <div className="review-item">
                      <div className="review-header">
                        <span>Anjali S.</span>
                        <div className="review-stars">
                          <FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" />
                        </div>
                      </div>
                      <p className="review-text">Absolutely loved the quality of this product! Will definitely order again.</p>
                    </div>
                    <div className="review-item">
                      <div className="review-header">
                        <span>Rahul M.</span>
                        <div className="review-stars">
                          <FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" stroke="none" />
                        </div>
                      </div>
                      <p className="review-text">Good packaging and timely delivery. Matches the description perfectly.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Products;
