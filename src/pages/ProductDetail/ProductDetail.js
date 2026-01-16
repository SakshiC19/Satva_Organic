import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, increment, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiHeart, FiMinus, FiPlus, FiCheck, FiStar, FiChevronLeft, FiX } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import Recommendations from '../../components/product/Recommendations';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  
  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [fetchingReviews, setFetchingReviews] = useState(false);
  
  // Pincode state
  const [pincode, setPincode] = useState('');
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState(null); // null, 'available', 'unavailable'
  const [pincodeError, setPincodeError] = useState('');

  const fetchProduct = async () => {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const productData = { id: docSnap.id, ...data };
        setProduct(productData);
        
        // Track recently viewed
        const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        const updatedRecentlyViewed = [id, ...recentlyViewed.filter(itemId => itemId !== id)].slice(0, 10);
        localStorage.setItem('recentlyViewed', JSON.stringify(updatedRecentlyViewed));
        
        // Track last visited category
        if (productData.category) {
          localStorage.setItem('lastVisitedCategory', productData.category);
        }

        if (productData.brands && productData.brands.length > 0) {
          setSelectedBrand(productData.brands[0]);
        }
        if (productData.packingSizes && productData.packingSizes.length > 0) {
          setSelectedSize(productData.packingSizes[0]);
        } else if (productData.weight) {
          setSelectedSize(productData.weight);
        }
      } else {
        navigate('/shop');
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setFetchingReviews(true);
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', id),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const reviewsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setFetchingReviews(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 999)) {
      setQuantity(newQuantity);
    }
  };

  const calculateDynamicPrice = (prod, size) => {
    if (!size || !prod) return prod?.price || 0;
    
    // Check for explicit price override first
    if (prod.sizePrices && prod.sizePrices[size]) {
      return parseFloat(prod.sizePrices[size]);
    }

    // Fallback to auto-calculation based on base price
    const match = size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    if (!match) return prod.price;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    let multiplier = 1;
    
    // Base unit is 100g or 100ml
    if (unit === 'g' || unit === 'gm' || unit === 'ml') {
      multiplier = value / 100;
    } else if (unit === 'kg' || unit === 'l' || unit === 'liter') {
      multiplier = (value * 1000) / 100;
    } else if (unit === 'pc' || unit === 'pcs' || unit === 'pack') {
       multiplier = value; 
    } else {
      return prod.price;
    }

    let finalPrice = prod.price * multiplier;

    if (prod.sizeDiscounts && prod.sizeDiscounts[size]) {
      const discount = parseFloat(prod.sizeDiscounts[size]);
      if (!isNaN(discount) && discount > 0) {
        finalPrice = finalPrice * (1 - discount / 100);
      }
    }

    return Math.round(finalPrice);
  };

  const currentPrice = product ? calculateDynamicPrice(product, selectedSize) : 0;

  const { addToCart, openCart, cartItems } = useCart();

  const isInCart = cartItems.some(item => 
    item.id === product?.id && item.selectedSize === selectedSize
  );

  const handleAddToCart = () => {
    if (!product) return;
    
    if (isInCart) {
      openCart();
      return;
    }
    
    addToCart({
      ...product,
      price: currentPrice,
      selectedBrand,
      selectedSize,
      quantity,
      basePrice: product.price
    });
    if (window.innerWidth > 768) {
      openCart();
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const handlePincodeCheck = async () => {
    if (!pincode || pincode.length !== 6) {
      setPincodeError('Please enter a valid 6-digit pincode');
      return;
    }

    setIsCheckingPincode(true);
    setPincodeError('');
    
    try {
      // Mock API call - in a real app, this would check against a database or shipping API
      // For now, let's assume pincodes starting with '4' are available (common in Maharashtra)
      // and others are checked against a mock list or just allowed for demo purposes
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (product.availablePincodes && product.availablePincodes.length > 0) {
        if (product.availablePincodes.includes(pincode)) {
          setPincodeStatus('available');
        } else {
          setPincodeStatus('unavailable');
        }
      } else {
        // Default logic if no specific pincodes are defined for the product
        if (pincode.startsWith('4') || pincode.startsWith('1')) {
          setPincodeStatus('available');
        } else {
          setPincodeStatus('unavailable');
        }
      }
    } catch (error) {
      console.error("Error checking pincode:", error);
      setPincodeError('Failed to check pincode. Please try again.');
    } finally {
      setIsCheckingPincode(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login to submit a review");
      navigate('/login');
      return;
    }

    if (!reviewComment.trim()) {
      alert("Please enter a comment");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewData = {
        productId: id,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        rating: reviewRating,
        comment: reviewComment,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, {
        reviewCount: increment(1)
      });

      setReviewComment('');
      setReviewRating(5);
      fetchReviews();
      alert("Review submitted successfully!");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
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
        <nav className="breadcrumb">
          <Link to="/">HOME</Link>
          <span className="separator">›</span>
          <Link to="/shop">{product.category?.toUpperCase() || 'PRODUCTS'}</Link>
          <span className="separator">›</span>
          <span className="current">{product.name?.toUpperCase()}</span>
        </nav>

        <div className="product-detail-main">
          <div className="product-images">
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
            <div className="main-image">
              <img src={currentImage} alt={product.name} />
            </div>
          </div>

          <div className="product-info">
            <div className="product-category-label">{product.category}</div>
            <h1 className="product-title">{product.name}</h1>

            <div className="product-meta">
              {product.brands && product.brands.length > 0 && (
                <div className="meta-item">
                  <span className="meta-label">Brands:</span>
                  <span className="meta-value">{product.brands.join(', ')}</span>
                </div>
              )}

              <div className="meta-item">
                <span className="rating-stars">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < Math.floor(product.rating || 4) ? 'star filled' : 'star'}>★</span>
                  ))}
                </span>
                <span className="rating-value" style={{ marginLeft: '8px', fontWeight: '600', color: '#4b5563' }}>
                  {product.rating ? product.rating.toFixed(1) : '4.0'}
                </span>
              </div>
            </div>

            <div className="product-price-group">
              <div className="product-price">
                <span className="current-price">₹{currentPrice}</span>
                <span className="unit-price-label" style={{ fontSize: '14px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                   (₹{product.price} / 100{product.unit === 'ml' || product.unit === 'l' ? 'ml' : 'g'})
                </span>
                
                {product.sizeDiscounts && product.sizeDiscounts[selectedSize] && (
                   <span className="discount-badge" style={{ color: '#dc2626', marginLeft: '10px', fontWeight: '600', fontSize: '14px' }}>
                      {product.sizeDiscounts[selectedSize]}% OFF
                   </span>
                )}
                
                {(() => {
                  const discVal = typeof product.discount === 'object' ? product.discount?.value : product.discount;
                  if (discVal > 0 && !product.sizeDiscounts?.[selectedSize]) {
                    return (
                      <span className="discount-badge" style={{ color: '#dc2626', marginLeft: '10px', fontWeight: '600', fontSize: '14px' }}>
                        {discVal}% OFF
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {product.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
            </div>

            <div className="product-features" style={{ marginTop: '8px', marginBottom: '16px', borderTop: 'none', paddingTop: 0 }}>

              <div className="feature-item">
                <FiCheck className={`feature-icon ${product.codAvailable !== false ? 'success' : 'error'}`} />
                <span>Cash on Delivery: {product.codAvailable !== false ? 'Available' : 'Not Available'}</span>
              </div>
              <div className="feature-item">
                <FiCheck className={`feature-icon ${product.refundPolicyAvailable ? 'success' : 'error'}`} />
                <span>Refund Policy: {product.refundPolicyAvailable ? 'Available' : 'Not Available'}</span>
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

            <div className="pincode-check-section">
              <label className="option-label">Check Delivery Availability</label>
              <div className="pincode-input-group">
                <input 
                  type="text" 
                  placeholder="Enter Pincode" 
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPincode(val);
                    if (pincodeStatus) setPincodeStatus(null);
                  }}
                  className={`pincode-input ${pincodeStatus}`}
                />
                <button 
                  className="btn-check-pincode"
                  onClick={handlePincodeCheck}
                  disabled={isCheckingPincode || pincode.length !== 6}
                >
                  {isCheckingPincode ? 'Checking...' : 'Check'}
                </button>
              </div>
              {pincodeError && <p className="pincode-error">{pincodeError}</p>}
              {pincodeStatus === 'available' && (
                <p className="pincode-success">
                  <FiCheck /> Delivery available to {pincode}
                </p>
              )}
              {pincodeStatus === 'unavailable' && (
                <p className="pincode-error">
                  <FiX /> Sorry, delivery not available for this product in your area.
                </p>
              )}
            </div>



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

            {(product.packingSizes && product.packingSizes.length > 0) || product.weight ? (
              <div className="product-option amount-option-container">
                <div className="amount-selection">
                  <label className="option-label">Weight</label>
                  <div className="option-buttons">
                    {(product.packingSizes && product.packingSizes.length > 0 
                      ? product.packingSizes 
                      : (product.weight ? [product.weight] : [])
                    ).map((size, index) => (
                      <button
                        key={index}
                        className={`option-btn ${selectedSize === size ? 'active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                        disabled={pincodeStatus !== 'available'}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="quantity-wishlist-group">
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
                </div>
              </div>
            ) : (
              <div className="product-option amount-option-container">
                 <div className="amount-selection">
                    <label className="option-label">Quantity</label>
                 </div>
                 <div className="quantity-wishlist-group">
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
                </div>
              </div>
            )}

            <div className="product-actions">
              <button 
                className={`btn-add-to-cart ${isInCart ? 'in-cart' : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock <= 0 || pincodeStatus !== 'available'}
              >
                {isInCart ? 'View Basket' : 'Add to Basket'}
              </button>
              <button 
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={product.stock <= 0 || pincodeStatus !== 'available'}
                style={{
                  flex: 1,
                  backgroundColor: pincodeStatus === 'available' ? '#f59e0b' : '#cbd5e1',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: pincodeStatus === 'available' ? 'pointer' : 'not-allowed',
                  marginLeft: '10px'
                }}
              >
                Buy Now
              </button>
              <button className="secondary-btn wishlist-inline-btn mobile-action-wishlist" title="Add to Wishlist">
                <FiHeart />
              </button>
            </div>
          </div>
        </div>

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
                <div className="review-form-container">
                  <h4>Write a Review</h4>
                  <form className="review-form" onSubmit={handleSubmitReview}>
                    <div className="form-group">
                      <label>Your Rating</label>
                      <div className="rating-input">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            className={`star-input ${reviewRating >= star ? 'active' : ''}`}
                            onClick={() => setReviewRating(star)}
                          >
                            <FiStar fill={reviewRating >= star ? "currentColor" : "none"} />
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Your Review</label>
                      <textarea 
                        placeholder="Write your review here..." 
                        rows="4"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <button 
                      type="submit" 
                      className="btn-submit-review"
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                </div>
                
                <div className="reviews-list">
                  {fetchingReviews ? (
                    <p>Loading reviews...</p>
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div key={review.id} className="review-card">
                        <div className="review-header">
                          <span className="review-user">{review.userName}</span>
                          <div className="review-rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FiStar 
                                key={star} 
                                fill={review.rating >= star ? "#f59e0b" : "none"} 
                                color={review.rating >= star ? "#f59e0b" : "#ccc"}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="review-comment">{review.comment}</p>
                        <span className="review-date">
                          {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p>No reviews yet. Be the first to review this product!</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <Recommendations 
          title="Similar Products" 
          category={product.category} 
          currentProductId={product.id} 
        />
      </div>
    </div>
  );
};

export default ProductDetail;
