import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Error parsing cart from local storage:', error);
      return [];
    }
  });

  const [lastCartUpdatedAt, setLastCartUpdatedAt] = useState(() => {
    return localStorage.getItem('last_cart_updated_at') || null;
  });

  // Save cart and timestamp to local storage whenever it changes
  useEffect(() => {
    const savedCartStr = localStorage.getItem('cart');
    const hasCartChanged = savedCartStr !== JSON.stringify(cartItems);
    
    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    if (cartItems.length > 0) {
      // Only update timestamp if cart actually changed or if it doesn't exist
      if (hasCartChanged || !localStorage.getItem('last_cart_updated_at')) {
        const now = new Date().toISOString();
        localStorage.setItem('last_cart_updated_at', now);
        setLastCartUpdatedAt(now);
      }
    } else {
      localStorage.removeItem('last_cart_updated_at');
      setLastCartUpdatedAt(null);
    }
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.id === product.id && item.selectedSize === product.selectedSize
      );
      if (existingItem) {
        return prevItems.map(item =>
          (item.id === product.id && item.selectedSize === product.selectedSize)
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      }
      return [...prevItems, { ...product, quantity: product.quantity || 1 }];
    });
  };

  const removeFromCart = (productId, selectedSize) => {
    setCartItems(prevItems => prevItems.filter(item => 
      !(item.id === productId && item.selectedSize === selectedSize)
    ));
  };

  const updateQuantity = (productId, selectedSize, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId, selectedSize);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        (item.id === productId && item.selectedSize === selectedSize)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen(prev => !prev);

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const gstTotal = cartItems.reduce((total, item) => {
    const itemGstConfig = item.gst !== undefined ? item.gst : (item.category === 'Vegetable Basket' ? 0 : 5);
    return total + ((item.price * item.quantity) * (itemGstConfig / 100));
  }, 0);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
    gstTotal,
    lastCartUpdatedAt,
    isCartOpen,
    openCart,
    closeCart,
    toggleCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
