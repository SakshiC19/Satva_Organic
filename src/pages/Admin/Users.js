import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { 
  FiSearch, FiUser, FiMail, FiShield, 
  FiMoreVertical, FiTrash2, FiLock, FiUnlock, FiEye, 
  FiDownload, FiCheckCircle, FiXCircle, FiAlertCircle, FiClock, FiX, FiMapPin, FiPackage, FiStar,
  FiTruck, FiDollarSign, FiShoppingBag, FiCreditCard
} from 'react-icons/fi';
import './Users.css';

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const formatDate = (date) => {
        if (!date) return 'N/A';
        if (date.toDate) return date.toDate().toLocaleDateString();
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
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
          case 'accepted': return 'status-accepted';
          case 'processing': return 'status-processing';
          case 'shipped': return 'status-shipped';
          case 'delivered': return 'status-delivered';
          case 'cancelled': return 'status-cancelled';
          default: return 'status-pending';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-group">
                        <h2>Order Details</h2>
                        <span className="user-id">#{order.id.substring(0, 8)}</span>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </div>
                <div className="modal-body">
                    <div className="order-details-grid-new">
                        <div className="details-main">
                             {/* Items */}
                            <div className="detail-card">
                                <h3><FiPackage /> Order Items</h3>
                                <table className="items-table-new">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.name}</td>
                                                <td>{item.quantity}</td>
                                                <td>{formatCurrency(item.price)}</td>
                                                <td>{formatCurrency(item.price * item.quantity)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
                                            <td style={{ fontWeight: 'bold' }}>{formatCurrency(order.totalAmount || order.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Address */}
                            <div className="detail-card">
                                <h3><FiTruck /> Delivery Address</h3>
                                <div className="address-box">
                                    {order.shippingAddress ? (
                                        <>
                                            <p>{order.shippingAddress.address}</p>
                                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                                        </>
                                    ) : (
                                        <p>No address provided</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="details-sidebar">
                            <div className={`status-badge-large ${getStatusClass(order.status)}`}>
                                {order.status?.toUpperCase() || 'PENDING'}
                            </div>

                            <div className="detail-card">
                                <h3><FiCreditCard /> Payment Info</h3>
                                <p><strong>Method:</strong> {order.paymentMethod?.toUpperCase()}</p>
                                <p><strong>Status:</strong> {order.paymentStatus || 'Pending'}</p>
                            </div>

                            <div className="detail-card">
                                <h3><FiClock /> Timeline</h3>
                                <p>Ordered: {formatDate(order.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

const UserDetailsModal = ({ user, onClose, userOrders, loadingOrders, handleAction }) => {
    if (!user) return null;
    const totalSpend = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const formatDate = (date) => {
        if (!date) return 'N/A';
        if (date.toDate) return date.toDate().toLocaleDateString();
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
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

    const [viewingOrderDetails, setViewingOrderDetails] = useState(null);

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
            <div className="info-section full-width">
              <h3><FiClock /> Recent Orders</h3>
              {loadingOrders ? (
                <div className="loading-small">Loading orders...</div>
              ) : userOrders.length > 0 ? (
                <div className="mini-table-container">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Payment</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userOrders.slice(0, 10).map(order => (
                        <tr key={order.id} onClick={() => setViewingOrderDetails(order)} style={{ cursor: 'pointer' }} className="clickable-row">
                          <td style={{ fontWeight: 'bold' }}>#{order.id.substring(0, 8)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>
                              {order.items?.length > 0 ? (
                                  <span title={order.items.map(i => i.name).join(', ')}>
                                      {order.items[0].name} {order.items.length > 1 && `+${order.items.length - 1}`}
                                  </span>
                              ) : 'NA'}
                          </td>
                          <td>{order.paymentMethod?.toUpperCase() || 'NA'}</td>
                          <td>₹{order.totalAmount || 'NA'}</td>
                          <td>
                              <span className={`status-dot ${order.status?.toLowerCase()}`}></span>
                              {order.status || 'NA'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No orders found for this user.</p>
              )}
            </div>

            <div className="modal-grid">
              <div className="info-section">
                <h3><FiShield /> Account Stats</h3>
                <div className="user-modal-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Total Orders</span>
                    <span className="stat-value">{userOrders.length || 'NA'}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Total Spend</span>
                    <span className="stat-value">₹{totalSpend ? totalSpend.toLocaleString() : 'NA'}</span>
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


          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
        {viewingOrderDetails && (
            <OrderDetailsModal order={viewingOrderDetails} onClose={() => setViewingOrderDetails(null)} />
        )}
      </div>
    );
};

const UserReviewsModal = ({ user, onClose }) => {
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [filterProduct, setFilterProduct] = useState('');
    const [sortOption, setSortOption] = useState('date-desc');

    const formatDate = (date) => {
        if (!date) return 'N/A';
        if (date.toDate) return date.toDate().toLocaleDateString();
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
        return new Date(date).toLocaleDateString();
    };

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
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    emailVerified: 'all'
  });
  
  const [dateFilter, setDateFilter] = useState('all');
  const [activeUserIdsByDate, setActiveUserIdsByDate] = useState(null);
  const [orderCounts, setOrderCounts] = useState({});
  const [selectedUsers, setSelectedUsers] = useState(new Set());

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
      const q = query(ordersRef, where('userId', '==', user.id));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
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
            setSelectedUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(user.id);
                return newSet;
            });
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

  const handleBulkAction = async (action) => {
      if (selectedUsers.size === 0) return;

      if (action === 'notification') {
          setIsNotificationModalOpen(true);
          return;
      }

      if (action === 'block') {
          if (!window.confirm(`Are you sure you want to block ${selectedUsers.size} users?`)) return;
          try {
              const batch = [];
              selectedUsers.forEach(userId => {
                  const userRef = doc(db, 'users', userId);
                  batch.push(updateDoc(userRef, { status: 'blocked' }));
              });
              await Promise.all(batch);
              setUsers(users.map(u => selectedUsers.has(u.id) ? { ...u, status: 'blocked' } : u));
              setSelectedUsers(new Set());
              alert('Users blocked successfully');
          } catch (error) {
              console.error("Error blocking users:", error);
              alert('Failed to block users');
          }
      }

      if (action === 'export') {
          const selectedData = users.filter(u => selectedUsers.has(u.id));
          const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
          const data = selectedData.map(u => [
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
          link.setAttribute("download", `selected_users_export_${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
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

  const getNewUsersCount = () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      return users.filter(u => {
          const date = u.createdAt?.toDate ? u.createdAt.toDate() : (u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : new Date(u.createdAt));
          return date >= thirtyDaysAgo;
      }).length;
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
    const matchesDate = dateFilter === 'all' || (activeUserIdsByDate && activeUserIdsByDate.has(user.id));

    return matchesSearch && matchesRole && matchesStatus && matchesVerification && matchesDate;
  }).sort((a, b) => {
    const { key, direction } = sortConfig;
    let valA = a[key] || '';
    let valB = b[key] || '';
    
    if (key === 'createdAt') {
      const getTime = (d) => {
          if (!d) return 0;
          if (d.seconds) return d.seconds * 1000;
          if (d.toDate) return d.toDate().getTime();
          return new Date(d).getTime() || 0;
      };
      valA = getTime(valA);
      valB = getTime(valB);
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

  useEffect(() => {
    const fetchOrderCounts = async () => {
      if (paginatedUsers.length === 0) return;
      
      const counts = {};
      try {
        const userIds = paginatedUsers.map(u => u.id);
        if (userIds.length > 0) {
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, where('userId', 'in', userIds));
            const snapshot = await getDocs(q);
            
            userIds.forEach(id => counts[id] = { count: 0, latestOrderId: null, latestOrderDate: 0 });
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.userId) {
                    if (!counts[data.userId]) counts[data.userId] = { count: 0, latestOrderId: null, latestOrderDate: 0 };
                    
                    counts[data.userId].count += 1;
                    
                    const orderDate = data.createdAt?.seconds || 0;
                    if (orderDate > counts[data.userId].latestOrderDate) {
                        counts[data.userId].latestOrderDate = orderDate;
                        counts[data.userId].latestOrderId = doc.id;
                    }
                }
            });
            setOrderCounts(prev => ({ ...prev, ...counts }));
        }
      } catch (error) {
        console.error("Error fetching order counts:", error);
      }
    };

    fetchOrderCounts();
  }, [paginatedUsers]);

  useEffect(() => {
    const fetchUsersByDate = async () => {
        if (dateFilter === 'all') {
            setActiveUserIdsByDate(null);
            return;
        }
        setLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();

            if (dateFilter === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (dateFilter === 'week') {
                const day = startDate.getDay();
                const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                startDate.setDate(diff);
                startDate.setHours(0, 0, 0, 0);
            } else if (dateFilter === 'month') {
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
            }

            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, where('createdAt', '>=', startDate));
            const snapshot = await getDocs(q);
            const userIds = new Set(snapshot.docs.map(doc => doc.data().userId));
            setActiveUserIdsByDate(userIds);
        } catch (error) {
            console.error("Error filtering by date:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchUsersByDate();
  }, [dateFilter]);

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




  return (
    <>
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
          <div className="stat-icon green"><FiUser /></div>
          <div className="stat-info">
            <span className="stat-label">New Users</span>
            <span className="stat-value">{getNewUsersCount()}</span>
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
          <div className="stat-icon blue" style={{ background: '#fff7ed', color: '#f59e0b' }}><FiStar /></div>
          <div className="stat-info">
            <span className="stat-label">Reviews</span>
            <span className="stat-value">{Object.values(reviewCounts).reduce((a, b) => a + b, 0)}</span>
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
        <div className="filter-group">
            <select 
                className="filter-select"
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="user">Users</option>
            </select>
            <select 
                className="filter-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
            </select>
            <select 
                className="filter-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
            >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>
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
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.has(u.id))}
                    onChange={(e) => {
                        if (e.target.checked) {
                            const newSelected = new Set(selectedUsers);
                            paginatedUsers.forEach(u => newSelected.add(u.id));
                            setSelectedUsers(newSelected);
                        } else {
                            const newSelected = new Set(selectedUsers);
                            paginatedUsers.forEach(u => newSelected.delete(u.id));
                            setSelectedUsers(newSelected);
                        }
                    }}
                  />
                </th>
                <th onClick={() => handleSort('displayName')} className="sortable">
                  USER {sortConfig.key === 'displayName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="email-col">EMAIL</th>
                <th className="phone-col">PHONE</th>
                <th>ORDER ID</th>
                <th onClick={() => handleSort('createdAt')} className="sortable">
                  JOINED {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>ORDER ITEMS</th>
                <th className="actions-col">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map(user => (
                  <tr key={user.id} className={selectedUsers.has(user.id) ? 'selected' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => {
                            const newSelected = new Set(selectedUsers);
                            if (e.target.checked) {
                                newSelected.add(user.id);
                            } else {
                                newSelected.delete(user.id);
                            }
                            setSelectedUsers(newSelected);
                        }}
                      />
                    </td>
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
                    <td className="email-col" title={user.email}>{user.email || 'NA'}</td>
                    <td className="phone-col">{user.phoneNumber || user.mobile || 'NA'}</td>
                    <td>
                        {orderCounts[user.id]?.latestOrderId ? (
                            <span className="user-id-small" style={{ fontWeight: 'bold' }}>#{orderCounts[user.id].latestOrderId.substring(0, 8)}</span>
                        ) : (
                            <span className="text-muted">NA</span>
                        )}
                    </td>
                    <td>
                        <div className="date-cell">
                            <span className="date-main">{formatDate(user.createdAt)}</span>
                        </div>
                    </td>
                    <td>
                        <div 
                            className={`status-pill clickable ${
                                (orderCounts[user.id]?.count || 0) === 0 ? 'status-grey' : 
                                (orderCounts[user.id]?.count || 0) <= 3 ? 'status-blue' : 'status-green'
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                fetchUserDetails(user);
                            }}
                        >
                            <FiPackage />
                            <span>{(orderCounts[user.id]?.count || 0) > 0 ? `${orderCounts[user.id].count} Orders` : 'NA'}</span>
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
                            <button onClick={() => handleAction('toggleStatus', user)}>
                              {user.status === 'active' ? <FiLock /> : <FiUnlock />}
                              {user.status === 'active' ? 'Block User' : 'Unblock User'}
                            </button>
                            <button 
                                className={`delete ${orderCounts[user.id]?.count > 0 ? 'disabled' : ''}`}
                                onClick={() => {
                                    if (orderCounts[user.id]?.count > 0) return;
                                    handleAction('delete', user);
                                }}
                                disabled={orderCounts[user.id]?.count > 0}
                                title={orderCounts[user.id]?.count > 0 ? "Cannot delete user with orders" : "Delete user"}
                            >
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
                  <td colSpan="8" className="no-results">
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
            onClick={() => setCurrentPage(prev => prev + 1)}
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
            userOrders={userOrders}
            loadingOrders={loadingOrders}
            handleAction={handleAction}
        />
      )}

      {viewingReviews && (
        <UserReviewsModal 
            user={viewingReviews} 
            onClose={() => setViewingReviews(null)} 
        />
      )}

      {isNotificationModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNotificationModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Send Notification</h2>
              <button className="close-btn" onClick={() => setIsNotificationModalOpen(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#64748b' }}>
                Sending to <strong>{selectedUsers.size}</strong> selected users.
              </p>
              <div className="info-item" style={{ gap: '8px' }}>
                <label>Message</label>
                <textarea 
                  style={{ 
                    width: '100%', 
                    minHeight: '120px', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Type your message here..."
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsNotificationModalOpen(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={() => {
                  alert(`Notification sent to ${selectedUsers.size} users: ${notificationMessage}`);
                  setIsNotificationModalOpen(false);
                  setNotificationMessage('');
                  setSelectedUsers(new Set());
                }}
                disabled={!notificationMessage.trim()}
              >
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedUsers.size > 0 && (
          <div className="bulk-actions-bar">
              <div className="bulk-info">
                <span className="selected-count">{selectedUsers.size} users selected</span>
                {selectedUsers.size === paginatedUsers.length && filteredUsers.length > paginatedUsers.length && (
                    <button 
                        className="select-all-link"
                        onClick={() => {
                            const allIds = new Set(filteredUsers.map(u => u.id));
                            setSelectedUsers(allIds);
                        }}
                    >
                        Select all {filteredUsers.length} users
                    </button>
                )}
              </div>
              <div className="bulk-btns">
                  <button className="bulk-btn" onClick={() => handleBulkAction('notification')}>
                      <FiMail /> Send Notification
                  </button>
                  <button className="bulk-btn" onClick={() => handleBulkAction('block')}>
                      <FiLock /> Block Users
                  </button>
                  <button className="bulk-btn" onClick={() => handleBulkAction('export')}>
                      <FiDownload /> Export Selected
                  </button>
                  <button className="bulk-btn-close" onClick={() => setSelectedUsers(new Set())}>
                      <FiX />
                  </button>
              </div>
          </div>
      )}
    </div>
    </>
  );
};

export default Users;
