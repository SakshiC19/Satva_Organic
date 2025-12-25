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
      
      if (cats.length === 0) {
        // Seed default categories to DB if empty
        const seededCats = [];
        for (const cat of defaultCategories) {
          // Remove id as Firestore generates it
          const { id, ...catData } = cat; 
          const docRef = await addDoc(collection(db, 'categories'), catData);
          seededCats.push({ id: docRef.id, ...catData });
        }
        setCategories(seededCats);
      } else {
        setCategories(cats);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fallback only on error, but don't seed
      setCategories([]); 
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category) => {
    try {
      const docRef = await addDoc(collection(db, 'categories'), category);
      setCategories([...categories, { id: docRef.id, ...category }]);
      return docRef;
    } catch (error) {
      console.error("Error adding category:", error);
      throw error;
    }
  };

  const updateCategory = async (id, updates) => {
    try {
      await updateDoc(doc(db, 'categories', id), updates);
      setCategories(categories.map(cat => 
        cat.id === id ? { ...cat, ...updates } : cat
      ));
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  };

  const deleteCategory = async (id) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  };

  return (
    <CategoryContext.Provider value={{ categories, loading, addCategory, updateCategory, deleteCategory, fetchCategories }}>
      {children}
    </CategoryContext.Provider>
  );
};

const defaultCategories = [
  {
    id: 1,
    name: 'Organic Exotic Products',
    slug: 'organic-exotic-products',
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
    name: 'Organic Wood Cold Press Oils Products',
    slug: 'organic-wood-cold-press-oils',
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
    name: 'Organic Powder',
    slug: 'organic-powder',
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
