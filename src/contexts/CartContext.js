import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
  const { currentUser } = useAuth();
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

  const [shippingConfig, setShippingConfig] = useState({ freeShippingAbove: 500, shippingCharge: 50 });

  // Load shipping configuration with real-time updates
  useEffect(() => {
    const docRef = doc(db, 'settings', 'shipping');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setShippingConfig(docSnap.data());
      }
    }, (error) => {
      console.error("Error fetching shipping config:", error);
    });

    return () => unsubscribe();
  }, []);

  // Load cart from Firestore when user logs in
  useEffect(() => {
    const loadUserCart = async () => {
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists() && userDoc.data().cart) {
            const firestoreCart = userDoc.data().cart;
            // Simple merge: Priority to Firestore if different
            if (JSON.stringify(firestoreCart) !== JSON.stringify(cartItems)) {
              console.log('Syncing cart from Firestore...');
              setCartItems(firestoreCart);
            }
          }
        } catch (error) {
          console.error('Error loading cart from Firestore:', error);
        }
      }
    };
    loadUserCart();
  }, [currentUser]);

  // Save cart and timestamp to local storage and Firestore whenever it changes
  useEffect(() => {
    const syncCart = async () => {
      const savedCartStr = localStorage.getItem('cart');
      const hasCartChanged = savedCartStr !== JSON.stringify(cartItems);
      
      localStorage.setItem('cart', JSON.stringify(cartItems));
      
      if (cartItems.length > 0) {
        // Only update timestamp if cart actually changed or if it doesn't exist
        if (hasCartChanged || !localStorage.getItem('last_cart_updated_at')) {
          const now = new Date().toISOString();
          localStorage.setItem('last_cart_updated_at', now);
          setLastCartUpdatedAt(now);
          
          // Sync to Firestore if logged in
          if (currentUser) {
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, { 
                cart: cartItems,
                lastCartUpdatedAt: now 
              });
              console.log('Cart synced to Firestore');
            } catch (error) {
              console.error('Error syncing cart to Firestore:', error);
            }
          }
        }
      } else {
        localStorage.removeItem('last_cart_updated_at');
        setLastCartUpdatedAt(null);
        
        // Sync empty cart to Firestore if logged in and it was changed
        if (currentUser && hasCartChanged) {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { cart: [] });
            console.log('Empty cart synced to Firestore');
          } catch (error) {
            console.error('Error clearing cart in Firestore:', error);
          }
        }
      }
    };
    
    syncCart();
  }, [cartItems, currentUser]);

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.id === product.id && item.selectedSize === product.selectedSize
      );

      // Get available stock (prefer maxStock if passed, else product.stock)
      const availableStock = product.maxStock || product.stock || 999;
      const quantityToAdd = product.quantity || 1;

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;
        
        // Validation: cannot exceed stock
        if (newQuantity > availableStock) {
          alert(`Only ${availableStock} items available in stock.`);
          return prevItems;
        }

        return prevItems.map(item =>
          (item.id === product.id && item.selectedSize === product.selectedSize)
            ? { ...item, quantity: newQuantity, maxStock: availableStock }
            : item
        );
      }
      
      // Validation for new item
      if (quantityToAdd > availableStock) {
        alert(`Only ${availableStock} items available in stock.`);
        return prevItems;
      }

      return [...prevItems, { ...product, quantity: quantityToAdd, maxStock: availableStock }];
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

    setCartItems(prevItems => {
      const item = prevItems.find(i => i.id === productId && i.selectedSize === selectedSize);
      
      // Use stored maxStock or product.stock if available
      const availableStock = item?.maxStock || item?.stock || 999;

      if (quantity > availableStock) {
        alert(`Only ${availableStock} items available in stock.`);
        return prevItems;
      }

      return prevItems.map(item =>
        (item.id === productId && item.selectedSize === selectedSize)
          ? { ...item, quantity }
          : item
      );
    });
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
    toggleCart,
    shippingConfig
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
