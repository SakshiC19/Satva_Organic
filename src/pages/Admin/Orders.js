import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  FiSearch, FiFilter, FiMoreVertical, FiEdit, FiTrash2, FiEye, FiDownload, 
  FiPrinter, FiTruck, FiX, FiCheck, FiClock, FiPackage, FiDollarSign,
  FiShoppingBag, FiAlertCircle, FiTrendingUp, FiCalendar, FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { downloadInvoice, viewInvoice } from '../../utils/invoiceGenerator';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [specialFilter, setSpecialFilter] = useState(null); // 'pending_payments', 'refund_requests'
  const [showFilters, setShowFilters] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    setLoading(true);
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate comprehensive stats
  const calculateStats = () => {
    if (!orders || orders.length === 0) {
      return {
        totalRevenue: 0,
        todayOrders: 0,
        pendingPayments: 0,
        refundRequests: 0,
        avgOrderValue: 0,
        total: 0,
        pending: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalRevenue = orders
      .filter(o => o.status?.toLowerCase() === 'delivered')
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

    const todayOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return orderDate >= today;
    }).length;

    const pendingPayments = orders.filter(o =>
      o.paymentMethod === 'cod' &&
      o.status?.toLowerCase() === 'delivered' &&
      !o.paymentReceived
    ).length;

    const refundRequests = orders.filter(o =>
      o.status?.toLowerCase() === 'refunded' || o.refundStatus === 'requested'
    ).length;

    const completedOrders = orders.filter(o => o.status?.toLowerCase() === 'delivered');
    const avgOrderValue = completedOrders.length > 0
      ? totalRevenue / completedOrders.length
      : 0;

    return {
      totalRevenue,
      todayOrders,
      pendingPayments,
      refundRequests,
      avgOrderValue,
      total: orders.length,
      pending: orders.filter(o => o.status?.toLowerCase() === 'pending').length,
      processing: orders.filter(o => o.status?.toLowerCase() === 'processing').length,
      delivered: orders.filter(o => o.status?.toLowerCase() === 'delivered').length,
      cancelled: orders.filter(o => o.status?.toLowerCase() === 'cancelled').length
    };
  };

  const stats = calculateStats();

  const handleApproveCancellation = async (orderId) => {
    if (window.confirm('Approve cancellation for this order?')) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          status: 'Cancelled',
          'cancellationRequest.status': 'approved',
          'cancellationRequest.approvedAt': new Date()
        });
        setOrders(orders.map(o => o.id === orderId ? { 
          ...o, 
          status: 'Cancelled',
          cancellationRequest: { ...o.cancellationRequest, status: 'approved' }
        } : o));
        setActiveDropdown(null);
      } catch (error) {
        console.error("Error approving cancellation:", error);
      }
    }
  };

  const handleRejectCancellation = async (orderId) => {
    if (window.confirm('Reject cancellation request?')) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          'cancellationRequest.status': 'rejected',
          'cancellationRequest.rejectedAt': new Date()
        });
        setOrders(orders.map(o => o.id === orderId ? { 
          ...o, 
          cancellationRequest: { ...o.cancellationRequest, status: 'rejected' }
        } : o));
        setActiveDropdown(null);
      } catch (error) {
        console.error("Error rejecting cancellation:", error);
      }
    }
  };

  const handleStatClick = (type) => {
    // Reset other filters
    setSearchTerm('');
    setDateRange('all');
    setPaymentFilter('all');
    setSpecialFilter(null);

    switch (type) {
      case 'revenue':
        setActiveTab('delivered');
        break;
      case 'today':
        setDateRange('today');
        setActiveTab('all');
        break;
      case 'pending_payments':
        setSpecialFilter('pending_payments');
        setActiveTab('all');
        break;
      case 'refunds':
        setSpecialFilter('refund_requests');
        setActiveTab('all');
        break;
      default:
        setActiveTab('all');
    }
    
    // Scroll to orders section
    document.querySelector('.om-orders-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        status: newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: currentUser?.email || 'admin'
      });
      
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

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone?.includes(searchTerm);
    
    const matchesTab = 
      activeTab === 'all' || 
      order.status?.toLowerCase() === activeTab.toLowerCase();

    const matchesPayment =
      paymentFilter === 'all' ||
      order.paymentMethod?.toLowerCase() === paymentFilter.toLowerCase();
    
    let matchesSpecial = true;
    if (specialFilter === 'pending_payments') {
      matchesSpecial = order.paymentMethod === 'cod' && order.status?.toLowerCase() === 'delivered' && !order.paymentReceived;
    } else if (specialFilter === 'refund_requests') {
      matchesSpecial = order.status?.toLowerCase() === 'refunded' || order.refundStatus === 'requested' || order.status?.toLowerCase() === 'returned';
    }

    return matchesSearch && matchesTab && matchesPayment && matchesSpecial;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit',
        month: 'short',
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
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'processing': return 'status-processing';
      case 'packed': return 'status-packed';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      case 'refunded': return 'status-refunded';
      default: return 'status-pending';
    }
  };

  const handleBulkAction = (action) => {
    if (selectedOrders.length === 0) {
      alert('Please select orders first');
      return;
    }
    alert(`Bulk ${action} for ${selectedOrders.length} orders - Feature coming soon`);
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
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
          <h1 className="om-title">Order Management & Invoices</h1>
          <p className="om-subtitle">Track orders, manage shipments, and download invoices</p>
        </div>
        <div className="om-header-right">
          <div className="om-search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search orders, customers, phone..."
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
              <span className="admin-name">{currentUser?.displayName || 'Admin'}</span>
              <span className="admin-email">{currentUser?.email || 'admin@satva.com'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="om-stats-header">
        <h2 className="section-title">Business Overview</h2>
        <div className="date-range-selector">
          <button className={dateRange === 'today' ? 'active' : ''} onClick={() => setDateRange('today')}>
            <FiCalendar /> Today
          </button>
          <button className={dateRange === 'week' ? 'active' : ''} onClick={() => setDateRange('week')}>
            This Week
          </button>
          <button className={dateRange === 'month' ? 'active' : ''} onClick={() => setDateRange('month')}>
            This Month
          </button>
          <button className={dateRange === 'all' ? 'active' : ''} onClick={() => setDateRange('all')}>
            All Time
          </button>
        </div>
      </div>

      <div className="om-stats">
        <div className="stat-card stat-revenue" onClick={() => handleStatClick('revenue')}>
          <div className="stat-icon-wrapper green">
            <FiDollarSign />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <h2 className="stat-value">{formatCurrency(stats.totalRevenue)}</h2>
            <span className="stat-change positive">
              <FiTrendingUp /> +12.5%
            </span>
          </div>
        </div>

        <div className="stat-card stat-today" onClick={() => handleStatClick('today')}>
          <div className="stat-icon-wrapper blue">
            <FiShoppingBag />
          </div>
          <div className="stat-content">
            <p className="stat-label">Today's Orders</p>
            <h2 className="stat-value">{stats.todayOrders}</h2>
            <span className="stat-change positive">
              <FiTrendingUp /> +8.2%
            </span>
          </div>
        </div>

        <div className="stat-card stat-pending-payment" onClick={() => handleStatClick('pending_payments')}>
          <div className="stat-icon-wrapper orange">
            <FiAlertCircle />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Payments</p>
            <h2 className="stat-value">{stats.pendingPayments}</h2>
            <span className="stat-change neutral">COD Orders</span>
          </div>
        </div>

        <div className="stat-card stat-refund" onClick={() => handleStatClick('refunds')}>
          <div className="stat-icon-wrapper red">
            <FiRefreshCw />
          </div>
          <div className="stat-content">
            <p className="stat-label">Refund Requests</p>
            <h2 className="stat-value">{stats.refundRequests}</h2>
            <span className="stat-change neutral">Pending Review</span>
          </div>
        </div>

        <div className="stat-card stat-aov">
          <div className="stat-icon-wrapper purple">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <p className="stat-label">Avg Order Value</p>
            <h2 className="stat-value">{formatCurrency(stats.avgOrderValue)}</h2>
            <span className="stat-change positive">+5.3%</span>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="om-orders-section">
        <div className="om-section-header">
          <h2 className="section-title">Orders List ({filteredOrders.length})</h2>
          <div className="header-actions">
            <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
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

        {/* Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-group">
              <label>Payment Method</label>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="all">All Payments</option>
                <option value="cod">Cash on Delivery</option>
                <option value="online">Online Payment</option>
                <option value="upi">UPI</option>
              </select>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="om-tabs-wrapper">
          <div className="om-tabs">
            <button className={`om-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
              All Orders <span className="tab-count">{stats.total}</span>
            </button>
            <button className={`om-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
              Pending <span className="tab-count">{stats.pending}</span>
            </button>
            <button className={`om-tab ${activeTab === 'processing' ? 'active' : ''}`} onClick={() => setActiveTab('processing')}>
              Processing <span className="tab-count">{stats.processing}</span>
            </button>
            <button className={`om-tab ${activeTab === 'shipped' ? 'active' : ''}`} onClick={() => setActiveTab('shipped')}>
              Shipped <span className="tab-count">{stats.shipped || 0}</span>
            </button>
            <button className={`om-tab ${activeTab === 'out for delivery' ? 'active' : ''}`} onClick={() => setActiveTab('out for delivery')}>
              Out for Delivery <span className="tab-count">{stats.outForDelivery || 0}</span>
            </button>
            <button className={`om-tab ${activeTab === 'delivered' ? 'active' : ''}`} onClick={() => setActiveTab('delivered')}>
              Delivered <span className="tab-count">{stats.delivered}</span>
            </button>
            <button className={`om-tab ${activeTab === 'cancelled' ? 'active' : ''}`} onClick={() => setActiveTab('cancelled')}>
              Cancelled <span className="tab-count">{stats.cancelled}</span>
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedOrders.length > 0 && (
          <div className="bulk-actions-bar">
            <span>{selectedOrders.length} orders selected</span>
            <div className="bulk-btns">
              <button className="bulk-btn" onClick={() => handleBulkAction('status')}>
                Update Status
              </button>
              <button className="bulk-btn" onClick={() => handleBulkAction('invoice')}>
                Generate Invoices
              </button>
              <button className="bulk-btn danger" onClick={() => handleBulkAction('delete')}>
                Delete Selected
              </button>
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
                      checked={selectedOrders.length === filteredOrders.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                  
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
                          <span className="order-id-text">#{order.id.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{order.customerName || 'Guest'}</span>
                          <span className="customer-contact">{order.phone || order.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="items-cell clickable" onClick={() => setViewingOrder(order)}>
                          <span className="items-count">{order.items?.length || 0} items</span>
                          {firstItem && <span className="items-preview">{firstItem.name}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="amount-cell">
                          <span className="amount-value">{formatCurrency(order.total)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="payment-cell">
                          <span className={`payment-badge ${order.paymentMethod?.toLowerCase()}`}>
                            {order.paymentMethod === 'cod' ? 'COD' : 'Paid'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {order.status || 'Pending'}
                        </span>
                        {order.cancellationRequest?.status === 'pending' && (
                          <div className="cancellation-badge">Request Pending</div>
                        )}
                      </td>
                      <td>
                        <span className="date-text">{formatDate(order.createdAt)}</span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <button 
                            className="action-icon-btn" 
                            onClick={() => downloadInvoice(order)}
                            title="Download Invoice"
                          >
                            <FiDownload />
                          </button>
                          <button
                            className="action-menu-btn"
                            onClick={() => setActiveDropdown(activeDropdown === order.id ? null : order.id)}
                          >
                            <FiMoreVertical />
                          </button>
                          {activeDropdown === order.id && (
                            <div className="action-dropdown">
                              <button className="dropdown-item" onClick={() => setViewingOrder(order)}>
                                <FiEye /> View Details
                              </button>
                              <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'Processing')}>
                                <FiEdit /> Update Status
                              </button>
                              <button className="dropdown-item" onClick={() => downloadInvoice(order)}>
                                <FiDownload /> Download Invoice
                              </button>
                              <button className="dropdown-item" onClick={() => viewInvoice(order)}>
                                <FiEye /> View Invoice
                              </button>
                              <button className="dropdown-item">
                                <FiTruck /> Assign Delivery
                              </button>
                              
                              {order.cancellationRequest?.status === 'pending' ? (
                                <>
                                  <button className="dropdown-item danger" onClick={() => handleApproveCancellation(order.id)}>
                                    <FiCheck /> Approve Cancel
                                  </button>
                                  <button className="dropdown-item" onClick={() => handleRejectCancellation(order.id)}>
                                    <FiX /> Reject Cancel
                                  </button>
                                </>
                              ) : (
                                <button className="dropdown-item danger" onClick={() => updateOrderStatus(order.id, 'Cancelled')}>
                                  <FiTrash2 /> Cancel Order
                                </button>
                              )}
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
            <FiPackage size={64} />
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
        <div className="modal-overlay" onClick={() => setViewingOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - #{viewingOrder.id.substring(0, 10)}</h2>
              <button className="close-btn" onClick={() => setViewingOrder(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="order-details-grid">
                <div className="detail-section">
                  <h3>Customer Information</h3>
                  <div className="detail-row">
                    <span>Name:</span>
                    <strong>{viewingOrder.customerName}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Email:</span>
                    <strong>{viewingOrder.email}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Phone:</span>
                    <strong>{viewingOrder.phone}</strong>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Order Information</h3>
                  <div className="detail-row">
                    <span>Order ID:</span>
                    <strong>#{viewingOrder.id}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Status:</span>
                    <strong>{viewingOrder.status}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Payment:</span>
                    <strong>{viewingOrder.paymentMethod}</strong>
                  </div>
                </div>

                <div className="detail-section full-width">
                  <h3>Delivery Address</h3>
                  <p>{viewingOrder.address?.street}, {viewingOrder.address?.city}, {viewingOrder.address?.state} - {viewingOrder.address?.pincode}</p>
                </div>

                <div className="detail-section full-width">
                  <h3>Order Items</h3>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingOrder.items?.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.price)}</td>
                          <td>{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                        <td className="total-amount">{formatCurrency(viewingOrder.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setViewingOrder(null)}>Close</button>
              <button className="btn-primary" onClick={() => downloadInvoice(viewingOrder)}>
                <FiDownload /> Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
