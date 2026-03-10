import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import './AbandonedCartReminder.css';

const AbandonedCartReminder = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { cartItems, cartCount, cartTotal, lastCartUpdatedAt, openCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const checkReminder = () => {
      // Don't show if tab is hidden or on desktop
      if (document.hidden || window.innerWidth > 768) return;

      if (cartItems.length === 0 || !lastCartUpdatedAt) {
        setIsVisible(false);
        return;
      }

      const lastUpdated = new Date(lastCartUpdatedAt).getTime();
      const lastReminderShownAt = localStorage.getItem('last_reminder_shown_at');
      const now = Date.now();

      const twelveHours = 12 * 60 * 60 * 1000;

      const isCartOldEnough = (now - lastUpdated) > twelveHours;
      const isReminderOldEnough = !lastReminderShownAt || (now - new Date(lastReminderShownAt).getTime()) > twelveHours;

      if (isCartOldEnough && isReminderOldEnough) {
        // Add a slight delay after activity/load to be less jarring
        setTimeout(() => {
          if (!document.hidden) {
            setIsVisible(true);
          }
        }, 3000); 
      }
    };

    // Check on mount (with a small delay for "active" feel)
    const initialCheck = setTimeout(checkReminder, 2000);
    
    // Check every hour
    const interval = setInterval(checkReminder, 60 * 60 * 1000);
    
    // Check when user comes back to the tab
    document.addEventListener('visibilitychange', checkReminder);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', checkReminder);
    };
  }, [cartItems.length, lastCartUpdatedAt]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('last_reminder_shown_at', new Date().toISOString());
  };

  const handleViewCart = () => {
    setIsVisible(false);
    localStorage.setItem('last_reminder_shown_at', new Date().toISOString());
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
          It's been a while since you added <strong className="product-highlight">{firstItem.name}</strong> to your cart.
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
            <span className="view-text">View Basket</span>
            <span className="view-arrow">›</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AbandonedCartReminder;
