import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiSearch, FiFilter, FiMoreVertical, FiEdit, FiStar, FiTrash2, FiClock, FiPackage, FiDownload, FiPrinter, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { generateInvoice } from '../../utils/invoiceGenerator';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders from Firebase...');
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
      console.error('Error details:', error.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate comprehensive stats
  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total Revenue
    const totalRevenue = orders
      .filter(o => o.status?.toLowerCase() === 'delivered')
      .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

    // Today's Orders
    const todayOrders = orders.filter(o => {
      const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return orderDate >= today;
    }).length;

    // Pending Payments (COD orders that are delivered but not marked as paid)
    const pendingPayments = orders.filter(o =>
      o.paymentMethod === 'cod' &&
      o.status?.toLowerCase() === 'delivered' &&
      !o.paymentReceived
    ).length;

    // Refund Requests
    const refundRequests = orders.filter(o =>
      o.refundStatus === 'requested' || o.refundStatus === 'pending'
    ).length;

    // Average Order Value
    const completedOrders = orders.filter(o => o.status?.toLowerCase() === 'delivered');
    const avgOrderValue = completedOrders.length > 0
      ? totalRevenue / completedOrders.length
      : 0;

    // Status counts
    const pending = orders.filter(o => o.status?.toLowerCase() === 'pending').length;
    const confirmed = orders.filter(o => o.status?.toLowerCase() === 'confirmed').length;
    const processing = orders.filter(o => o.status?.toLowerCase() === 'processing').length;
    const packed = orders.filter(o => o.status?.toLowerCase() === 'packed').length;
    const outForDelivery = orders.filter(o => o.status?.toLowerCase() === 'shipped' || o.status?.toLowerCase() === 'out-for-delivery').length;
    const delivered = orders.filter(o => o.status?.toLowerCase() === 'delivered').length;
    const cancelled = orders.filter(o => o.status?.toLowerCase() === 'cancelled').length;
    const returned = orders.filter(o => o.status?.toLowerCase() === 'returned').length;
    const refunded = orders.filter(o => o.status?.toLowerCase() === 'refunded').length;

    return {
      totalRevenue,
      todayOrders,
      pendingPayments,
      refundRequests,
      avgOrderValue,
      total: orders.length,
      pending,
      confirmed,
      processing,
      packed,
      outForDelivery,
      delivered,
      cancelled,
      returned,
      refunded
    };
  };

  const stats = calculateStats();

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      setActiveDropdown(null);
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const handleBulkAction = (action) => {
    alert(`Bulk action "${action}" for ${selectedOrders.length} orders`);
  };

  const addSampleOrders = async () => {
    alert('Sample orders functionality coming soon');
  };

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
      order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'pending' && order.status?.toLowerCase() === 'pending') ||
      (activeTab === 'processing' && order.status?.toLowerCase() === 'processing') ||
      (activeTab === 'out-for-delivery' && order.status?.toLowerCase() === 'shipped') ||
      (activeTab === 'delivered' && order.status?.toLowerCase() === 'delivered');
    
    return matchesSearch && matchesTab;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Accept';
      case 'shipped':
        return 'Out for Delivery';
      case 'delivered':
        return 'Completed';
      case 'cancelled':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
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
              placeholder="Search by Order ID, Customer, Phone, Email..."
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
        <div className="stat-card stat-new">
          <div className="stat-icon-wrapper blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 7V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V7" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total New Orders</p>
            <div className="stat-value-row">
              <h2 className="stat-value">{stats.total.toLocaleString()}</h2>
              <span className="stat-change positive">{getPercentageChange(stats.total, stats.total - 100)}</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-pending">
          <div className="stat-icon-wrapper purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Orders Pending</p>
            <div className="stat-value-row">
              <h2 className="stat-value">{stats.pending}</h2>
              <span className="stat-change negative">-10%</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon-wrapper green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Orders Completed</p>
            <div className="stat-value-row">
              <h2 className="stat-value">{stats.completed.toLocaleString()}</h2>
              <span className="stat-change positive">+84%</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-cancelled">
          <div className="stat-icon-wrapper red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Orders Canceled</p>
            <div className="stat-value-row">
              <h2 className="stat-value">{stats.cancelled}</h2>
              <span className="stat-change positive">+54%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="date-range-selector">
        <button
          className={dateRange === 'today' ? 'active' : ''}
          onClick={() => setDateRange('today')}
        >
          Today
        </button>
        <button
          className={dateRange === 'week' ? 'active' : ''}
          onClick={() => setDateRange('week')}
        >
          This Week
        </button>
        <button
          className={dateRange === 'month' ? 'active' : ''}
          onClick={() => setDateRange('month')}
        >
          This Month
        </button>
        <button
          className={dateRange === 'all' ? 'active' : ''}
          onClick={() => setDateRange('all')}
        >
          All Time
        </button>
      </div>

      {/* Orders List Section */}
      <div className="om-orders-section">
        <div className="om-section-header">
          <h2 className="section-title">Orders List ({filteredOrders.length})</h2>
          <div className="header-actions">
            <button className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)}>
              <FiFilter /> Filters
            </button>
            {selectedOrders.length > 0 && (
              <div className="bulk-actions">
                <button onClick={() => handleBulkAction('export')}>
                  <FiDownload /> Export
                </button>
                <button onClick={() => handleBulkAction('print')}>
                  <FiPrinter /> Print
                </button>
                <button onClick={() => handleBulkAction('cancel')} className="danger">
                  <FiX /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-group">
              <label>Payment Status</label>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="cod">Cash on Delivery</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        )}

        {/* Enhanced Tabs */}
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
          </div>
          <div className="om-table-actions">
            <button className="table-action-btn" onClick={() => document.querySelector('.om-search-box input')?.focus()} title="Search">
              <FiSearch />
            </button>
            <button className="table-action-btn">
              <FiFilter />
            </button>
            <button className="table-action-btn" onClick={() => alert('View options coming soon')} title="Grid View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button className="table-action-btn" onClick={() => alert('View options coming soon')} title="List View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                  <th>Product Name</th>
                  <th>Customer Name</th>
                  <th>Order Id</th>
                  <th>Amount</th>
                  <th>Status</th>
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
                    <tr key={order.id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-image">
                            {itemImage ? (
                              <img src={itemImage} alt={firstItem.name} />
                            ) : (
                              <div className="product-placeholder">📦</div>
                            )}
                          </div>
                          <div className="product-info">
                            <span className="product-name">{firstItem.name || 'Product'}</span>
                            <span className="product-items">Items {order.items?.length || 1}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {order.customerName?.charAt(0) || 'U'}
                          </div>
                          <div className="customer-info">
                            <span className="customer-name">{order.customerName || 'Customer'}</span>
                            <span className="customer-type">
                              {order.orderCount > 10 ? 'Star Customer' : 
                               order.orderCount > 5 ? 'Pro Customer' : 'New Customer'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="items-cell">
                          <span className="items-count">{order.items?.length || 0} Items</span>
                          <span className="items-preview">{firstItem.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="amount-cell">
                          <span className="amount-value">₹{order.totalAmount?.toLocaleString() || 0}</span>
                          <span className="payment-method">
                            {order.paymentMethod === 'card' ? 'Paid by Mastercard' : 
                             order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <button 
                            className="action-menu-btn invoice-btn"
                            onClick={() => generateInvoice(order)}
                            title="Download Invoice"
                            style={{ marginRight: '8px', color: '#27ae60' }}
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
                            <div className="action-dropdown">
                                <button className="dropdown-item" onClick={() => setViewingOrder(order)}>
                                  <FiSearch /> View Details
                                </button>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                                  <FiEdit /> Confirm Order
                                </button>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'processing')}>
                                  <FiClock /> Start Processing
                                </button>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'shipped')}>
                                  <FiStar /> Ship Order
                                </button>
                                <button className="dropdown-item danger" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
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
              <rect x="8" y="16" width="48" height="40" rx="4" stroke="#D1D5DB" strokeWidth="2"/>
              <path d="M24 16V12C24 10.9 24.9 10 26 10H38C39.1 10 40 10.9 40 12V16" stroke="#D1D5DB" strokeWidth="2"/>
            </svg>
            <h3>No Orders Found</h3>
            <p>
              {searchTerm || activeTab !== 'all' 
                ? 'No orders match your search criteria.' 
                : 'No orders have been placed yet.'}
            </p>
            {(searchTerm === '' && activeTab === 'all' && dateRange === 'all') && (
              <button
                onClick={addSampleOrders}
                className="btn-primary"
                style={{ marginTop: '20px' }}
              >
                <FiPackage style={{ marginRight: '8px' }} />
                Add Sample Orders
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
