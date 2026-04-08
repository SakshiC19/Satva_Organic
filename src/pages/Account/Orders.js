import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { downloadInvoice } from '../../utils/invoiceGenerator';
import { uploadImage } from '../../services/storageService';
import Badge from '../../components/common/Badge';
import {
  BsDownload,
  BsBoxSeam,
  BsXCircle,
  BsChevronRight,
  BsHouse,
  BsFilter,
  BsSearch,
  BsCheckLg,
  BsXLg
} from 'react-icons/bs';
import './Account.css';

const Orders = () => {
  const { currentUser } = useAuth();
  const { addToCart, openCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  
  // Mobile Filter State
  const [showFilter, setShowFilter] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState('All');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status) {
      setStatusFilter(status);
      setTempStatusFilter(status);
    } else {
      setStatusFilter('All');
      setTempStatusFilter('All');
    }
  }, [location.search]);

  const [allOrdersTotal, setAllOrdersTotal] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch total orders to calculate global serial numbers
    const fetchGlobalInfo = async () => {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        const sortedAll = snap.docs.map(doc => ({
          id: doc.id,
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt || 0)
        })).sort((a, b) => b.createdAt - a.createdAt);
        
        setAllOrders(sortedAll);
        setAllOrdersTotal(snap.size);
      } catch (err) {
        console.error("Error fetching global orders for serials:", err);
      }
    };

    fetchGlobalInfo();

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);



  const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null });
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [cancelImage, setCancelImage] = useState(null);
  const [cancelPreview, setCancelPreview] = useState(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [cancellationReasons, setCancellationReasons] = useState([
    "Changed my mind",
    "Ordered by mistake",
    "Found a better price",
    "Item not needed anymore",
    "Expected delivery date changed",
    "Other"
  ]);

  // Refund State
  const [refundModal, setRefundModal] = useState({ isOpen: false, orderId: null });
  const [refundReason, setRefundReason] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundImage, setRefundImage] = useState(null);
  const [refundPreview, setRefundPreview] = useState(null);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  const [refundReasons, setRefundReasons] = useState([
    "Product is damaged / broken",
    "Wrong item received",
    "Product quality not as expected",
    "Expired product",
    "Missing items in package",
    "Other"
  ]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'order_reasons'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.cancellationReasons) setCancellationReasons(data.cancellationReasons);
        if (data.refundReasons) setRefundReasons(data.refundReasons);
      }
    });
    return () => unsubscribe();
  }, []);


  const handleCancelClick = (orderId, e) => {
    if(e) e.stopPropagation();
    setCancelModal({ isOpen: true, orderId });
    setCancelReason('');
    setCustomReason('');
    setCancelImage(null);
    setCancelPreview(null);
  };

  const handleCancelImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCancelImage(file);
      setCancelPreview(URL.createObjectURL(file));
    }
  };

  const submitCancellation = async () => {
    if (!cancelReason) {
      alert('Please select a reason for cancellation.');
      return;
    }
    if (cancelReason === 'Other' && !customReason.trim()) {
      alert('Please specify the reason for choosing "Other".');
      return;
    }
    const reason = cancelReason === 'Other' ? customReason.trim() : cancelReason;
    
    setIsSubmittingCancel(true);
    try {
      let imageUrl = null;
      if (cancelImage) {
        const uploadResult = await uploadImage(cancelImage, `cancellations/${cancelModal.orderId}`);
        imageUrl = uploadResult.url;
      }

      const orderRef = doc(db, 'orders', cancelModal.orderId);
      await updateDoc(orderRef, {
        cancellationRequest: {
          status: 'pending',
          reason: reason,
          message: cancelReason === 'Other' ? customReason.trim() : '',
          photoUrl: imageUrl,
          requestedAt: serverTimestamp()
        }
      });
      
      setOrders(orders.map(o => o.id === cancelModal.orderId ? { 
        ...o, 
        cancellationRequest: { status: 'pending', reason, message: cancelReason === 'Other' ? customReason.trim() : '', photoUrl: imageUrl, requestedAt: new Date() } 
      } : o));
      
      setCancelModal({ isOpen: false, orderId: null });
      alert('Cancellation request sent to admin for approval.');
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      alert('Failed to send cancellation request.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleRefundClick = (orderId, e) => {
    if (e) e.stopPropagation();
    setRefundModal({ isOpen: true, orderId });
    setRefundReason('');
    setRefundNote('');
    setRefundImage(null);
    setRefundPreview(null);
  };

  const handleRefundImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRefundImage(file);
      setRefundPreview(URL.createObjectURL(file));
    }
  };

  const submitRefundRequest = async () => {
    if (!refundReason) {
      alert('Please select a reason for refund.');
      return;
    }
    if (refundReason === 'Other' && !refundNote.trim()) {
      alert('Please provide details for choosing "Other".');
      return;
    }
    
    setIsSubmittingRefund(true);
    try {
      let imageUrl = null;
      if (refundImage) {
        const uploadResult = await uploadImage(refundImage, `refunds/${refundModal.orderId}`);
        imageUrl = uploadResult.url;
      }

      const orderRef = doc(db, 'orders', refundModal.orderId);
      await updateDoc(orderRef, {
        refundRequest: {
          status: 'pending',
          reason: refundReason,
          message: refundNote,
          photoUrl: imageUrl,
          requestedAt: serverTimestamp()
        }
      });

      setOrders(orders.map(o => o.id === refundModal.orderId ? {
        ...o,
        refundRequest: { status: 'pending', reason: refundReason, message: refundNote, photoUrl: imageUrl, requestedAt: new Date() }
      } : o));

      setRefundModal({ isOpen: false, orderId: null });
      alert('Your refund request has been submitted and is pending approval.');
    } catch (error) {
      console.error("Error submitting refund request:", error);
      alert('Failed to submit refund request. Please try again.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const isEligibleForRefund = (status, updatedAt) => {
    if (status !== 'Delivered' || !updatedAt) return false;
    const deliveryDate = updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt);
    const diffTime = Math.abs(new Date() - deliveryDate);
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours <= 48; // 2 days = 48 hours
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Placed on: N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Placed on: N/A';
      return `Placed on ${date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })}`;
    } catch (e) {
      return 'Placed on: N/A';
    }
  };

  const getEstimatedDelivery = (timestamp) => {
    if (!timestamp) return 'Fri, 13 Feb';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      date.setDate(date.getDate() + 7); // Mock 7 days delivery
      return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch (e) {
      return 'Fri, 13 Feb';
    }
  };

  const formatDateOnly = (timestamp) => {
    try {
      if (!timestamp) return '';
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch (e) {
      return '';
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items?.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'All') {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateFilter === 'Today') {
          matchesDate = orderDate >= today;
        } else if (dateFilter === 'This Week') {
          matchesDate = (now - orderDate) / (1000 * 60 * 60 * 24) <= 7;
        } else if (dateFilter === 'This Month') {
          matchesDate = (now - orderDate) / (1000 * 60 * 60 * 24) <= 30;
        } else if (dateFilter === 'Last 30 Days') {
          matchesDate = (now - orderDate) / (1000 * 60 * 60 * 24) <= 30;
        } else if (dateFilter === 'Last 6 Months') {
          matchesDate = (now - orderDate) / (1000 * 60 * 60 * 24) <= 180;
        } else if (dateFilter === '2025') {
          matchesDate = orderDate.getFullYear() === 2025;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'success';
      case 'Cancelled': return 'danger';
      case 'Processing': return 'warning';
      case 'Accepted': return 'success';
      case 'Shipped': return 'info';
      case 'Out for Delivery': return 'primary';
      case 'Returned': return 'secondary';
      default: return 'warning';
    }
  };

  if (loading) {
    return (
      <div className="account-section">
        <div className="account-header">
          <h2 className="account-title">My Orders</h2>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-section">
      {/* Breadcrumb */}
      <div className="breadcrumb desktop-only">
        <Link to="/" className="breadcrumb-item">
          <BsHouse /> Home
        </Link>
        <BsChevronRight className="breadcrumb-separator" />
        <span className="breadcrumb-item active">My Orders</span>
      </div>

      <div className="account-header">
        <h2 className="account-title">MY ORDERS</h2>
      </div>

      {/* Search and Filters */}
      <div className="orders-search-bar">
        <div className="search-input-wrapper">
          <BsSearch className="search-icon-small" />
          <input 
            type="text" 
            placeholder="Search orders" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="mobile-filters-btn" onClick={() => {
            setTempStatusFilter(statusFilter);
            setShowFilter(true);
        }}>
          <BsFilter /> Filters
        </button>
      </div>

      <div className="orders-list">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <React.Fragment key={order.id}>
              {/* Desktop View */}
              <div className="order-card-enhanced desktop-view">
                {/* Header: Order ID, Date, Status */}
                <div className="card-header-row">
                  <div className="header-left">
                    <span className="order-id">Order #{allOrders.length - allOrders.findIndex(ao => ao.id === order.id)}</span>
                    <span className="order-date">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="header-right">
                    <Badge variant={getStatusColor(order.status)}>{order.status || 'Processing'}</Badge>
                  </div>
                </div>

                {/* Body: Items, Payment, Address */}
                <div className="card-body-row">
                  <div className="items-section">
                    {order.items?.slice(0, 2).map((item, idx) => (
                       <div key={idx} className="item-row">
                         <img src={item.image} alt={item.name} className="item-thumb" />
                         <div className="item-details">
                           <span className="item-name">{item.name}</span>
                           <span className="item-meta">Qty: {item.quantity} | {item.selectedSize || 'Standard'}</span>
                         </div>
                       </div>
                    ))}
                    {order.items?.length > 2 && (
                      <div className="more-items">+{order.items.length - 2} more items</div>
                    )}
                  </div>
                  
                  <div className="info-section">
                    <div className="info-block">
                      <span className="info-label">Payment</span>
                      <span className="info-value">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                    </div>
                    <div className="info-block">
                      <span className="info-label">Delivery To</span>
                      <span className="info-value">{order.shippingAddress?.city || 'N/A'} - {order.shippingAddress?.pincode || ''}</span>
                    </div>
                    <div className="info-block">
                      <span className="info-label">Total Amount</span>
                      <span className="info-value price">₹{order.totalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Actions */}
                <div className="card-footer-row">
                  <div className="footer-actions">
                    <button className="btn-track" onClick={() => navigate(`/account/orders/${order.id}`)}>
                      Track Order
                    </button>
                    {['Pending', 'Accepted', 'Processing', 'Packed'].includes(order.status) && (
                      order.cancellationRequest?.status === 'pending' ? (
                        <button className="btn-cancel disabled" disabled>
                          Cancellation Requested
                        </button>
                      ) : (
                        <button className="btn-cancel" onClick={(e) => handleCancelClick(order.id, e)}>
                          Cancel Order
                        </button>
                      )
                    )}
                    {isEligibleForRefund(order.status, order.updatedAt) && (
                      order.refundRequest ? (
                        <button className="btn-refund disabled" disabled>
                          Refund {order.refundRequest.status.charAt(0).toUpperCase() + order.refundRequest.status.slice(1)}
                        </button>
                      ) : (
                        <button className="btn-refund" onClick={(e) => handleRefundClick(order.id, e)}>
                          Refund Product
                        </button>
                      )
                    )}
                    {['confirmed', 'processing', 'packed', 'shipped', 'out for delivery', 'delivered'].includes(order.status?.toLowerCase()) && (
                      <button className="btn-text" onClick={() => downloadInvoice(order)}>
                        <BsDownload /> Invoice
                      </button>
                    )}
                  </div>
                  <Link to={`/account/orders/${order.id}`} className="view-full-details">
                    View Full Details <BsChevronRight />
                  </Link>
                </div>
              </div>

                {/* Mobile View */}
                <div className="mobile-view mobile-p-card" onClick={() => navigate(`/account/orders/${order.id}`)}>
                    <img src={order.items?.[0]?.image} alt={order.items?.[0]?.name} className="mobile-p-img" />
                    <div className="mobile-p-info">
                    <div className="mobile-p-order-id">ORDER #{allOrders.length - allOrders.findIndex(ao => ao.id === order.id)}</div>
                    <h4 className="mobile-p-name">{order.items?.[0]?.name}</h4>
                    <p className="mobile-p-meta">
                        {order.items?.[0]?.selectedSize || '300g'} <span className="dot-sep">•</span> {order.paymentMethod === 'cod' ? 'Cash' : 'Paid'} ₹{order.totalAmount}
                    </p>
                        <p className={`mobile-p-policy ${order.status === 'Cancelled' ? 'danger' : 'success'}`}>
                            {order.status === 'Delivered' ? `Delivered on ${formatDateOnly(order.updatedAt)}` : 
                             order.status === 'Cancelled' ? 'Order Cancelled' : `Delivery by ${getEstimatedDelivery(order.createdAt)}`}
                        </p>
                    </div>
                    <div className="mobile-p-arrow">
                        <BsChevronRight />
                    </div>

                    {order.status === 'Delivered' && (
                        <div className="mobile-card-footer" style={{position: 'absolute', bottom: '10px', right: '40px'}}>
                           <button className="btn-add-feedback" style={{background: 'none', border: '1px solid #be185d', color: '#be185d', padding: '4px 8px', borderRadius: '4px', fontSize: '10px'}} onClick={(e) => e.stopPropagation()}>
                             ADD FEEDBACK
                           </button>
                        </div>
                    )}
                </div>
            </React.Fragment>
          ))
        ) : (
          <div className="empty-orders">
            <div className="empty-icon">
              <BsBoxSeam />
            </div>
            <h3>No orders found</h3>
            <p>Try adjusting your search or filters.</p>
            <Link to="/shop" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        )}
      </div>

      
      {/* Mobile Filter Modal */}
      {showFilter && (
        <div className="mobile-filter-overlay" onClick={() => setShowFilter(false)}>
          <div className="mobile-filter-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="filter-sheet-header">
              <h3>FILTER BY</h3>
              <button className="close-filter-btn" onClick={() => setShowFilter(false)}>
                <BsXLg />
              </button>
            </div>
            
            <div className="filter-sheet-content">
              <h4>Status</h4>
              <div className="filter-options-list">
                {[
                  { label: 'All', value: 'All' },
                  { label: 'Ordered', value: 'Accepted' }, // Assuming 'Accepted' is the ordered status, logic might need adjustment if multiple statuses map to 'Ordered'
                  { label: 'Shipped', value: 'Shipped' },
                  { label: 'Delivered', value: 'Delivered' },
                  { label: 'Cancelled', value: 'Cancelled' },
                  { label: 'Exchange', value: 'Exchange' },
                  { label: 'Return', value: 'Returned' }
                ].map((option) => (
                  <label key={option.value} className="filter-option-item">
                    <div className="radio-circle">
                      {tempStatusFilter === option.value && <div className="radio-dot" />}
                    </div>
                    <input 
                      type="radio" 
                      name="statusFilter" 
                      value={option.value}
                      checked={tempStatusFilter === option.value}
                      onChange={() => setTempStatusFilter(option.value)}
                      style={{ display: 'none' }}
                    />
                    <span className="option-label">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-sheet-footer">
              <button 
                className="btn-clear-filter" 
                onClick={() => setTempStatusFilter('All')}
              >
                Clear
              </button>
              <button 
                className="btn-apply-filter" 
                onClick={() => {
                  setStatusFilter(tempStatusFilter);
                  setShowFilter(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content small-modal">
            <div className="modal-header">
              <h3>Request Cancellation</h3>
              <button className="close-btn" onClick={() => setCancelModal({ isOpen: false, orderId: null })}>
                <BsXCircle />
              </button>
            </div>
            <div className="modal-body">
              <p>Please select a reason for cancellation:</p>
              <select 
                className="form-select"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="">Select Reason</option>
                {cancellationReasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              
              {cancelReason === 'Other' && (
                <textarea
                  className="form-textarea"
                  placeholder="Please specify reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows="3"
                  style={{ marginTop: '10px', width: '100%' }}
                />
              )}

              <div className="upload-section" style={{ marginTop: '15px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  Upload Product Photo (Optional)
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleCancelImageChange}
                  style={{ fontSize: '12px' }}
                />
                {cancelPreview && (
                  <div className="photo-preview" style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img 
                      src={cancelPreview} 
                      alt="Preview" 
                      style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} 
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setCancelModal({ isOpen: false, orderId: null })}
                disabled={isSubmittingCancel}
              >
                Close
              </button>
              <button 
                className="btn-primary" 
                onClick={submitCancellation}
                disabled={!cancelReason || (cancelReason === 'Other' && !customReason.trim()) || isSubmittingCancel}
                style={{ backgroundColor: !cancelReason || (cancelReason === 'Other' && !customReason.trim()) || isSubmittingCancel ? '#fda4af' : '#ef4444' }}
              >
                {isSubmittingCancel ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content small-modal">
            <div className="modal-header">
              <h3>Request Refund</h3>
              <button className="close-btn" onClick={() => setRefundModal({ isOpen: false, orderId: null })}>
                <BsXCircle />
              </button>
            </div>
            <div className="modal-body">
              <p>Requested refunds must be within 2 days of delivery.</p>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label className="form-label">Reason for Refund *</label>
                <select 
                  className="form-select"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <option value="">Select Reason</option>
                  {refundReasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label className="form-label">Additional Details</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tell us more about the issue..."
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  rows="3"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Photo *</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleRefundImageChange}
                  style={{ width: '100%', marginBottom: '10px' }}
                />
                {refundPreview && (
                  <div className="refund-preview" style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img src={refundPreview} alt="Refund Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRefundModal({ isOpen: false, orderId: null })}>Close</button>
              <button 
                className="btn-primary" 
                onClick={submitRefundRequest}
                disabled={isSubmittingRefund || !refundReason || (refundReason === 'Other' && !refundNote.trim()) || !refundImage}
              >
                {isSubmittingRefund ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
