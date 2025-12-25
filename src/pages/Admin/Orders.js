import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  FiSearch, FiFilter, FiMoreVertical, FiEdit, FiTrash2, FiEye,
  FiPrinter, FiTruck, FiX, FiDollarSign, FiDownload, FiCalendar,
  FiClock, FiPackage, FiCheckCircle, FiXCircle, FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [dateRange, setDateRange] = useState('all'); // today, week, month, all
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

      console.log('Query snapshot size:', querySnapshot.size);

      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Orders fetched:', ordersData.length, ordersData);
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
      const updateData = {
        status: newStatus,
        [`statusHistory.${newStatus}`]: new Date(),
        lastUpdated: new Date()
      };

      await updateDoc(orderRef, updateData);

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, ...updateData } : order
      ));

      setActiveDropdown(null);
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  // Add sample orders for testing
  const addSampleOrders = async () => {
    try {
      console.log('Adding sample orders...');
      const ordersRef = collection(db, 'orders');

      const sampleOrders = [
        {
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '9876543210',
          items: [
            {
              id: 'prod1',
              name: 'Organic Wheat Flour',
              price: 150,
              quantity: 2,
              image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=100&h=100&fit=crop'
            }
          ],
          totalAmount: 300,
          status: 'pending',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          shippingAddress: {
            street: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001'
          },
          createdAt: serverTimestamp()
        },
        {
          customerName: 'Jane Smith',
          customerEmail: 'jane@example.com',
          customerPhone: '9876543211',
          items: [
            {
              id: 'prod2',
              name: 'Organic Rice',
              price: 200,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&h=100&fit=crop'
            },
            {
              id: 'prod3',
              name: 'Organic Dal',
              price: 120,
              quantity: 2,
              image: 'https://images.unsplash.com/photo-1599909533540-d7cfb9d3e9b8?w=100&h=100&fit=crop'
            }
          ],
          totalAmount: 440,
          status: 'processing',
          paymentMethod: 'upi',
          paymentStatus: 'paid',
          shippingAddress: {
            street: '456 Park Ave',
            city: 'Delhi',
            state: 'Delhi',
            zipCode: '110001'
          },
          createdAt: serverTimestamp()
        },
        {
          customerName: 'Mike Johnson',
          customerEmail: 'mike@example.com',
          customerPhone: '9876543212',
          items: [
            {
              id: 'prod4',
              name: 'Organic Honey',
              price: 350,
              quantity: 1,
              image: 'https://images.unsplash.com/photo-1587049352846-4a222e784acc?w=100&h=100&fit=crop'
            }
          ],
          totalAmount: 350,
          status: 'delivered',
          paymentMethod: 'card',
          paymentStatus: 'paid',
          shippingAddress: {
            street: '789 Lake Road',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560001'
          },
          createdAt: serverTimestamp()
        }
      ];

      for (const order of sampleOrders) {
        await addDoc(ordersRef, order);
      }

      alert('Sample orders added successfully!');
      fetchOrders(); // Refresh the orders list
    } catch (error) {
      console.error('Error adding sample orders:', error);
      alert('Failed to add sample orders: ' + error.message);
    }
  };

  // Filter orders based on all criteria
  const getFilteredOrders = () => {
    return orders.filter(order => {
      // Search filter
      const matchesSearch =
        order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.includes(searchTerm) ||
        order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Tab filter
      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'pending' && order.status?.toLowerCase() === 'pending') ||
        (activeTab === 'confirmed' && order.status?.toLowerCase() === 'confirmed') ||
        (activeTab === 'processing' && order.status?.toLowerCase() === 'processing') ||
        (activeTab === 'packed' && order.status?.toLowerCase() === 'packed') ||
        (activeTab === 'out-for-delivery' && (order.status?.toLowerCase() === 'shipped' || order.status?.toLowerCase() === 'out-for-delivery')) ||
        (activeTab === 'delivered' && order.status?.toLowerCase() === 'delivered') ||
        (activeTab === 'cancelled' && order.status?.toLowerCase() === 'cancelled') ||
        (activeTab === 'returned' && order.status?.toLowerCase() === 'returned');

      // Payment filter
      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'paid' && order.paymentStatus === 'paid') ||
        (paymentFilter === 'cod' && order.paymentMethod === 'cod') ||
        (paymentFilter === 'failed' && order.paymentStatus === 'failed');

      // Date range filter
      let matchesDate = true;
      if (dateRange !== 'all' && order.createdAt) {
        const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        const now = new Date();

        if (dateRange === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          matchesDate = orderDate >= today;
        } else if (dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= weekAgo;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= monthAgo;
        }
      }

      return matchesSearch && matchesTab && matchesPayment && matchesDate;
    });
  };

  const filteredOrders = getFilteredOrders();

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

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
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'processing': return 'status-processing';
      case 'packed': return 'status-packed';
      case 'shipped':
      case 'out-for-delivery': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      case 'returned': return 'status-returned';
      case 'refunded': return 'status-refunded';
      default: return 'status-pending';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'processing': return 'Processing';
      case 'packed': return 'Packed';
      case 'shipped':
      case 'out-for-delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      case 'returned': return 'Returned';
      case 'refunded': return 'Refunded';
      default: return status || 'Pending';
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(currentOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBulkAction = (action) => {
    if (selectedOrders.length === 0) {
      alert('Please select orders first');
      return;
    }

    switch (action) {
      case 'export':
        alert(`Exporting ${selectedOrders.length} orders...`);
        // Implement CSV export
        break;
      case 'print':
        alert(`Printing invoices for ${selectedOrders.length} orders...`);
        // Implement bulk print
        break;
      case 'cancel':
        if (window.confirm(`Cancel ${selectedOrders.length} orders?`)) {
          selectedOrders.forEach(id => updateOrderStatus(id, 'cancelled'));
        }
        break;
      default:
        break;
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

      {/* Enhanced Stats Cards */}
      <div className="om-stats-enhanced">
        <div className="stat-card-enhanced revenue">
          <div className="stat-icon-wrapper">
            <FiDollarSign />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <h2 className="stat-value">{formatCurrency(stats.totalRevenue)}</h2>
            <span className="stat-change positive">+12.5% this month</span>
          </div>
        </div>

        <div className="stat-card-enhanced today">
          <div className="stat-icon-wrapper">
            <FiCalendar />
          </div>
          <div className="stat-content">
            <p className="stat-label">Today's Orders</p>
            <h2 className="stat-value">{stats.todayOrders}</h2>
            <span className="stat-change positive">+8 from yesterday</span>
          </div>
        </div>

        <div className="stat-card-enhanced pending-payment">
          <div className="stat-icon-wrapper">
            <FiClock />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Payments</p>
            <h2 className="stat-value">{stats.pendingPayments}</h2>
            <span className="stat-change neutral">COD Orders</span>
          </div>
        </div>

        <div className="stat-card-enhanced refund">
          <div className="stat-icon-wrapper">
            <FiRefreshCw />
          </div>
          <div className="stat-content">
            <p className="stat-label">Refund Requests</p>
            <h2 className="stat-value">{stats.refundRequests}</h2>
            <span className="stat-change negative">Needs attention</span>
          </div>
        </div>

        <div className="stat-card-enhanced aov">
          <div className="stat-icon-wrapper">
            <FiPackage />
          </div>
          <div className="stat-content">
            <p className="stat-label">Avg Order Value</p>
            <h2 className="stat-value">{formatCurrency(stats.avgOrderValue)}</h2>
            <span className="stat-change positive">+5.2% growth</span>
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
            <button className={`om-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
              All Orders <span className="tab-count">{stats.total}</span>
            </button>
            <button className={`om-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
              Pending <span className="tab-count">{stats.pending}</span>
            </button>
            <button className={`om-tab ${activeTab === 'confirmed' ? 'active' : ''}`} onClick={() => setActiveTab('confirmed')}>
              Confirmed <span className="tab-count">{stats.confirmed}</span>
            </button>
            <button className={`om-tab ${activeTab === 'processing' ? 'active' : ''}`} onClick={() => setActiveTab('processing')}>
              Processing <span className="tab-count">{stats.processing}</span>
            </button>
            <button className={`om-tab ${activeTab === 'packed' ? 'active' : ''}`} onClick={() => setActiveTab('packed')}>
              Packed <span className="tab-count">{stats.packed}</span>
            </button>
            <button className={`om-tab ${activeTab === 'out-for-delivery' ? 'active' : ''}`} onClick={() => setActiveTab('out-for-delivery')}>
              Out for Delivery <span className="tab-count">{stats.outForDelivery}</span>
            </button>
            <button className={`om-tab ${activeTab === 'delivered' ? 'active' : ''}`} onClick={() => setActiveTab('delivered')}>
              Delivered <span className="tab-count">{stats.delivered}</span>
            </button>
            <button className={`om-tab ${activeTab === 'cancelled' ? 'active' : ''}`} onClick={() => setActiveTab('cancelled')}>
              Cancelled <span className="tab-count">{stats.cancelled}</span>
            </button>
          </div>
        </div>

        {/* Enhanced Orders Table */}
        {currentOrders.length > 0 ? (
          <>
            <div className="om-table-container">
              <table className="om-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedOrders.length === currentOrders.length && currentOrders.length > 0}
                      />
                    </th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Order Status</th>
                    <th>Delivery</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order) => {
                    const itemCount = order.items?.length || 0;
                    const firstItem = order.items?.[0] || {};
                    const itemImage = firstItem.image || firstItem.images?.[0]?.url || firstItem.images?.[0];

                    return (
                      <tr key={order.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => handleSelectOrder(order.id)}
                          />
                        </td>
                        <td>
                          <div className="order-id-cell">
                            <span className="order-id-text">#{order.id.substring(0, 8)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">
                              {order.customerName?.charAt(0) || 'U'}
                            </div>
                            <div className="customer-info">
                              <span className="customer-name">{order.customerName || 'Guest'}</span>
                              <span className="customer-contact">{order.customerPhone || order.customerEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="items-cell">
                            {itemImage && <img src={itemImage} alt="item" className="item-thumb" />}
                            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          </div>
                        </td>
                        <td>
                          <div className="amount-cell">
                            <span className="amount-value">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="payment-cell">
                            <span className={`payment-badge ${order.paymentMethod}`}>
                              {order.paymentMethod === 'cod' ? 'COD' :
                                order.paymentMethod === 'card' ? 'Card' :
                                  order.paymentMethod === 'upi' ? 'UPI' : 'Paid'}
                            </span>
                            {order.paymentStatus === 'paid' && <FiCheckCircle className="paid-icon" />}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td>
                          <div className="delivery-cell">
                            {order.deliveryPartner ? (
                              <>
                                <FiTruck className="delivery-icon" />
                                <span>{order.deliveryPartner}</span>
                              </>
                            ) : (
                              <span className="not-assigned">Not Assigned</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="date-text">{formatDate(order.createdAt)}</span>
                        </td>
                        <td>
                          <div className="action-cell">
                            <button
                              className="action-menu-btn"
                              onClick={() => setActiveDropdown(activeDropdown === order.id ? null : order.id)}
                            >
                              <FiMoreVertical />
                            </button>
                            {activeDropdown === order.id && (
                              <div className="action-dropdown">
                                <button className="dropdown-item" onClick={() => viewOrderDetails(order)}>
                                  <FiEye /> View Details
                                </button>
                                <button className="dropdown-item" onClick={() => alert('Edit order')}>
                                  <FiEdit /> Edit Order
                                </button>
                                <button className="dropdown-item" onClick={() => alert('Print invoice')}>
                                  <FiPrinter /> Print Invoice
                                </button>
                                <button className="dropdown-item" onClick={() => alert('Assign delivery')}>
                                  <FiTruck /> Assign Delivery
                                </button>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                                  <FiCheckCircle /> Confirm Order
                                </button>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'processing')}>
                                  <FiPackage /> Mark Processing
                                </button>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'packed')}>
                                  <FiPackage /> Mark Packed
                                </button>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'shipped')}>
                                  <FiTruck /> Mark Shipped
                                </button>
                                <button className="dropdown-item" onClick={() => updateOrderStatus(order.id, 'delivered')}>
                                  <FiCheckCircle /> Mark Delivered
                                </button>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item danger" onClick={() => {
                                  if (window.confirm('Cancel this order?')) {
                                    updateOrderStatus(order.id, 'cancelled');
                                  }
                                }}>
                                  <FiXCircle /> Cancel Order
                                </button>
                                <button className="dropdown-item danger" onClick={() => alert('Process refund')}>
                                  <FiDollarSign /> Process Refund
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

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              <div className="pagination-controls">
                <select value={itemsPerPage} onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <div className="page-buttons">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="page-number">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <FiPackage size={64} color="#d1d5db" />
            <h3>No Orders Found</h3>
            <p>
              {searchTerm || activeTab !== 'all' || dateRange !== 'all'
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

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderDetails(false)}>
          <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="close-btn" onClick={() => setShowOrderDetails(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="order-details-grid">
                {/* Order Info */}
                <div className="detail-section">
                  <h3>📦 Order Information</h3>
                  <div className="detail-row">
                    <span>Order ID:</span>
                    <strong>#{selectedOrder.id}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Order Date:</span>
                    <strong>{formatDate(selectedOrder.createdAt)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Status:</span>
                    <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="detail-section">
                  <h3>👤 Customer Information</h3>
                  <div className="detail-row">
                    <span>Name:</span>
                    <strong>{selectedOrder.customerName}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Phone:</span>
                    <strong>{selectedOrder.customerPhone}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Email:</span>
                    <strong>{selectedOrder.customerEmail}</strong>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="detail-section">
                  <h3>📍 Delivery Address</h3>
                  <p>{selectedOrder.shippingAddress?.street || 'N/A'}</p>
                  <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.zipCode}</p>
                </div>

                {/* Items */}
                <div className="detail-section full-width">
                  <h3>🛒 Order Items</h3>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.price)}</td>
                          <td>{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payment Info */}
                <div className="detail-section">
                  <h3>💳 Payment Information</h3>
                  <div className="detail-row">
                    <span>Method:</span>
                    <strong>{selectedOrder.paymentMethod?.toUpperCase()}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Status:</span>
                    <strong>{selectedOrder.paymentStatus || 'Pending'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Total Amount:</span>
                    <strong className="total-amount">{formatCurrency(selectedOrder.totalAmount)}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowOrderDetails(false)}>Close</button>
              <button className="btn-primary" onClick={() => alert('Print invoice')}>
                <FiPrinter /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
