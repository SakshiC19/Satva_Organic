import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';



const CategoryContext = createContext();

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(cats);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchCategories = async () => {
    // Deprecated: onSnapshot handles updates now, but keeping for compatibility if needed
    // or we can remove this function entirely if not used elsewhere explicitly.
    // For now, let's just log or do nothing.
  };

  const syncProducts = async (oldName, newName, isDelete = false) => {
    console.log(`Syncing products from "${oldName}" to "${newName || (isDelete ? 'Uncategorized' : 'N/A')}"`);
    try {
      // Create a query against the collection.
      const q = query(collection(db, 'products'), where('category', '==', oldName));
      const snapshot = await getDocs(q);
      
      let count = 0;
      
      const updatePromises = snapshot.docs.map(productDoc => {
        const productRef = doc(db, 'products', productDoc.id);
        let updateData = {};
        if (isDelete) {
          updateData = { category: 'Uncategorized' };
        } else if (newName) {
          updateData = { category: newName };
        }
        count++;
        return updateDoc(productRef, updateData);
      });

      await Promise.all(updatePromises);
      console.log(`Successfully synced ${count} products.`);
    } catch (error) {
      console.error("Error syncing products:", error);
    }
  };

  const addCategory = async (category) => {
    try {
      // Check for duplicates
      const q = query(collection(db, 'categories'), where('name', '==', category.name));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error(`Category "${category.name}" already exists.`);
      }

      const docRef = await addDoc(collection(db, 'categories'), category);
      const newCat = { id: docRef.id, ...category };
      // setCategories handled by onSnapshot
      return newCat;
    } catch (error) {
      console.error("Error adding category:", error);
      throw error;
    }
  };

  const updateCategory = async (id, updates) => {
    console.log(`Updating category ${id}`, updates);
    try {
      const oldCategory = categories.find(c => c.id === id);
      await updateDoc(doc(db, 'categories', id), updates);
      


      // Auto-sync products if name changed
      if (oldCategory && updates.name && oldCategory.name !== updates.name) {
        // Run sync in background
        syncProducts(oldCategory.name, updates.name).catch(err => console.error("Background sync failed:", err));
      }

      console.log(`Category ${id} updated successfully.`);
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  };

  const deleteCategory = async (id) => {
    console.log(`Deleting category ${id}`);
    try {
      const categoryToDelete = categories.find(c => c.id === id);
      if (!categoryToDelete) {
        console.warn(`Category with ID ${id} not found in local state.`);
      }
      


      await deleteDoc(doc(db, 'categories', id));
      
      // Removed auto-sync to 'Uncategorized' per user request
      // Products will retain their old category name until manually updated

      console.log(`Category ${id} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting category:", error);
      // Revert state if delete failed
      fetchCategories(); 
      throw error;
    }
  };

  return (
    <CategoryContext.Provider value={{ 
      categories, 
      loading, 
      addCategory, 
      updateCategory, 
      deleteCategory, 
      fetchCategories,
      syncProducts 
    }}>
      {children}
    </CategoryContext.Provider>
  );
};


