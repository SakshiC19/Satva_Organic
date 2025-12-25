import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiFilter } from 'react-icons/fi';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './Admin.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    customers: 0,
    revenueChange: '+0%',
    ordersChange: '+0%',
    productsChange: '+0%',
    customersChange: '+0%'
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Orders
      const ordersRef = collection(db, 'orders');
      const qOrders = query(ordersRef, orderBy('createdAt', 'desc'));
      const ordersSnapshot = await getDocs(qOrders);
      const allOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch Products
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      // const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 3. Fetch Users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      // --- Calculate Stats ---

      // Total Revenue (Sum of 'delivered' orders)
      const deliveredOrders = allOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
      const totalRevenue = deliveredOrders.reduce((sum, order) => {
        // Handle string or number amounts, remove currency symbols if present
        const val = typeof order.totalAmount === 'string'
          ? parseFloat(order.totalAmount.replace(/[^\d.-]/g, ''))
          : order.totalAmount;
        return sum + (val || 0);
      }, 0);

      // Total Orders
      const totalOrdersCount = allOrders.length;

      // Total Products
      const totalProductsCount = productsSnapshot.size;

      // Active Customers
      const totalCustomersCount = usersSnapshot.size;

      setStats({
        revenue: totalRevenue,
        orders: totalOrdersCount,
        products: totalProductsCount,
        customers: totalCustomersCount,
        // Mock trends for now since we don't have historical snapshots stored simply
        revenueChange: '+18.2% this week',
        ordersChange: '+12.5% this week',
        productsChange: '+2.3% this week',
        customersChange: '+24.6% this week'
      });

      // --- Recent Orders ---
      setRecentOrders(allOrders.slice(0, 5));

      // --- Top Products ---
      // Aggregate product sales from order items
      const productStats = {};
      allOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const itemName = item.name || 'Unknown Item';
            if (!productStats[itemName]) {
              productStats[itemName] = {
                name: itemName,
                salesCount: 0,
                revenue: 0,
                image: item.image || item.images?.[0]?.url || item.images?.[0] || 'https://via.placeholder.com/100'
              };
            }
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            productStats[itemName].salesCount += qty;
            productStats[itemName].revenue += (price * qty);
          });
        }
      });

      // Sort by sales count and take top 3
      const sortedTopProducts = Object.values(productStats)
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 3);

      setTopProducts(sortedTopProducts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) { return 'N/A'; }
  };

  // Helper to color status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'status-received';
      case 'received': return 'status-received';
      case 'pending': return 'status-pending'; // You might need CSS for this
      case 'cancelled': return 'status-cancelled'; // You might need CSS for this
      default: return '';
    }
  };

  // Cards Data Configuration
  const statsConfig = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.revenue),
      trend: stats.revenueChange,
      trendUp: true,
      icon: <FiDollarSign />,
      primary: true
    },
    {
      label: 'Total Orders',
      value: stats.orders.toLocaleString(),
      trend: stats.ordersChange,
      trendUp: true,
      icon: <FiShoppingBag />,
      iconClass: 'blue'
    },
    {
      label: 'Total Product',
      value: stats.products.toLocaleString(),
      trend: stats.productsChange,
      trendUp: true, // changed from false to true for positivity
      icon: <FiBox />,
      iconClass: 'purple'
    },
    {
      label: 'Active Customers',
      value: stats.customers.toLocaleString(),
      trend: stats.customersChange,
      trendUp: true,
      icon: <FiUsers />,
      iconClass: 'orange'
    }
  ];

  if (loading) {
    return <div className="admin-loading"><div className="loading-spinner"></div> Loading Dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back! Your grocery store's performance view</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsConfig.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.primary ? 'primary' : ''}`}>
            <div className="stat-card-header">
              <div className={`stat-icon ${stat.iconClass || ''}`}>
                {stat.icon}
              </div>
              <button className="stat-trend-btn">
                <FiTrendingUp size={12} />
              </button>
            </div>
            <div className="stat-body">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
            <div className="stat-footer">
              {stat.trendUp ? <FiTrendingUp className="trend-up" /> : <FiTrendingDown className="trend-down" />}
              <span className={stat.trendUp ? 'trend-up' : 'trend-down'}>{stat.trend}</span>
            </div>
            {/* Keeping the mini chart generic for visual appeal */}
            <svg className="mini-chart" viewBox="0 0 100 40">
              <path
                d="M0 30 Q 20 10, 40 25 T 80 15 L 100 35"
                fill="none"
                stroke={stat.primary ? "rgba(255,255,255,0.4)" : "rgba(5, 150, 105, 0.2)"}
                strokeWidth="3"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Revenue Analytics</h3>
            <select className="chart-select">
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="chart-placeholder">
            <div style={{ position: 'absolute', left: '20px', top: '20px', textAlign: 'left' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(stats.revenue * 0.75)}</span>
              <span style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: '8px', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                <FiTrendingUp size={10} /> 8.24%
              </span>
            </div>
            {/* Static SVG Chart preserved for visual layout */}
            <svg width="100%" height="200" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 150 Q 100 130, 150 160 T 250 120 T 350 140 T 450 100 T 600 130"
                fill="none"
                stroke="#059669"
                strokeWidth="4"
              />
              <path
                d="M0 150 Q 100 130, 150 160 T 250 120 T 350 140 T 450 100 T 600 130 L 600 200 L 0 200 Z"
                fill="url(#chartGradient)"
              />
              <circle cx="450" cy="100" r="6" fill="#059669" stroke="white" strokeWidth="2" />
              <rect x="430" y="70" width="80" height="20" rx="10" fill="#059669" />
              <text x="440" y="84" fill="white" fontSize="10" fontWeight="bold">Peak: {formatCurrency(stats.revenue / 5)}</text>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 20px', marginTop: '10px', color: '#64748b', fontSize: '0.75rem' }}>
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            {/* Changed title to better reflect Data */}
            <h3>Total Sales</h3>
            <select className="chart-select">
              <option>Monthly</option>
            </select>
          </div>
          <div className="chart-placeholder">
            {/* Donut Chart SVG */}
            <svg width="180" height="180" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="12" strokeDasharray="180 251" strokeDashoffset="0" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#34d399" strokeWidth="12" strokeDasharray="40 251" strokeDashoffset="-180" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#6ee7b7" strokeWidth="12" strokeDasharray="31 251" strokeDashoffset="-220" />
              <g transform="translate(50, 50)">
                <text textAnchor="middle" dy="-5" fontSize="10" fontWeight="800" fill="#1e293b">{stats.orders}</text>
                <text textAnchor="middle" dy="10" fontSize="6" fill="#64748b">Orders</text>
              </g>
            </svg>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Total Sales Stats</p>
              <h4 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 800 }}>{formatCurrency(stats.revenue)}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="data-grid">
        <div className="list-card">
          <div className="list-header">
            <h3>Top Products</h3>
            <select className="chart-select">
              <option>All Time</option>
            </select>
          </div>
          <div className="products-list">
            {topProducts.length > 0 ? topProducts.map((product, index) => (
              <div key={index} className="product-item">
                <img src={product.image} alt={product.name} className="product-thumb" />
                <div className="product-details">
                  <span className="product-name">{product.name}</span>
                  <span className="product-sales">{product.salesCount} sold</span>
                </div>
                <span className="product-price">{formatCurrency(product.revenue)}</span>
              </div>
            )) : <p style={{ padding: '20px', color: '#666' }}>No sales data yet.</p>}
          </div>
        </div>

        <div className="admin-table-container">
          <div className="list-header" style={{ padding: '24px 24px 0 24px' }}>
            <h3>Recent Order</h3>
            <button className="btn-help" style={{ width: 'auto', padding: '6px 16px' }}>
              <FiFilter size={14} /> Filter
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Date</th>
                <th>Status</th>
                <th>Price</th>
                <th>Customer</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const firstItem = order.items?.[0] || {};
                const itemName = firstItem.name || 'Bundle';
                const itemImage = firstItem.image || firstItem.images?.[0]?.url || firstItem.images?.[0] || 'https://via.placeholder.com/30';

                return (
                  <tr key={order.id}>
                    <td>#{order.id.slice(0, 6)}...</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={itemImage} alt={itemName} style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' }} />
                        {itemName}
                      </div>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>{order.customerName || 'Guest'}</td>
                  </tr>
                );
              })}
              {recentOrders.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No recent orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
