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
import { Navigation, Autoplay, Pagination } from 'swiper/modules';
import { collection, getDocs, limit, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { useCategories } from '../../contexts/CategoryContext';
import ProductCard from '../../components/product/ProductCard';
import './Home.css';

import exoticProductImg from '../../assets/productsImages/exotic_product/exotic-product.png';
import seedsNutImg from '../../assets/productsImages/seed_nut/seedsnut.png';
import organicItemsImg from '../../assets/productsImages/organic-items/organic-items.png';

const Home = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [specialOffer, setSpecialOffer] = useState(null);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchSpecialOffer();
  }, []);

  const fetchSpecialOffer = async () => {
    try {
      const offerRef = doc(db, 'settings', 'specialOffer');
      const offerSnap = await getDoc(offerRef);
      if (offerSnap.exists()) {
        setSpecialOffer(offerSnap.data());
      }
    } catch (error) {
      console.error('Error fetching special offer:', error);
    }
  };

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

  // Category images mapping (fallback/override)
  const categoryImages = {
    'organic-exotic-products': exoticProductImg,
    'organic-wood-cold-press-oils': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
    'millets-of-india': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    'organic-items': organicItemsImg,
    'seeds-and-nuts': seedsNutImg,
    'organic-powder': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  };

  const getCategoryImage = (category) => {
    const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
    if (categoryImages[slug]) return categoryImages[slug];
    if (category.image) return category.image;
    return null;
  };

  const handlesearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const uniqueCategories = (contextCategories || []).filter((cat, index, self) =>
    index === self.findIndex((c) => c.name === cat.name)
  );

  const quickCategories = uniqueCategories.slice(0, 8);

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

  const heroSlides = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1920&q=80',
      title: 'Fresh & Organic',
      subtitle: 'Premium quality products delivered to your doorstep',
      buttonText: 'Shop Now',
      link: '/shop'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1920&q=80',
      title: 'Healthy Living',
      subtitle: 'Discover our range of organic seeds and nuts',
      buttonText: 'Explore',
      link: '/shop?category=seeds-and-nuts'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1920&q=80',
      title: 'Exotic Flavors',
      subtitle: 'Taste the difference with our exotic collection',
      buttonText: 'View Products',
      link: '/shop?category=organic-exotic-products'
    }
  ];

  return (
    <div className="home-page-modern">
      {/* Hero Slider Section */}
      <section className="hero-slider-section">
        <Swiper
          modules={[Navigation, Autoplay, Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          loop={true}
          className="hero-swiper"
        >
          {heroSlides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div 
                className="hero-slide"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="hero-overlay"></div>
                <div className="hero-content-slider">
                  <h1 className="hero-title-slider">{slide.title}</h1>
                  <p className="hero-subtitle-slider">{slide.subtitle}</p>
                  <button 
                    className="hero-btn-slider"
                    onClick={() => navigate(slide.link)}
                  >
                    {slide.buttonText}
                  </button>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
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

          <div className="categories-slider-container">
            <button className="cat-nav-btn cat-prev" aria-label="Previous">
              <FiChevronLeft />
            </button>

            <Swiper
              modules={[Navigation, Autoplay]}
              spaceBetween={16}
              slidesPerView="auto"
              autoplay={{
                delay: 2500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
              }}
              navigation={{
                prevEl: '.cat-prev',
                nextEl: '.cat-next',
              }}
              loop={true}
              breakpoints={{
                320: { slidesPerView: 2.5, spaceBetween: 12 },
                480: { slidesPerView: 3.5, spaceBetween: 12 },
                768: { slidesPerView: 4.5, spaceBetween: 14 },
                1024: { slidesPerView: 6, spaceBetween: 16 },
              }}
              className="categories-slider"
            >
              {quickCategories.map((category, index) => {
                const imageUrl = getCategoryImage(category);
                return (
                  <SwiperSlide key={index}>
                    <div
                      className="category-card-compact"
                      onClick={() => navigate(`/shop?category=${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`)}
                      style={{ position: 'relative', overflow: 'hidden', padding: 0 }}
                    >
                      <div className="category-image-wrapper" style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        zIndex: 1
                      }}>
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={category.name}
                              className="category-img"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.classList.add('fallback-icon');
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))',
                              zIndex: 2
                            }}></div>
                          </>
                        ) : (
                          categoryIcons[category.name.toLowerCase()] || categoryIcons.default
                        )}
                      </div>
                      <div className="category-name-container" style={{
                        position: 'relative',
                        zIndex: 3,
                        marginTop: 'auto',
                        padding: '12px 8px'
                      }}>
                        <div className="category-name-scroll">
                          <span style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{category.name}</span>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                )
              })}
            </Swiper>

            <button className="cat-nav-btn cat-next" aria-label="Next">
              <FiChevronRight />
            </button>
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
              modules={[Navigation, Autoplay]}
              spaceBetween={16}
              slidesPerView="auto"
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
              }}
              navigation={{
                prevEl: '.flash-prev',
                nextEl: '.flash-next',
              }}
              loop={true}
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
      {specialOffer && specialOffer.isActive && (
        <section className="promo-banner-section">
          <div className="container-fluid">
            <div className="promo-banner-modern">
              <div className="promo-content">
                <span className="promo-badge">{specialOffer.badge}</span>
                <h3 className="promo-title">{specialOffer.title}</h3>
                <p className="promo-text">{specialOffer.description}</p>
                <button
                  className="promo-btn"
                  onClick={() => navigate(specialOffer.buttonLink || '/shop')}
                >
                  {specialOffer.buttonText}
                </button>
              </div>
              <div className="promo-visual">
                <div className="promo-circle"></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Compact */}
      <section className="features-compact">
        <div className="container-fluid">
          <div className="features-grid-modern">
            {features.map((feature, index) => (
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
