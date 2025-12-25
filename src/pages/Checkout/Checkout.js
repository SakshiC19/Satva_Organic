import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { FiCheck, FiShield, FiLoader } from 'react-icons/fi';
import './Checkout.css';

const Checkout = () => {
  const { currentUser, login, signup } = useAuth();
  const { cartItems, cartTotal } = useCart();
  const navigate = useNavigate();

  // Safety check for cartTotal
  const safeCartTotal = cartTotal || 0;
  const safeCartItems = cartItems || [];

  const [activeStep, setActiveStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

  const [address, setAddress] = useState({
    name: '',
    phone: '',
    pincode: '',
    locality: '',
    address: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    if (currentUser) {
      setActiveStep(2);
      setEmail(currentUser.email);
    } else {
      setActiveStep(1);
    }
  }, [currentUser]);

  // Pincode Auto-fill functionality
  const fetchPincodeDetails = async (pincode) => {
    if (pincode.length !== 6) {
      setPincodeError('');
      return;
    }

    setPincodeLoading(true);
    setPincodeError('');

    try {
      // Using India Post Pincode API
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (data && data[0] && data[0].Status === 'Success') {
        const postOffice = data[0].PostOffice[0];
        setAddress(prev => ({
          ...prev,
          locality: postOffice.Name || '',
          city: postOffice.District || '',
          state: postOffice.State || ''
        }));
        setPincodeError('');
      } else {
        setPincodeError('Invalid pincode or details not found');
        // Clear auto-filled fields
        setAddress(prev => ({
          ...prev,
          locality: '',
          city: '',
          state: ''
        }));
      }
    } catch (error) {
      console.error('Error fetching pincode details:', error);
      setPincodeError('Failed to fetch pincode details');
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddress({ ...address, pincode: value });

    if (value.length === 6) {
      fetchPincodeDetails(value);
    }
  };

  const handleLoginContinue = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignup) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to ' + (isSignup ? 'create account' : 'login') + '. Please check your credentials.');
    }
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    setActiveStep(3);
  };

  const handleSummaryContinue = () => {
    setActiveStep(4);
  };

  const StepHeader = ({ step, title, info }) => {
    const isActive = activeStep === step;
    const isCompleted = activeStep > step;

    return (
      <div className={`step-header ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
        <div className="step-number">
          {isCompleted ? <FiCheck /> : step}
        </div>
        <div className="step-title-wrapper">
          <span className="step-title">{title}</span>
          {isCompleted && info && <span className="step-info">{info}</span>}
        </div>
        {isCompleted && (
          <button
            className="step-action-btn"
            onClick={() => setActiveStep(step)}
          >
            CHANGE
          </button>
        )}
      </div>
    );
  };

  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmOrder = async () => {
    setShowConfirmation(true);
    setTimeout(() => {
      // navigate('/account/orders');
    }, 5000);
  };

  return (
    <div className="checkout-page">
      {showConfirmation && (
        <div className="order-confirmation-overlay">
          <div className="order-confirmation-popup">
            <div className="celebration-gif">
              <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmM2Z3g2Z3g2Z3g2Z3g2Z3g2Z3g2Z3g2Z3g2Z3g2Z3g/26tOZ42Mg6pbTpr7W/giphy.gif" alt="Celebration" />
            </div>
            <h2>Order Confirmed!</h2>
            <p>Thank you for shopping with Satva Organics.</p>
            <button onClick={() => navigate('/shop')} className="continue-shopping-btn">
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      <div className="checkout-container">
        {/* Main Content */}
        <div className="checkout-main">

          {/* Step 1: Login */}
          <div className="checkout-step">
            <StepHeader
              step={1}
              title="LOGIN OR SIGNUP"
              info={currentUser ? `Logged in as ${currentUser.displayName || currentUser.email}` : null}
            />
            {activeStep === 1 && !currentUser && (
              <div className="step-body">
                <div className="login-step-content">
                  <div className="login-form-container">
                    <form onSubmit={handleLoginContinue}>
                      <input
                        type="email"
                        className="checkout-input"
                        placeholder="Enter Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />

                      {isSignup && (
                        <input
                          type="text"
                          className="checkout-input"
                          placeholder="Enter Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      )}

                      <input
                        type="password"
                        className="checkout-input"
                        placeholder="Enter Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />

                      {error && <p style={{ color: 'red', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}

                      <button type="submit" className="continue-btn">
                        {isSignup ? 'Signup & Continue' : 'Login & Continue'}
                      </button>

                      <div style={{ marginTop: '12px', fontSize: '14px', textAlign: 'center' }}>
                        <span style={{ color: '#878787' }}>
                          {isSignup ? 'Existing User? ' : 'New to Satva Organics? '}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSignup(!isSignup);
                            setError('');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2874f0',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          {isSignup ? 'Log in' : 'Sign up'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Delivery Address */}
          <div className="checkout-step">
            <StepHeader
              step={2}
              title="DELIVERY ADDRESS"
              info={activeStep > 2 ? `${address.name}, ${address.pincode}` : null}
            />
            {activeStep === 2 && (
              <div className="step-body">
                <form className="address-form" onSubmit={handleAddressSubmit}>
                  <div className="form-row">
                    <input
                      type="text"
                      className="checkout-input"
                      placeholder="Name"
                      required
                      value={address.name}
                      onChange={e => setAddress({ ...address, name: e.target.value })}
                    />
                    <input
                      type="tel"
                      className="checkout-input"
                      placeholder="10-digit mobile number"
                      required
                      maxLength="10"
                      pattern="[0-9]{10}"
                      value={address.phone}
                      onChange={e => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="input-with-loader">
                      <input
                        type="text"
                        className="checkout-input"
                        placeholder="Pincode"
                        required
                        maxLength="6"
                        value={address.pincode}
                        onChange={handlePincodeChange}
                      />
                      {pincodeLoading && <FiLoader className="input-loader spinning" />}
                    </div>
                    <input
                      type="text"
                      className="checkout-input"
                      placeholder="Locality"
                      required
                      value={address.locality}
                      onChange={e => setAddress({ ...address, locality: e.target.value })}
                    />
                  </div>
                  {pincodeError && <p className="pincode-error">{pincodeError}</p>}

                  <textarea
                    className="checkout-input full-width"
                    placeholder="Address (Area and Street)"
                    rows="3"
                    required
                    value={address.address}
                    onChange={e => setAddress({ ...address, address: e.target.value })}
                  ></textarea>

                  <div className="form-row">
                    <input
                      type="text"
                      className="checkout-input"
                      placeholder="City/District/Town"
                      required
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                    />
                    <input
                      type="text"
                      className="checkout-input"
                      placeholder="State"
                      required
                      value={address.state}
                      onChange={e => setAddress({ ...address, state: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="continue-btn save-address-btn">
                    SAVE AND DELIVER HERE
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Step 3: Order Summary */}
          <div className="checkout-step">
            <StepHeader step={3} title="ORDER SUMMARY" info={`${safeCartItems.length} Items`} />
            {activeStep === 3 && (
              <div className="step-body">
                {safeCartItems.map(item => {
                  const itemImage = item.images && item.images.length > 0
                    ? (item.images[0].url || item.images[0])
                    : item.image;

                  return (
                    <div key={`${item.id}-${item.selectedSize || 'default'}`} className="order-summary-item">
                      <img src={itemImage} alt={item.name} className="summary-item-image" />
                      <div className="summary-item-details">
                        <h4>{item.name}</h4>
                        <div className="summary-item-meta">
                          Size: {item.selectedSize || 'Standard'} | Quantity: {item.quantity}
                        </div>
                        <div className="summary-item-price">
                          ₹{item.price * item.quantity}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={handleSummaryContinue} className="continue-btn">
                  CONTINUE
                </button>
              </div>
            )}
          </div>

          {/* Step 4: Payment Options */}
          <div className="checkout-step">
            <StepHeader step={4} title="PAYMENT OPTIONS" />
            {activeStep === 4 && (
              <div className="step-body">
                <div className="payment-options">
                  <label className="payment-option">
                    <input type="radio" name="payment" />
                    <span>UPI</span>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment" />
                    <span>Wallets</span>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment" />
                    <span>Credit / Debit / ATM Card</span>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment" />
                    <span>Net Banking</span>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment" defaultChecked />
                    <span>Cash on Delivery</span>
                  </label>
                </div>
                <button
                  className="continue-btn confirm-order-btn"
                  onClick={handleConfirmOrder}
                >
                  CONFIRM ORDER
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Sidebar - Price Details */}
        <div className="checkout-sidebar">
          <div className="price-details-card">
            <div className="price-header">PRICE DETAILS</div>
            <div className="price-content">
              {/* Product Details Breakdown */}
              <div className="products-breakdown">
                <div className="breakdown-header">
                  Price ({safeCartItems.length} item{safeCartItems.length !== 1 ? 's' : ''})
                </div>
                {safeCartItems.map((item, index) => {
                  const itemImage = item.images && item.images.length > 0
                    ? (item.images[0].url || item.images[0])
                    : item.image;

                  return (
                    <div key={`price-${item.id}-${item.selectedSize || 'default'}-${index}`} className="product-price-item">
                      <div className="product-price-left">
                        <img src={itemImage} alt={item.name} className="product-price-thumb" />
                        <div className="product-price-info">
                          <div className="product-price-name">{item.name}</div>
                          <div className="product-price-meta">
                            {item.selectedSize && <span>{item.selectedSize}</span>}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="product-price-amount">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="price-divider"></div>

              <div className="price-row">
                <span>Subtotal</span>
                <span>₹{safeCartTotal.toLocaleString()}</span>
              </div>
              <div className="price-row">
                <span>Delivery Charges</span>
                <span className="green-text">FREE</span>
              </div>

              <div className="price-divider"></div>

              <div className="price-row total">
                <span>Total Payable</span>
                <span>₹{safeCartTotal.toLocaleString()}</span>
              </div>
              <div className="savings-text">
                Your Total Savings on this order ₹0
              </div>
            </div>
          </div>

          <div className="secure-badge">
            <FiShield className="secure-icon" />
            <div>
              Safe and Secure Payments. Easy returns.<br />
              100% Authentic products.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
