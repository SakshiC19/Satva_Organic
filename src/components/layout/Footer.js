import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiMapPin, 
  FiPhone, 
  FiMail,
  FiSend,
  FiChevronUp,
  FiChevronDown
} from 'react-icons/fi';
import { 
  FaFacebookF, 
  FaTwitter, 
  FaInstagram, 
  FaYoutube,
  FaTiktok,
  FaCcPaypal,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover,
  FaWhatsapp
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
    const [email, setEmail] = useState('');
    const [expandedSections, setExpandedSections] = useState({});

    const handleNewsletterSubmit = (e) => {
        e.preventDefault();
        console.log('Newsletter subscription:', email);
        setEmail('');
    };

    const toggleSection = (section) => {
        if (window.innerWidth <= 768) {
            setExpandedSections(prev => ({
                ...prev,
                [section]: !prev[section]
            }));
        }
    };

    return (
        <footer className="footer">
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
                                Lorem Ipsum is simply dummy text of the and typesetting industry. Lorem Ipsum is dummy text of the printing.
                            </p>

                            <div className="footer-contact">
                                <div className="footer-contact-item">
                                    <FiMapPin />
                                    <span>Mumbai, Maharashtra, India</span>
                                </div>
                                <div className="footer-contact-item">
                                    <FiPhone />
                                    <a href="tel:+919876543210">+91 98765 43210</a>
                                </div>
                                <div className="footer-contact-item">
                                    <FiMail />
                                    <a href="mailto:info@satvaorganics.com">info@satvaorganics.com</a>
                                </div>
                            </div>

                            <div className="footer-social">
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                    <FaFacebookF />
                                </a>
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                                    <FaTwitter />
                                </a>
                                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                                    <FaYoutube />
                                </a>
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                    <FaInstagram />
                                </a>
                                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                                    <FaTiktok />
                                </a>
                            </div>
                        </div>

                        {/* Company Links */}
                        <div className={`footer-column ${expandedSections['company'] ? 'expanded' : ''}`}>
                            <h4 className="footer-title" onClick={() => toggleSection('company')}>
                                Company
                                <FiChevronDown className="footer-toggle-icon" />
                            </h4>
                            <ul className="footer-links">
                                <li><Link to="/about">About</Link></li>
                                <li><Link to="/blogs">Blogs</Link></li>
                                <li><Link to="/products">All products</Link></li>
                                <li><Link to="/locations">Locations Map</Link></li>
                                <li><Link to="/faq">Faq</Link></li>
                                <li><Link to="/contact">Contact</Link></li>
                            </ul>
                        </div>

                        {/* Services Links */}
                        <div className={`footer-column ${expandedSections['services'] ? 'expanded' : ''}`}>
                            <h4 className="footer-title" onClick={() => toggleSection('services')}>
                                Services
                                <FiChevronDown className="footer-toggle-icon" />
                            </h4>
                            <ul className="footer-links">
                                <li><Link to="/track-order">Order tracking</Link></li>
                                <li><Link to="/wishlist">Wishlist</Link></li>
                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/account" className="highlight-link">My Account</Link></li>
                                <li><Link to="/terms">Terms of Service</Link></li>
                                <li><Link to="/offers">Promotional Offers</Link></li>
                            </ul>
                        </div>

                        {/* Customer Care Links */}
                        <div className={`footer-column ${expandedSections['customer'] ? 'expanded' : ''}`}>
                            <h4 className="footer-title" onClick={() => toggleSection('customer')}>
                                Customer Care
                                <FiChevronDown className="footer-toggle-icon" />
                            </h4>
                            <ul className="footer-links">
                                <li><Link to="/track-order">Order tracking</Link></li>
                                <li><Link to="/wishlist">Wishlist</Link></li>
                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/account">My Account</Link></li>
                                <li><Link to="/terms">Terms of Service</Link></li>
                                <li><Link to="/offers">Promotional Offers</Link></li>
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

            {/* WhatsApp Sticky Button */}
            <a 
                href="https://wa.me/919876543210" 
                className="whatsapp-sticky" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
            >
                <FaWhatsapp />
            </a>

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
