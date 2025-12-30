import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiSearch, FiFilter, FiMoreVertical, FiEdit, FiStar, FiTrash2, FiClock, FiTag } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { generateInvoice } from '../../utils/invoiceGenerator';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('all'); // 'today', 'week', 'month', 'all'
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      setActiveDropdown(null);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Calculate stats based on period
  const getFilteredStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const periodOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      if (statsPeriod === 'today') return orderDate >= today;
      if (statsPeriod === 'week') return orderDate >= lastWeek;
      if (statsPeriod === 'month') return orderDate >= lastMonth;
      return true;
    });

    const revenue = periodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const aov = periodOrders.length > 0 ? revenue / periodOrders.length : 0;

    return {
      total: periodOrders.length,
      revenue: revenue,
      aov: aov,
      pending: periodOrders.filter(o => o.status?.toLowerCase() === 'pending').length,
      completed: periodOrders.filter(o => o.status?.toLowerCase() === 'delivered').length,
      cancelled: periodOrders.filter(o => o.status?.toLowerCase() === 'cancelled').length,
      todayCount: orders.filter(o => {
        if (!o.createdAt) return false;
        const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return d >= today;
      }).length
    };
  };

  const stats = getFilteredStats();

  // Calculate percentage changes (mock data for now)
  const getPercentageChange = (current, previous) => {
    if (previous === 0) return '+0%';
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
  };

  // Filter orders based on active tab and search
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && order.status?.toLowerCase() === 'pending') ||
      (activeTab === 'processing' && ['confirmed', 'processing', 'packed'].includes(order.status?.toLowerCase())) ||
      (activeTab === 'out-for-delivery' && order.status?.toLowerCase() === 'shipped') ||
      (activeTab === 'delivered' && order.status?.toLowerCase() === 'delivered') ||
      (activeTab === 'cancelled' && ['cancelled', 'returned', 'refunded'].includes(order.status?.toLowerCase()));

    return matchesSearch && matchesTab;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'processing': return 'status-processing';
      case 'packed': return 'status-packed';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      case 'returned': return 'status-returned';
      case 'refunded': return 'status-refunded';
      default: return 'status-pending';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Order Details #{order.id.substring(0, 8)}</h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="order-info-grid">
              <div className="info-section">
                <h3>Customer Info</h3>
                <p><strong>Name:</strong> {order.customerName}</p>
                <p><strong>Email:</strong> {order.email}</p>
                <p><strong>Phone:</strong> {order.phoneNumber}</p>
              </div>
              <div className="info-section">
                <h3>Shipping Address</h3>
                <p>{order.shippingAddress?.address}</p>
                <p>{order.shippingAddress?.locality}, {order.shippingAddress?.city}</p>
                <p>{order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
              </div>
              <div className="info-section">
                <h3>Payment Info</h3>
                <p><strong>Method:</strong> {order.paymentMethod?.toUpperCase()}</p>
                <p><strong>Status:</strong> {order.paymentStatus || 'Pending'}</p>
                <p><strong>Total:</strong> ₹{order.totalAmount}</p>
              </div>
            </div>
            <div className="items-list">
              <h3>Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>{item.selectedSize}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price}</td>
                      <td>₹{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => generateInvoice(order)}>Download Invoice</button>
            <button className="btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="order-management">
      {/* Header */}
      <div className="om-header">
        <div className="om-header-left">
          <h1 className="om-title">Order Management</h1>
          <p className="om-subtitle">Track and manage all grocery orders in real time.</p>
        </div>
        <div className="om-header-right">
          <div className="om-search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users, orders, products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="om-admin-profile">
            <div className="admin-avatar">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Admin" />
              ) : (
                <span>{currentUser?.displayName?.charAt(0) || 'A'}</span>
              )}
            </div>
            <div className="admin-info">
              <span className="admin-name">{currentUser?.displayName || 'Admin User'}</span>
              <span className="admin-email">{currentUser?.email || 'admin@company.com'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Header with Period Selector */}
      <div className="om-stats-header">
        <h2 className="section-title">Business Overview</h2>
        <div className="period-selector">
          <button className={statsPeriod === 'today' ? 'active' : ''} onClick={() => setStatsPeriod('today')}>Today</button>
          <button className={statsPeriod === 'week' ? 'active' : ''} onClick={() => setStatsPeriod('week')}>Week</button>
          <button className={statsPeriod === 'month' ? 'active' : ''} onClick={() => setStatsPeriod('month')}>Month</button>
          <button className={statsPeriod === 'all' ? 'active' : ''} onClick={() => setStatsPeriod('all')}>All Time</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="om-stats">
        <div className="stat-card stat-revenue">
          <div className="stat-icon-wrapper green">
            <FiTag />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <div className="stat-value-row">
              <h2 className="stat-value">₹{stats.revenue.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="stat-card stat-new">
          <div className="stat-icon-wrapper blue">
            <FiStar />
          </div>
          <div className="stat-content">
            <p className="stat-label">Today's Orders</p>
            <div className="stat-value-row">
              <h2 className="stat-value">{stats.todayCount}</h2>
            </div>
          </div>
        </div>

        <div className="stat-card stat-aov">
          <div className="stat-icon-wrapper purple">
            <FiFilter />
          </div>
          <div className="stat-content">
            <p className="stat-label">Avg Order Value</p>
            <div className="stat-value-row">
              <h2 className="stat-value">₹{stats.aov.toFixed(0)}</h2>
            </div>
          </div>
        </div>

        <div className="stat-card stat-pending">
          <div className="stat-icon-wrapper orange">
            <FiClock />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Orders</p>
            <div className="stat-value-row">
              <h2 className="stat-value">{stats.pending}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List Section */}
      <div className="om-orders-section">
        <div className="om-section-header">
          <h2 className="section-title">Orders List</h2>
          <button className="add-order-btn">+ Add Order</button>
        </div>

        {/* Tabs */}
        <div className="om-tabs-wrapper">
          <div className="om-tabs">
            <button
              className={`om-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Order
            </button>
            <button
              className={`om-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending
            </button>
            <button
              className={`om-tab ${activeTab === 'processing' ? 'active' : ''}`}
              onClick={() => setActiveTab('processing')}
            >
              Processing
            </button>
            <button
              className={`om-tab ${activeTab === 'out-for-delivery' ? 'active' : ''}`}
              onClick={() => setActiveTab('out-for-delivery')}
            >
              Out for Delivery
            </button>
            <button
              className={`om-tab ${activeTab === 'delivered' ? 'active' : ''}`}
              onClick={() => setActiveTab('delivered')}
            >
              Delivered
            </button>
            <button
              className={`om-tab ${activeTab === 'cancelled' ? 'active' : ''}`}
              onClick={() => setActiveTab('cancelled')}
            >
              Cancelled/Refunded
            </button>
          </div>
          <div className="om-table-actions">
            <button className="table-action-btn" onClick={() => document.querySelector('.om-search-box input')?.focus()} title="Search">
              <FiSearch />
            </button>
            <button className="table-action-btn" onClick={() => alert('Filter options coming soon')} title="Filter">
              <FiFilter />
            </button>
            <button className="table-action-btn" onClick={() => alert('View options coming soon')} title="Grid View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button className="table-action-btn" onClick={() => alert('View options coming soon')} title="List View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.length > 0 && (
          <div className="bulk-actions-bar">
            <span>{selectedOrders.length} orders selected</span>
            <div className="bulk-btns">
              <button className="bulk-btn" onClick={() => {/* Bulk Print */}}>Print Invoices</button>
              <button className="bulk-btn" onClick={() => {/* Bulk Export */}}>Export CSV</button>
              <button className="bulk-btn danger" onClick={() => {/* Bulk Cancel */}}>Cancel Selected</button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        {filteredOrders.length > 0 ? (
          <div className="om-table-container">
            <table className="om-table">
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleAllSelection}
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const firstItem = order.items?.[0] || {};
                  const itemImage = firstItem.images && firstItem.images.length > 0
                    ? (firstItem.images[0].url || firstItem.images[0])
                    : firstItem.image;

                  return (
                    <tr key={order.id} className={selectedOrders.includes(order.id) ? 'selected' : ''}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                        />
                      </td>
                      <td>
                        <div className="order-id-cell">
                          <span className="order-id-text">#{order.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {order.customerName?.charAt(0) || 'U'}
                          </div>
                          <div className="customer-info">
                            <span className="customer-name">{order.customerName || 'Customer'}</span>
                            <span className="customer-type">{order.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="items-cell">
                          <button 
                            className="items-count-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Toggle items popover logic could go here, or use a simple tooltip approach
                              // For now, let's make it a simple toggle or just display
                              const details = order.items.map(i => `${i.quantity}x ${i.name}`).join('\n');
                              alert(details); // Simple fallback for now as requested "when clicked... displayed"
                            }}
                            title="Click to view items"
                          >
                            {order.items?.length || 0} Items
                          </button>
                          <div className="items-preview-text">
                             {firstItem.name} {order.items?.length > 1 ? `+${order.items.length - 1} more` : ''}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="amount-cell">
                          <span className="amount-value">₹{order.totalAmount?.toLocaleString() || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div className="payment-cell">
                          <span className={`payment-badge ${order.paymentMethod === 'cod' ? 'cod' : 'paid'}`}>
                            {order.paymentMethod === 'cod' ? 'COD' : 'Paid'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td>
                        <span className="order-date">{formatDate(order.createdAt)}</span>
                      </td>
                      <td>
                        <div className="action-cell" style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 5 }}>
                          <button 
                            className="action-menu-btn invoice-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateInvoice(order);
                            }}
                            title="Download Invoice"
                            style={{ color: '#27ae60', cursor: 'pointer' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </button>
                          <button
                            className="action-menu-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === order.id ? null : order.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <FiMoreVertical />
                          </button>
                          {activeDropdown === order.id && (
                            <div className="action-dropdown" style={{ display: 'block' }}>
                                <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setViewingOrder(order); setActiveDropdown(null); }}>
                                  <FiSearch /> View Details
                                </button>
                                <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'confirmed'); }}>
                                  <FiEdit /> Confirm Order
                                </button>
                                <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'processing'); }}>
                                  <FiClock /> Start Processing
                                </button>
                                <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'shipped'); }}>
                                  <FiStar /> Ship Order
                                </button>
                                <button className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'cancelled'); }}>
                                  <FiTrash2 /> Cancel Order
                                </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="16" width="48" height="40" rx="4" stroke="#D1D5DB" strokeWidth="2" />
              <path d="M24 16V12C24 10.9 24.9 10 26 10H38C39.1 10 40 10.9 40 12V16" stroke="#D1D5DB" strokeWidth="2" />
            </svg>
            <h3>No Orders Found</h3>
            <p>
              {searchTerm || activeTab !== 'all'
                ? 'No orders match your search criteria.'
                : 'No orders have been placed yet.'}
            </p>
          </div>
        )}
      </div>
      {/* Order Details Modal */}
      {viewingOrder && (
        <OrderDetailsModal 
          order={viewingOrder} 
          onClose={() => setViewingOrder(null)} 
        />
      )}
    </div>
  );
};

export default Orders;
