import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { 
  FiSearch, FiUser, FiMail, FiCalendar, FiShield, FiPhone, 
  FiMoreVertical, FiTrash2, FiLock, FiUnlock, FiEye, 
  FiDownload, FiFilter, FiCheckCircle, FiXCircle, FiAlertCircle, FiClock, FiX, FiMapPin, FiPackage
} from 'react-icons/fi';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [viewingReviews, setViewingReviews] = useState(null);
  const [reviewCounts, setReviewCounts] = useState({});
  
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    emailVerified: 'all'
  });

  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'active'
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (user) => {
    setViewingUser(user);
    setLoadingOrders(true);
    try {
      // Fetch Orders
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('userId', '==', user.id), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserOrders(orders);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleAction = async (action, user) => {
    if (user.email === 'admin@satvaorganics.com') {
      alert('Cannot perform this action on Super Admin');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.id);
      
      switch (action) {
        case 'toggleStatus':
          const newStatus = user.status === 'active' ? 'inactive' : 'active';
          if (window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this account?`)) {
            await updateDoc(userRef, { status: newStatus });
            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
          }
          break;
        
        case 'changeRole':
          const newRole = user.role === 'admin' ? 'user' : 'admin';
          if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
            await updateDoc(userRef, { role: newRole });
            setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
          }
          break;

        case 'delete':
          if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await deleteDoc(userRef);
            setUsers(users.filter(u => u.id !== user.id));
          }
          break;

        case 'resetPassword':
          if (window.confirm(`Send password reset email to ${user.email}?`)) {
            await sendPasswordResetEmail(auth, user.email);
            alert(`Password reset link sent to ${user.email}`);
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert('Failed to perform action');
    }
    setActiveDropdown(null);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return <FiCheckCircle />;
      case 'inactive': return <FiXCircle />;
      case 'blocked': return <FiAlertCircle />;
      case 'pending': return <FiClock />;
      default: return <FiCheckCircle />;
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'blocked': return 'status-blocked';
      case 'pending': return 'status-pending';
      default: return 'status-active';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return new Date(date).toLocaleDateString();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phoneNumber && user.phoneNumber.includes(searchTerm));

    const matchesRole = filters.role === 'all' || user.role === filters.role;
    const matchesStatus = filters.status === 'all' || user.status === filters.status;
    const matchesVerification = filters.emailVerified === 'all' || 
      (filters.emailVerified === 'verified' ? user.emailVerified : !user.emailVerified);

    return matchesSearch && matchesRole && matchesStatus && matchesVerification;
  }).sort((a, b) => {
    const { key, direction } = sortConfig;
    let valA = a[key] || '';
    let valB = b[key] || '';
    
    if (key === 'createdAt') {
      valA = valA.seconds || new Date(valA).getTime();
      valB = valB.seconds || new Date(valB).getTime();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    const fetchReviewCounts = async () => {
      if (paginatedUsers.length === 0) return;
      
      const counts = {};
      try {
        const userIds = paginatedUsers.map(u => u.id);
        if (userIds.length > 0) {
            const reviewsRef = collection(db, 'reviews');
            const q = query(reviewsRef, where('userId', 'in', userIds));
            const snapshot = await getDocs(q);
            
            userIds.forEach(id => counts[id] = 0);
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.userId) {
                    counts[data.userId] = (counts[data.userId] || 0) + 1;
                }
            });
            setReviewCounts(prev => ({ ...prev, ...counts }));
        }
      } catch (error) {
        console.error("Error fetching review counts:", error);
      }
    };

    fetchReviewCounts();
  }, [paginatedUsers]);

  const exportToCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
    const data = filteredUsers.map(u => [
      u.id,
      u.displayName || 'N/A',
      u.email,
      u.phoneNumber || u.mobile || 'N/A',
      u.role || 'user',
      u.status || 'active',
      formatDate(u.createdAt)
    ]);

    const csvContent = [headers, ...data].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const UserDetailsModal = ({ user, onClose }) => {
    if (!user) return null;
    const totalSpend = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title-group">
              <div className="modal-avatar">
                {user.photoURL ? <img src={user.photoURL} alt="" /> : user.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <h2>{user.displayName || 'User Details'}</h2>
                <span className="user-id">ID: {user.id}</span>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}><FiX /></button>
          </div>

          <div className="modal-body">
            <div className="modal-grid">
              <div className="info-section">
                <h3><FiUser /> Profile Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Email</label>
                    <span>{user.email}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <span>{user.phoneNumber || user.mobile || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Role</label>
                    <span className={`role-badge ${user.role || 'user'}`}>{user.role || 'user'}</span>
                  </div>
                  <div className="info-item">
                    <label>Status</label>
                    <span className={`status-pill ${getStatusClass(user.status)}`}>{user.status || 'active'}</span>
                  </div>
                  <div className="info-item">
                    <label>Joined Date</label>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <label>Email Verified</label>
                    <span className={user.emailVerified ? 'text-success' : 'text-danger'}>
                      {user.emailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Last Login</label>
                    <span>{user.lastLogin ? formatDate(user.lastLogin) : 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>IP Address</label>
                    <span>{user.lastIp || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3><FiShield /> Account Stats</h3>
                <div className="user-modal-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Total Orders</span>
                    <span className="stat-value">{userOrders.length}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Total Spend</span>
                    <span className="stat-value">₹{totalSpend.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {user.addresses && user.addresses.length > 0 && (
              <div className="info-section full-width">
                <h3><FiMapPin /> Address Book</h3>
                <div className="mini-table-container">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.addresses.map((addr, idx) => (
                        <tr key={idx}>
                          <td>{addr.name}</td>
                          <td>{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</td>
                          <td>{addr.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="info-section full-width">
              <h3><FiClock /> Login History</h3>
              {user.loginHistory && user.loginHistory.length > 0 ? (
                <div className="mini-table-container">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Device/Browser</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...user.loginHistory].reverse().slice(0, 10).map((login, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(login.timestamp)} {login.timestamp?.toDate ? login.timestamp.toDate().toLocaleTimeString() : ''}</td>
                          <td title={login.device}>{login.device?.substring(0, 50)}...</td>
                          <td>{login.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No login history available.</p>
              )}
            </div>

            <div className="info-section full-width">
              <h3><FiCalendar /> Recent Orders</h3>
              {loadingOrders ? (
                <div className="loading-small">Loading orders...</div>
              ) : userOrders.length > 0 ? (
                <div className="mini-table-container">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userOrders.slice(0, 5).map(order => (
                        <tr key={order.id}>
                          <td>#{order.id.substring(0, 8)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>₹{order.totalAmount}</td>
                          <td><span className={`status-dot ${order.status?.toLowerCase()}`}></span>{order.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No orders found for this user.</p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>Close</button>
            <button className="btn-primary" onClick={() => handleAction('changeRole', user)}>
              Change Role
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UserReviewsModal = ({ user, onClose }) => {
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [filterProduct, setFilterProduct] = useState('');
    const [sortOption, setSortOption] = useState('date-desc');

    useEffect(() => {
      const fetchReviews = async () => {
        try {
          const q = query(collection(db, 'reviews'), where('userId', '==', user.id));
          const snapshot = await getDocs(q);
          
          const reviewsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let productName = data.productName || 'Unknown Product';
            
            if (!data.productName && data.orderId) {
                try {
                    const orderDoc = await getDoc(doc(db, 'orders', data.orderId));
                    if (orderDoc.exists()) {
                        const orderData = orderDoc.data();
                        if (orderData.items && orderData.items.length > 0) {
                            productName = orderData.items.map(i => i.name).join(', ');
                        } else {
                            productName = `Order #${data.orderId.substring(0,6)}`;
                        }
                    }
                } catch (e) {
                    console.error("Error fetching order for review:", e);
                }
            }
            
            return {
              id: docSnap.id,
              ...data,
              productName
            };
          }));
          
          setReviews(reviewsData);
        } catch (error) {
          console.error("Error fetching reviews:", error);
        } finally {
          setLoadingReviews(false);
        }
      };
      
      fetchReviews();
    }, [user.id]);

    const filteredReviews = reviews
      .filter(r => r.productName.toLowerCase().includes(filterProduct.toLowerCase()))
      .sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        
        switch(sortOption) {
            case 'date-desc': return dateB - dateA;
            case 'date-asc': return dateA - dateB;
            case 'rating-desc': return ratingB - ratingA;
            case 'rating-asc': return ratingA - ratingB;
            default: return 0;
        }
      });

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content reviews-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <div className="modal-title-group">
                <div>
                    <h2>Reviews by {user.displayName}</h2>
                    <span className="user-id">Total Reviews: {reviews.length}</span>
                </div>
            </div>
            <button className="close-btn" onClick={onClose}><FiX /></button>
          </div>
          
          <div className="modal-body">
            <div className="reviews-controls" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div className="search-box" style={{ flex: 1 }}>
                    <FiSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Filter by product..." 
                        value={filterProduct}
                        onChange={(e) => setFilterProduct(e.target.value)}
                    />
                </div>
                <select 
                    className="filter-select" 
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value)}
                >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="rating-desc">Highest Rating</option>
                    <option value="rating-asc">Lowest Rating</option>
                </select>
            </div>

            {loadingReviews ? (
                <div className="loading-small">Loading reviews...</div>
            ) : filteredReviews.length > 0 ? (
                <div className="mini-table-container">
                    <table className="mini-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Order ID</th>
                                <th>Rating</th>
                                <th>Review</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReviews.map(review => (
                                <tr key={review.id}>
                                    <td style={{ fontWeight: 500 }}>{review.productName}</td>
                                    <td>#{review.orderId?.substring(0, 8)}</td>
                                    <td>
                                        <span style={{ color: '#f59e0b' }}>
                                            {'★'.repeat(review.rating || 0)}
                                            <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - (review.rating || 0))}</span>
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={review.comment}>
                                            {review.comment || 'No comment'}
                                        </div>
                                    </td>
                                    <td>{formatDate(review.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="no-data">No reviews found.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-users-page">
      <div className="users-header">
        <div className="header-left">
          <h1 className="header-title">User Management</h1>
          <p className="header-subtitle">Manage your customers and administrators</p>
        </div>
        <div className="header-right">
          <button className="btn-export" onClick={exportToCSV}>
            <FiDownload /> Export CSV
          </button>
        </div>
      </div>

      <div className="users-stats-row">
        <div className="user-stat-card">
          <div className="stat-icon blue"><FiUser /></div>
          <div className="stat-info">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{users.length}</span>
          </div>
        </div>
        <div className="user-stat-card">
          <div className="stat-icon green"><FiShield /></div>
          <div className="stat-info">
            <span className="stat-label">Admins</span>
            <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
          </div>
        </div>
        <div className="user-stat-card">
          <div className="stat-icon orange"><FiClock /></div>
          <div className="stat-info">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{users.filter(u => u.status === 'pending').length}</span>
          </div>
        </div>
      </div>

      <div className="users-controls">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, phone or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>



      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('displayName')} className="sortable">
                  User {sortConfig.key === 'displayName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Email</th>
                <th>Phone</th>
                <th onClick={() => handleSort('role')} className="sortable">
                  Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('createdAt')} className="sortable">
                  Joined {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Status</th>
                <th>Reviews</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell" onClick={() => fetchUserDetails(user)}>
                        <div className="user-avatar">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" />
                          ) : (
                            user.displayName?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="user-info">
                          <span className="user-name">{user.displayName || 'No Name'}</span>
                          <span className="user-id-small">#{user.id.substring(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phoneNumber || user.mobile || '—'}</td>
                    <td>
                      <span className={`role-badge ${user.role || 'user'}`}>
                        {user.role === 'admin' && <FiShield />}
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className={`status-pill ${getStatusClass(user.status)}`}>
                        {getStatusIcon(user.status)}
                        <span>{user.status || 'active'}</span>
                      </div>
                    </td>
                    <td>
                        <div className="reviews-cell" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                            <span style={{ color: '#f59e0b' }}>⭐</span>
                            <span>{reviewCounts[user.id] || 0} Reviews</span>
                        </div>
                    </td>
                    <td className="actions-col">
                      <div className="action-dropdown-container">
                        <button 
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === user.id ? null : user.id);
                          }}
                        >
                          <FiMoreVertical />
                        </button>
                        {activeDropdown === user.id && (
                          <div className="action-dropdown">
                            <button onClick={() => {
                              fetchUserDetails(user);
                              setActiveDropdown(null);
                            }}>
                              <FiEye /> View Profile
                            </button>
                            <button onClick={() => {
                                fetchUserDetails(user);
                                setActiveDropdown(null);
                            }}>
                                <FiPackage /> View Orders
                            </button>
                            <button onClick={() => {
                                setViewingReviews(user);
                                setActiveDropdown(null);
                            }}>
                                <span style={{ color: '#f59e0b' }}>⭐</span> View Reviews
                            </button>
                            <button onClick={() => handleAction('changeRole', user)}>
                              <FiShield /> Change Role
                            </button>
                            <button onClick={() => handleAction('toggleStatus', user)}>
                              {user.status === 'active' ? <FiLock /> : <FiUnlock />}
                              {user.status === 'active' ? 'Block User' : 'Unblock User'}
                            </button>
                            <button onClick={() => handleAction('resetPassword', user)}>
                              <FiMail /> Reset Password
                            </button>
                            <button className="delete" onClick={() => handleAction('delete', user)}>
                              <FiTrash2 /> Delete User
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-results">
                    <div className="no-results-content">
                      <FiSearch />
                      <p>No users found matching your criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="pagination-btn"
          >
            Previous
          </button>
          <div className="page-numbers">
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`page-number ${currentPage === i + 1 ? 'active' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {viewingUser && (
        <UserDetailsModal 
          user={viewingUser} 
          onClose={() => setViewingUser(null)} 
        />
      )}
      
      {viewingReviews && (
        <UserReviewsModal 
            user={viewingReviews}
            onClose={() => setViewingReviews(null)}
        />
      )}
    </div>
  );
};

export default Users;
