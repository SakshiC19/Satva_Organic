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

  // Save cart to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
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

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
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
