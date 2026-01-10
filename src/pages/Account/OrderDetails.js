import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { downloadInvoice } from '../../utils/invoiceGenerator';
import Badge from '../../components/common/Badge';
import { 
  FiArrowLeft, 
  FiDownload, 
  FiTruck, 
  FiMapPin, 
  FiCreditCard, 
  FiMessageCircle, 
  FiPhone, 
  FiStar, 
  FiCamera,
  FiHelpCircle,
  FiClock,
  FiCheckCircle,
  FiPackage,
  FiXCircle
} from 'react-icons/fi';
import './Account.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '', images: [] });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderDoc = await getDoc(doc(db, 'orders', id));
        if (orderDoc.exists()) {
          setOrder({ id: orderDoc.id, ...orderDoc.data() });
        } else {
          navigate('/account/orders');
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Handle Firestore Timestamp or standard Date object or string
    let date;
    try {
      date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
    } catch (e) {
      return 'N/A';
    }
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusSteps = () => {
    const steps = [
      { label: 'Ordered', status: 'Pending', icon: <FiClock /> },
      { label: 'Accepted', status: 'Accepted', icon: <FiCheckCircle /> },
      { label: 'Shipped', status: 'Shipped', icon: <FiTruck /> },
      { label: 'Delivered', status: 'Delivered', icon: <FiCheckCircle /> }
    ];
    
    const currentStatusIndex = steps.findIndex(s => s.status === order?.status);
    return steps.map((step, index) => ({
      ...step,
      isCompleted: index <= currentStatusIndex,
      isActive: index === currentStatusIndex
    }));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'reviews'), {
        orderId: id,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        ...reviewData,
        createdAt: serverTimestamp()
      });
      setShowReviewForm(false);
      alert('Thank you for your review!');
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  if (loading) {
    return <div className="loading-state"><div className="spinner"></div></div>;
  }

  if (!order) return null;

  const steps = getStatusSteps();

  return (
    <div className="order-details-page">
      <div className="order-details-header">
        <button onClick={() => navigate('/account/orders')} className="btn-back">
          <FiArrowLeft /> Back to Orders
        </button>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => downloadInvoice(order)}>
            <FiDownload /> Download Invoice
          </button>
        </div>
      </div>

      <div className="order-main-grid">
        <div className="order-left-col">
          {/* Tracking Stepper */}
          <div className="order-card tracking-card">
            <h3 className="card-title">Order Status</h3>
            <div className="stepper-container">
              {steps.map((step, index) => (
                <div key={index} className={`step-item ${step.isCompleted ? 'completed' : ''} ${step.isActive ? 'active' : ''}`}>
                  <div className="step-icon-wrapper">
                    {step.icon}
                  </div>
                  <div className="step-info">
                    <span className="step-label">{step.label}</span>
                    {step.isActive && <span className="step-time">{formatDate(order.updatedAt || order.createdAt)}</span>}
                  </div>
                  {index < steps.length - 1 && <div className="step-line"></div>}
                </div>
              ))}
            </div>
            {order.status === 'Cancelled' && (
              <div className="cancelled-notice">
                <FiXCircle /> This order was cancelled. Reason: {order.cancelReason || 'User request'}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="order-card items-card">
            <h3 className="card-title">Items Ordered ({order.items?.length})</h3>
            <div className="order-items-list">
              {order.items?.map((item, index) => (
                <div key={index} className="order-item-row">
                  <img src={item.image} alt={item.name} className="item-img" />
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p>Size: {item.selectedSize || '500g'} | Qty: {item.quantity}</p>
                    <span className="item-price">₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}</span>
                  </div>
                  {order.status === 'Delivered' && (
                    <button className="btn-rate" onClick={() => setShowReviewForm(true)}>
                      Rate & Review
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Review Form (Conditional) */}
          {showReviewForm && (
            <div className="order-card review-card">
              <h3 className="card-title">Rate & Review Products</h3>
              <form onSubmit={handleReviewSubmit} className="review-form">
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map(num => (
                    <FiStar 
                      key={num} 
                      className={num <= reviewData.rating ? 'star filled' : 'star'} 
                      onClick={() => setReviewData({...reviewData, rating: num})}
                    />
                  ))}
                </div>
                <textarea 
                  placeholder="Share your experience with this product..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                  required
                />
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowReviewForm(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Submit Review</button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="order-right-col">
          {/* Delivery Address */}
          <div className="order-card info-card">
            <h3 className="card-title"><FiMapPin /> Delivery Address</h3>
            <div className="address-content">
              <p className="customer-name">{order.shippingAddress?.name}</p>
              <p>{order.shippingAddress?.address}</p>
              <p>{order.shippingAddress?.locality}, {order.shippingAddress?.city}</p>
              <p>{order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
              <p className="phone">Phone: {order.shippingAddress?.phone}</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="order-card info-card">
            <h3 className="card-title"><FiCreditCard /> Payment Method</h3>
            <div className="payment-content">
              <p className="method-name">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
              <p className="status">Status: {order.paymentStatus || 'Pending'}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-card summary-card">
            <h3 className="card-title">Order Summary</h3>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{order.totalAmount}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span className="free">FREE</span>
              </div>
              <div className="summary-row">
                <span>Discount</span>
                <span>-₹0</span>
              </div>
              <div className="summary-row total">
                <span>Total Paid</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="order-card support-card">
            <h3 className="card-title"><FiHelpCircle /> Need Help?</h3>
            <div className="support-actions">
              <a href={`https://wa.me/919087659045?text=Hi, I need help with my order #${order.id}`} target="_blank" rel="noreferrer" className="support-btn whatsapp">
                <FiMessageCircle /> Chat on WhatsApp
              </a>
              <button className="support-btn call">
                <FiPhone /> Call Support
              </button>
              <button className="support-btn ticket">
                Raise a Complaint
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
