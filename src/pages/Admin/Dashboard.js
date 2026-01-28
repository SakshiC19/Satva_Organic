import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiFilter } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeCustomers: 0
  });
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(5));
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch products
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate stats
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalOrders = ordersData.length;
      const totalProducts = productsData.length;

      setStats({
        totalRevenue,
        totalOrders,
        totalProducts,
        activeCustomers: ordersData.length // Simplified - count unique customers
      });

      setRecentOrders(ordersData.slice(0, 3));
      setTopProducts(productsData.slice(0, 3));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const statsCards = [
    { 
      label: 'Total Revenue', 
      value: formatCurrency(stats.totalRevenue), 
      trend: '+18.2% this week', 
      trendUp: true,
      icon: <FiDollarSign />,
      primary: true,
      path: '/admin/orders'
    },
    { 
      label: 'Total Orders', 
      value: stats.totalOrders.toString(), 
      trend: '+12.5% this week', 
      trendUp: true,
      icon: <FiShoppingBag />,
      iconClass: 'blue',
      path: '/admin/orders'
    },
    { 
      label: 'Total Product', 
      value: stats.totalProducts.toString(), 
      trend: '-2.3% this week', 
      trendUp: false,
      icon: <FiBox />,
      iconClass: 'purple',
      path: '/admin/products'
    },
    { 
      label: 'Active Customers', 
      value: stats.activeCustomers.toString(), 
      trend: '+24.6% this week', 
      trendUp: true,
      icon: <FiUsers />,
      iconClass: 'orange',
      path: '/admin/users'
    }
  ];

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Loading Dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Dashboard Overview</h1>
            <p>Welcome back! Here's what's happening with your store today.</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              <FiShoppingBag /> View Website
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div 
            key={index} 
            className={`stat-card clickable ${stat.primary ? 'primary' : ''}`}
            onClick={() => navigate(stat.path)}
          >
            <div className="stat-card-header">
              <div className={`stat-icon ${stat.iconClass || ''}`}>
                {stat.icon}
              </div>
              <button className="stat-trend-btn">
                <FiTrendingUp size={14} />
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
            {/* Mini Chart SVG Placeholder */}
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
            <h3>Sales By Category</h3>
            <select className="chart-select">
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="chart-placeholder">
            <div style={{ position: 'absolute', left: '20px', top: '20px', textAlign: 'left' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹18,200.82</span>
              <span style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: '8px', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                <FiTrendingUp size={10} /> 8.24%
              </span>
            </div>
            {/* Main Line Chart SVG */}
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
              <rect x="430" y="70" width="60" height="20" rx="10" fill="#059669" />
              <text x="440" y="84" fill="white" fontSize="10" fontWeight="bold">₹4,645.80</text>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 20px', marginTop: '10px', color: '#64748b', fontSize: '0.75rem' }}>
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Sales By Category</h3>
            <select className="chart-select">
              <option>Monthly</option>
            </select>
          </div>
          <div className="chart-placeholder">
            <svg width="180" height="180" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="12" strokeDasharray="180 251" strokeDashoffset="0" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#34d399" strokeWidth="12" strokeDasharray="40 251" strokeDashoffset="-180" />
              <g transform="translate(50, 50)">
                <text textAnchor="middle" dy="-5" fontSize="10" fontWeight="800" fill="#1e293b">16,100</text>
                <rect x="-15" y="2" width="30" height="10" rx="5" fill="#059669" />
                <text textAnchor="middle" dy="10" fontSize="6" fill="white">+ 45%</text>
              </g>
            </svg>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Total Number of Sales</p>
              <h4 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 800 }}>3,40,0031</h4>
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
            {topProducts.length > 0 ? topProducts.map((product, index) => {
              const productImage = product.images && product.images.length > 0 
                ? (product.images[0].url || product.images[0]) 
                : product.image || 'https://via.placeholder.com/100';
              
              return (
                <div key={index} className="product-item">
                  <img src={productImage} alt={product.name} className="product-thumb" />
                  <div className="product-details">
                    <span className="product-name">{product.name}</span>
                    <span className="product-sales">{product.stock || 0} in stock</span>
                  </div>
                  <span className="product-price">{formatCurrency(product.price)}</span>
                </div>
              );
            }) : <p style={{ padding: '20px', color: '#666' }}>No products yet.</p>}
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
              {recentOrders.length > 0 ? recentOrders.map((order) => {
                const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                const orderDate = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
                
                return (
                  <tr key={order.id}>
                    <td>{order.id.substring(0, 8)}...</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {firstItem ? firstItem.name : 'N/A'}
                      </div>
                    </td>
                    <td>{orderDate}</td>
                    <td>
                      <span className={`status-badge status-${order.status?.toLowerCase() || 'pending'}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>{order.customerName || 'Guest'}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
