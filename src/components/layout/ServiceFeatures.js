import React from 'react';
import { FiTruck, FiRefreshCw, FiCreditCard, FiGift } from 'react-icons/fi';
import './ServiceFeatures.css';

const ServiceFeatures = () => {
  const features = [
    {
      icon: <FiTruck />,
      title: 'Free Shipping',
      description: 'On all orders over $49.00'
    },
    {
      icon: <FiRefreshCw />,
      title: '15 days returns',
      description: 'Moneyback guarantee'
    },
    {
      icon: <FiCreditCard />,
      title: 'Secure checkout',
      description: 'Protected by Paypal'
    },
    {
      icon: <FiGift />,
      title: 'Offer & gift here',
      description: 'On all orders over'
    }
  ];

  return (
    <section className="service-features">
      <div className="container">
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              <div className="feature-icon">
                {feature.icon}
              </div>
              <div className="feature-content">
                <h4 className="feature-title">{feature.title}</h4>
                <p className="feature-desc">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceFeatures;
