import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { downloadInvoice } from '../../utils/invoiceGenerator';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  
  // Mobile Filter State
  const [showFilter, setShowFilter] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState('All');

  useEffect(() => {
    if (!currentUser) return;

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

  const cancellationReasons = [
    "Changed my mind",
    "Ordered by mistake",
    "Found a better price",
    "Item not needed anymore",
    "Expected delivery date changed",
    "Other"
  ];


  const handleCancelClick = (orderId, e) => {
    if(e) e.stopPropagation();
    setCancelModal({ isOpen: true, orderId });
    setCancelReason('');
    setCustomReason('');
  };

  const submitCancellation = async () => {
    if (!cancelReason) return;
    const reason = cancelReason === 'Other' ? customReason : cancelReason;
    
    try {
      const orderRef = doc(db, 'orders', cancelModal.orderId);
      await updateDoc(orderRef, {
        cancellationRequest: {
          status: 'pending',
          reason: reason,
          requestedAt: serverTimestamp()
        }
      });
      
      setOrders(orders.map(o => o.id === cancelModal.orderId ? { 
        ...o, 
        cancellationRequest: { status: 'pending', reason, requestedAt: new Date() } 
      } : o));
      
      setCancelModal({ isOpen: false, orderId: null });
      alert('Cancellation request sent to admin for approval.');
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      alert('Failed to send cancellation request.');
    }
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
                    <span className="order-id">Order #{order.id.substring(0, 8).toUpperCase()}</span>
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
                        <div className="mobile-p-order-id">ORDER #{ (order.id || '').toUpperCase().substring(0, 12) }</div>
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
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setCancelModal({ isOpen: false, orderId: null })}>Close</button>
              <button 
                className="btn-danger" 
                onClick={submitCancellation}
                disabled={!cancelReason || (cancelReason === 'Other' && !customReason)}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
