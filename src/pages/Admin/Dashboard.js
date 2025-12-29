import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiFilter } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch Orders
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      const allOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch Products
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch Users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const totalUsers = usersSnapshot.size;

      // Calculate Stats
      const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalOrdersCount = allOrders.length;
      const totalProductsCount = allProducts.length;

      setTotalSales(totalRevenue);

      // Prepare Stats Array
      const statsData = [
        { 
          label: 'Total Revenue', 
          value: `₹${totalRevenue.toLocaleString()}`, 
          trend: '+12.5% this week', // Mock trend
          trendUp: true,
          icon: <FiDollarSign />,
          primary: true
        },
        { 
          label: 'Total Orders', 
          value: totalOrdersCount.toLocaleString(), 
          trend: '+8.2% this week', 
          trendUp: true,
          icon: <FiShoppingBag />,
          iconClass: 'blue',
          path: '/admin/orders'
        },
        { 
          label: 'Total Product', 
          value: totalProductsCount.toLocaleString(), 
          trend: '+2.4% this week', 
          trendUp: true,
          icon: <FiBox />,
          iconClass: 'purple',
          path: '/admin/products'
        },
        { 
          label: 'Active Customers', 
          value: totalUsers.toLocaleString(), 
          trend: '+15.3% this week', 
          trendUp: true,
          icon: <FiUsers />,
          iconClass: 'orange',
          path: '/admin/users'
        }
      ];
      setStats(statsData);

      // Calculate Top Products (based on order frequency)
      const productSales = {};
      allOrders.forEach(order => {
        order.items?.forEach(item => {
          if (item.id) {
            if (!productSales[item.id]) {
              productSales[item.id] = {
                name: item.name,
                image: (item.images && item.images[0]?.url) || item.image || 'https://via.placeholder.com/100',
                salesCount: 0,
                revenue: 0
              };
            }
            productSales[item.id].salesCount += (item.quantity || 1);
            productSales[item.id].revenue += (item.price * (item.quantity || 1));
          }
        });
      });

      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 3)
        .map(p => ({
          name: p.name,
          sales: `${p.salesCount} sold`,
          price: `₹${p.revenue.toLocaleString()}`,
          image: p.image
        }));
      
      setTopProducts(sortedProducts.length > 0 ? sortedProducts : [
        { name: 'No sales yet', sales: '0 sold', price: '₹0', image: 'https://via.placeholder.com/100' }
      ]);

      // Recent Orders (last 5)
      const recent = allOrders
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 5)
        .map(order => ({
          id: order.id.substring(0, 8),
          product: order.items?.[0]?.name || 'Multiple Items',
          date: formatDate(order.createdAt),
          status: order.status || 'Pending',
          price: `₹${order.totalAmount?.toLocaleString()}`,
          customer: order.customerName || 'Guest',
          image: (order.items?.[0]?.images && order.items[0].images[0]?.url) || order.items?.[0]?.image || 'https://via.placeholder.com/50'
        }));
      setRecentOrders(recent);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>Dashboard Overview</h1>
            <p>Welcome back! Your grocery store's performance view</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="view-website-btn"
            style={{
              padding: '10px 20px',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FiShoppingBag /> View Website
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={`stat-card ${stat.primary ? 'primary' : ''} ${stat.path ? 'clickable' : ''}`}
            onClick={() => stat.path && navigate(stat.path)}
            style={{ cursor: stat.path ? 'pointer' : 'default' }}
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
            <h3>Sales Overview</h3>
            <select className="chart-select">
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="chart-placeholder">
            <div style={{ position: 'absolute', left: '20px', top: '20px', textAlign: 'left' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{totalSales.toLocaleString()}</span>
              <span style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: '8px', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                <FiTrendingUp size={10} /> 8.24%
              </span>
            </div>
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
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 20px', marginTop: '10px', color: '#64748b', fontSize: '0.75rem' }}>
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Sales Distribution</h3>
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
                <text textAnchor="middle" dy="5" fontSize="10" fontWeight="800" fill="#1e293b">{recentOrders.length}</text>
              </g>
            </svg>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Recent Activity</p>
              <h4 style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 800 }}>{recentOrders.length} New Orders</h4>
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
              <option>Monthly</option>
            </select>
          </div>
          <div className="products-list">
            {topProducts.map((product, index) => (
              <div key={index} className="product-item">
                <img src={product.image} alt={product.name} className="product-thumb" />
                <div className="product-details">
                  <span className="product-name">{product.name}</span>
                  <span className="product-sales">{product.sales}</span>
                </div>
                <span className="product-price">{product.price}</span>
              </div>
            ))}
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
                <th>#</th>
                <th>Product</th>
                <th>Date</th>
                <th>Status</th>
                <th>Price</th>
                <th>Customer</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={order.image} alt={order.product} style={{ width: '30px', height: '30px', borderRadius: '4px' }} />
                      {order.product}
                    </div>
                  </td>
                  <td>{order.date}</td>
                  <td>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                  </td>
                  <td>{order.price}</td>
                  <td>{order.customer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
