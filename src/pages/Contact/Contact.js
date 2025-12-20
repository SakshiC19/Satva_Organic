import React, { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiUser, FiChevronDown, FiEdit } from 'react-icons/fi';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    serviceType: '',
    phone: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="contact-page">
      {/* Contact Header Section */}
      <section className="contact-header-section">
        <div className="container">
          <div className="contact-header-content">
            <h1 className="contact-header-title">Contact Us</h1>
            <div className="title-underline"></div>
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section className="contact-info-section">
        <div className="container">
          <div className="contact-info-grid">
            {/* Email Address */}
            <div className="contact-info-card">
              <div className="contact-icon-wrapper">
                <FiMail className="contact-icon" />
                <span className="contact-icon-badge"></span>
              </div>
              <h3 className="contact-info-title">Email Address</h3>
              <p className="contact-info-text">info@webmail.com</p>
              <p className="contact-info-text">jobs@webexample.com</p>
            </div>

            {/* Phone Number */}
            <div className="contact-info-card">
              <div className="contact-icon-wrapper">
                <FiPhone className="contact-icon" />
                <span className="contact-icon-badge"></span>
              </div>
              <h3 className="contact-info-title">Phone Number</h3>
              <p className="contact-info-text">+0123-456789</p>
              <p className="contact-info-text">+987-6543210</p>
            </div>

            {/* Office Address */}
            <div className="contact-info-card">
              <div className="contact-icon-wrapper">
                <FiMapPin className="contact-icon" />
                <span className="contact-icon-badge"></span>
              </div>
              <h3 className="contact-info-title">Office Address</h3>
              <p className="contact-info-text">18/A, New Born Town Hall</p>
              <p className="contact-info-text">New York, US</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="contact-form-section">
        <div className="container">
          <div className="contact-content-wrapper">
            {/* Form Section */}
            <div className="contact-form-wrapper">
              <h2 className="form-title">Get a Queue</h2>

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group-icon">
                    <input 
                      type="text" 
                      name="name" 
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                    <FiUser className="input-icon" />
                  </div>
                  <div className="form-group-icon">
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                    <FiMail className="input-icon" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group-icon">
                    <select 
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Service Type</option>
                      <option value="organic-products">Organic Products</option>
                      <option value="bulk-order">Bulk Order</option>
                      <option value="consultation">Consultation</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                    <FiChevronDown className="input-icon" />
                  </div>
                  <div className="form-group-icon">
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                    <FiPhone className="input-icon" />
                  </div>
                </div>

                <div className="form-group-icon">
                  <textarea 
                    name="message" 
                    rows="6"
                    placeholder="Enter message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>
                  <FiEdit className="input-icon textarea-icon" />
                </div>

                <button type="submit" className="submit-btn">
                  Get a free service
                </button>
              </form>
            </div>

            {/* Map Section */}
            <div className="map-wrapper">
              <div className="map-container">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d193595.15830869428!2d-74.119763973046!3d40.69766374874431!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1703123456789!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Office Location"
                ></iframe>
                <div className="map-overlay">
                  <button className="map-directions-btn">
                    Get Directions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
