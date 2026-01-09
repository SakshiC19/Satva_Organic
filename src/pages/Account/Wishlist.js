import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiTrash2, FiShoppingCart, FiArrowRight, FiHeart, FiHome, FiChevronRight } from 'react-icons/fi';
import ProductCard from '../../components/product/ProductCard';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import './Account.css';

const Wishlist = () => {
  const navigate = useNavigate();
  const { wishlistItems, clearWishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();
  const [sortBy, setSortBy] = useState('newest');

  // Mock recommendations
  const recommendations = [
    {
      id: 'rec1',
      name: 'Organic Honey',
      category: 'Organic Items',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
      price: 250,
      originalPrice: 300,
      discount: 16,
      rating: 4.8,
      inStock: true,
      stock: 15
    },
    {
      id: 'rec2',
      name: 'Cold Pressed Coconut Oil',
      category: 'Oils',
      image: 'https://images.unsplash.com/photo-1590733455785-f18519f59f4f?w=400',
      price: 450,
      originalPrice: 500,
      discount: 10,
      rating: 4.9,
      inStock: true,
      stock: 8
    }
  ];

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
    // Optional: clearWishlist();
  };

  if (wishlistCount === 0) {
    return (
      <div className="account-section">
        <div className="empty-wishlist">
          <div className="empty-wishlist-icon">
            <FiHeart />
          </div>
          <h2>Your wishlist is empty</h2>
          <p>Explore our products and add your favorites to your wishlist!</p>
          <button className="btn-primary" onClick={() => navigate('/shop')}>
            Continue Shopping <FiArrowRight />
          </button>
        </div>

        {/* Recommendations even when empty */}
        <div className="wishlist-recommendations">
          <h3 className="section-title">You may also like</h3>
          <div className="wishlist-grid">
            {recommendations.map(item => (
              <ProductCard key={item.id} product={item} compact />
            ))}
          </div>
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
        <div className="wishlist-controls">
          <select 
            className="wishlist-sort" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Recently Added</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="discount">Highest Discount</option>
          </select>
          <button className="btn-outline-danger" onClick={clearWishlist}>
            <FiTrash2 /> Clear Wishlist
          </button>
          <button className="btn-primary" onClick={handleMoveAllToCart}>
            <FiShoppingCart /> Move All to Basket
          </button>
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

      <div className="wishlist-recommendations">
        <h3 className="section-title">Recommended for You</h3>
        <div className="wishlist-grid">
          {recommendations.map(item => (
            <ProductCard key={item.id} product={item} compact />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
