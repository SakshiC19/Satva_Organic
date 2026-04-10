import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiShoppingCart, FiMinus, FiPlus, FiHeart, FiClock } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import './ProductSelectionModal.css';

const ProductSelectionModal = ({ product, isOpen, onClose }) => {
  const { addToCart, openCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { currentUser } = useAuth();
  const [selectedWeight, setSelectedWeight] = useState(null);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const {
    name,
    image,
    images,
    price,
    packingSizes,
    weightOptions = ['250g', '500g', '1kg'],
    stock = 10
  } = product;

  const availableOptions = packingSizes && packingSizes.length > 0 ? packingSizes : weightOptions;

  const calculateDynamicPrice = (prod, size) => {
    if (!size || !prod) return prod?.price || 0;
    
    // Check for explicit price override first
    if (prod.sizePrices && prod.sizePrices[size]) {
      return parseFloat(prod.sizePrices[size]);
    }

    const match = size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    if (!match) return prod.price;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    let multiplier = 1;
    
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

  const getSpecificStock = () => {
    if (selectedWeight && product.sizeStocks && product.sizeStocks[selectedWeight] !== undefined) {
      return product.sizeStocks[selectedWeight];
    }
    return product.stock || 0;
  };

  const currentPrice = calculateDynamicPrice(product, selectedWeight);
  const currentStock = getSpecificStock();

  const productImage = images && images.length > 0 
    ? (images[0].url || images[0]) 
    : image;

  const handleAddToCart = () => {
    if (!selectedWeight) {
      setError(true);
      return;
    }
    addToCart({
      ...product,
      price: currentPrice,
      selectedWeight,
      selectedSize: selectedWeight, // Ensure compatibility
      quantity,
      basePrice: product.price,
      maxStock: currentStock // Pass max stock to cart for validation
    });
    onClose();
    if (window.innerWidth > 768) {
      openCart();
    }
  };

  return createPortal(
    <div className="selection-modal-overlay" onClick={onClose}>
      <div className="selection-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><FiX /></button>
        
        <div className="modal-body">
          <div className="product-preview">
            <img src={productImage} alt={name} />
          </div>
          
          <div className="product-details">
            <h3>{name}</h3>
            <div className="modal-price">
              <span className="current">₹{currentPrice}</span>
              <span className="unit-info" style={{fontSize: '0.8em', color: '#666', marginLeft: '8px'}}>
                (₹{price}/100{product.unit === 'ml' || product.unit === 'l' ? 'ml' : 'g'})
              </span>
            </div>

            <div className={`modal-selection-row ${error && !selectedWeight ? 'shake-error' : ''}`}>
              <div className="selection-group">
                <label className={error && !selectedWeight ? 'error-text' : ''}>
                  Select Weight {error && !selectedWeight && <span className="required-msg">- Required</span>}
                </label>
                <div className="weight-options">
                  {availableOptions.map(w => (
                    <button 
                      key={w}
                      className={`weight-btn ${selectedWeight === w ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedWeight(w);
                        setError(false);
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="selection-group">
                <label>Quantity</label>
                <div className="quantity-selector">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button>
                  <span>{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(currentStock || 999, quantity + 1))}
                    disabled={quantity >= (currentStock || 999)}
                  >
                    <FiPlus />
                  </button>
                </div>
              </div>
            </div>



            {selectedWeight && currentStock > 0 && currentStock <= 10 && (
              <div className="stock-limit-msg" style={{ 
                color: '#ef4444', 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                marginBottom: '10px',
                textAlign: 'left'
              }}>
                Hurry! Only {currentStock} left in stock
              </div>
            )}

            <div className="modal-action-row">
              <button 
                className={`modal-view-details-btn ${!selectedWeight ? 'disabled' : ''}`} 
                onClick={() => {
                  if (!selectedWeight) {
                    setError(true);
                    return;
                  }
                  onClose();
                  window.location.href = `/product/${product.id}`;
                }}
                disabled={!selectedWeight}
              >
                View Details
              </button>
              
              {selectedWeight && currentStock === 0 ? (
                <button 
                  className={`modal-notify-btn ${notified ? 'notified' : ''}`}
                  onClick={async () => {
                    if (!currentUser) {
                      alert("Please login to get notified!");
                      return;
                    }
                    setIsNotifying(true);
                    try {
                      // Check if already exists
                      const q = query(
                        collection(db, 'stockNotifications'),
                        where('productId', '==', product.id),
                        where('userId', '==', currentUser.uid),
                        where('selectedSize', '==', selectedWeight),
                        where('status', '==', 'pending')
                      );
                      const snapshot = await getDocs(q);

                      if (!snapshot.empty) {
                        setNotified(true);
                        alert("You're already on the list!");
                        return;
                      }

                      await addDoc(collection(db, 'stockNotifications'), {
                        productId: product.id,
                        productName: product.name,
                        selectedSize: selectedWeight,
                        userId: currentUser.uid,
                        userEmail: currentUser.email,
                        status: 'pending',
                        createdAt: serverTimestamp()
                      });
                      setNotified(true);
                      alert("We'll notify you when this size is back!");
                    } catch (err) {
                      console.error("Error setting notification:", err);
                    } finally {
                      setIsNotifying(false);
                    }
                  }}
                  disabled={isNotifying || notified}
                >
                  <FiClock /> {notified ? 'Notified' : (isNotifying ? 'Setting...' : 'Notify Me')}
                </button>
              ) : (
                <button 
                  className={`modal-add-btn ${!selectedWeight || currentStock === 0 ? 'disabled' : ''}`} 
                  onClick={handleAddToCart}
                  disabled={!selectedWeight || currentStock === 0}
                >
                  <FiShoppingCart /> Add to Basket
                </button>
              )}
              <button 
                className={`modal-wishlist-btn ${isInWishlist(product.id) ? 'active' : ''} ${!selectedWeight ? 'disabled' : ''}`} 
                onClick={(e) => {
                  if (!selectedWeight) {
                    setError(true);
                    return;
                  }
                  e.stopPropagation();
                  toggleWishlist(product);
                }}
                disabled={!selectedWeight}
                title="Wishlist"
              >
                <FiHeart className={isInWishlist(product.id) ? 'filled' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductSelectionModal;
