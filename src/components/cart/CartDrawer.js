import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiMinus, FiPlus, FiClock, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import './CartDrawer.css';

const CartDrawer = () => {
  const { isCartOpen, closeCart, cartItems, updateQuantity, removeFromCart } = useCart();
  const [showNotice, setShowNotice] = React.useState(false);
  const [showPolicy, setShowPolicy] = React.useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const itemTotal = calculateTotal();
  const deliveryCharge = 25;
  const handlingCharge = 2;
  const smallCartCharge = itemTotal < 100 ? 20 : 0;
  const grandTotal = itemTotal + deliveryCharge + handlingCharge + smallCartCharge;

  const handleProceed = () => {
    closeCart();
    if (currentUser) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=checkout');
    }
  };

  return (
    <>
      <div className="cart-overlay" onClick={closeCart}></div>
      <div className="cart-drawer">
        <div className="cart-header">
          <h2>My Basket</h2>
          <button className="close-cart-btn" onClick={closeCart}>
            <FiX />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <FiShoppingBag className="empty-cart-icon" />
            <p>Your basket is empty</p>
            <button className="btn-start-shopping" onClick={() => {
              closeCart();
              navigate('/shop');
            }}>
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-content">
              {/* Notice Section */}
              {showNotice && (
                <div className="cart-notice">
                  <div className="notice-text">
                    <h4>1 out of stock item removed</h4>
                    <p>you can continue to checkout</p>
                  </div>
                  <button className="btn-review" onClick={() => setShowNotice(false)}>Review</button>
                </div>
              )}

              {/* Delivery Info */}
              <div className="delivery-info-card highlighted">
                <div className="delivery-icon">
                  <FiClock />
                </div>
                <div className="delivery-text">
                  <h3>Delivery in 8 minutes</h3>
                  <p>Shipment of {cartItems.length} item{cartItems.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Cart Items */}
              <div className="cart-items-list">
                {cartItems.map((item) => {
                  const itemImage = item.images && item.images.length > 0 
                    ? (item.images[0].url || item.images[0]) 
                    : item.image;

                    return (
                      <div key={`${item.id}-${item.selectedSize || 'default'}`} className="cart-item">
                        <div className="item-image">
                          <img src={itemImage} alt={item.name} />
                        </div>
                        <div className="item-details">
                          <span className="item-category">{item.category}</span>
                          <h4 className="product-name">{item.name}</h4>
                          <span className="item-unit-badge">{item.selectedSize || item.weight || item.unit || 'Standard'}</span>
                          
                          <div className="product-features">
                            <span className="feature-item">No Preservatives</span>
                            <span className="feature-item">✓ Returnable if Damaged</span>
                          </div>

                          <div className="item-price-row">
                            <span className="item-price">₹{item.price}</span>
                            <div className="item-actions-right">
                              <div className="item-quantity-controls">
                                <button 
                                  onClick={() => item.quantity > 1 && updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                                  className={`qty-control-btn ${item.quantity <= 1 ? 'disabled' : ''}`}
                                  disabled={item.quantity <= 1}
                                >
                                  <FiMinus />
                                </button>
                                <span>{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                                  className="qty-control-btn"
                                >
                                  <FiPlus />
                                </button>
                              </div>
                              <button 
                                className="remove-item-icon-btn" 
                                onClick={() => removeFromCart(item.id, item.selectedSize)}
                                title="Remove item"
                              >
                                <FiX />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                })}
              </div>

              {/* Cancellation Policy */}
              <div className="cancellation-policy-card">
                <div className="policy-header" onClick={() => setShowPolicy(!showPolicy)}>
                  <h3>Cancellation Policy</h3>
                  <button className="expand-btn">{showPolicy ? 'Read less' : 'Read more'}</button>
                </div>
                {showPolicy ? (
                  <p className="policy-full">🔒 Orders can't be cancelled once packed. Refunds apply for delays. We strive to maintain the highest quality standards and timeliness for every delivery.</p>
                ) : (
                  <p className="policy-summary">🔒 Orders can't be cancelled once packed. Refunds apply for delays.</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="cart-footer" onClick={handleProceed}>
              <div className="cart-total-info">
                <span className="total-amount">₹{grandTotal}</span>
                <span className="total-label">TOTAL</span>
              </div>
              <button className="btn-proceed">
                {currentUser ? 'Continue' : 'Login to Continue'} 
                <span className="arrow-icon">›</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
