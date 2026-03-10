import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import './AbandonedCartReminder.css';

const AbandonedCartReminder = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { cartItems, cartCount, cartTotal, openCart } = useCart();
  const { currentUser } = useAuth();
  const lastShownRef = useRef(0);
  const prevUserRef = useRef(currentUser);

  const checkReminder = React.useCallback((isManualTrigger = false) => {
    // Strictly mobile view constraint (768px or less)
    const isMobile = window.innerWidth <= 768;
    if (!isMobile || document.hidden || cartItems.length === 0) {
      setIsVisible(false);
      return;
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Trigger if manual (login) or if 1 hour has elapsed since last display
    if (isManualTrigger || (now - lastShownRef.current) >= oneHour) {
      // Small delay so it doesn't pop up instantly on page transition
      setTimeout(() => {
        if (!document.hidden && window.innerWidth <= 768 && cartItems.length > 0) {
          setIsVisible(true);
          lastShownRef.current = Date.now();
        }
      }, 3000); 
    }
  }, [cartItems.length]);

  // Handle Login Trigger
  useEffect(() => {
    // Detect transitions from logged-out to logged-in
    if (!prevUserRef.current && currentUser && cartItems.length > 0) {
      checkReminder(true);
    }
    prevUserRef.current = currentUser;
  }, [currentUser, cartItems.length, checkReminder]);

  // Lifecycle for background checks
  useEffect(() => {
    // Initial check shortly after load
    const initialCheck = setTimeout(() => checkReminder(), 5000);
    
    // Set up 1-hour recurring interval
    const interval = setInterval(() => checkReminder(), 60 * 60 * 1000);

    const handleVisibility = () => {
      if (!document.hidden) checkReminder();
    };
    
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkReminder]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleViewCart = () => {
    setIsVisible(false);
    openCart();
  };

  if (!isVisible || cartItems.length === 0) return null;

  const firstItem = cartItems[0];

  return (
    <div className="abandoned-cart-reminder visible">
      <button className="reminder-close-btn" onClick={handleDismiss} aria-label="Close reminder">
        <FiX />
      </button>
      <div className="reminder-content">
        <div className="reminder-header">
          <div className="reminder-icon-container">
             <FiShoppingCart className="reminder-icon-svg" />
          </div>
          <span className="reminder-title">You left items in your cart!</span>
        </div>
        <p className="reminder-message">
          Don't forget your <strong className="product-highlight">{firstItem.name}</strong>. Complete your purchase now!
        </p>
        
        <button className="premium-cart-action" onClick={handleViewCart}>
          <div className="action-left">
            <div className="action-icon-box">
              <FiShoppingCart />
            </div>
            <div className="action-info">
              <span className="item-count">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
              <span className="cart-price">₹{cartTotal}</span>
            </div>
          </div>
          <div className="action-right">
            <span className="view-text">Check Out</span>
            <span className="view-arrow">›</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AbandonedCartReminder;
