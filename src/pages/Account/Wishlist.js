import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiTrash2, FiShoppingCart, FiArrowRight, FiHeart, FiHome, FiChevronRight, FiStar, FiPercent } from 'react-icons/fi';
import ProductCard from '../../components/product/ProductCard';
import Recommendations from '../../components/product/Recommendations';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import './Account.css';

const Wishlist = () => {
  const navigate = useNavigate();
  const { wishlistItems, clearWishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();
  const [sortBy, setSortBy] = useState('newest');

  const sortedItems = useMemo(() => {
    const items = [...wishlistItems];
    switch (sortBy) {
      case 'price-low':
        return items.sort((a, b) => a.price - b.price);
      case 'price-high':
        return items.sort((a, b) => b.price - a.price);
      case 'discount':
        return items.sort((a, b) => (b.discount || 0) - (a.discount || 0));
      default:
        return items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }
  }, [wishlistItems, sortBy]);

  const handleMoveAllToCart = () => {
    wishlistItems.forEach(item => {
      if (item.inStock || item.stock > 0) {
        addToCart(item);
      }
    });
  };

  if (wishlistCount === 0) {
    return (
      <div className="account-section full-width-layout">
        <div className="breadcrumb">
          <Link to="/" className="breadcrumb-item">
            <FiHome /> Home
          </Link>
          <FiChevronRight className="breadcrumb-separator" />
          <span className="breadcrumb-item active">My Wishlist</span>
        </div>
        <div className="empty-wishlist-container">
          <div className="empty-wishlist-illustration">
            <div className="illustration-wrapper">
              <div className="heart-icon-bg">
                <FiHeart className="main-heart" />
                <div className="leaf leaf-1">🍃</div>
                <div className="leaf leaf-2">🌿</div>
              </div>
            </div>
          </div>
          
          <div className="empty-wishlist-content">
            <h2>💚 Your wishlist is waiting!</h2>
            <p>Save organic products you love and buy them anytime.</p>
            
            <div className="empty-wishlist-actions">
              <button className="btn-primary main-cta" onClick={() => navigate('/shop')}>
                Explore Organic Products <FiArrowRight />
              </button>
              
              <div className="secondary-actions">
                <button className="btn-outline-secondary" onClick={() => navigate('/flash-deals')}>
                  <FiPercent /> View Today's Deals
                </button>
                <button className="btn-outline-secondary" onClick={() => navigate('/shop?sort=popular')}>
                  <FiStar /> Browse Best Sellers
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="wishlist-recommendations-smart">
          <Recommendations 
            title="Recently Viewed" 
            type="recentlyViewed" 
            limit={4} 
          />
          <Recommendations 
            title="Popular Organic Products" 
            type="popular" 
            limit={4} 
          />
          <Recommendations 
            title="Today's Best Deals" 
            type="discounted" 
            limit={4} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="account-section">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/" className="breadcrumb-item">
          <FiHome /> Home
        </Link>
        <FiChevronRight className="breadcrumb-separator" />
        <span className="breadcrumb-item active">My Wishlist</span>
      </div>

      <div className="wishlist-header-actions">
        <div className="wishlist-info">
          <h2 className="account-title">My Wishlist ({wishlistCount})</h2>
        </div>
      </div>

      <div className="wishlist-grid">
        {sortedItems.map(item => (
          <ProductCard 
            key={item.id} 
            product={item} 
            isWishlistPage={true}
          />
        ))}
      </div>

      <div className="wishlist-recommendations-smart" style={{ marginTop: '60px' }}>
        <Recommendations 
          title="You May Also Like" 
          type="category" 
          category={localStorage.getItem('lastVisitedCategory')}
          limit={4} 
        />
        <Recommendations 
          title="Trending Now" 
          type="popular" 
          limit={4} 
        />
      </div>
    </div>
  );
};

export default Wishlist;
