import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { deleteMultipleImages, getPathFromURL } from '../../services/storageService';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPackage, FiX, FiStar, FiEye } from 'react-icons/fi';
import { useCategories } from '../../contexts/CategoryContext';
import './Products.css';

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState(initialCategory);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { categories: contextCategories } = useCategories();

  useEffect(() => {
    fetchProducts();
  }, []);

  // Update filterCategory if searchParams change
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setFilterCategory(cat);
    }
  }, [searchParams]);

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
      await deleteDoc(doc(db, 'products', productId));

      if (productImages && productImages.length > 0) {
        const imagePaths = productImages
          .map(img => getPathFromURL(img.url || img))
          .filter(path => path !== null);

        if (imagePaths.length > 0) {
          await deleteMultipleImages(imagePaths);
        }
      }

      setProducts(products.filter(p => p.id !== productId));
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...contextCategories.map(cat => cat.name)];

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

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <FiPackage size={64} />
          <h3>No products found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr 
                  key={product.id} 
                  onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                  className="product-row-clickable"
                >
                  <td>
                    <div className="product-cell">
                      <img 
                        src={product.images?.[0]?.url || product.images?.[0] || 'https://via.placeholder.com/50'} 
                        alt={product.name} 
                        className="product-table-img"
                      />
                      <div className="product-name-cell">
                        <span className="product-name-text">{product.name}</span>
                        <span className="product-id-text">ID: {product.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">{product.category}</span>
                  </td>
                  <td>
                    <div className="price-group">
                      <span className="price-text">₹{product.price}</span>
                      {product.originalPrice > product.price && (
                        <div className="discount-tag">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`stock-badge ${
                      product.stock === 0 ? 'out-of-stock' : 
                      product.stock < 10 ? 'low-stock' : 'in-stock'
                    }`}>
                      {product.stock === 0 ? 'Out of Stock' : `${product.stock} in stock`}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button 
                        className="action-btn-circle" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                        title="View Details"
                      >
                        <FiEye />
                      </button>
                      <Link 
                        to={`/admin/products/edit/${product.id}`} 
                        className="action-btn-circle"
                        title="Edit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FiEdit2 />
                      </Link>
                      <button 
                        className="action-btn-circle delete" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(product.id, product.images);
                        }}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedProduct && (
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
                  <div className="review-item">
                    <div className="review-header">
                      <span>Anjali S.</span>
                      <div className="review-stars">
                        <FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" /><FiStar fill="#fbbf24" />
                      </div>
                    </div>
                    <p className="review-text">Absolutely loved the quality of this product! Will definitely order again.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
