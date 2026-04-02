import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const savedWishlist = localStorage.getItem('wishlist');
      return savedWishlist ? JSON.parse(savedWishlist) : [];
    } catch (error) {
      console.error('Error parsing wishlist from local storage:', error);
      return [];
    }
  });

  // Load wishlist from Firestore when user logs in
  useEffect(() => {
    const loadUserWishlist = async () => {
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const firestoreWishlist = userDoc.data().wishlist || [];
            
            // If local has items but firestore is empty, sync local to firestore
            if (wishlistItems.length > 0 && firestoreWishlist.length === 0) {
              await updateDoc(userRef, { 
                wishlist: wishlistItems,
                lastWishlistUpdatedAt: new Date().toISOString()
              });
              console.log('Initial wishlist sync: Local to Firestore');
            } 
            // Otherwise, if they differ, use firestore (cloud priority)
            else if (JSON.stringify(firestoreWishlist) !== JSON.stringify(wishlistItems)) {
              console.log('Syncing wishlist from Firestore...');
              setWishlistItems(firestoreWishlist);
            }
          }
        } catch (error) {
          console.error('Error loading wishlist from Firestore:', error);
        }
      }
    };
    loadUserWishlist();
  }, [currentUser]);

  // Save wishlist to local storage and Firestore whenever it changes
  useEffect(() => {
    const syncWishlist = async () => {
      const savedStr = localStorage.getItem('wishlist');
      const hasChanged = savedStr !== JSON.stringify(wishlistItems);
      
      localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
      
      if (currentUser && hasChanged) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, { 
            wishlist: wishlistItems,
            lastWishlistUpdatedAt: new Date().toISOString()
          });
          console.log('Wishlist synced to Firestore');
        } catch (error) {
          console.error('Error syncing wishlist to Firestore:', error);
        }
      }
    };
    
    syncWishlist();
  }, [wishlistItems, currentUser]);

  const addToWishlist = (product) => {
    setWishlistItems((prev) => {
      if (prev.find((item) => item.id === product.id)) {
        return prev;
      }
      return [...prev, { ...product, addedAt: new Date().toISOString() }];
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const toggleWishlist = (product) => {
    if (wishlistItems.find((item) => item.id === product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.id === productId);
  };

  const clearWishlist = () => {
    setWishlistItems([]);
  };

  const value = {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
    wishlistCount: wishlistItems.length
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
