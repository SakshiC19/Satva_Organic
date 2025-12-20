import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiFilter } from 'react-icons/fi';
import './Admin.css';

const Dashboard = () => {
  const stats = [
    { 
      label: 'Total Revenue', 
      value: '$24,582', 
      trend: '+18.2% this week', 
      trendUp: true,
      icon: <FiDollarSign />,
      primary: true
    },
    { 
      label: 'Total Orders', 
      value: '3,842', 
      trend: '+12.5% this week', 
      trendUp: true,
      icon: <FiShoppingBag />,
      iconClass: 'blue'
    },
    { 
      label: 'Total Product', 
      value: '1,247', 
      trend: '-2.3% this week', 
      trendUp: false,
      icon: <FiBox />,
      iconClass: 'purple'
    },
    { 
      label: 'Active Customers', 
      value: '8,234', 
      trend: '+24.6% this week', 
      trendUp: true,
      icon: <FiUsers />,
      iconClass: 'orange'
    }
  ];

  const topProducts = [
    { name: 'Fresh Milk', sales: '342 sold', price: '$684.00', image: 'https://images.unsplash.com/photo-1550583724-125581f77833?w=100&h=100&fit=crop' },
    { name: 'Wheat Bread', sales: '256 sold', price: '$512.00', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop' },
    { name: 'Emerald Velvet', sales: '184 sold', price: '$355.90', image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=100&h=100&fit=crop' },
  ];

  const recentOrders = [
    { id: '1', product: 'Fresh Dairy', date: 'May 5', status: 'Received', price: '$145.80', customer: 'M-Starlight', image: 'https://images.unsplash.com/photo-1563636619-e9107da5a163?w=50&h=50&fit=crop' },
    { id: '2', product: 'Vegetables', date: 'May 4', status: 'Received', price: '$210.30', customer: 'Serene W', image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c12e8c?w=50&h=50&fit=crop' },
    { id: '3', product: 'Rang Eggs', date: 'May 3', status: 'Received', price: '$298.40', customer: 'James D', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=50&h=50&fit=crop' },
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back! Your grocery store's performance view</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
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
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>$18,200.82</span>
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
              <text x="440" y="84" fill="white" fontSize="10" fontWeight="bold">$4,645.80</text>
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
            {/* Donut Chart SVG */}
            <svg width="180" height="180" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#059669" strokeWidth="12" strokeDasharray="180 251" strokeDashoffset="0" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#34d399" strokeWidth="12" strokeDasharray="40 251" strokeDashoffset="-180" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#6ee7b7" strokeWidth="12" strokeDasharray="31 251" strokeDashoffset="-220" />
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
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={order.image} alt={order.product} style={{ width: '30px', height: '30px', borderRadius: '4px' }} />
                      {order.product}
                    </div>
                  </td>
                  <td>{order.date}</td>
                  <td>
                    <span className="status-badge status-received">Received</span>
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
