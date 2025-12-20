import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import './HeroSlider.css';

const HeroSlider = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const bannersRef = collection(db, 'heroBanners');
        const q = query(bannersRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const bannersList = snapshot.docs.map(doc => ({
            id: doc.id,
            type: 'image', // Assuming all dynamic banners are images for now
            ...doc.data()
          }));
          setSlides(bannersList);
        } else {
          // Fallback to default slides if no dynamic banners exist
          setSlides([
            {
              id: 1,
              type: 'image',
              image: 'https://rukminim1.flixcart.com/fk-p-flap/1600/270/image/9e9aa250df53aa1d.jpg?q=20',
              alt: 'Big Savings on Mattresses',
              fallbackColor: '#2874f0'
            },
            {
              id: 2,
              type: 'content',
              title: 'Tasty & Healthy',
              highlight: 'Organic Food',
              subtitle: '100% genuine Products',
              buttonText: 'Shop Now',
              image: '/hero-vegetables.png',
              bgColor: '#f0fdf4'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching hero banners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  if (loading) {
    return <div className="hero-slider-loading"></div>;
  }

  return (
    <div className="hero-slider-container">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        spaceBetween={0}
        slidesPerView={1}
        navigation={{
          prevEl: '.hero-prev',
          nextEl: '.hero-next',
        }}
        pagination={{ 
          clickable: true,
          bulletClass: 'hero-bullet',
          bulletActiveClass: 'hero-bullet-active'
        }}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        loop={true}
        effect="fade"
        className="hero-swiper"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            {slide.type === 'image' ? (
              <div className="hero-slide image-slide" style={{ backgroundColor: slide.fallbackColor }}>
                <img src={slide.image} alt={slide.alt} className="hero-banner-img" />
              </div>
            ) : (
              <div className="hero-slide content-slide" style={{ backgroundColor: slide.bgColor }}>
                <div className="container">
                  <div className="hero-content-wrapper">
                    <div className="hero-text-content">
                      <span className="hero-badge">{slide.subtitle}</span>
                      <h1 className="hero-title">
                        {slide.title} <span className="highlight">{slide.highlight}</span>
                      </h1>
                      <button className="hero-cta-btn">{slide.buttonText}</button>
                    </div>
                    <div className="hero-image-content">
                      <img src={slide.image} alt={slide.title} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SwiperSlide>
        ))}

        {/* Custom Navigation Buttons */}
        <button className="hero-nav-btn hero-prev">
          <FiChevronLeft />
        </button>
        <button className="hero-nav-btn hero-next">
          <FiChevronRight />
        </button>
      </Swiper>
    </div>
  );
};

export default HeroSlider;
