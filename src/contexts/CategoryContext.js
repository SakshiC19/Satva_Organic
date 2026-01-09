import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

import exoticProductImg from '../assets/productsImages/exotic_product/exotic-product.png';
import seedsNutImg from '../assets/productsImages/seed_nut/seedsnut.png';
import organicItemsImg from '../assets/productsImages/organic-items/organic-items.png';

const CategoryContext = createContext();

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const cats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Deduplicate categories based on slug or name
      const uniqueCats = [];
      const seenKeys = new Set();
      
      cats.forEach(cat => {
        const key = cat.slug || cat.name;
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueCats.push(cat);
        }
      });

      setCategories(uniqueCats);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const syncProducts = async (oldName, newName, isDelete = false) => {
    console.log(`Syncing products from "${oldName}" to "${newName || (isDelete ? 'Uncategorized' : 'N/A')}"`);
    try {
      const productsRef = collection(db, 'products');
      const snapshot = await getDocs(productsRef);
      
      let count = 0;
      for (const productDoc of snapshot.docs) {
        const data = productDoc.data();
        if (data.category === oldName) {
          const productRef = doc(db, 'products', productDoc.id);
          if (isDelete) {
            await updateDoc(productRef, { category: 'Uncategorized' });
          } else if (newName) {
            await updateDoc(productRef, { category: newName });
          }
          count++;
        }
      }
      console.log(`Successfully synced ${count} products.`);
    } catch (error) {
      console.error("Error syncing products:", error);
    }
  };

  const addCategory = async (category) => {
    try {
      const docRef = await addDoc(collection(db, 'categories'), category);
      const newCat = { id: docRef.id, ...category };
      setCategories(prev => [...prev, newCat]);
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
        await syncProducts(oldCategory.name, updates.name);
      }

      setCategories(prev => prev.map(cat =>
        cat.id === id ? { ...cat, ...updates } : cat
      ));
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
      
      // Auto-sync products to 'Uncategorized'
      if (categoryToDelete) {
        await syncProducts(categoryToDelete.name, null, true);
      }

      setCategories(prev => prev.filter(cat => cat.id !== id));
      console.log(`Category ${id} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting category:", error);
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

const defaultCategories = [
  {
    id: 1,
    name: 'Vegetable Basket',
    slug: 'vegetable-basket',
    image: exoticProductImg,
    subcategories: [
      'Broccoli',
      'Cherry Tomato',
      'Red Cabbage',
      'Yellow Zucchini',
      'Lettuce Leaf',
      'Beshal',
      'Jalapeno Green Chilli',
      'Bok Choy',
      'Organic Spinach',
      'Organic Roman',
      'Rocket'
    ]
  },
  {
    id: 2,
    name: 'Satva Pure Oils',
    slug: 'satva-pure-oils',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
    subcategories: [
      'Coconut Oil',
      'Groundnuts Oil',
      'Sunflower Oil',
      'Safflower Oil'
    ]
  },
  {
    id: 3,
    name: 'Millets Of India',
    slug: 'millets-of-india',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    subcategories: [
      'Sorghum (Jowar)',
      'Pearl Millet (Bajra)',
      'Finger Millet (Ragi)'
    ]
  },
  {
    id: 4,
    name: 'Organic Items',
    slug: 'organic-items',
    image: organicItemsImg,
    subcategories: [
      'Fresh Turmeric',
      'Organic Jaggery',
      'Organic Jaggery Cubes'
    ]
  },
  {
    id: 5,
    name: 'Seeds And Nuts',
    slug: 'seeds-and-nuts',
    image: seedsNutImg,
    subcategories: [
      'Pumpkin Seeds',
      'Sunflower Seeds',
      'Sesame Seeds',
      'Solapuri Peanuts',
      'Chia Seeds',
      'Mustard Seeds'
    ]
  },
  {
    id: 6,
    name: 'Healthy Life Powders',
    slug: 'healthy-life-powders',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
    subcategories: [
      'Moringa Leaf Powder',
      'Neem Powder',
      'Amla Powder',
      'Shatavari Powder',
      'Triphala Powder',
      'Turmeric Latte Mix',
      'Organic Jaggery Powder'
    ]
  }
];
