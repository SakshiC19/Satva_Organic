import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { FiShoppingCart, FiChevronRight } from 'react-icons/fi';
import './StickyCartBar.css';

const StickyCartBar = () => {
  const { cartItems, cartTotal, openCart } = useCart();
  const location = useLocation();

  const isVisiblePage = location.pathname === '/shop' || location.pathname.startsWith('/shop/');

  if (cartItems.length === 0 || !isVisiblePage) return null;

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartTotal;

  return (
    <div className="sticky-cart-bar" onClick={openCart}>
      <div className="cart-info">
        <div className="cart-icon-wrapper">
          <FiShoppingCart />
        </div>
        <div className="cart-text">
          <span className="item-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          <span className="total-price">₹{totalPrice}</span>
        </div>
      </div>
      <button className="view-cart-btn">
        View Cart <FiChevronRight />
      </button>
    </div>
  );
};

export default StickyCartBar;
