import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { generateInvoice } from '../../utils/invoiceGenerator';
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
  FiChevronRight
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

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
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

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          status: 'Cancelled',
          updatedAt: serverTimestamp(),
          cancelReason: 'User cancelled'
        });
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
      } catch (error) {
        console.error("Error cancelling order:", error);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
        if (dateFilter === 'Last 30 Days') {
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
      <div className="account-header">
        <h2 className="account-title">My Orders ({filteredOrders.length})</h2>
      </div>

      {/* Filters & Search */}
      <div className="orders-controls">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by Order ID or Product Name" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-group">
          <div className="filter-item">
            <FiFilter className="filter-icon" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Processing">Processing</option>
              <option value="Packed">Packed</option>
              <option value="Shipped">Shipped</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
          <div className="filter-item">
            <FiCalendar className="filter-icon" />
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="All">All Time</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 6 Months">Last 6 Months</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>

      <div className="orders-list">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <div key={order.id} className="order-card-premium">
              <div className="order-card-header">
                <div className="order-main-info">
                  <div className="order-id-group">
                    <span className="label">Order ID</span>
                    <span className="value">#{order.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="order-date-group">
                    <FiCalendar className="icon" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>
                <div className="order-status-group">
                  <Badge variant={getStatusColor(order.status)}>
                    {order.status || 'Processing'}
                  </Badge>
                  {order.estimatedDelivery && (
                    <span className="est-delivery">
                      Est. Delivery: {order.estimatedDelivery}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="order-card-body">
                <div className="order-items-preview">
                  <div className="items-list">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="item-mini">
                        <img src={item.image} alt={item.name} />
                        <div className="item-info">
                          <span className="name">{item.name}</span>
                          <span className="qty">Qty: {item.quantity} | {item.selectedSize || '500g'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="order-summary-actions">
                  <div className="order-total">
                    <span className="label">Total Amount</span>
                    <span className="amount">₹{order.totalAmount}</span>
                  </div>
                  <div className="order-actions-grid">
                    <button 
                      className="btn-action btn-track"
                      onClick={() => navigate(`/account/orders/${order.id}`)}
                    >
                      <FiTruck /> Track Order
                    </button>
                    <button 
                      className="btn-action btn-reorder"
                      onClick={() => handleReorder(order)}
                    >
                      <FiRefreshCw /> Reorder
                    </button>
                    <button 
                      className="btn-action btn-invoice"
                      onClick={() => generateInvoice(order)}
                    >
                      <FiDownload /> Invoice
                    </button>
                    
                    {order.status === 'Processing' && (
                      <button 
                        className="btn-action btn-cancel"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        <FiXCircle /> Cancel
                      </button>
                    )}
                    
                    {order.status === 'Delivered' && (
                      <button 
                        className="btn-action btn-return"
                        onClick={() => navigate(`/account/orders/${order.id}?action=return`)}
                      >
                        <FiRotateCcw /> Return
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="order-card-footer">
                <Link to={`/account/orders/${order.id}`} className="view-details-link">
                  View Full Order Details <FiChevronRight />
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
    </div>
  );
};

export default Orders;
