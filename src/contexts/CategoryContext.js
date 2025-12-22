import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

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
        // Fallback to default categories if none in DB
        setCategories(defaultCategories);
      } else {
        setCategories(cats);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(defaultCategories);
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
    <CategoryContext.Provider value={{ categories, loading, addCategory, updateCategory, deleteCategory }}>
      {children}
    </CategoryContext.Provider>
  );
};

const defaultCategories = [
  {
    id: 1,
    name: 'Organic Exotic Products',
    slug: 'organic-exotic-products',
    image: 'https://placehold.co/150/e2e8f0/1e293b?text=Exotic',
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
    image: 'https://placehold.co/150/fef3c7/92400e?text=Oils',
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
    image: 'https://placehold.co/150/fee2e2/991b1b?text=Millets',
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
    image: 'https://placehold.co/150/dcfce7/166534?text=Organic',
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
    image: 'https://placehold.co/150/ffedd5/9a3412?text=Seeds',
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
    image: 'https://placehold.co/150/f3e8ff/6b21a8?text=Powder',
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
