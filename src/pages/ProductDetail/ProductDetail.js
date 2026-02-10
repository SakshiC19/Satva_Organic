import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, increment, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiHeart, FiMinus, FiPlus, FiCheck, FiStar, FiX, FiTruck, FiRefreshCw, FiPackage } from 'react-icons/fi';
import { BsTruck, BsArrowRepeat, BsShieldCheck, BsClockHistory, BsSearch, BsTree, BsFileText, BsArrowRight } from 'react-icons/bs';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import Recommendations from '../../components/product/Recommendations';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { cartItems, addToCart, openCart } = useCart();
  const { wishlistItems, toggleWishlist, isInWishlist } = useWishlist();
  
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
  const pincodeRef = useRef(null);
  const [userAddressPincode, setUserAddressPincode] = useState('');
  
  // Fixed bottom footer state for mobile
  const [showFixedFooter, setShowFixedFooter] = useState(true);
  const productActionsRef = useRef(null);
  const policyCardRef = useRef(null);

  const isInCart = cartItems.some(item => 
    item.id === product?.id && item.selectedSize === selectedSize
  );
  
  const isItemInWishlist = isInWishlist(product?.id);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Autofill pincode from user profile
  useEffect(() => {
    const autofillPincode = async () => {
      // Only check pincode automatically if it's an exotic vegetable
      const isExoticVegetable = product?.category?.toLowerCase().includes('exotic') || 
                               product?.category?.toLowerCase().includes('vegetable basket');
      
      if (currentUser && isExoticVegetable) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.addresses && userData.addresses.length > 0) {
              const profilePincode = userData.addresses[0].pincode;
              if (profilePincode && profilePincode.length === 6) {
                setPincode(profilePincode);
                setUserAddressPincode(profilePincode);
                // Trigger check automatically
                setTimeout(() => {
                  handlePincodeCheckInternal(profilePincode);
                }, 100);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user address for autofill:", error);
        }
      }
    };
    autofillPincode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, product?.id, product?.category]);

  // Scroll tracking for fixed footer visibility
  useEffect(() => {
    const handleScroll = () => {
      if (productActionsRef.current) {
        const rect = productActionsRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Check if the product actions section is visible in viewport
        // Hide fixed footer when actions are visible, show when they're not
        if (rect.top >= 0 && rect.bottom <= windowHeight) {
          setShowFixedFooter(false);
        } else {
          setShowFixedFooter(true);
        }
      }
    };

    // Only add scroll listener on mobile
    if (window.innerWidth <= 768) {
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [product]);

  const handlePincodeCheckInternal = async (code) => {
    if (!code || code.length !== 6) return;
    setIsCheckingPincode(true);
    setPincodeStatus(null);
    setPincodeError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      let available = false;
      if (product.availablePincodes && product.availablePincodes.length > 0) {
        available = product.availablePincodes.includes(code);
      } else {
        available = code.startsWith('4') || code.startsWith('1');
      }
      setPincodeStatus(available ? 'available' : 'unavailable');
    } catch (error) {
      console.error("Error checking pincode:", error);
    } finally {
      setIsCheckingPincode(false);
    }
  };

  const handleWishlistToggle = (e) => {
    e.stopPropagation();
    if (product) {
      toggleWishlist(product);
    }
  };

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

  const handleAddToCart = () => {
    if (!product) return;

    const isExoticVegetable = product.category?.toLowerCase().includes('exotic') || 
                             product.category?.toLowerCase().includes('vegetable basket');

    if (isExoticVegetable) {
      if (!currentUser) {
        pincodeRef.current?.scrollIntoView({ behavior: 'smooth' });
        pincodeRef.current?.focus();
        return;
      }

      if (pincodeStatus !== 'available') {
        pincodeRef.current?.scrollIntoView({ behavior: 'smooth' });
        pincodeRef.current?.focus();
        return;
      }
    }
    
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
  };

  const handleBuyNow = () => {
    if (!product) return;

    const isExoticVegetable = product.category?.toLowerCase().includes('exotic') || 
                             product.category?.toLowerCase().includes('vegetable basket');

    if (isExoticVegetable) {
      if (!currentUser) {
        pincodeRef.current?.scrollIntoView({ behavior: 'smooth' });
        pincodeRef.current?.focus();
        return;
      }

      if (pincodeStatus !== 'available') {
        pincodeRef.current?.scrollIntoView({ behavior: 'smooth' });
        pincodeRef.current?.focus();
        return;
      }
    }

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
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (product.availablePincodes && product.availablePincodes.length > 0) {
        if (product.availablePincodes.includes(pincode)) {
          setPincodeStatus('available');
        } else {
          setPincodeStatus('unavailable');
        }
      } else {
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
                <span className="stock-status-inline" style={{ marginLeft: '12px' }}>
                  {product.stock > 0 ? (
                    product.stock <= 5 ? (
                      <span className="low-stock">🔴 Only {product.stock} left</span>
                    ) : (
                      <span className="in-stock">🟢 In Stock</span>
                    )
                  ) : (
                    <span className="out-of-stock">🔴 Out of Stock</span>
                  )}
                </span>
              </div>
            </div>

            <div className="product-price-group">
              <div className="product-price">
                <span className="current-price">₹{currentPrice}</span>
                <span className="unit-price-label">
                   (₹{product.price} / 100{product.unit === 'ml' || product.unit === 'l' ? 'ml' : 'g'})
                </span>
                
                {product.sizeDiscounts && product.sizeDiscounts[selectedSize] && (
                   <span className="discount-badge">
                      {product.sizeDiscounts[selectedSize]}% OFF
                   </span>
                )}
                
                {(() => {
                  const discVal = typeof product.discount === 'object' ? product.discount?.value : product.discount;
                  if (discVal > 0 && !product.sizeDiscounts?.[selectedSize]) {
                    return (
                      <span className="discount-badge">
                        {discVal}% OFF
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="tax-info">Inclusive of all taxes</div>
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

            <div className="product-actions" ref={productActionsRef}>
              <button 
                className={`btn-add-to-cart ${isInCart ? 'in-cart' : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                {isInCart ? 'View Basket' : 'Add to Basket'}
              </button>
              <button 
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
              >
                Buy Now
              </button>
              <button 
                className={`secondary-btn wishlist-inline-btn mobile-action-wishlist ${isItemInWishlist ? 'active' : ''}`} 
                onClick={handleWishlistToggle}
                title={isItemInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <FiHeart className={isItemInWishlist ? 'filled' : ''} />
              </button>
            </div>

            {/* Replacement Policy Card - Mobile Only */}
            <div className="mobile-replacement-policy-card" ref={policyCardRef}>
              <div className="policy-header">
                <BsShieldCheck className="policy-icon" />
                <h4>Easy Replacement Policy</h4>
              </div>
              <ul className="policy-list-minimal">
                <li><BsClockHistory className="li-icon" /> Report damaged/spoiled items within 48 hours</li>
                <li><BsSearch className="li-icon" /> Replacement after verification</li>
                <li><BsTree className="li-icon" /> No return for natural taste/texture variations</li>
              </ul>
              <Link to="/refund-policy" className="mobile-full-policy-link-row">
                <span className="link-content">
                  <BsFileText className="file-icon" /> Read full refund & replacement policy
                </span>
                <BsArrowRight className="arrow-icon" />
              </Link>
            </div>
            
            <p className="mobile-policy-disclaimer">
              Applicable only for damaged or spoiled products. Natural variations are not eligible for return.
            </p>

            <div className="trust-signals">
              <div className="trust-signal-item">
                <div className="trust-signal-icon"><BsTruck /></div>
                <div className="trust-signal-content">
                  <span className="trust-signal-title">Free Shipping above ₹499</span>
                </div>
              </div>
              <div 
                className="trust-signal-item tappable-mobile" 
                onClick={() => {
                  if (window.innerWidth <= 768 && policyCardRef.current) {
                    policyCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                <div className="trust-signal-icon"><BsArrowRepeat /></div>
                <div className="trust-signal-content">
                  <span className="trust-signal-title">Easy Replacement*</span>
                </div>
              </div>
              {product.codAvailable !== false && !product.category?.toLowerCase().includes('vegetable basket') && (
                <div className="trust-signal-item">
                  <div className="trust-signal-icon"><FiPackage /></div>
                  <div className="trust-signal-content">
                    <span className="trust-signal-title">Cash on Delivery</span>
                  </div>
                </div>
              )}
              {!product.category?.toLowerCase().includes('vegetable basket') && (
                <div className="trust-signal-item">
                  <div className="trust-signal-icon"><FiCheck /></div>
                  <div className="trust-signal-content">
                    <span className="trust-signal-title">No Preservatives</span>
                  </div>
                </div>
              )}
            </div>

            {(product.category?.toLowerCase().includes('exotic') || 
              product.category?.toLowerCase().includes('vegetable basket')) && (
              <div className="pincode-check-section">
                <label className="option-label">Check Delivery Availability</label>
                <div className="pincode-input-group">
                  <input 
                    type="text" 
                    placeholder="Enter Pincode" 
                    value={pincode}
                    ref={pincodeRef}
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
                    <FiX /> This product is currently not available in your location
                  </p>
                )}
              </div>
            )}
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
            <button
              className={`tab-btn desktop-only-tab ${activeTab === 'shipping' ? 'active' : ''}`}
              onClick={() => setActiveTab('shipping')}
            >
              <BsTruck className="tab-icon" /> Shipping
            </button>
            <button
              className={`tab-btn desktop-only-tab ${activeTab === 'refund' ? 'active' : ''}`}
              onClick={() => setActiveTab('refund')}
            >
              <BsArrowRepeat className="tab-icon" /> Refund
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === 'description' && (
              <div className="tab-pane description-pane">
                <div className="description-section">
                  <h4 className="section-title">🌿 Product Overview</h4>
                  <p>{product.description || 'No description available.'}</p>
                </div>
                
                {product.benefits && product.benefits.length > 0 && (
                  <div className="description-section">
                    <h4 className="section-title">✅ Key Benefits</h4>
                    <ul className="benefits-list">
                      {product.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {product.longDescription && (
                  <div className="description-section">
                    <p>{product.longDescription}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'additional' && (
              <div className="tab-pane">
                <h3 className="section-title">Technical Specifications</h3>
                <table className="info-table">
                  <tbody>
                    <tr>
                      <th>Net Weight</th>
                      <td>{selectedSize || product.weight || 'N/A'}</td>
                    </tr>
                    {product.ingredients && (
                      <tr>
                        <th>Ingredients</th>
                        <td>{product.ingredients}</td>
                      </tr>
                    )}
                    <tr>
                      <th>Shelf Life</th>
                      <td>{product.shelfLife || '12 Months'}</td>
                    </tr>
                    <tr>
                      <th>Storage Instructions</th>
                      <td>{product.storageInstructions || 'Store in a cool & dry place'}</td>
                    </tr>
                    <tr>
                      <th>FSSAI License No</th>
                      <td>{product.fssaiNo || '21523068000676'}</td>
                    </tr>
                    <tr>
                      <th>Country of Origin</th>
                      <td>India</td>
                    </tr>
                    <tr>
                      <th>Category</th>
                      <td>{product.category || 'Healthy Life Powders'}</td>
                    </tr>
                    {product.subcategory && (
                      <tr>
                        <th>Sub-category</th>
                        <td>{product.subcategory}</td>
                      </tr>
                    )}
                    <tr>
                      <th>Manufacturer</th>
                      <td>{product.manufacturer || 'Satva Organics'}</td>
                    </tr>
                    <tr>
                      <th>Packed On</th>
                      <td>{product.packedOn || '02/2024'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="tab-pane shipping-pane">
                <h3 className="section-title">📦 Shipping Info</h3>
                <div className="shipping-info-content">
                  <p>We ensure your organic products reach you in the best condition.</p>
                  <ul className="info-list">
                    <li>Standard delivery: 3-5 business days.</li>
                    <li>Free shipping on all orders above ₹499.</li>
                    <li>Carefully packed in eco-friendly packaging.</li>
                    <li>Tracking link provided via SMS/Email once dispatched.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'refund' && (
              <div className="tab-pane refund-pane">
                <h3 className="section-title">🔁 Refund & Replacement Policy</h3>
                <div className="refund-info-content">
                  <ul className="info-list compact">
                    <li>Damaged products must be reported within 2 days.</li>
                    <li>Replacement only (no resale items).</li>
                    <li>Natural products – no taste/texture based returns.</li>
                  </ul>
                  <div className="policy-link-wrapper">
                    <Link to="/refund-policy" className="read-full-policy-link">
                      👉 Read full policy
                    </Link>
                  </div>
                </div>
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

      {/* Fixed Bottom Footer for Mobile */}
      <div className={`fixed-bottom-footer ${showFixedFooter ? 'visible' : 'hidden'}`}>
        <button 
          className={`btn-add-to-cart ${isInCart ? 'in-cart' : ''}`}
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
        >
          {isInCart ? 'View Basket' : 'Add to Basket'}
        </button>
        <button 
          className="btn-buy-now"
          onClick={handleBuyNow}
          disabled={product.stock <= 0}
        >
          Buy Now
        </button>
        <button 
          className={`wishlist-btn ${isItemInWishlist ? 'active' : ''}`} 
          onClick={handleWishlistToggle}
          title={isItemInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <FiHeart className={isItemInWishlist ? 'filled' : ''} />
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
