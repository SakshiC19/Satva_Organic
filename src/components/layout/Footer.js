import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiMapPin, 
  FiPhone, 
  FiMail,
  FiSend
} from 'react-icons/fi';
import { 
  FaLinkedinIn, 
  FaInstagram, 
  FaCcPaypal,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const [email, setEmail] = useState('');
  const location = useLocation();

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Newsletter subscription:', email);
    setEmail('');
  };

  const hideWhatsApp = location.pathname.startsWith('/shop') || 
                       location.pathname.startsWith('/product') || 
                       location.pathname.startsWith('/checkout');

  const isOrdersPage = location.pathname.includes('/account/orders');
  const isProductDetailPage = location.pathname.includes('/product/');
  const hideFooterOnMobile = isOrdersPage || isProductDetailPage;


  return (
    <footer className={`footer ${hideFooterOnMobile ? 'hide-on-mobile' : ''}`}>
      <div className="footer-main">
        <div className="container">
          <div className="footer-content">
            {/* Company Info */}
            <div className="footer-column footer-about">
              <Link to="/" className="footer-logo">
                <span className="logo-icon">🌿</span>
                <span className="logo-text">Satva Organics</span>
              </Link>
              <p className="footer-description">
                Satva Organics is dedicated to bringing you the finest organic products, sourced directly from nature to promote a healthier and more sustainable lifestyle.
              </p>
              
              <div className="footer-contact">
                <div className="footer-contact-item">
                  <FiMapPin />
                  <span>Sangli-kolhapur Byepass Road, Village - Jainapur (Jaysingpur), Kolhapur, Maharashtra - 416101</span>
                </div>
                <div className="footer-contact-item">
                  <FiPhone />
                  <a href="tel:+917517555383">+91 75175 55383</a>
                </div>
                <div className="footer-contact-item">
                  <FiMail />
                  <a href="mailto:info.satvaorganics@gmail.com">info.satvaorganics@gmail.com</a>
                </div>
              </div>

              <div className="footer-social">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <FaLinkedinIn />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <FaInstagram />
                </a>
              </div>
            </div>

            {/* Company Links */}
            <div className="footer-column">
              <h4 className="footer-title">Company</h4>
              <ul className="footer-links">
                <li><Link to="/">About</Link></li>
                <li><Link to="/shop">All products</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/terms">Terms and Conditions</Link></li>
                <li><Link to="/privacy">Privacy and Policy</Link></li>
              </ul>
            </div>

            {/* Services Links */}
            <div className="footer-column">
              <h4 className="footer-title">Services</h4>
              <ul className="footer-links">
                <li><Link to="/account/orders">Order tracking</Link></li>
                <li><Link to="/account/wishlist">Wishlist</Link></li>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/account" className="highlight-link">My Account</Link></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="footer-column footer-newsletter">
              <h4 className="footer-title">Newsletter</h4>
              <p className="newsletter-description">
                Subscribe to our weekly Newsletter and receive updates via email.
              </p>
              
              <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="newsletter-input"
                />
                <button type="submit" className="newsletter-button" aria-label="Subscribe">
                  <FiSend />
                </button>
              </form>

              <div className="payment-methods">
                <h5 className="payment-title">We Accept</h5>
                <div className="payment-icons">
                  <FaCcPaypal />
                  <FaCcVisa />
                  <FaCcDiscover />
                  <FaCcMastercard />
                  <FaCcAmex />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky WhatsApp Icon */}
      {!hideWhatsApp && (
        <a 
          href="https://wa.me/7517555383" 
          className="whatsapp-sticky" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
        >
          <svg viewBox="0 0 448 512" width="24" height="24">
            <path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.4-11.3 2.5-2.4 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.5-9.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
          </svg>
        </a>
      )}

      {/* Copyright */}
      <div className="footer-bottom">
        <div className="container">
          <p className="copyright">
            © {new Date().getFullYear()} <strong>Satva Organics</strong>. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
