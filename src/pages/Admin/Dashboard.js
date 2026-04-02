import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiFilter, FiShoppingCart } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeCustomers: 0,
    totalWishlistItems: 0,
    totalCartItems: 0
  });
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [wishlistData, setWishlistData] = useState([]);
  const [cartData, setCartData] = useState([]);
  const [users, setUsers] = useState([]);
  const [productNames, setProductNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('All');
  const [showWishlistTable, setShowWishlistTable] = useState(false);
  const [showCartTable, setShowCartTable] = useState(false);
  const wishlistTableRef = useRef(null);
  const cartTableRef = useRef(null);

  const handleWishlistCardClick = () => {
    setShowWishlistTable(true);
    setShowCartTable(false); // Hide the other if open
    setTimeout(() => {
      wishlistTableRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCartCardClick = () => {
    setShowCartTable(true);
    setShowWishlistTable(false); // Hide the other if open
    setTimeout(() => {
      cartTableRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };



  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const productsRef = collection(db, 'products');
    const usersRef = collection(db, 'users');

    const unsubscribeOrders = onSnapshot(query(ordersRef, orderBy('createdAt', 'desc'), limit(100)), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentOrders(orders);
      
      // Calculate revenue and customers
      const revenue = orders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
      setStats(prev => ({
        ...prev,
        totalRevenue: revenue,
        totalOrders: snapshot.size,
        activeCustomers: new Set(orders.map(o => o.userId)).size
      }));
    });

    const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStats(prev => ({ ...prev, totalProducts: products.length }));
      
      // Create product name map
      const nameMap = {};
      products.forEach(p => {
        nameMap[p.id] = p.name;
      });
      setProductNames(nameMap);
      
      setLoading(false);
    });

    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      
      // Process wishlist data
      const allWishlistItems = usersData.flatMap(u => u.wishlist || []);
      const wishlistCounts = {};
      allWishlistItems.forEach(item => {
        const id = item.id || item.productId;
        if (id) {
          wishlistCounts[id] = (wishlistCounts[id] || 0) + 1;
        }
      });
      const wishlistArray = Object.entries(wishlistCounts).map(([id, count]) => ({
        id,
        count
      })).sort((a, b) => b.count - a.count);
      setWishlistData(wishlistArray);

      // Process cart data
      const allCartItems = usersData.flatMap(u => u.cart || []);
      const cartCounts = {};
      allCartItems.forEach(item => {
        const id = item.id || item.productId;
        if (id) {
          cartCounts[id] = (cartCounts[id] || 0) + (item.quantity || 1);
        }
      });
      const cartArray = Object.entries(cartCounts).map(([id, count]) => ({
        id,
        count
      })).sort((a, b) => b.count - a.count);
      setCartData(cartArray);

      setStats(prev => ({ 
        ...prev, 
        totalWishlistItems: allWishlistItems.length,
        totalCartItems: allCartItems.length
      }));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeUsers();
    };
  }, []);

  // Recalculate top products when orders or products change
  useEffect(() => {
    if (recentOrders.length === 0 || !stats.totalProducts) return;

    const productSales = {};
    recentOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const productName = item.name?.trim().toLowerCase();
          if (productName) {
            const quantity = item.quantity || 1;
            productSales[productName] = (productSales[productName] || 0) + quantity;
          }
        });
      }
    });

    const productsRef = collection(db, 'products');
    getDocs(productsRef).then(productsSnapshot => {
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const sortedBySales = productsData.map(product => {
        const normalizedName = product.name?.trim().toLowerCase();
        return {
          ...product,
          salesCount: productSales[normalizedName] || 0
        };
      }).sort((a, b) => (a.stock || 0) - (b.stock || 0));

      setTopProducts(sortedBySales);
    });
  }, [recentOrders, stats.totalProducts]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'Just now';
    
    let d;
    if (date.seconds) {
      d = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }

    if (isNaN(d.getTime())) return 'Recently';
    
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredOrders = orderFilter === 'All' 
    ? recentOrders 
    : recentOrders.filter(order => order.status?.toLowerCase() === orderFilter.toLowerCase());

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
    },
    {
      label: 'Wishlist Items',
      value: stats.totalWishlistItems.toString(),
      trend: 'Total saved products',
      trendUp: true,
      icon: <FiTrendingUp />,
      iconClass: 'green',
      onClick: handleWishlistCardClick
    },
    {
      label: 'Items in Carts',
      value: stats.totalCartItems.toString(),
      trend: 'Total added to cart',
      trendUp: true,
      icon: <FiShoppingCart />,
      iconClass: 'blue',
      onClick: handleCartCardClick
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
            onClick={() => stat.onClick ? stat.onClick() : navigate(stat.path)}
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
            <h3>Checkout Status Analysis</h3>
          </div>
          <div className="chart-placeholder">
            <svg width="180" height="180" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" stroke="#059669" strokeWidth="12" 
                strokeDasharray={`${Math.min((recentOrders.filter(o => o.status !== 'Cancelled').length / (recentOrders.length || 1)) * 251, 251)} 251`} 
                strokeDashoffset="0" 
              />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" stroke="#ef4444" strokeWidth="12" 
                strokeDasharray={`${Math.min((recentOrders.filter(o => o.status === 'Cancelled').length / (recentOrders.length || 1)) * 251, 251)} 251`} 
                strokeDashoffset={`-${Math.min((recentOrders.filter(o => o.status !== 'Cancelled').length / (recentOrders.length || 1)) * 251, 251)}`} 
              />
            </svg>
            <div className="chart-legend" style={{ textAlign: 'left', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <span style={{ width: '10px', height: '10px', background: '#059669', borderRadius: '2px' }}></span>
                    <span>Successful Checkouts: {recentOrders.filter(o => o.status !== 'Cancelled').length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }}></span>
                    <span>Cancelled: {recentOrders.filter(o => o.status === 'Cancelled').length}</span>
                </div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Most Wishlisted Products</h3>
          </div>
          <div className="wishlist-list" style={{ padding: '0 15px', overflowY: 'auto', maxHeight: '240px' }}>
             {wishlistData.length > 0 ? wishlistData.slice(0, 5).map((item, idx) => (
                 <div key={idx} className="wishlist-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>#{idx + 1} {productNames[item.id] || `ID: ${item.id.substring(0, 8)}...`}</span>
                    <span className="count-badge" style={{ background: '#dcfce7', color: '#059669', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {item.count} Wishlists
                    </span>
                 </div>
             )) : <p>No wishlist data available.</p>}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Most Carted Products</h3>
          </div>
          <div className="wishlist-list" style={{ padding: '0 15px', overflowY: 'auto', maxHeight: '240px' }}>
             {cartData.length > 0 ? cartData.slice(0, 5).map((item, idx) => (
                 <div key={idx} className="wishlist-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>#{idx + 1} {productNames[item.id] || `ID: ${item.id.substring(0, 8)}...`}</span>
                    <span className="count-badge" style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {item.count} Items
                    </span>
                 </div>
             )) : <p>No cart data available.</p>}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="data-grid">
        <div className="list-card">
          <div className="list-header">
            <h3>Top Products</h3>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="product-name">{product.name}</span>
                    </div>
                    <span className="product-sales">
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                    </span>
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
            <div className="filter-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiFilter size={14} color="#64748b" />
              <select 
                className="chart-select" 
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                style={{ border: 'none', background: '#f8fafc', fontWeight: 'bold' }}
              >
                <option value="All">All Orders</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="admin-table-wrapper">
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
                {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                  const orderDate = formatDate(order.createdAt);
                  
                  return (
                    <tr key={order.id}>
                      <td>#{order.id.substring(0, 8)}...</td>
                      <td>
                        <div className="order-product-info">
                          <span className="product-name-table">{firstItem ? firstItem.name : 'N/A'}</span>
                          {order.items?.length > 1 && <span className="items-count">+{order.items.length - 1} more</span>}
                        </div>
                      </td>
                      <td>{orderDate}</td>
                      <td>
                        <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-') || 'pending'}`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td>{formatCurrency(order.total || order.totalAmount || order.grandTotal)}</td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{order.customerName || order.userName || 'Guest'}</span>
                        </div>
                      </td>
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

      {/* Customer Carts Section */}
      {showCartTable && (
        <div className="data-grid" style={{ marginTop: '30px' }} ref={cartTableRef}>
          <div className="admin-table-container" style={{ gridColumn: '1 / -1' }}>
            <div className="list-header" style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Customer Carts Analysis</h3>
              <button 
                onClick={() => setShowCartTable(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Cart Items</th>
                    <th>Total Value</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.cart && u.cart.length > 0).length > 0 ? (
                    users.filter(u => u.cart && u.cart.length > 0).map((user) => {
                      const cartTotal = user.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="customer-cell">
                              <span className="customer-name">{user.displayName || user.fullName || 'Anonymous'}</span>
                            </div>
                          </td>
                          <td>{user.email || user.phoneNumber || 'N/A'}</td>
                          <td>
                            <div className="order-product-info">
                              <span className="product-name-table">
                                {user.cart.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                              </span>
                            </div>
                          </td>
                          <td>{formatCurrency(cartTotal)}</td>
                          <td>{formatDate(user.lastCartUpdatedAt || user.updatedAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        No active customer carts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Wishlist Section */}
      {showWishlistTable && (
        <div className="data-grid" style={{ marginTop: '30px' }} ref={wishlistTableRef}>
          <div className="admin-table-container" style={{ gridColumn: '1 / -1' }}>
            <div className="list-header" style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Customer Wishlist Analysis</h3>
              <button 
                onClick={() => setShowWishlistTable(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Wishlist Items</th>
                    <th>Total Items</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.wishlist && u.wishlist.length > 0).length > 0 ? (
                    users.filter(u => u.wishlist && u.wishlist.length > 0).map((user) => {
                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="customer-cell">
                              <span className="customer-name">{user.displayName || user.fullName || 'Anonymous'}</span>
                            </div>
                          </td>
                          <td>{user.email || user.phoneNumber || 'N/A'}</td>
                          <td>
                            <div className="order-product-info">
                              <span className="product-name-table">
                                {user.wishlist.map(item => item.name || productNames[item.id || item.productId] || 'Unknown Product').join(', ')}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="count-badge" style={{ background: '#dcfce7', color: '#059669', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {user.wishlist.length} Items
                            </span>
                          </td>
                          <td>{formatDate(user.lastWishlistUpdatedAt || user.updatedAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        No active customer wishlists found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
