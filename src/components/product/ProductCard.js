import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';
import { FiHeart, FiShoppingCart, FiShoppingBag, FiTrash2, FiTruck } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import ProductSelectionModal from './ProductSelectionModal';

const ProductCard = ({
  product,
  compact = false,
  isWishlistPage = false
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist, removeFromWishlist } = useWishlist();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

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
    stock,
    weight = '500g', // Default weight
    deliveryDays = '2-3 days', // Default delivery info
    priceAlert = null // e.g., "Price dropped by ₹20"
  } = product;

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

  return (
    <div className={`product-card ${compact ? 'product-card-compact' : ''} ${!isInStock ? 'out-of-stock-card' : ''}`} onClick={handleProductClick}>
      {/* Product Image */}
      <div className="product-card-image">
        <div className="wishlist-icon-container">
          <button
            className={`wishlist-btn ${isItemInWishlist ? 'active' : ''}`}
            onClick={handleWishlistClick}
            title={isWishlistPage ? "Remove from Wishlist" : (isItemInWishlist ? "Remove from Wishlist" : "Add to Wishlist")}
          >
            {isWishlistPage ? <FiTrash2 className="trash-icon" /> : <FiHeart className={`heart-icon ${isItemInWishlist ? 'filled' : ''}`} />}
          </button>
        </div>
        <img src={productImage} alt={name} />
        {!isInStock && <div className="out-of-stock-overlay">Out of Stock</div>}
      </div>

      {/* Product Info */}
      <div className="product-card-info">
        <h3 className="product-name" title={name}>{name}</h3>

        {/* Rating & Organic Label */}
        <div className="rating-row">
          <div className="product-rating-badge">
            {rating} <span className="star">★</span>
          </div>
          <span className="review-count">({Math.floor(Math.random() * 1000) + 50})</span>
          <div className="organic-assured-badge">
            <img src="https://cdn-icons-png.flaticon.com/512/2917/2917995.png" alt="shield" className="shield-icon" style={{ width: '14px', height: '14px', marginRight: '4px' }} />
            <span>Organic</span>
          </div>
        </div>

        {/* Price */}
        <div className="product-price-container">
          <div className="product-price">
            <span className="current-price">₹{price}</span>
            {originalPrice && (
              <>
                <span className="original-price">₹{originalPrice}</span>
                <span className="discount-text">{discount}% off</span>
              </>
            )}
          </div>
          {priceAlert && <div className="price-alert">🔔 {priceAlert}</div>}
        </div>

        {/* Delivery Info */}
        <div className="delivery-info">
          <FiTruck /> <span>Delivery in {deliveryDays}</span>
        </div>

        {/* Stock Status */}
        <div className="stock-status">
          {isInStock ? (
            <span className="in-stock-text">🟢 In Stock</span>
          ) : (
            <span className="out-of-stock-text">🔴 Out of Stock</span>
          )}
          {isInStock && stock < 10 && stock > 0 && (
            <span className="few-left-text">Only few left!</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="product-card-actions">
          <button
            className="card-btn add-cart-btn"
            disabled={!isInStock}
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            title={!isInStock ? "Item Out of Stock" : "Add to Cart"}
          >
            Add to Cart
          </button>
          <button
            className="card-btn buy-now-btn"
            disabled={!isInStock}
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
              navigate('/checkout');
            }}
            title={!isInStock ? "Item Out of Stock" : "Buy Now"}
          >
            Buy Now
          </button>
        </div>
      </div>

      <ProductSelectionModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default ProductCard;
