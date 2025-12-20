import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiMinus, FiPlus, FiClock, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import './CartDrawer.css';

const CartDrawer = () => {
  const { isCartOpen, closeCart, cartItems, updateQuantity, removeFromCart } = useCart();
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
          <h2>My Cart</h2>
          <button className="close-cart-btn" onClick={closeCart}>
            <FiX />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <FiShoppingBag className="empty-cart-icon" />
            <p>Your cart is empty</p>
            <button className="btn-start-shopping" onClick={closeCart}>
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-content">
              {/* Delivery Info */}
              <div className="delivery-info-card">
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
                  // Handle both Firebase format (images array) and legacy format (single image string)
                  const itemImage = item.images && item.images.length > 0 
                    ? (item.images[0].url || item.images[0]) 
                    : item.image;

                    return (
                      <div key={`${item.id}-${item.selectedSize || 'default'}`} className="cart-item">
                      <div className="item-image">
                        <img src={itemImage} alt={item.name} />
                      </div>
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <p className="item-unit">{item.selectedSize || item.weight || item.unit || 'Standard'}</p>
                        <div className="item-price-row">
                          <span className="item-price">₹{item.price}</span>
                          <div className="item-quantity-controls">
                            <button 
                              onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                              className="qty-control-btn"
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bill Details */}
              <div className="bill-details-card">
                <h3>Bill details</h3>
                <div className="bill-row">
                  <span>Items total</span>
                  <span>₹{itemTotal}</span>
                </div>
                <div className="bill-row">
                  <span>Delivery charge <span className="info-icon">i</span></span>
                  <span>₹{deliveryCharge}</span>
                </div>
                <div className="bill-row">
                  <span>Handling charge <span className="info-icon">i</span></span>
                  <span>₹{handlingCharge}</span>
                </div>
                {smallCartCharge > 0 && (
                  <div className="bill-row">
                    <span>Small cart charge <span className="info-icon">i</span></span>
                    <span>₹{smallCartCharge}</span>
                  </div>
                )}
                <div className="bill-row grand-total">
                  <span>Grand total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="cancellation-policy-card">
                <h3>Cancellation Policy</h3>
                <p>Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.</p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="cart-footer">
              <div className="cart-total-info">
                <span className="total-amount">₹{grandTotal}</span>
                <span className="total-label">TOTAL</span>
              </div>
              <button className="btn-proceed" onClick={handleProceed}>
                {currentUser ? 'Proceed to Pay' : 'Login to Proceed'} 
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
