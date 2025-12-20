import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import './PromotionalBanners.css';

const PromotionalBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const bannersRef = collection(db, 'promotionalBanners');
        const q = query(bannersRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const bannersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBanners(bannersList);
      } catch (error) {
        console.error('Error fetching promotional banners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  if (loading) return null;

  // If no banners in DB, show default ones or nothing
  const displayBanners = banners.length > 0 ? banners : [
    {
      id: 'default-1',
      subtitle: 'Fresh',
      title: 'Bread Products',
      offer: 'SALE UP TO 40% OFF',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
      bgColor: '#ffffff'
    },
    {
      id: 'default-2',
      subtitle: 'Fresh',
      title: 'Chilli Organic',
      offer: 'SALE UP TO 70% OFF',
      image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400',
      bgColor: '#f0fdf4'
    }
  ];

  return (
    <section className="promotional-banners">
      <div className="container">
        <div className="banners-grid">
          {displayBanners.slice(0, 3).map((banner, index) => (
            <div 
              key={banner.id} 
              className={`promo-banner banner-style-${index + 1}`}
              style={{ backgroundColor: banner.bgColor }}
            >
              <div className="banner-content">
                <h3 className="banner-title">{banner.title}</h3>
                <p className="banner-subtitle">{banner.subtitle}</p>
                <button className="banner-order-btn">Order Now</button>
              </div>
              <div className="banner-image">
                <img src={banner.image} alt={banner.title} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromotionalBanners;
