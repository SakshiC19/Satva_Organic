import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';
import { FiHeart, FiShoppingCart, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import ProductSelectionModal from './ProductSelectionModal';

const ProductCard = ({ 
  product,
  compact = false
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  const { 
    id,
    name, 
    image, 
    images, // Firebase format
    price, 
    originalPrice, 
    discount, 
    category,
    rating = 0,
    inStock = true,
    stock // Firebase uses 'stock' number instead of 'inStock' boolean
  } = product;

  // Handle both Firebase format (images array) and legacy format (single image string)
  const productImage = images && images.length > 0 
    ? (images[0].url || images[0]) 
    : image;

  // Determine stock status - Firebase uses numeric stock, legacy uses boolean inStock
  const isInStock = stock !== undefined ? stock > 0 : inStock;



  const handleProductClick = () => {
    if (id) {
      navigate(`/product/${id}`);
    }
  };

  return (
    <div className={`product-card ${compact ? 'product-card-compact' : ''}`} onClick={handleProductClick}>
      {/* Product Image */}
      <div className="product-card-image">
        <div className="wishlist-icon-container">
           <button className="wishlist-btn" onClick={(e) => { e.stopPropagation(); /* Add to wishlist logic */ }}>
             <FiHeart className="heart-icon" />
           </button>
        </div>
        <img src={productImage} alt={name} />
      </div>

      {/* Product Info */}
      <div className="product-card-info">
        <h3 className="product-name">{name}</h3>
        <span className="product-variant">{category}</span> {/* Using category as variant/color placeholder */}
        
        {/* Rating & Organic Label */}
        <div className="rating-row">
          <div className="product-rating-badge">
            {rating} <span className="star">★</span>
          </div>
          <span className="review-count">({Math.floor(Math.random() * 1000) + 50})</span> {/* Placeholder count */}
          <div className="organic-assured-badge">
             <img src="https://cdn-icons-png.flaticon.com/512/2917/2917995.png" alt="shield" className="shield-icon" style={{width: '14px', height: '14px', marginRight: '4px'}} />
             <span>Organic</span>
          </div>
        </div>

        {/* Price */}
        <div className="product-price">
          <span className="current-price">₹{price}</span>
          {originalPrice && (
            <>
              <span className="original-price">₹{originalPrice}</span>
              <span className="discount-text">{discount}% off</span>
            </>
          )}
        </div>

        {/* Stock Status / Few Left */}
        {isInStock ? (
          stock < 10 && stock > 0 ? (
            <span className="few-left-text">Only few left</span>
          ) : null
        ) : (
          <span className="out-of-stock">Out of Stock</span>
        )}

        {/* Action Buttons */}
        <div className="product-card-actions">
          <button 
            className="card-btn add-cart-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
          >
            Add to Cart
          </button>
          <button 
            className="card-btn buy-now-btn"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
              navigate('/checkout');
            }}
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
