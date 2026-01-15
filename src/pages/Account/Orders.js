import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { downloadInvoice } from '../../utils/invoiceGenerator';
import Badge from '../../components/common/Badge';
import { 
  FiDownload, 
  FiPackage, 
  FiCalendar, 
  FiSearch, 
  FiFilter, 
  FiRefreshCw, 
  FiXCircle, 
  FiRotateCcw,
  FiTruck,
  FiChevronRight,
  FiHome
} from 'react-icons/fi';
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
  const [showFilters, setShowFilters] = useState(false);

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

  const handleReorder = (order) => {
    order.items.forEach(item => {
      addToCart({
        ...item,
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        selectedSize: item.selectedSize || 'Standard',
        quantity: item.quantity
      });
    });
    openCart();
  };

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


  const handleCancelClick = (orderId) => {
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
      <div className="breadcrumb">
        <Link to="/" className="breadcrumb-item">
          <FiHome /> Home
        </Link>
        <FiChevronRight className="breadcrumb-separator" />
        <span className="breadcrumb-item active">My Orders</span>
      </div>

      <div className="account-header">
        <h2 className="account-title">My Orders ({filteredOrders.length})</h2>
      </div>



      <div className="orders-list">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <div key={order.id} className="order-card-enhanced">
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
                        <span className="item-meta">Qty: {item.quantity} | {item.selectedSize}</span>
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
                      <button className="btn-cancel" onClick={() => handleCancelClick(order.id)}>
                        Cancel Order
                      </button>
                    )
                  )}
                  {['confirmed', 'processing', 'packed', 'shipped', 'out for delivery', 'delivered'].includes(order.status?.toLowerCase()) && (
                    <button className="btn-text" onClick={() => downloadInvoice(order)}>
                      <FiDownload /> Invoice
                    </button>
                  )}
                </div>
                <Link to={`/account/orders/${order.id}`} className="view-full-details">
                  View Full Details <FiChevronRight />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-orders">
            <div className="empty-icon">
              <FiPackage />
            </div>
            <h3>No orders found</h3>
            <p>Try adjusting your search or filters.</p>
            <Link to="/shop" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        )}
      </div>

      
      {/* Cancellation Modal */}
      {cancelModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content small-modal">
            <div className="modal-header">
              <h3>Request Cancellation</h3>
              <button className="close-btn" onClick={() => setCancelModal({ isOpen: false, orderId: null })}>
                <FiXCircle />
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
