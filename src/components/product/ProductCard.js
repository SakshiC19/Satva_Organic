import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';
import { FiHeart, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import ProductSelectionModal from './ProductSelectionModal';
import ProductQuickView from './ProductQuickView';

const FlashDealTimer = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = React.useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiryDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryDate]);

  return (
    <div className="flash-deal-timer-mini">
      <span className="timer-unit">{String(timeLeft.hours).padStart(2, '0')}h</span>
      <span className="timer-sep">:</span>
      <span className="timer-unit">{String(timeLeft.minutes).padStart(2, '0')}m</span>
      <span className="timer-sep">:</span>
      <span className="timer-unit">{String(timeLeft.seconds).padStart(2, '0')}s</span>
    </div>
  );
};


const ProductCard = ({
  product,
  compact = false,
  isWishlistPage = false,
  isFlashDeal = false,
  showCategory = true,
  showBuyNow = true
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist, removeFromWishlist } = useWishlist();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);

  const {
    id,
    name,
    image,
    images,
    price,
    originalPrice,
    discount,
    category,
    rating = 0,
    inStock = true,
    stock = 0,
    dealExpiry = null,
    dealStockLimit = null
  } = product;

  const [isDealActive, setIsDealActive] = React.useState(isFlashDeal);

  React.useEffect(() => {
    if (isFlashDeal) {
      const checkDealStatus = () => {
        const now = new Date().getTime();
        const expiryTime = dealExpiry ? new Date(dealExpiry).getTime() : null;
        const isExpired = expiryTime && now > expiryTime;
        const isStockOut = dealStockLimit !== null && dealStockLimit <= 0;
        
        if (isExpired || isStockOut) {
          setIsDealActive(false);
        } else {
          setIsDealActive(true);
        }
      };

      checkDealStatus();
      const interval = setInterval(checkDealStatus, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isFlashDeal, dealExpiry, dealStockLimit]);

  const calculatePrice = (basePrice, size) => {
    if (!size || !basePrice) return basePrice || 0;
    const match = size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    if (!match) return basePrice;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    let multiplier = 1;
    if (unit === 'g' || unit === 'gm' || unit === 'ml') {
      multiplier = value / 100;
    } else if (unit === 'kg' || unit === 'l' || unit === 'liter') {
      multiplier = (value * 1000) / 100;
    } else if (unit === 'pc' || unit === 'pcs' || unit === 'pack') {
      multiplier = value;
    }
    
    return Math.round(basePrice * multiplier);
  };

  const defaultSize = product.packingSizes?.[0] || product.weight || '250g';
  const displayPrice = calculatePrice(price, defaultSize);
  const displayDiscount = typeof discount === 'object' ? discount?.value : (parseFloat(discount) || 0);
  
  let effectiveOriginalPrice = originalPrice;
  if (!effectiveOriginalPrice && displayDiscount > 0) {
    effectiveOriginalPrice = price / (1 - (displayDiscount / 100));
  }

  const displayOriginalPrice = calculatePrice(effectiveOriginalPrice, defaultSize);

  const productImage = images && images.length > 0
    ? (images[0].url || images[0])
    : image;

  const isInStock = stock !== undefined ? stock > 0 : inStock;
  const isItemInWishlist = isInWishlist(id);

  const handleProductClick = () => {
    if (id) {
      navigate(`/product/${id}`);
    }
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    if (isWishlistPage) {
      removeFromWishlist(id);
    } else {
      toggleWishlist(product);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (product.packingSizes && product.packingSizes.length > 0) {
      setIsModalOpen(true);
    } else {
      addToCart({ ...product, quantity: 1 });
    }
  };

  return (
    <div className={`product-card ${compact ? 'product-card-compact' : ''} ${isDealActive ? 'flash-deal-card' : ''} ${!isInStock ? 'out-of-stock-card' : ''} ${!showBuyNow ? 'hide-buy-now' : ''}`} onClick={handleProductClick}>
      {/* Product Image Section */}
      <div className="product-card-image">
        {isDealActive && (
          <div className="flash-badge-overlay">
            <FiShoppingBag /> Flash Deal
          </div>
        )}
        
        <div className="image-actions-overlay">
          <button
            className={`action-btn wishlist-btn ${isItemInWishlist ? 'active' : ''}`}
            onClick={handleWishlistClick}
            title="Wishlist"
          >
            {isWishlistPage ? <FiTrash2 /> : <FiHeart className={isItemInWishlist ? 'filled' : ''} />}
          </button>
        </div>

        <img src={productImage} alt={name} loading="lazy" />
        
        {!isInStock && <div className="out-of-stock-overlay">Out of Stock</div>}
        


        {isDealActive && dealExpiry && <FlashDealTimer expiryDate={dealExpiry} />}
      </div>

      {/* Product Info Section */}
      <div className="product-card-info">
        {showCategory && <div className="category-tag">{category}</div>}
        <h3 className="product-name" title={name}>{name}</h3>

        <div className="rating-row">
          <div className="product-rating-badge">
            {rating} <span className="star">★</span>
          </div>
          <span className="review-count">(12)</span>
        </div>



        <div className="product-price-container">
          <div className="price-main-row">
            <span className="current-price">₹{price}</span>
            {effectiveOriginalPrice > 0 && displayDiscount > 0 && (
              <div className="discount-pill">-{displayDiscount}%</div>
            )}
          </div>
          
          {(product.unit === 'g' || product.unit === 'kg' || product.unit === 'ml' || product.unit === 'l') && (
            <div className="unit-price-row">
              (₹{price} / 100{product.unit === 'ml' || product.unit === 'l' ? 'ml' : 'g'})
            </div>
          )}
          
          {effectiveOriginalPrice > 0 && (effectiveOriginalPrice - price) > 0 && (
            <div className="price-secondary-row">
              <span className="original-price">₹{Math.round(effectiveOriginalPrice)}</span>
              <span className="savings-text">You save ₹{Math.round(effectiveOriginalPrice - price)}</span>
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="product-card-actions" onClick={e => e.stopPropagation()}>
          {isInStock ? (
            <div className="action-controls">

              
              <div className="main-buttons">
                <button className="card-btn add-cart-btn" onClick={handleAddToCart}>
                  Add to Basket
                </button>
                {showBuyNow && (
                  <button className="card-btn buy-now-btn" onClick={(e) => {
                    e.stopPropagation();
                    addToCart({ ...product, quantity: 1 });
                    navigate('/checkout');
                  }}>
                    Buy Now
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button className="card-btn notify-btn" onClick={e => {
              e.stopPropagation();
              alert(`Notified for ${name}`);
            }}>
              Notify Me
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <ProductSelectionModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      {isQuickViewOpen && (
        <ProductQuickView 
          product={product} 
          onClose={() => setIsQuickViewOpen(false)} 
        />
      )}
    </div>
  );
};

export default ProductCard;
