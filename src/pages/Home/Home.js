import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiTruck, 
  FiShield, 
  FiHeart, 
  FiSearch, 
  FiTag,
  FiClock,
  FiStar,
  FiChevronRight,
  FiChevronLeft,
  FiGrid,
  FiPackage
} from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import 'swiper/css';
import 'swiper/css/navigation';

import { useCategories } from '../../contexts/CategoryContext';
import ProductCard from '../../components/product/ProductCard';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      const productsCollection = collection(db, 'products');
      const productsQuery = query(productsCollection, limit(8));
      const productsSnapshot = await getDocs(productsQuery);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeaturedProducts(productsList);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const { categories: contextCategories } = useCategories();

  // Category icons mappings
  const categoryIcons = {
    default: <FiPackage />
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const quickCategories = (contextCategories || []).slice(0, 8);

  const features = [
    {
      icon: <FiShield />,
      title: '100% Organic',
      description: 'Certified Products'
    },
    {
      icon: <FiTruck />,
      title: 'Free Delivery',
      description: 'Orders above ₹500'
    },
    {
      icon: <FiHeart />,
      title: 'Farm Fresh',
      description: 'Direct from Farms'
    },
    {
      icon: <FiStar />,
      title: 'Best Quality',
      description: 'Premium Selection'
    }
  ];

  return (
    <div className="home-page-modern">
      {/* Hero Section with Search */}
      <section className="hero-compact">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">Fresh & Organic.</h1>
            <p className="hero-subtitle">Premium quality products delivered to your doorstep</p>
          </div>
          
          {/* Search Bar */}
          <form className="search-bar-hero" onSubmit={handleSearch}>
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">Search</button>
          </form>
        </div>
      </section>

      {/* Quick Categories Grid */}
      <section className="categories-quick">
        <div className="container-fluid">
          <div className="section-header-compact">
            <h2 className="section-title-small">
              <FiGrid className="title-icon" />
              Shop by Category
            </h2>
            <button 
              className="view-all-link"
              onClick={() => navigate('/shop')}
            >
              View All <FiChevronRight />
            </button>
          </div>
          
          <div className="categories-grid-compact">
            {quickCategories.map((category, index) => (
              <div
                key={index}
                className="category-card-compact"
                onClick={() => navigate(`/shop?category=${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`)}
              >
                <div className="category-icon-wrapper">
                  {categoryIcons[category.name.toLowerCase()] || categoryIcons.default}
                </div>
                <span className="category-name">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flash Deals Section */}
      <section className="flash-deals">
        <div className="container-fluid">
          <div className="flash-header">
            <div className="flash-title-group">
              <FiTag className="flash-icon" />
              <h2 className="section-title-small">Flash Deals</h2>
              <div className="flash-timer">
                <FiClock className="timer-icon" />
                <span>Ends in 2h 30m</span>
              </div>
            </div>
            <button 
              className="view-all-link"
              onClick={() => navigate('/shop')}
            >
              See All <FiChevronRight />
            </button>
          </div>

          <div className="flash-deals-container">
            <button className="flash-nav-btn flash-prev" aria-label="Previous">
              <FiChevronLeft />
            </button>

            <Swiper
              modules={[Navigation]}
              spaceBetween={16}
              slidesPerView="auto"
              navigation={{
                prevEl: '.flash-prev',
                nextEl: '.flash-next',
              }}
              breakpoints={{
                320: { slidesPerView: 2, spaceBetween: 12 },
                480: { slidesPerView: 2.5, spaceBetween: 12 },
                768: { slidesPerView: 3.5, spaceBetween: 14 },
                1024: { slidesPerView: 4.5, spaceBetween: 16 },
              }}
              className="flash-deals-slider"
            >
              {featuredProducts.slice(0, 6).map(product => (
                <SwiperSlide key={product.id}>
                  <ProductCard product={product} compact />
                </SwiperSlide>
              ))}
            </Swiper>

            <button className="flash-nav-btn flash-next" aria-label="Next">
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products">
        <div className="container-fluid">
          <div className="section-header-compact">
            <h2 className="section-title-small">
              <FiStar className="title-icon" />
              Featured Products
            </h2>
            <button 
              className="view-all-link"
              onClick={() => navigate('/shop')}
            >
              View All <FiChevronRight />
            </button>
          </div>

          {loadingProducts ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : (
            <div className="products-grid-compact">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="promo-banner-section">
        <div className="container-fluid">
          <div className="promo-banner-modern">
            <div className="promo-content">
              <span className="promo-badge">SPECIAL OFFER</span>
              <h3 className="pr
      <section className="features-compact">
        <div className="container-fluid">
          <div className="features-grid-modern">
            {features.map((featomo-title">Get 30% Off on First Order</h3>
              <p className="promo-text">Download our app and get exclusive deals</p>
              <button 
                className="promo-btn"
                onClick={() => navigate('/shop')}
              >
                Shop Now
              </button>
            </div>
            <div className="promo-visual">
              <div className="promo-circle"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Compacts */}ure, index) => (
              <div key={index} className="feature-card-modern">
                <div className="feature-icon-modern">{feature.icon}</div>
                <div className="feature-content">
                  <h4 className="feature-title-modern">{feature.title}</h4>
                  <p className="feature-desc-modern">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
