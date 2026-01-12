import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { downloadInvoice } from '../../utils/invoiceGenerator';
import { 
  FiArrowLeft, 
  FiDownload, 
  FiTruck, 
  FiMapPin, 
  FiCreditCard, 
  FiMessageCircle, 
  FiPhone, 
  FiStar, 
  FiHelpCircle,
  FiClock,
  FiCheckCircle,
  FiPackage,
  FiXCircle,
  FiCopy,
  FiInfo,
  FiMail
} from 'react-icons/fi';
import './Account.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '', images: [] });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const cancelReasons = [
    "Ordered by mistake",
    "Delivery delay",
    "Found better price",
    "Changed my mind",
    "Other"
  ];

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
      { label: 'Ordered', status: 'Pending', icon: <FiClock />, description: 'Order placed successfully' },
      { label: 'Accepted', status: 'Accepted', icon: <FiCheckCircle />, description: 'Seller has accepted your order' },
      { label: 'Shipped', status: 'Shipped', icon: <FiTruck />, description: 'Order is on the way' },
      { label: 'Delivered', status: 'Delivered', icon: <FiPackage />, description: 'Order delivered successfully' }
    ];
    
    const statusMap = {
      'pending': 0,
      'accepted': 1,
      'confirmed': 1,
      'processing': 1,
      'packed': 1,
      'shipped': 2,
      'delivered': 3,
      'cancelled': -1,
      'cancellation_requested': -2
    };

    const currentStatus = order?.status?.toLowerCase() || 'pending';
    const currentStatusIndex = statusMap[currentStatus] ?? 0;

    return steps.map((step, index) => ({
      ...step,
      isCompleted: currentStatusIndex >= index,
      isActive: currentStatusIndex === index,
      timestamp: index === 0 ? order.createdAt : (currentStatusIndex >= index ? order.statusUpdatedAt : null)
    }));
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    alert('Order ID copied to clipboard!');
  };

  const handleRequestCancellation = async () => {
    if (!cancelReason) {
      alert('Please select a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    try {
      const orderRef = doc(db, 'orders', id);
      await updateDoc(orderRef, {
        status: 'Cancellation_Requested',
        cancellationRequest: {
          reason: cancelReason,
          requestedAt: serverTimestamp(),
          status: 'pending'
        }
      });
      setOrder({
        ...order,
        status: 'Cancellation_Requested',
        cancellationRequest: {
          reason: cancelReason,
          requestedAt: new Date(),
          status: 'pending'
        }
      });
      setShowCancelModal(false);
      alert('Cancellation request submitted successfully. It is now under review.');
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      alert('Failed to submit cancellation request. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'accepted': 
      case 'confirmed':
      case 'processing': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'cancellation_requested': return '#f59e0b';
      default: return '#6b7280';
    }
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
      <div className="order-details-header-new">
        <div className="header-top">
          <button onClick={() => navigate('/account/orders')} className="btn-back-new">
            <FiArrowLeft />
          </button>
          <div className="order-meta-info">
            <div className="order-id-group">
              <h1>Order #{order.id.substring(0, 10).toUpperCase()}</h1>
              <button className="copy-btn" onClick={handleCopyId} title="Copy Order ID">
                <FiCopy />
              </button>
            </div>
            <p className="order-date-status">
              Placed on {formatDate(order.createdAt)} | Status: 
              <span className="status-text-badge" style={{ color: getStatusBadgeColor(order.status) }}>
                {order.status === 'Cancellation_Requested' ? '🟡 Cancellation Requested' : order.status}
              </span>
              <span className="status-tooltip" title={steps.find(s => s.isActive)?.description || 'Order is being processed'}>
                <FiInfo />
              </span>
            </p>
          </div>
        </div>
        <div className="header-actions-new">
          <button className="btn-outline" onClick={() => downloadInvoice(order)}>
            <FiDownload /> Invoice
          </button>
        </div>
      </div>

      <div className="order-main-grid">
        <div className="order-left-col">
          <div className="order-card tracking-card-new">
            <h3 className="card-title">Order Timeline</h3>
            <div className="timeline-container">
              {steps.map((step, index) => (
                <div key={index} className={`timeline-item ${step.isCompleted ? 'completed' : ''} ${step.isActive ? 'active' : ''}`}>
                  <div className="timeline-icon">
                    {step.isCompleted ? <FiCheckCircle /> : step.icon}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-label">{step.label}</span>
                      {step.timestamp && <span className="timeline-time">{formatDate(step.timestamp)}</span>}
                    </div>
                    <p className="timeline-desc">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && <div className="timeline-line"></div>}
                </div>
              ))}
            </div>
            
            {order.status?.toLowerCase() === 'cancellation_requested' && (
              <div className="cancellation-notice-new warning">
                <FiClock /> <strong>Cancellation Requested</strong>
                <p>Your request is under review. Reason: {order.cancellationRequest?.reason}</p>
              </div>
            )}

            {order.status?.toLowerCase() === 'cancelled' && (
              <div className="cancellation-notice-new danger">
                <FiXCircle /> <strong>Order Cancelled</strong>
                <p>This order was cancelled. {order.cancellationRequest?.approvedAt ? `Approved on ${formatDate(order.cancellationRequest.approvedAt)}` : ''}</p>
              </div>
            )}

            {order.cancellationRequest?.status === 'rejected' && (
              <div className="cancellation-notice-new danger">
                <FiInfo /> <strong>Cancellation Request Rejected</strong>
                <p>Your cancellation request was rejected. Reason: {order.cancellationRequest.rejectionReason}</p>
              </div>
            )}

            {order.status?.toLowerCase() !== 'delivered' && order.status?.toLowerCase() !== 'cancelled' && (
              <div className="delivery-estimate">
                <FiTruck /> Expected delivery: <strong>3–5 days from order date</strong>
              </div>
            )}
          </div>

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
          <div className="order-card info-card-new">
            <h3 className="card-title"><FiCreditCard /> Payment Details</h3>
            <div className="payment-details-content">
              <div className="payment-method-info">
                <div className="method-icon">
                  {order.paymentMethod === 'cod' ? <FiClock /> : <FiCheckCircle className="success" />}
                </div>
                <div className="method-text">
                  <p className="method-name">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online (Razorpay)'}</p>
                  {order.paymentId && <p className="transaction-id">Transaction ID: {order.paymentId}</p>}
                </div>
              </div>
              <div className={`payment-status-badge ${order.paymentStatus?.toLowerCase()}`}>
                {order.paymentStatus || 'Pending'}
              </div>
            </div>
          </div>

          <div className="order-card info-card-new">
            <h3 className="card-title"><FiMapPin /> Delivery Address</h3>
            <div className="address-content-new">
              {order.shippingAddress ? (
                <>
                  <p className="customer-name">{order.shippingAddress.name}</p>
                  <p className="address-text">
                    {order.shippingAddress.address}, {order.shippingAddress.locality}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} - <strong>{order.shippingAddress.pincode}</strong>
                  </p>
                  <p className="phone">📞 {order.shippingAddress.phone}</p>
                </>
              ) : order.address ? (
                <>
                  <p className="customer-name">{order.customerName}</p>
                  <p className="address-text">
                    {order.address.street || order.address.address}<br />
                    {order.address.city}, {order.address.state} - <strong>{order.address.pincode}</strong>
                  </p>
                  <p className="phone">📞 {order.phone || order.phoneNumber}</p>
                </>
              ) : (
                <p className="no-address">No address information available</p>
              )}
            </div>
          </div>

          <div className="order-card summary-card-new">
            <h3 className="card-title">Price Details</h3>
            <div className="price-breakdown">
              <div className="price-row">
                <span>Items Total</span>
                <span>₹{order.totalAmount}</span>
              </div>
              <div className="price-row">
                <span>Delivery Fee</span>
                <span className="success">FREE</span>
              </div>
              <div className="price-row">
                <span>Tax</span>
                <span>₹0</span>
              </div>
              <div className="price-row total-row">
                <span>Total Paid</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
            {order.paymentStatus === 'Paid' && (
              <div className="payment-success-note">
                <FiCheckCircle /> Payment Successful
              </div>
            )}
          </div>

          <div className="order-actions-footer">
            {order.status?.toLowerCase() === 'pending' && (
              <button className="btn-danger-outline full-width" onClick={() => setShowCancelModal(true)}>
                Request Cancellation
              </button>
            )}
            {(order.status?.toLowerCase() === 'accepted' || order.status?.toLowerCase() === 'shipped') && (
              <button className="btn-primary full-width" onClick={() => alert('Tracking feature coming soon!')}>
                Track Order
              </button>
            )}
            {(order.status?.toLowerCase() === 'delivered' || order.status?.toLowerCase() === 'cancelled') && (
              <button className="btn-primary-outline full-width" onClick={() => navigate('/shop')}>
                Reorder Items
              </button>
            )}
          </div>

          <div className="order-card support-card-new">
            <h3 className="card-title">Need Help?</h3>
            <p className="support-subtitle">Get in touch with our team for any queries</p>
            <div className="support-grid">
              <a href={`https://wa.me/919087659045?text=Hi, I need help with my order #${order.id}`} target="_blank" rel="noreferrer" className="support-item whatsapp">
                <FiMessageCircle /> WhatsApp
              </a>
              <a href="tel:+919087659045" className="support-item call">
                <FiPhone /> Call Us
              </a>
              <a href="mailto:support@satvaorganics.com" className="support-item email">
                <FiMail /> Email
              </a>
            </div>
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="modal-overlay-new">
          <div className="modal-content-new">
            <div className="modal-header-new">
              <h3>Request Cancellation</h3>
              <button onClick={() => setShowCancelModal(false)}><FiXCircle /></button>
            </div>
            <div className="modal-body-new">
              <p>Please select a reason for cancellation:</p>
              <select 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)}
                className="reason-select"
              >
                <option value="">Select a reason</option>
                {cancelReasons.map((reason, idx) => (
                  <option key={idx} value={reason}>{reason}</option>
                ))}
              </select>
              <div className="modal-info-box">
                <FiInfo />
                <p>Your request will be reviewed by our admin team. You will be notified once it's approved.</p>
              </div>
            </div>
            <div className="modal-footer-new">
              <button className="btn-secondary" onClick={() => setShowCancelModal(false)}>Back</button>
              <button 
                className="btn-danger" 
                onClick={handleRequestCancellation}
                disabled={isCancelling || !cancelReason}
              >
                {isCancelling ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
