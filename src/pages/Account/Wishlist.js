import React from 'react';
import ProductCard from '../../components/product/ProductCard';
import './Account.css';

const Wishlist = () => {
  // Mock wishlist data
  const wishlistItems = [
    {
      id: 1,
      name: 'Fresh Organic Peach',
      category: 'Fruits',
      image: 'https://images.unsplash.com/photo-1629828874514-944d8c50f5ac?w=400',
      price: 110,
      originalPrice: 130,
      discount: 15,
      rating: 4.5,
      inStock: true
    }
  ];

  return (
    <div className="account-section">
      <div className="account-header">
        <h2 className="account-title">My Wishlist</h2>
      </div>

      <div className="wishlist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {wishlistItems.map(item => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
