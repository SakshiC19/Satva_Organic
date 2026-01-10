import React from 'react';
import './Terms.css';

const Terms = () => {
  return (
    <div className="terms-page">
      <div className="container">
        <div className="terms-container">
          <h1 className="terms-title">Terms and Conditions</h1>
          <div className="terms-content">
            <p className="last-updated">Last Updated: January 10, 2026</p>
            
            <section>
              <h2>1. Introduction</h2>
              <p>Welcome to Satva Organics. By accessing our website, you agree to these terms and conditions. Please read them carefully.</p>
            </section>

            <section>
              <h2>2. Use of the Website</h2>
              <p>By using this website, you warrant that you are at least 18 years of age or are accessing the site under the supervision of a parent or guardian.</p>
            </section>

            <section>
              <h2>3. Privacy Policy</h2>
              <p>Your use of the website is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices.</p>
            </section>

            <section>
              <h2>4. Products and Pricing</h2>
              <p>All products listed on the website, their descriptions, and their prices are each subject to change. Satva Organics reserves the right, at any time, to modify, suspend, or discontinue the sale of any product with or without notice.</p>
            </section>

            <section>
              <h2>5. Orders and Payments</h2>
              <p>We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order.</p>
            </section>

            <section>
              <h2>6. Shipping and Delivery</h2>
              <p>Shipping and delivery dates are estimates only and cannot be guaranteed. We are not liable for any delays in shipments.</p>
            </section>

            <section>
              <h2>7. Returns and Refunds</h2>
              <p>Please refer to our Returns Policy for information about returning products purchased on our website.</p>
            </section>

            <section>
              <h2>8. Contact Information</h2>
              <p>If you have any questions about these Terms, please contact us at satvaorganics@gmail.com.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
