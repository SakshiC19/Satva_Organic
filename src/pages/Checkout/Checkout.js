import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { FiCheck, FiShield, FiEdit2, FiPlus } from 'react-icons/fi';
import { generateInvoice } from '../../utils/invoiceGenerator';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './Checkout.css';

const Checkout = () => {
  const { currentUser, login, signup } = useAuth();
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  
  // Phone Verification State
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // Check if COD is available for all items in cart
  // Default to true if codAvailable property is missing (backward compatibility)
  const isCodAvailable = cartItems.every(item => item.codAvailable !== false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(isCodAvailable ? 'cod' : 'razorpay');

  // Update payment method if COD becomes unavailable
  useEffect(() => {
    if (!isCodAvailable && selectedPaymentMethod === 'cod') {
      setSelectedPaymentMethod('razorpay');
    }
  }, [isCodAvailable, selectedPaymentMethod]);
  
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    pincode: '',
    locality: '',
    address: '',
    city: '',
    state: ''
  });

  const [localities, setLocalities] = useState([]);
  const [loadingPincode, setLoadingPincode] = useState(false);

  const handlePincodeChange = async (e) => {
    const newPincode = e.target.value.replace(/\D/g, ''); // Only allow numbers
    if (newPincode.length > 6) return;

    setAddress(prev => ({ ...prev, pincode: newPincode }));

    if (newPincode.length === 6) {
      setLoadingPincode(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${newPincode}`);
        const data = await response.json();
        
        if (data[0].Status === "Success") {
          const postOffices = data[0].PostOffice;
          const state = postOffices[0].State;
          const district = postOffices[0].District;
          
          // Get unique locality names
          const localityOptions = [...new Set(postOffices.map(po => po.Name))].sort();
          
          setAddress(prev => ({
            ...prev,
            state: state,
            city: district,
            locality: '' // Reset locality so user has to select
          }));
          setLocalities(localityOptions);
        } else {
           setLocalities([]);
        }
      } catch (error) {
        console.error("Error fetching pincode details:", error);
        setLocalities([]);
      } finally {
        setLoadingPincode(false);
      }
    } else {
      setLocalities([]);
    }
  };

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (currentUser) {
      setActiveStep(2);
      setEmail(currentUser.email);
      fetchSavedAddresses();
    } else {
      setActiveStep(1);
    }
  }, [currentUser]);

  const fetchSavedAddresses = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().addresses) {
        setSavedAddresses(userDoc.data().addresses);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
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
      // Success is handled by useEffect listening to currentUser
    } catch (err) {
      console.error(err);
      setError('Failed to ' + (isSignup ? 'create account' : 'login') + '. Please check your credentials.');
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    
    if (!isPhoneVerified) {
      alert('Please verify your mobile number with OTP before proceeding. (Use 123456 for demo)');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      let updatedAddresses = [...savedAddresses];

      if (editingIndex !== null) {
        // Update existing address
        updatedAddresses[editingIndex] = address;
        await updateDoc(userRef, { addresses: updatedAddresses });
      } else {
        // Add new address
        updatedAddresses.push(address);
        await updateDoc(userRef, { addresses: arrayUnion(address) });
      }

      setSavedAddresses(updatedAddresses);
      setIsAddingNew(false);
      setEditingIndex(null);
      setActiveStep(3);
    } catch (error) {
      console.error("Error saving address:", error);
      // Still proceed to next step even if save fails, but maybe show an error?
      setActiveStep(3);
    }
  };

  const handleEditAddress = (index) => {
    setAddress(savedAddresses[index]);
    setEditingIndex(index);
    setIsAddingNew(true);
  };

  const handleSelectAddress = (selectedAddr) => {
    setAddress(selectedAddr);
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
            Change
          </button>
        )}
      </div>
    );
  };

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Helper to remove undefined values
  const sanitizeData = (data) => {
    return JSON.parse(JSON.stringify(data));
  };

  const handleConfirmOrder = async () => {
    // Sanitize items to ensure no undefined values or complex objects
    const sanitizedItems = cartItems.map(item => ({
      id: item.id || '',
      name: item.name || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      selectedSize: item.selectedSize || 'Standard',
      image: item.image || (item.images && item.images[0] ? (item.images[0].url || item.images[0]) : ''),
      // Add other necessary fields but avoid spreading everything if it contains undefined
    }));

    // Construct the order object
    const rawOrderData = {
      customerName: address.name || currentUser?.displayName || 'Guest',
      email: email || currentUser?.email || '',
      phoneNumber: address.phone || '',
      shippingAddress: {
        name: address.name || '',
        phone: address.phone || '',
        pincode: address.pincode || '',
        locality: address.locality || '',
        address: address.address || '',
        city: address.city || '',
        state: address.state || ''
      },
      items: sanitizedItems,
      totalAmount: cartTotal || 0,
      paymentMethod: selectedPaymentMethod,
      status: 'Pending',
      createdAt: serverTimestamp(),
      userId: currentUser?.uid || 'guest',
      orderCount: 1 
    };

    // Remove any remaining undefined values
    const orderData = sanitizeData(rawOrderData);

    if (selectedPaymentMethod === 'razorpay') {
      // Simulate Razorpay payment flow
      const options = {
        key: "YOUR_RAZORPAY_KEY", 
        amount: (cartTotal || 0) * 100, 
        currency: "INR",
        name: "Satva Organics",
        description: "Grocery Purchase",
        image: "https://example.com/your_logo",
        handler: async function (response) {
          try {
            // Create Order
            await addDoc(collection(db, 'orders'), {
              ...orderData,
              paymentId: response.razorpay_payment_id,
              paymentStatus: 'Paid'
            });

            // Reduce Stock
            const { increment } = await import('firebase/firestore');
            const stockUpdates = cartItems.map(item => {
              const productRef = doc(db, 'products', item.id);
              return updateDoc(productRef, {
                stock: increment(-item.quantity)
              });
            });
            await Promise.all(stockUpdates);

            setShowConfirmation(true);
          } catch (error) {
            console.error("Error saving order (Razorpay):", error);
            alert("Payment successful but failed to place order. Please contact support.");
          }
        },
        prefill: {
          name: address.name || currentUser?.displayName,
          email: email,
          contact: address.phone
        },
        theme: {
          color: "#27ae60"
        }
      };
      
      alert("Redirecting to Razorpay Payment Gateway...");
      setTimeout(async () => {
        // Simulate success handler
        try {
            await addDoc(collection(db, 'orders'), {
              ...orderData,
              paymentId: 'pay_' + Date.now(),
              paymentStatus: 'Paid'
            });

            // Reduce Stock
            const { increment } = await import('firebase/firestore');
            const stockUpdates = cartItems.map(item => {
              const productRef = doc(db, 'products', item.id);
              return updateDoc(productRef, {
                stock: increment(-item.quantity)
              });
            });
            await Promise.all(stockUpdates);

            setShowConfirmation(true);
        } catch (error) {
            console.error("Error saving order (Simulated):", error);
            alert("Failed to place order. Please try again.");
        }
      }, 1500);
      
    } else {
      // Cash on Delivery
      try {
        await addDoc(collection(db, 'orders'), {
            ...orderData,
            paymentStatus: 'Pending'
        });

        // Reduce Stock
        const { increment } = await import('firebase/firestore');
        const stockUpdates = cartItems.map(item => {
          const productRef = doc(db, 'products', item.id);
          return updateDoc(productRef, {
            stock: increment(-item.quantity)
          });
        });
        await Promise.all(stockUpdates);

        setShowConfirmation(true);
      } catch (error) {
        console.error("Error saving order (COD):", error);
        alert("Failed to place order. Please try again.");
      }
    }
    
    // Hide confetti after 5 seconds
    setTimeout(() => {
      // navigate('/account/orders'); // Redirect to orders page
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
              title="Login or Signup" 
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

                      {error && <p style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>{error}</p>}

                      <button type="submit" className="continue-btn">
                        {isSignup ? 'Signup & Continue' : 'Login & Continue'}
                      </button>
                      
                      <div style={{marginTop: '12px', fontSize: '14px', textAlign: 'center'}}>
                        <span style={{color: '#878787'}}>
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
              title="Delivery Address" 
              info={activeStep > 2 ? `${address.name}, ${address.pincode}` : null}
            />
            {activeStep === 2 && (
              <div className="step-body">
                {!isAddingNew && savedAddresses.length > 0 ? (
                  <div className="saved-addresses-list">
                    {savedAddresses.map((addr, index) => (
                      <div key={index} className="saved-address-card">
                        <div className="address-header">
                          <span className="address-name">{addr.name}</span>
                          <span className="address-type">{addr.locality}</span>
                        </div>
                        <p className="address-text">
                          {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="address-phone">Phone: {addr.phone}</p>
                        <div className="address-actions">
                          <button 
                            className="deliver-here-btn"
                            onClick={() => handleSelectAddress(addr)}
                          >
                            Deliver Here
                          </button>
                          <button 
                            className="edit-address-btn"
                            onClick={() => handleEditAddress(index)}
                          >
                            <FiEdit2 /> Edit
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      className="add-new-address-btn"
                      onClick={() => {
                        setAddress({
                          name: '', phone: '', pincode: '', locality: '',
                          address: '', city: '', state: ''
                        });
                        setEditingIndex(null);
                        setIsAddingNew(true);
                      }}
                    >
                      <FiPlus /> Add New Address
                    </button>
                  </div>
                ) : (
                  <form className="address-form" onSubmit={handleAddressSubmit}>
                    <input 
                      type="text" 
                      className="checkout-input" 
                      placeholder="Name" 
                      required 
                      value={address.name}
                      onChange={e => setAddress({...address, name: e.target.value})}
                    />
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className="checkout-input" 
                        placeholder="10-digit mobile number" 
                        required 
                        value={address.phone}
                        onChange={e => {
                          setAddress({...address, phone: e.target.value});
                          setIsPhoneVerified(false);
                        }}
                        disabled={isPhoneVerified}
                      />
                      {!isPhoneVerified && address.phone.length === 10 && !showOtpInput && (
                        <button 
                          type="button"
                          className="verify-btn"
                          onClick={() => setShowOtpInput(true)}
                        >
                          Verify
                        </button>
                      )}
                      {isPhoneVerified && (
                        <span className="verified-badge">
                          <FiCheck /> Verified
                        </span>
                      )}
                    </div>

                    {showOtpInput && (
                      <div className="otp-container full-width">
                        <p>Enter 6-digit OTP sent to {address.phone}</p>
                        <div className="otp-input-group">
                          <input 
                            type="text" 
                            maxLength="6" 
                            placeholder="000000"
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (otp === '123456') {
                                setIsPhoneVerified(true);
                                setShowOtpInput(false);
                              } else {
                                alert('Invalid OTP. Use 123456 for demo.');
                              }
                            }}
                          >
                            Verify OTP
                          </button>
                          <button type="button" className="resend-btn" onClick={() => setOtp('')}>Resend</button>
                        </div>
                      </div>
                    )}
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className="checkout-input" 
                        placeholder="Pincode" 
                        required 
                        value={address.pincode}
                        onChange={handlePincodeChange}
                        maxLength={6}
                      />
                      {loadingPincode && (
                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#666' }}>
                          Checking...
                        </div>
                      )}
                    </div>
                    
                    {localities.length > 0 ? (
                      <select
                        className="checkout-input"
                        value={address.locality}
                        onChange={e => setAddress({...address, locality: e.target.value})}
                        required
                        style={{ backgroundColor: 'white' }}
                      >
                        <option value="">Select Locality</option>
                        {localities.map((loc, index) => (
                          <option key={index} value={loc}>{loc}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="checkout-input" 
                        placeholder="Locality" 
                        required 
                        value={address.locality}
                        onChange={e => setAddress({...address, locality: e.target.value})}
                      />
                    )}
                    <textarea 
                      className="checkout-input full-width" 
                      placeholder="Address (Area and Street)" 
                      rows="3" 
                      required
                      value={address.address}
                      onChange={e => setAddress({...address, address: e.target.value})}
                    ></textarea>
                    <input 
                      type="text" 
                      className="checkout-input" 
                      placeholder="City/District/Town" 
                      required 
                      value={address.city}
                      onChange={e => setAddress({...address, city: e.target.value})}
                    />
                    <input 
                      type="text" 
                      className="checkout-input" 
                      placeholder="State" 
                      required 
                      value={address.state}
                      onChange={e => setAddress({...address, state: e.target.value})}
                    />
                    
                    <div className="form-actions">
                      <button type="submit" className="continue-btn" style={{width: '200px'}}>
                        {editingIndex !== null ? 'Update Address' : 'Save and Deliver Here'}
                      </button>
                      {savedAddresses.length > 0 && (
                        <button 
                          type="button" 
                          className="cancel-btn"
                          onClick={() => {
                            setIsAddingNew(false);
                            setEditingIndex(null);
                          }}
                          style={{
                            marginLeft: '10px',
                            padding: '12px 24px',
                            border: '1px solid #e0e0e0',
                            background: 'white',
                            color: '#2874f0',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Step 3: Order Summary */}
          <div className="checkout-step">
            <StepHeader step={3} title="Order Summary" info={`${cartItems.length} Items`} />
            {activeStep === 3 && (
              <div className="step-body">
                {cartItems.map(item => {
                  const itemImage = item.images && item.images.length > 0 
                    ? (item.images[0].url || item.images[0]) 
                    : item.image;

                  return (
                    <div key={`${item.id}-${item.selectedSize || 'default'}`} className="order-summary-item">
                      <div className="item-main-info">
                        <img src={itemImage} alt={item.name} className="item-image" />
                        <div className="item-details">
                          <h4 className="item-name">{item.name}</h4>
                          <div className="item-meta">
                            Size: {item.selectedSize || 'Standard'}
                          </div>
                          <div className="item-price">
                            ₹{item.price}
                          </div>
                        </div>
                      </div>
                      
                      <div className="item-controls-row">
                        <div className="item-quantity-controls">
                          <button 
                            className="qty-btn"
                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button 
                            className="qty-btn"
                            onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button 
                          className="remove-item-btn"
                          onClick={() => removeFromCart(item.id, item.selectedSize)}
                        >
                          Remove
                        </button>
                        <div className="item-total-price">
                          ₹{item.price * item.quantity}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={handleSummaryContinue} className="continue-btn" style={{width: '200px', marginLeft: 'auto', display: 'block'}}>
                  Continue
                </button>
              </div>
            )}
          </div>

          {/* Step 4: Payment Options */}
          <div className="checkout-step">
            <StepHeader step={4} title="Payment Options" />
            {activeStep === 4 && (
              <div className="step-body">
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  {/* Razorpay Option */}
                  <label 
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '16px',
                      border: selectedPaymentMethod === 'razorpay' ? '1px solid #2874f0' : '1px solid #e0e0e0',
                      borderRadius: '4px',
                      backgroundColor: selectedPaymentMethod === 'razorpay' ? '#f5faff' : 'white'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="payment" 
                      value="razorpay"
                      checked={selectedPaymentMethod === 'razorpay'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    />
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <span style={{fontWeight: '600'}}>Razorpay (Cards, UPI, NetBanking)</span>
                      <span style={{fontSize: '12px', color: '#878787'}}>Pay securely online</span>
                    </div>
                  </label>

                  {/* Cash on Delivery Option */}
                  <label 
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: isCodAvailable ? 'pointer' : 'not-allowed',
                      padding: '16px',
                      border: selectedPaymentMethod === 'cod' ? '1px solid #2874f0' : '1px solid #e0e0e0',
                      borderRadius: '4px',
                      backgroundColor: !isCodAvailable ? '#f9f9f9' : (selectedPaymentMethod === 'cod' ? '#f5faff' : 'white'),
                      opacity: isCodAvailable ? 1 : 0.6
                    }}
                  >
                    <input 
                      type="radio" 
                      name="payment" 
                      value="cod"
                      checked={selectedPaymentMethod === 'cod'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      disabled={!isCodAvailable}
                    />
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <span style={{fontWeight: '600'}}>Cash on Delivery</span>
                      {!isCodAvailable ? (
                        <span style={{fontSize: '12px', color: '#dc2626'}}>
                          Not available for some items in your cart
                        </span>
                      ) : (
                        <span style={{fontSize: '12px', color: '#878787'}}>Pay when you receive the order</span>
                      )}
                    </div>
                  </label>
                </div>
                <button 
                  className="continue-btn" 
                  style={{marginTop: '24px', width: '200px'}}
                  onClick={handleConfirmOrder}
                >
                  {selectedPaymentMethod === 'razorpay' ? 'Pay Now' : 'Confirm Order'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Sidebar - Price Details */}
        <div className="checkout-sidebar">
          <div className="price-details-card">
            <div className="price-header">Price Details</div>
            <div className="price-content">
              <div className="price-row">
                <span>Price ({cartItems.length} items)</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="price-row">
                <span>Delivery Charges</span>
                <span className="green-text">FREE</span>
              </div>
              <div className="price-row total">
                <span>Total Payable</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="green-text" style={{fontSize: '14px', fontWeight: '600'}}>
                Your Total Savings on this order ₹0
              </div>
            </div>
          </div>
          
          <div className="secure-badge">
            <FiShield className="secure-icon" />
            <div>
              Safe and Secure Payments. Easy returns.<br/>
              100% Authentic products.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
