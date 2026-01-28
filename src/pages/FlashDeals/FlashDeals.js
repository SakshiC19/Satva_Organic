import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ProductCard from '../../components/product/ProductCard';
import { FiTag, FiClock, FiFilter, FiTrendingUp, FiArrowDown } from 'react-icons/fi';
import './FlashDeals.css';

const FlashDeals = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('discount'); // discount, ending, popular

  useEffect(() => {
    const productsCollection = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
      const productsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.discount && parseFloat(p.discount) > 0);
      
      setProducts(productsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'discount') return parseFloat(b.discount) - parseFloat(a.discount);
    if (sortBy === 'popular') return (b.rating || 0) - (a.rating || 0);
    return 0; // 'ending' would need real expiry dates
  });

  return (
    <div className="flash-deals-page">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="title-area">
              <FiTag className="header-icon" />
              <h1>Flash Deals</h1>
              <p>Limited time offers on fresh organic products</p>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <FiClock />
                <span>New deals every 24h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="deals-controls">
          <div className="results-count">
            Showing <strong>{sortedProducts.length}</strong> active deals
          </div>
          <div className="sort-options">
            <span className="sort-label"><FiFilter /> Sort by:</span>
            <button 
              className={`sort-btn ${sortBy === 'discount' ? 'active' : ''}`}
              onClick={() => setSortBy('discount')}
            >
              <FiArrowDown /> Highest Discount
            </button>
            <button 
              className={`sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
            >
              <FiTrendingUp /> Popular
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Fetching best deals for you...</p>
          </div>
        ) : (
          <div className="deals-grid">
            {sortedProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                isFlashDeal={true} 
              />
            ))}
          </div>
        )}

        {!loading && sortedProducts.length === 0 && (
          <div className="empty-state">
            <FiTag />
            <h3>No active flash deals right now</h3>
            <p>Check back later for fresh offers!</p>
            <button className="btn-primary" onClick={() => navigate('/shop')}>
              Browse Shop
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashDeals;
