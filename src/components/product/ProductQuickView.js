import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiShoppingCart, FiHeart, FiMinus, FiPlus } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import './ProductQuickView.css';

const ProductQuickView = ({ product, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const { addToCart, openCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  if (!product) return null;

  const {
    name,
    image,
    images,
    price,
    originalPrice,
    discount,
    category,
    description,
    rating = 0,
    stock,
    packingSizes = []
  } = product;

  // Handle both Firebase format (images array) and legacy format (single image string)
  const productImage = images && images.length > 0
    ? (images[0].url || images[0])
    : image;

  const isInStock = stock !== undefined ? stock > 0 : true;

  const handleQuantityChange = (type) => {
    if (type === 'increment' && quantity < stock) {
      setQuantity(quantity + 1);
    } else if (type === 'decrement' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity,
      selectedSize: selectedSize || (packingSizes && packingSizes.length > 0 ? packingSizes[0] : 'Standard')
    });
    onClose();
    if (window.innerWidth > 768) {
      openCart();
    }
  };

  const handleAddToWishlist = () => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return createPortal(
    <div className="quick-view-overlay" onClick={onClose}>
      <div className="quick-view-modal" onClick={(e) => e.stopPropagation()}>
        <button className="quick-view-close" onClick={onClose} aria-label="Close">
          <FiX />
        </button>

        <div className="quick-view-content">
          {/* Product Image */}
          <div className="quick-view-image">
            {discount && (
              <span className="quick-view-discount">-{discount}%</span>
            )}
            <img src={productImage} alt={name} />
          </div>

          {/* Product Details */}
          <div className="quick-view-details">
            <span className="quick-view-category">{category}</span>
            <h2 className="quick-view-title">{name}</h2>

            {/* Rating */}
            <div className="quick-view-rating">
              {[...Array(5)].map((_, index) => (
                <span key={index} className={index < rating ? 'star filled' : 'star'}>
                  ★
                </span>
              ))}
              <span className="review-count">1 REVIEW</span>
            </div>

            {/* Price */}
            <div className="quick-view-price">
              <span className="current-price">₹{price}</span>
              {originalPrice && (
                <span className="original-price">₹{originalPrice}</span>
              )}
            </div>

            {/* Stock Status */}
            <div className="quick-view-stock">
              {isInStock ? (
                <span className="in-stock">IN STOCK</span>
              ) : (
                <span className="out-of-stock">OUT OF STOCK</span>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="quick-view-description">{description}</p>
            )}

            {/* Packing Sizes */}
            {packingSizes && packingSizes.length > 0 && (
              <div className="quick-view-sizes">
                <label>Amount</label>
                <div className="size-options">
                  {packingSizes.map((size, index) => (
                    <button
                      key={index}
                      className={`size-option ${selectedSize === size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="quick-view-quantity">
              <button
                className="quantity-btn"
                onClick={() => handleQuantityChange('decrement')}
                disabled={quantity <= 1}
              >
                <FiMinus />
              </button>
              <input
                type="number"
                value={quantity}
                readOnly
                className="quantity-input"
              />
              <button
                className="quantity-btn"
                onClick={() => handleQuantityChange('increment')}
                disabled={quantity >= stock}
              >
                <FiPlus />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="quick-view-actions">
              <button
                className="btn-add-to-cart"
                onClick={handleAddToCart}
                disabled={!isInStock}
              >
                <FiShoppingCart />
                Add to Cart
              </button>
              <button
                className={`btn-add-to-wishlist ${isInWishlist(product.id) ? 'active' : ''}`}
                onClick={handleAddToWishlist}
                aria-label="Add to wishlist"
              >
                <FiHeart className={isInWishlist(product.id) ? 'filled' : ''} />
              </button>
            </div>

            {/* Product Meta */}
            <div className="quick-view-meta">
              <div className="meta-item">
                <span className="meta-label">Type:</span>
                <span className="meta-value">
                  {product.productType === 'organic' ? 'Organic' : product.productType === 'inorganic' ? 'Inorganic' : 'Organic'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">COD:</span>
                <span className="meta-value">
                  {product.codAvailable ? 'Available' : 'Not Available'}
                </span>
              </div>
              {product.mfgDate && (
                <div className="meta-item">
                  <span className="meta-label">MFG:</span>
                  <span className="meta-value">{product.mfgDate}</span>
                </div>
              )}
              {product.life && (
                <div className="meta-item">
                  <span className="meta-label">LIFE:</span>
                  <span className="meta-value">{product.life}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductQuickView;
