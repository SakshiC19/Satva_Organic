import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { doc, updateDoc, arrayUnion, serverTimestamp, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import config from '../../config';
import { FiCheck, FiShield, FiEdit2, FiPlus, FiTruck, FiChevronLeft, FiX, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import tpcService from '../../services/tpcCourierService';
import './Checkout.css';

const Checkout = () => {
  const { currentUser, login, signup } = useAuth();
  
  // Load Razorpay Script
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  // Calculate grand total (same as CartDrawer)
  const itemTotal = cartTotal || 0;
  const deliveryCharge = 25;
  const shippingCharge = 2; // Renamed from handlingCharge
  const smallCartCharge = itemTotal > 0 && itemTotal < 100 ? 20 : 0;
  const grandTotal = itemTotal + deliveryCharge + shippingCharge + smallCartCharge;

  // Safety check for cartTotal
  const safeCartTotal = grandTotal;
  const safeCartItems = cartItems || [];

  const [activeStep, setActiveStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  // const [isPhoneVerified, setIsPhoneVerified] = useState(true); // Default to true for demo
  const isPhoneVerified = true; // Default to true for demo
  
  // Check if COD is available for all items in cart
  const isCodAvailable = cartItems.every(item => item.codAvailable !== false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(isCodAvailable ? 'cod' : 'razorpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobilePayment, setShowMobilePayment] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('address'); // 'address', 'review', 'payment'
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    state: '',
    addressType: 'Home',
    alternatePhone: ''
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

          // Also check TPC service availability
          try {
            const tpcResult = await tpcService.checkPinCodeService(newPincode);
            if (tpcResult.success) {
              console.log('TPC Service check:', tpcResult);
              // We can store this in state if needed to show service badges
            }
          } catch (e) {
            console.warn('TPC service check failed:', e);
          }
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

  const fetchSavedAddresses = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && userDoc.data().addresses) {
        setSavedAddresses(userDoc.data().addresses);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setActiveStep(2);
      setEmail(currentUser.email);
      fetchSavedAddresses();
    } else {
      setActiveStep(1);
    }
  }, [currentUser, fetchSavedAddresses]);

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
            CHANGE
          </button>
        )}
      </div>
    );
  };

  const [showConfirmation, setShowConfirmation] = useState(false);

  const sanitizeData = (data) => {
    return JSON.parse(JSON.stringify(data));
  };

  const handleConfirmOrder = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const sanitizedItems = cartItems.map(item => ({
      id: item.id || '',
      name: item.name || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      selectedSize: item.selectedSize || 'Standard',
      image: item.image || (item.images && item.images[0] ? (item.images[0].url || item.images[0]) : ''),
    }));

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
      userId: currentUser?.uid || 'guest',
      orderCount: 1 
    };

    const orderData = sanitizeData(rawOrderData);

    const createRazorpayOrder = async () => {
      try {
        const backendUrl = config.API_URL;
        
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round((cartTotal || 0) * 100)
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create order on backend');
        }

        return await response.json();
      } catch (err) {
        console.warn("Backend order creation failed, using mock for testing:", err);
        return {
          id: `order_mock_${Date.now()}`,
          amount: Math.round((cartTotal || 0) * 100),
          currency: 'INR'
        };
      }
    };

    if (selectedPaymentMethod === 'razorpay') {
      const res = await loadRazorpay();
      
      if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        setIsProcessing(false);
        return;
      }

      try {
        const razorpayOrder = await createRazorpayOrder();

        const options = {
          key: "rzp_test_RyAk3DGa85x3tr", 
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Satva Organics",
          description: "Grocery Purchase",
          image: "https://firebasestorage.googleapis.com/v0/b/satva-organic.appspot.com/o/logo.png?alt=media",
          order_id: razorpayOrder.id,
          handler: async function (response) {
            try {
              const orderToSave = {
                ...orderData,
                createdAt: serverTimestamp(),
                paymentId: response.razorpay_payment_id,
                paymentStatus: 'Paid',
                razorpayOrderId: response.razorpay_order_id || '',
                razorpaySignature: response.razorpay_signature || ''
              };
              
              await addDoc(collection(db, 'orders'), orderToSave);
              
              cartItems.forEach(item => {
                removeFromCart(item.id, item.selectedSize);
              });
              
              setConfirmedOrder(orderToSave);
              setShowConfirmation(true);
              setIsProcessing(false);
            } catch (error) {
              console.error("Error saving order (Razorpay):", error);
              alert(`Payment successful but failed to place order. Error: ${error.message}`);
              setIsProcessing(false);
            }
          },
          prefill: {
            name: address.name || currentUser?.displayName,
            email: email,
            contact: address.phone
          },
          theme: {
            color: "#27ae60"
          },
          modal: {
              ondismiss: function() {
                  setIsProcessing(false);
              }
          }
        };
        
        const paymentObject = new window.Razorpay(options);
        paymentObject.open();

      } catch (err) {
        console.error("Error creating order:", err);
        alert(`Failed to initiate payment. Technical Error: ${err.message}`);
        setIsProcessing(false);
        return;
      }
      
    } else {
      // Cash on Delivery
      try {
        const orderToSave = {
            ...orderData,
            createdAt: serverTimestamp(),
            paymentStatus: 'Pending'
        };
        await addDoc(collection(db, 'orders'), orderToSave);
        
        // Clear cart
        cartItems.forEach(item => {
          removeFromCart(item.id, item.selectedSize);
        });

        setConfirmedOrder(orderToSave);
        setShowConfirmation(true);
      } catch (error) {
        console.error("Error saving order (COD):", error);
        alert("Failed to place order. Please try again.");
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="checkout-page">
      {showConfirmation && confirmedOrder && (
        <div className="modal-overlay confirmation-overlay">
          <div className="modal-content confirmation-modal-new">
            <div className="conf-header">
              <div className="conf-header-left">
                <div className="conf-check-icon">
                  <FiCheck />
                </div>
                <div className="conf-title-group">
                  <h3>Order confirmed</h3>
                  {confirmedOrder.items.reduce((acc, item) => acc + ((item.originalPrice || item.price) - item.price) * item.quantity, 0) > 0 && (
                    <span className="conf-saved-badge">
                      Saved ₹{confirmedOrder.items.reduce((acc, item) => acc + ((item.originalPrice || item.price) - item.price) * item.quantity, 0)} 🎊
                    </span>
                  )}
                </div>
              </div>
              <button className="conf-close-btn" onClick={() => navigate('/shop')}>
                <FiX />
              </button>
            </div>

            <div className="conf-body">
              {/* Delivery Address */}
              <div className="conf-section address-section">
                <div className="section-icon">
                  <FiPlus style={{ transform: 'rotate(45deg)' }} /> {/* Using FiPlus as a pin icon fallback or just a dot */}
                  <span className="dot-icon">📍</span>
                </div>
                <div className="section-content">
                  <h4>Deliver to <strong>{confirmedOrder.shippingAddress.name}</strong></h4>
                  <p>{confirmedOrder.shippingAddress.address}, {confirmedOrder.shippingAddress.locality}, {confirmedOrder.shippingAddress.city}, {confirmedOrder.shippingAddress.state} - {confirmedOrder.shippingAddress.pincode}</p>
                  <p className="conf-contact">Contact Number - {confirmedOrder.shippingAddress.phone}</p>
                </div>
              </div>

              {/* Products Section */}
              <div className="conf-products-header">
                <span>{confirmedOrder.items.length} Product{confirmedOrder.items.length > 1 ? 's' : ''}</span>
                <button className="track-order-link" onClick={() => navigate('/account/orders')}>
                  TRACK ORDER <FiChevronRight />
                </button>
              </div>

              <div className="conf-products-list">
                {confirmedOrder.items.map((item, idx) => (
                  <div key={idx} className="conf-product-card">
                    <div className="delivery-date-banner">
                      <FiTruck /> Delivery by {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="conf-product-main">
                      <img src={item.image} alt={item.name} className="conf-product-img" />
                      <div className="conf-product-info">
                        <div className="conf-product-price-row">
                          <span className="conf-price">₹{item.price}</span>
                        </div>
                        <p className="conf-meta">Size: {item.selectedSize || 'Standard'}  •  Qty: {item.quantity}</p>
                        <p className="conf-returns">All issue easy returns</p>
                      </div>
                    </div>
                    <div className="conf-deal-note">
                      <div className="deal-left">
                        <span className="deal-icon">🎊</span>
                        <div className="deal-text">
                          <p>Got a great deal on this product!</p>
                          <span>Share with others too</span>
                        </div>
                      </div>
                      <button className="conf-share-btn">
                        <FiPlus style={{ transform: 'rotate(45deg)' }} /> SHARE
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Info */}
              <div className="conf-payment-info">
                <div className="payment-method">
                  <span className="payment-icon">
                    {confirmedOrder.paymentMethod === 'cod' ? '💵' : '💳'}
                  </span>
                  <span>{confirmedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                </div>
                <div className="payment-amount">
                  ₹{confirmedOrder.totalAmount} <FiChevronRight />
                </div>
              </div>
            </div>

            <div className="conf-footer">
              <button onClick={() => navigate('/shop')} className="conf-continue-shopping-btn">
                CONTINUE SHOPPING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Change Modal */}
      {showAddressModal && (
        <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="modal-content address-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>CHANGE DELIVERY ADDRESS</h3>
              <button className="modal-close-btn" onClick={() => setShowAddressModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <button 
                className="add-new-address-modal-btn"
                onClick={() => {
                  setAddress({
                    name: '', phone: '', pincode: '', locality: '',
                    address: '', city: '', state: ''
                  });
                  setEditingIndex(null);
                  setIsAddingNew(true);
                  setShowAddressModal(false);
                }}
              >
                <FiPlus /> ADD NEW ADDRESS
              </button>
              
              {savedAddresses.map((addr, index) => (
                <div key={index} className="modal-address-card">
                  <div className="modal-address-header">
                    <input 
                      type="radio" 
                      name="selectedAddress" 
                      checked={address.name === addr.name && address.phone === addr.phone}
                      onChange={() => {}}
                    />
                    <div className="modal-address-info">
                      <strong>{addr.name}</strong>
                      <p>{addr.address}, {addr.locality}, {addr.city}, {addr.state} - {addr.pincode}</p>
                      <p>{addr.phone}</p>
                    </div>
                  </div>
                  <div className="modal-address-actions">
                    <button className="modal-edit-btn" onClick={() => {
                      handleEditAddress(index);
                      setShowAddressModal(false);
                    }}>
                      EDIT
                    </button>
                  </div>
                  <button 
                    className="modal-deliver-btn"
                    onClick={() => {
                      handleSelectAddress(addr);
                      setShowAddressModal(false);
                    }}
                  >
                    Deliver to this Address
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="checkout-container">
        {/* Breadcrumb */}
        {isMobile && currentUser ? (
          <nav className="mobile-checkout-breadcrumb header-breadcrumb">
            <div className="breadcrumb-content">
              <button className="breadcrumb-back-btn" onClick={() => {
                if (showMobilePayment) {
                  setShowMobilePayment(false);
                  setCheckoutStep('review');
                } else if (checkoutStep === 'review') {
                  setCheckoutStep('address');
                } else {
                  navigate('/shop');
                }
              }} title="Go back">
                <FiChevronLeft />
              </button>
              {!showMobilePayment && (
                <>
                  <span className="clickable" onClick={() => navigate('/shop')}>CART</span>
                  <span className="separator">›</span>
                </>
              )}
              <span 
                className={!showMobilePayment ? 'current' : 'clickable'} 
                onClick={() => {
                  setShowMobilePayment(false);
                  setCheckoutStep('address');
                }}
              >
                ADDRESS & ITEMS
              </span>
              <span className="separator">›</span>
              <span className={showMobilePayment ? 'current' : ''}>PAYMENT</span>
            </div>
          </nav>
        ) : (
          <nav className="checkout-breadcrumb">
            <Link to="/">HOME</Link>
            <span className="separator">›</span>
            <Link to="/shop">SHOP</Link>
            <span className="separator">›</span>
            <span className="current">CHECKOUT</span>
          </nav>
        )}

        {/* Main Content Wrapper */}
        <div className="checkout-content-wrapper">
          {/* Main Content */}
          <div className="checkout-main">
          {isMobile && currentUser && (
            <div className="mobile-checkout-flow">
              {/* Address Section on Top for Mobile */}
              {!showMobilePayment ? (
                <>
                  {/* Address Section on Top for Mobile */}
                  <div className="checkout-step mobile-address-step">
                    <div className="step-header active">
                      <div className="step-number">1</div>
                      <div className="step-title-wrapper">
                        <span className="step-title">DELIVERY ADDRESS</span>
                        {address.name && !isAddingNew && (
                          <span className="step-info">{address.name}, {address.pincode}</span>
                        )}
                      </div>
                      {address.name && !isAddingNew && (
                        <button className="step-action-btn" onClick={() => setShowAddressModal(true)}>CHANGE</button>
                      )}
                    </div>
                    <div className="step-body">
                      {!address.name || isAddingNew ? (
                        <>
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
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSelectAddress(addr);
                                      }}
                                      style={{ cursor: 'pointer', position: 'relative', zIndex: 10 }}
                                    >
                                      DELIVER HERE
                                    </button>
                                    <button 
                                      className="edit-address-btn"
                                      onClick={() => handleEditAddress(index)}
                                    >
                                      <FiEdit2 /> EDIT
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
                                <FiPlus /> ADD A NEW ADDRESS
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
                              <input 
                                type="text" 
                                className="checkout-input" 
                                placeholder="10-digit mobile number" 
                                required 
                                value={address.phone}
                                onChange={e => setAddress({...address, phone: e.target.value})}
                              />
                              <input 
                                type="text" 
                                className="checkout-input" 
                                placeholder="Pincode" 
                                required 
                                value={address.pincode}
                                onChange={handlePincodeChange}
                                maxLength={6}
                              />
                              <textarea 
                                className="checkout-input full-width" 
                                placeholder="Address (Area and Street)" 
                                rows="3" 
                                required
                                value={address.address}
                                onChange={e => setAddress({...address, address: e.target.value})}
                              ></textarea>
                              <div className="form-actions">
                                <button type="submit" className="continue-btn">
                                  SAVE AND DELIVER HERE
                                </button>
                                {savedAddresses.length > 0 && (
                                  <button type="button" className="cancel-btn" onClick={() => setIsAddingNew(false)}>
                                    CANCEL
                                  </button>
                                )}
                              </div>
                            </form>
                          )}
                        </>
                      ) : (
                        <div className="selected-address-summary">
                          <p className="address-text">
                            <strong>{address.name}</strong><br/>
                            {address.address}, {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="address-phone">{address.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Details Section for Mobile */}
                  <div className="checkout-step mobile-products-step">
                    <div className="step-header">
                      <div className="step-number">2</div>
                      <div className="step-title-wrapper">
                        <span className="step-title">PRODUCT DETAILS</span>
                      </div>
                    </div>
                    <div className="step-body">
                      {safeCartItems.map(item => {
                        const itemImage = item.images && item.images.length > 0
                          ? (item.images[0].url || item.images[0])
                          : item.image;
                        
                        const hasDiscount = item.originalPrice && item.originalPrice > item.price;

                        return (
                          <div key={`${item.id}-${item.selectedSize}`} className="mobile-product-card">
                            <img src={itemImage} alt={item.name} className="mobile-product-img" />
                            <div className="mobile-product-info">
                              <span className="mobile-product-category">{item.category}</span>
                              <h4 className="mobile-product-name">{item.name}</h4>
                              <div className="mobile-product-meta">
                                <span>Qty: {item.quantity}</span>
                                <span>Size: {item.selectedSize || 'Standard'}</span>
                              </div>
                              <div className="mobile-product-delivery">
                                <FiTruck /> Delivery by {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                              <div className="mobile-product-price">
                                <span className="current-price">₹{item.price * item.quantity}</span>
                                {hasDiscount && (
                                  <span className="original-price">₹{item.originalPrice * item.quantity}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bill Details Section for Mobile */}
                  <div className="checkout-step mobile-bill-details">
                    <div className="step-header">
                      <span className="step-title">Bill details</span>
                    </div>
                    <div className="step-body">
                      <div className="bill-row">
                        <span>Items total</span>
                        <span>₹{itemTotal.toLocaleString()}</span>
                      </div>
                      <div className="bill-row">
                        <span>Delivery charge</span>
                        <span>₹{deliveryCharge}</span>
                      </div>
                      <div className="bill-row">
                        <span>Shipping charge</span>
                        <span>₹{shippingCharge}</span>
                      </div>
                      {smallCartCharge > 0 && (
                        <div className="bill-row">
                          <span>Small basket charge</span>
                          <span>₹{smallCartCharge}</span>
                        </div>
                      )}
                      <div className="bill-row grand-total">
                        <span>Grand total</span>
                        <span>₹{grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mobile-payment-section">
                  {/* Payment Method Selection */}
                  <div className="checkout-step mobile-payment-step">
                    <div className="step-header active">
                      <span className="step-title">PAYMENT METHOD</span>
                    </div>
                    <div className="step-body">
                      <p className="payment-instruction">Select payment method</p>
                      
                      {/* Cash on Delivery Option */}
                      {isCodAvailable && (
                        <div 
                          className={`mobile-payment-card ${selectedPaymentMethod === 'cod' ? 'selected' : ''}`}
                          onClick={() => setSelectedPaymentMethod('cod')}
                        >
                          <div className="payment-card-content">
                            <div className="payment-card-left">
                              <span className="payment-amount">₹{grandTotal.toLocaleString()}</span>
                              <span className="payment-label">Cash on Delivery 💵</span>
                            </div>
                            <div className="payment-card-radio">
                              <input 
                                type="radio" 
                                checked={selectedPaymentMethod === 'cod'} 
                                readOnly 
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pay Online Option */}
                      <div 
                        className={`mobile-payment-card ${selectedPaymentMethod === 'razorpay' ? 'selected' : ''}`}
                        onClick={() => setSelectedPaymentMethod('razorpay')}
                      >
                        <div className="payment-card-content">
                          <div className="payment-card-left">
                            <span className="payment-amount">₹{grandTotal.toLocaleString()}</span>
                            <span className="payment-label">Pay Online ✨</span>
                            {selectedPaymentMethod === 'razorpay' && (
                              <span className="payment-discount">Extra discount with bank offers</span>
                            )}
                          </div>
                          <div className="payment-card-radio">
                            <input 
                              type="radio" 
                              checked={selectedPaymentMethod === 'razorpay'} 
                              readOnly 
                            />
                          </div>
                        </div>
                        
                        {/* Expanded Payment Options */}
                        {selectedPaymentMethod === 'razorpay' && (
                          <div className="payment-methods-expanded">
                            <div className="payment-method-item">
                              <span>💳 Debit/Credit Cards</span>
                              <span className="offers-badge">Offers Available</span>
                            </div>
                            <div className="payment-method-item">
                              <span>📱 UPI</span>
                              <span className="offers-badge">Offers Available</span>
                            </div>
                            <div className="payment-method-item">
                              <span>🏦 Net Banking</span>
                            </div>
                            <div className="payment-method-item">
                              <span>💰 Wallet</span>
                              <span className="offers-badge">Offers Available</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Price Details Link */}
                      <button className="view-price-details-btn" onClick={() => setShowMobilePayment(false)}>
                        VIEW PRICE DETAILS
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Sticky Footers - Moved outside animated containers */}
              {!showAddressModal && !showMobilePayment ? (
                <div className="mobile-sticky-footer">
                  <div className="mobile-total-info">
                    <span className="total-amount">₹{safeCartTotal.toLocaleString()}</span>
                    <span className="total-label">TOTAL</span>
                  </div>
                  <button 
                    className="mobile-place-order-btn"
                    onClick={() => {
                      window.scrollTo(0, 0);
                      setShowMobilePayment(true);
                      setCheckoutStep('payment');
                    }}
                  >
                    Continue <span style={{ fontSize: '20px', marginLeft: '4px' }}>›</span>
                  </button>
                </div>
              ) : !showAddressModal && showMobilePayment ? (
                <div className="mobile-sticky-footer payment-footer">
                  <div className="mobile-total-info">
                    <span className="total-amount">₹{safeCartTotal.toLocaleString()}</span>
                    <span className="total-label">TOTAL</span>
                  </div>
                  <button 
                    className="mobile-place-order-btn"
                    onClick={handleConfirmOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'PROCESSING...' : 'PAY NOW'} <span style={{ fontSize: '20px', marginLeft: '4px' }}>›</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {!isMobile && (
            <>
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
                        {isSignup ? 'SIGNUP & CONTINUE' : 'LOGIN & CONTINUE'}
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
                            DELIVER HERE
                          </button>
                          <button 
                            className="edit-address-btn"
                            onClick={() => handleEditAddress(index)}
                          >
                            <FiEdit2 /> EDIT
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
                      <FiPlus /> ADD A NEW ADDRESS
                    </button>
                  </div>
                ) : (
                  <form className="address-form" onSubmit={handleAddressSubmit}>
                    <div className="delivery-message">
                      <FiCheck /> Delivery available in Kolhapur
                    </div>
                    <input 
                      type="text" 
                      className="checkout-input" 
                      placeholder="Name" 
                      required 
                      value={address.name}
                      onChange={e => setAddress({...address, name: e.target.value})}
                    />
                    <input 
                      type="text" 
                      className="checkout-input" 
                      placeholder="10-digit mobile number" 
                      required 
                      value={address.phone}
                      onChange={e => setAddress({...address, phone: e.target.value})}
                    />
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

                    <div className="form-row">
                      <select
                        className="checkout-input"
                        value={address.deliverySlot || ''}
                        onChange={e => setAddress({...address, deliverySlot: e.target.value})}
                      >
                        <option value="">Select Delivery Slot</option>
                        <option value="Morning (8 AM - 11 AM)">Morning (8 AM - 11 AM)</option>
                        <option value="Afternoon (1 PM - 4 PM)">Afternoon (1 PM - 4 PM)</option>
                        <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <input 
                        type="tel" 
                        className="checkout-input" 
                        placeholder="Alternate Phone (Optional)" 
                        value={address.alternatePhone || ''}
                        onChange={e => setAddress({...address, alternatePhone: e.target.value})}
                      />
                    </div>

                    <div className="address-type-section">
                      <label>Address Type</label>
                      <div className="address-type-options">
                        {['Home', 'Work', 'Other'].map(type => (
                          <label key={type} className={`type-option ${address.addressType === type ? 'selected' : ''}`}>
                            <input 
                              type="radio" 
                              name="addressType" 
                              value={type}
                              checked={address.addressType === type}
                              onChange={e => setAddress({...address, addressType: e.target.value})}
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="continue-btn" style={{width: 'auto', minWidth: '200px'}}>
                        {editingIndex !== null ? 'UPDATE ADDRESS' : 'SAVE AND DELIVER HERE'}
                      </button>
                      {savedAddresses.length > 0 && (
                        <button 
                          type="button" 
                          className="cancel-btn"
                          onClick={() => {
                            setIsAddingNew(false);
                            setEditingIndex(null);
                          }}
                        >
                          CANCEL
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
            <StepHeader step={3} title="ORDER SUMMARY" info={`${safeCartItems.length} Items`} />
            {activeStep === 3 && (
              <div className="step-body">
                {safeCartItems.map(item => {
                  const itemImage = item.images && item.images.length > 0
                    ? (item.images[0].url || item.images[0])
                    : item.image;

                  return (
                    <div key={`${item.id}-${item.selectedSize || 'default'}`} className="order-summary-item">
                      <img src={itemImage} alt={item.name} className="summary-item-img" />
                      <div className="summary-item-details">
                        <h4>{item.name}</h4>
                        <div className="summary-item-meta">
                          Size: {item.selectedSize || 'Standard'}
                        </div>
                        <div className="summary-item-delivery">
                          <FiTruck /> Delivery by {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="summary-item-price">
                          ₹{item.price * item.quantity}
                        </div>
                      </div>
                      <div className="summary-item-actions">
                        <div className="quantity-controls small">
                          <button onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)} disabled={item.quantity <= 1}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)}>+</button>
                        </div>
                        <button className="remove-item-btn" onClick={() => removeFromCart(item.id, item.selectedSize)}>
                          REMOVE
                        </button>
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
                <div className="payment-options-container">
                  <div className={`payment-method-group ${selectedPaymentMethod === 'razorpay' ? 'active' : ''}`}>
                    <div 
                      className={`payment-option ${selectedPaymentMethod === 'razorpay' ? 'selected' : ''}`}
                      onClick={() => setSelectedPaymentMethod('razorpay')}
                    >
                      <div className="payment-label">
                        <input 
                          type="radio" 
                          name="payment" 
                          checked={selectedPaymentMethod === 'razorpay'}
                          onChange={() => setSelectedPaymentMethod('razorpay')}
                        />
                        <span>Razorpay (Cards, UPI, NetBanking)</span>
                      </div>
                    </div>
                    {selectedPaymentMethod === 'razorpay' && (
                      <div className="payment-action-container">
                        <button 
                          className="pay-now-btn" 
                          onClick={handleConfirmOrder}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'PROCESSING...' : `PAY ₹${safeCartTotal.toLocaleString()}`}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`payment-method-group ${selectedPaymentMethod === 'cod' ? 'active' : ''}`}>
                    <div 
                      className={`payment-option ${selectedPaymentMethod === 'cod' ? 'selected' : ''} ${!isCodAvailable ? 'disabled' : ''}`}
                      onClick={() => isCodAvailable && setSelectedPaymentMethod('cod')}
                    >
                      <div className="payment-label">
                        <input 
                          type="radio" 
                          name="payment" 
                          checked={selectedPaymentMethod === 'cod'}
                          onChange={() => isCodAvailable && setSelectedPaymentMethod('cod')}
                          disabled={!isCodAvailable}
                        />
                        <span>Cash on Delivery</span>
                        {!isCodAvailable && (
                          <span className="cod-unavailable-badge">Not Available</span>
                        )}
                      </div>
                    </div>
                    {selectedPaymentMethod === 'cod' && (
                      <div className="payment-action-container">
                        <button 
                          className="pay-now-btn" 
                          onClick={handleConfirmOrder}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'PROCESSING...' : `PAY ₹${safeCartTotal.toLocaleString()}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>

        {/* Sidebar - Price Details */}
        {!isMobile && (
        <div className="checkout-sidebar">
          <div className="price-details-card">
            <div className="price-header">PRICE DETAILS</div>
            <div className="price-content">
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
          
          <div className="checkout-footer-links">
            <a href="/policy/return">Return & Refund Policy</a>
            <span>•</span>
            <a href="/support">Need Help?</a>
          </div>
        </div>
        )}
      </div>
    </div>
  </div>
);
};

export default Checkout;
