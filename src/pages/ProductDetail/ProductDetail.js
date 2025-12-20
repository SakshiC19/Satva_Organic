import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiHeart, FiMinus, FiPlus, FiCheck } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import './ProductDetail.css';


const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productDoc = await getDoc(doc(db, 'products', id));
        if (productDoc.exists()) {
          const productData = { id: productDoc.id, ...productDoc.data() };
          setProduct(productData);
          
          // Set default selections
          if (productData.brands && productData.brands.length > 0) {
            setSelectedBrand(productData.brands[0]);
          }
          if (productData.packingSizes && productData.packingSizes.length > 0) {
            setSelectedSize(productData.packingSizes[0]);
          }
        } else {
          console.error('Product not found');
          navigate('/shop');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 999)) {
      setQuantity(newQuantity);
    }
  };

  const { addToCart, openCart } = useCart();

  // ... (existing code)

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart({
      ...product,
      selectedBrand,
      selectedSize,
      quantity
    });
    openCart();
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="product-detail-loading">
        <div className="spinner"></div>
        <p>Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-error">
        <h2>Product not found</h2>
        <Link to="/shop" className="btn btn-primary">Back to Shop</Link>
      </div>
    );
  }

  const productImages = product.images || [{ url: product.image }];
  const currentImage = productImages[selectedImage]?.url || productImages[selectedImage] || product.image;

  return (
    <div className="product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">HOME</Link>
          <span className="separator">›</span>
          <Link to="/shop">{product.category?.toUpperCase() || 'PRODUCTS'}</Link>
          <span className="separator">›</span>
          <span className="current">{product.name?.toUpperCase()}</span>
        </nav>

        {/* Product Main Section */}
        <div className="product-detail-main">
          {/* Left: Product Images */}
          <div className="product-images">
            <div className="main-image">
              <img src={currentImage} alt={product.name} />
            </div>
            {productImages.length > 1 && (
              <div className="image-thumbnails">
                {productImages.map((img, index) => (
                  <div
                    key={index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={img.url || img} alt={`${product.name} ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>

            {/* Meta Info */}
            <div className="product-meta">
              {product.brands && product.brands.length > 0 && (
                <div className="meta-item">
                  <span className="meta-label">Brands:</span>
                  <span className="meta-value">{product.brands.join(', ')}</span>
                </div>
              )}
              {product.packingSizes && product.packingSizes.length > 0 && (
                <div className="meta-item">
                  <span className="meta-label">Amount:</span>
                  <span className="meta-value">{product.packingSizes.join(', ')}</span>
                </div>
              )}
              <div className="meta-item">
                <span className="meta-label">SKU:</span>
                <span className="meta-value">{product.sku || 'N/A'}</span>
              </div>
              <div className="meta-item">
                <span className="rating-stars">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < (product.rating || 4) ? 'star filled' : 'star'}>★</span>
                  ))}
                </span>
                <span className="review-count">{product.reviewCount || 1} REVIEW</span>
              </div>
            </div>

            {/* Price */}
            <div className="product-price">
              <span className="current-price">${product.price}</span>
              {product.originalPrice && (
                <span className="original-price">${product.originalPrice}</span>
              )}
            </div>

            {/* Stock Status */}
            <div className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {product.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
            </div>

            {/* Description */}
            <p className="product-description">{product.description}</p>

            {/* Brand Selection */}
            {product.brands && product.brands.length > 0 && (
              <div className="product-option">
                <label className="option-label">Brands</label>
                <div className="option-buttons">
                  {product.brands.map((brand, index) => (
                    <button
                      key={index}
                      className={`option-btn ${selectedBrand === brand ? 'active' : ''}`}
                      onClick={() => setSelectedBrand(brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size/Amount Selection */}
            {product.packingSizes && product.packingSizes.length > 0 && (
              <div className="product-option">
                <label className="option-label">Amount</label>
                <div className="option-buttons">
                  {product.packingSizes.map((size, index) => (
                    <button
                      key={index}
                      className={`option-btn ${selectedSize === size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="product-actions">
              <div className="quantity-selector">
                <button 
                  className="qty-btn" 
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <FiMinus />
                </button>
                <input 
                  type="number" 
                  value={quantity} 
                  readOnly 
                  className="qty-input"
                />
                <button 
                  className="qty-btn" 
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= (product.stock || 999)}
                >
                  <FiPlus />
                </button>
              </div>

              <button 
                className="btn-add-to-cart"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                Add to cart
              </button>
              <button 
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
              >
                Buy Now
              </button>
            </div>

            {/* Wishlist & Compare */}
            <div className="secondary-actions">
              <button className="secondary-btn">
                <FiHeart /> ADD TO WISHLIST
              </button>
            </div>

            {/* Product Features */}
            <div className="product-features">
              <div className="feature-item">
                <FiCheck className="feature-icon" />
                <span>Type: {product.productType || 'Organic'}</span>
              </div>
              {product.mfgDate && (
                <div className="feature-item">
                  <FiCheck className="feature-icon" />
                  <span>MFG: {product.mfgDate}</span>
                </div>
              )}
              {product.shelfLife && (
                <div className="feature-item">
                  <FiCheck className="feature-icon" />
                  <span>LIFE: {product.shelfLife}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Tabs */}
        <div className="product-tabs">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button
              className={`tab-btn ${activeTab === 'additional' ? 'active' : ''}`}
              onClick={() => setActiveTab('additional')}
            >
              Additional Information
            </button>
            <button
              className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({product.reviewCount || 0})
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === 'description' && (
              <div className="tab-pane">
                <h3>Product Description</h3>
                <p>{product.description || 'No description available.'}</p>
                {product.longDescription && <p>{product.longDescription}</p>}
              </div>
            )}

            {activeTab === 'additional' && (
              <div className="tab-pane">
                <h3>Additional Information</h3>
                <table className="info-table">
                  <tbody>
                    <tr>
                      <th>Weight</th>
                      <td>{product.weight || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Dimensions</th>
                      <td>{product.dimensions || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Category</th>
                      <td>{product.category || 'N/A'}</td>
                    </tr>
                    {product.subcategory && (
                      <tr>
                        <th>Subcategory</th>
                        <td>{product.subcategory}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="tab-pane">
                <h3>Customer Reviews</h3>
                {/* Review Form */}
                <div className="review-form-container">
                  <h4>Write a Review</h4>
                  <form className="review-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="form-group">
                      <label>Your Rating</label>
                      <div className="rating-input">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="star-input">★</span>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Your Review</label>
                      <textarea placeholder="Write your review here..." rows="4"></textarea>
                    </div>
                    <button type="submit" className="btn-submit-review">Submit Review</button>
                  </form>
                </div>
                
                <div className="reviews-list">
                  <p>No reviews yet. Be the first to review this product!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
