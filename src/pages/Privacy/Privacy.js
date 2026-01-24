import React, { useEffect } from 'react';
import './Privacy.css';

const Privacy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <div className="privacy-header">
          <h1 className="privacy-title">Privacy Policy</h1>
          <p className="privacy-intro">
            We are committed to protecting the privacy and security of your personal data.
          </p>
        </div>

        <div className="privacy-content">
          <section className="privacy-section">
            <h2>1. Introduction</h2>
            <p>
              Welcome to www.satvaorganics.store (the "Website"), owned and operated by Satva Organics 
              ("we," "us," or "our"), located in Kolhapur, Maharashtra, India.
            </p>
            <p>
              We are committed to protecting the privacy and security of your personal data. This Privacy Policy 
              explains how we collect, use, process, share, and protect your personal data when you visit or use 
              our Website, in compliance with India's Digital Personal Data Protection Act, 2023 (DPDPA).
            </p>
            <p>
              By accessing or using our Website, you signify your understanding of the terms outlined in this 
              Privacy Policy. Please read it carefully.
            </p>
          </section>

          <section className="privacy-section">
            <h2>2. Definitions</h2>
            <ul>
              <li><strong>Personal Data:</strong> Any data about an individual who is identifiable by or in relation to such data, as defined under the DPDPA.</li>
              <li><strong>Data Fiduciary:</strong> Satva Organics.</li>
              <li><strong>Data Principal:</strong> The individual to whom the personal data relates (i.e., "you").</li>
              <li><strong>Processing:</strong> Any operation performed on personal data such as collection, storage, use, sharing, etc.</li>
              <li><strong>Consent:</strong> Freely given, specific, informed, and unambiguous indication of the Data Principal’s agreement to processing.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>3. Information We Collect (Personal Data)</h2>
            <p>We collect the following types of Personal Data:</p>
            <ul>
              <li><strong>Identity Data:</strong> First name, last name.</li>
              <li><strong>Contact Data:</strong> Email address, phone number, delivery and billing addresses.</li>
              <li><strong>Technical Data:</strong> IP address, browser type/version, device ID, etc.</li>
              <li><strong>Usage Data:</strong> How you use our Website, products, and services.</li>
              <li><strong>Marketing and Communications Data:</strong> Preferences for receiving marketing.</li>
              <li><strong>Transaction Data:</strong> Payment details, order history.</li>
              <li><strong>User-Generated Content:</strong> Comments, reviews, etc.</li>
            </ul>
            <p>We do not knowingly collect Sensitive Personal Data unless explicitly required and consented to.</p>
          </section>

          <section className="privacy-section">
            <h2>4. How We Collect Your Information</h2>
            <ul>
              <li><strong>Direct Interactions:</strong> Through forms, emails, or calls.</li>
              <li><strong>Automated Technologies:</strong> Cookies, logs, and tracking tools.</li>
              <li><strong>Third Parties:</strong> Google Analytics, payment gateways, etc.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>5. Purpose of Collecting and Using Your Personal Data</h2>
            <p>Your Personal Data is collected and processed for:</p>
            <ul>
              <li>Providing access to Website and services</li>
              <li>Processing registrations and orders</li>
              <li>Customer service and communication</li>
              <li>Marketing (with your consent)</li>
              <li>Website personalization and improvement</li>
              <li>Security, legal compliance, and analytic</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>6. Legal Basis for Processing (Consent)</h2>
            <p>
              Our primary legal basis is your Consent, given clearly before data is collected. In limited cases, we 
              may rely on "Certain Legitimate Uses" under the DPDPA.
            </p>
          </section>

          <section className="privacy-section">
            <h2>7. Data Sharing and Disclosure</h2>
            <p>We do not sell or rent your Personal Data. We may share it with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Bound by contracts to protect your data.</li>
              <li><strong>Legal Requirements:</strong> For compliance with law and regulations.</li>
              <li><strong>Protection of Rights:</strong> In case of fraud, abuse, or legal disputes.</li>
              <li><strong>Business Transfers:</strong> During mergers or acquisitions.</li>
              <li><strong>With Your Consent:</strong> As explicitly allowed by you.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>8. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tools to personalize experience, track usage, and improve performance. 
              You can manage cookie settings via your browser or cookie consent tool.
            </p>
          </section>

          <section className="privacy-section">
            <h2>9. Data Security</h2>
            <p>
              We use reasonable security measures to protect your data, in accordance with the DPDPA. However, 
              no digital storage or transmission is fully secure.
            </p>
          </section>

          <section className="privacy-section">
            <h2>10. Data Retention</h2>
            <p>
              We retain your data as long as necessary to fulfill the purpose it was collected for, and to comply 
              with legal obligations. Data is securely deleted or anonymized after the retention period.
            </p>
          </section>

          <section className="privacy-section">
            <h2>11. Your Rights as a Data Principal</h2>
            <ul>
              <li><strong>Access:</strong> Request confirmation, summary, or copy of your data.</li>
              <li><strong>Correction/Erasure:</strong> Request updates or deletion of inaccurate data.</li>
              <li><strong>Withdraw Consent:</strong> Opt-out of data processing at any time.</li>
              <li><strong>Grievance Redressal:</strong> File complaints about data misuse.</li>
              <li><strong>Nomination:</strong> Assign someone to manage your rights if incapacitated.</li>
            </ul>
            <p>To exercise these rights, contact the Grievance Officer listed below.</p>
          </section>

          <section className="privacy-section">
            <h2>12. Grievance Redressal</h2>
            <div className="contact-box">
              <p><strong>Name:</strong> Chetan Patil</p>
              <p><strong>Email:</strong> <a href="mailto:info.satvaorganics@gmail.com">info.satvaorganics@gmail.com</a></p>
              <p><strong>Address:</strong> Sangli-kolhapur Byepass Road, Village - Jainapur (Jaysingpur), Kolhapur, Maharashtra - 416101</p>
            </div>
          </section>

          <section className="privacy-section">
            <h2>13. Cross-Border Data Transfer</h2>
            <p>
              We will only transfer your data to jurisdictions allowed under DPDPA and ensure it is protected by 
              contractual or technical safeguards.
            </p>
          </section>

          <section className="privacy-section">
            <h2>14. Children's Privacy</h2>
            <p>
              This Website is not intended for those under 18. If we become aware that we’ve collected data from 
              a minor without proper consent, we will delete it immediately.
            </p>
          </section>

          <section className="privacy-section">
            <h2>15. Changes to This Privacy Policy</h2>
            <p>
              We may revise this policy periodically. Updates will be posted on this page with a new "Last 
              Updated" date. Continued use after changes means acceptance.
            </p>
          </section>

          <section className="privacy-section">
            <h2>16. Governing Law</h2>
            <p>
              This Privacy Policy shall be governed by the laws of India, including the DPDPA 2023.
            </p>
          </section>

          <section className="privacy-section">
            <h2>17. Contact Us</h2>
            <p>For general privacy questions, contact:</p>
            <div className="contact-box">
              <p><strong>Email:</strong> <a href="mailto:info.satvaorganics@gmail.com">info.satvaorganics@gmail.com</a></p>
              <p><strong>Postal Address:</strong> Sangli-kolhapur Byepass Road, Village - Jainapur (Jaysingpur), Kolhapur, Maharashtra - 416101</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
