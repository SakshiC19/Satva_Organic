import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';
import { FiHeart, FiShoppingCart, FiShoppingBag, FiTrash2, FiTruck, FiEye, FiMinus, FiPlus } from 'react-icons/fi';
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
  isFlashDeal = false
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist, removeFromWishlist } = useWishlist();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);
  const [quantity, setQuantity] = React.useState(1);

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
    stock = 50,
    initialStock = 100,
    weight = '500g',
    deliveryDays = '2-3 days',
    priceAlert = null,
    productType,
    flashDealExpiry = new Date(Date.now() + 86400000).toISOString() // Mock expiry
  } = product;

  const productImage = images && images.length > 0
    ? (images[0].url || images[0])
    : image;

  const isInStock = stock !== undefined ? stock > 0 : inStock;
  const isItemInWishlist = isInWishlist(id);
  const savings = originalPrice ? originalPrice - price : 0;

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

  const handleQuickView = (e) => {
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleQuantityChange = (e, delta) => {
    e.stopPropagation();
    const newQty = Math.max(1, Math.min(stock, quantity + delta));
    setQuantity(newQty);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (product.packingSizes && product.packingSizes.length > 0) {
      setIsModalOpen(true);
    } else {
      addToCart({ ...product, quantity });
    }
  };

  return (
    <div className={`product-card ${compact ? 'product-card-compact' : ''} ${isFlashDeal ? 'flash-deal-card' : ''} ${!isInStock ? 'out-of-stock-card' : ''}`} onClick={handleProductClick}>
      {/* Product Image Section */}
      <div className="product-card-image">
        {isFlashDeal && (
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
          
          {!compact && (
            <button className="action-btn quick-view-btn" onClick={handleQuickView} title="Quick View">
              <FiEye />
            </button>
          )}
        </div>

        <img src={productImage} alt={name} loading="lazy" />
        
        {!isInStock && <div className="out-of-stock-overlay">Out of Stock</div>}
        


        {isFlashDeal && <FlashDealTimer expiryDate={flashDealExpiry} />}
      </div>

      {/* Product Info Section */}
      <div className="product-card-info">
        <div className="category-tag">{category}</div>
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
            {originalPrice && (
              <div className="discount-pill">-{discount}%</div>
            )}
          </div>
          
          {originalPrice && (
            <div className="price-secondary-row">
              <span className="original-price">₹{originalPrice}</span>
              <span className="savings-text">Save ₹{savings}</span>
            </div>
          )}
        </div>



        {/* Delivery & Stock */}
        <div className="meta-info-row">
          <div className="delivery-tag">
            <FiTruck /> {deliveryDays}
          </div>
        </div>

        {/* Action Area */}
        <div className="product-card-actions" onClick={e => e.stopPropagation()}>
          {isInStock ? (
            <div className="action-controls">

              
              <div className="main-buttons">
                <button className="card-btn add-cart-btn" onClick={handleAddToCart}>
                  Add to Cart
                </button>
                <button className="card-btn buy-now-btn" onClick={(e) => {
                  e.stopPropagation();
                  addToCart({ ...product, quantity });
                  navigate('/checkout');
                }}>
                  Buy Now
                </button>
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
