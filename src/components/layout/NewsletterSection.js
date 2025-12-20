import React, { useState } from 'react';
import { FaTwitter, FaInstagram, FaGoogle, FaLinkedinIn, FaPinterestP } from 'react-icons/fa';
import './NewsletterSection.css';

const NewsletterSection = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Newsletter subscription:', email);
    setEmail('');
  };

  return (
    <section className="newsletter-section">
      <div className="container">
        <div className="newsletter-content">
          <h2 className="newsletter-title">Subscribe Newsletter.</h2>
          <p className="newsletter-desc">
            Get e-mail updates about our latest shop and special offers.
          </p>
          
          <form onSubmit={handleSubmit} className="newsletter-form-large">
            <input
              type="email"
              placeholder="Enter you email address here..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="newsletter-input-large"
            />
            <button type="submit" className="newsletter-btn-large">
              SUBSCRIBE
            </button>
          </form>

          <div className="newsletter-social">
            <button className="social-icon-circle"><FaTwitter /></button>
            <button className="social-icon-circle"><FaInstagram /></button>
            <button className="social-icon-circle"><FaGoogle /></button>
            <button className="social-icon-circle"><FaLinkedinIn /></button>
            <button className="social-icon-circle"><FaPinterestP /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
