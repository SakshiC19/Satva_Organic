import React, { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ProductCard from './ProductCard';
import './Recommendations.css';
import { FiStar } from 'react-icons/fi';

const Recommendations = ({ title = "You may also like", category, currentProductId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        let q;

        if (category) {
          q = query(
            productsRef, 
            where('category', '==', category),
            limit(6)
          );
        } else {
          q = query(productsRef, limit(6));
        }

        const querySnapshot = await getDocs(q);
        let recommendedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter out current product if provided
        if (currentProductId) {
          recommendedProducts = recommendedProducts.filter(p => p.id !== currentProductId);
        }

        setProducts(recommendedProducts.slice(0, 5));
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [category, currentProductId]);

  if (loading || products.length === 0) return null;

  return (
    <section className="recommendations-section">
      <div className="recommendations-header">
        <FiStar className="recommendations-icon" />
        <h2>{title}</h2>
      </div>
      <div className="recommendations-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} compact={true} />
        ))}
      </div>
    </section>
  );
};

export default Recommendations;
