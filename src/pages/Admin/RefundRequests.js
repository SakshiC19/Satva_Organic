import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiRefreshCcw, FiCheck, FiX, FiClock, FiCheckCircle, FiSkipBack } from 'react-icons/fi';
import './RefundRequests.css';

const RefundRequests = () => {
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundFilter, setRefundFilter] = useState('pending');
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [customCancellationReasons, setCustomCancellationReasons] = useState([]);
  const [customRefundReasons, setCustomRefundReasons] = useState([]);
  const [newReason, setNewReason] = useState({ cancellation: '', refund: '' });

  useEffect(() => {
    const ordersRef = collection(db, 'orders');

    const unsubscribeOrders = onSnapshot(query(ordersRef, orderBy('createdAt', 'desc'), limit(500)), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentOrders(orders);
      setLoading(false);
    });

    const unsubscribeReasons = onSnapshot(doc(db, 'settings', 'order_reasons'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCustomCancellationReasons(data.cancellationReasons || []);
        setCustomRefundReasons(data.refundReasons || []);
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeReasons();
    };
  }, []);

  const handleApproveRefund = async (e, orderId, isCancellation = false) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to approve this ${isCancellation ? 'cancellation' : 'refund'}?`)) return;

    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData = isCancellation ? {
        status: 'Cancelled',
        'cancellationRequest.status': 'approved',
        'cancellationRequest.processedAt': serverTimestamp(),
        statusUpdatedAt: serverTimestamp()
      } : {
        status: 'Returned',
        'refundRequest.status': 'approved',
        'refundRequest.processedAt': serverTimestamp(),
        paymentStatus: 'Refund Initiated',
        statusUpdatedAt: serverTimestamp()
      };

      await updateDoc(orderRef, updateData);
      alert(`${isCancellation ? 'Cancellation' : 'Refund'} approved successfully!`);
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request.");
    }
  };

  const handleRejectRefund = async (e, orderId, isCancellation = false) => {
    e.stopPropagation();
    const reason = window.prompt(`Reason for rejecting ${isCancellation ? 'cancellation' : 'refund'}?`);
    if (reason === null) return;

    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData = isCancellation ? {
        'cancellationRequest.status': 'rejected',
        'cancellationRequest.rejectionReason': reason,
        'cancellationRequest.processedAt': serverTimestamp()
      } : {
        'refundRequest.status': 'rejected',
        'refundRequest.rejectionReason': reason,
        'refundRequest.processedAt': serverTimestamp()
      };

      await updateDoc(orderRef, updateData);
      alert(`${isCancellation ? 'Cancellation' : 'Refund'} rejected.`);
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request.");
    }
  };

  const handleSaveReasons = async () => {
    try {
      const reasonsRef = doc(db, 'settings', 'order_reasons');
      await updateDoc(reasonsRef, {
        cancellationReasons: customCancellationReasons,
        refundReasons: customRefundReasons,
        updatedAt: serverTimestamp()
      });
      alert('Reasons updated successfully!');
      setReasonModalOpen(false);
    } catch (error) {
      alert('Failed to save reasons.');
    }
  };

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    let d;
    if (timestamp.toDate) d = timestamp.toDate();
    else if (timestamp.seconds) d = new Date(timestamp.seconds * 1000);
    else d = new Date(timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const formatDate = (date) => {
    if (!date) return 'Recently';
    let d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="admin-refunds-page">Loading...</div>;

  const stats = [
    { label: 'Total Requests', filter: 'all', value: recentOrders.filter(o => o.refundRequest || o.cancellationRequest).length.toString(), color: '#6366f1', icon: <FiRefreshCcw />, iconClass: 'purple', trend: 'Lifetime requests', trendUp: true },
    { label: "Today's", filter: 'today', value: recentOrders.filter(o => isToday(o.refundRequest?.requestedAt || o.cancellationRequest?.requestedAt)).length.toString(), color: '#f59e0b', icon: <FiClock />, iconClass: 'orange', trend: 'Last 24 hours', trendUp: true },
    { label: 'Approved', filter: 'approved', value: recentOrders.filter(o => o.refundRequest?.status === 'approved' || o.cancellationRequest?.status === 'approved').length.toString(), color: '#10b981', icon: <FiCheckCircle />, iconClass: 'green', trend: 'Orders resolved', trendUp: true },
    { label: 'Pending', filter: 'pending', value: recentOrders.filter(o => o.refundRequest?.status === 'pending' || o.cancellationRequest?.status === 'pending').length.toString(), color: '#ef4444', icon: <FiSkipBack />, iconClass: 'red', trend: 'Awaiting review', trendUp: false }
  ];

  return (
    <div className="admin-refunds-page">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Refund Requests Analysis</h1>
            <p>Manage customer return and cancellation requests</p>
          </div>
          <div className="header-actions">
            <button onClick={() => setReasonModalOpen(true)} className="btn btn-primary">
              Edit Reasons
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div 
            key={stat.filter}
            className={`stat-card clickable ${refundFilter === stat.filter ? 'active' : ''}`}
            onClick={() => setRefundFilter(stat.filter)}
            style={{ borderLeft: `6px solid ${stat.color}` }}
          >
            <div className="stat-card-header">
              <div className={`stat-icon ${stat.iconClass || ''}`} style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
            </div>
            <div className="stat-body">
              <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
            <div className="stat-footer">
               <span className={stat.trendUp ? 'trend-up' : 'trend-down'}>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-table-container">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Reason & Message</th>
                <th>Evidence</th>
                <th>Date & Time</th>
                <th>Refund Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.filter(o => {
                const req = o.refundRequest || o.cancellationRequest;
                if (!req) return false;
                if (refundFilter === 'all') return true;
                if (refundFilter === 'today') return isToday(req.requestedAt);
                if (refundFilter === 'approved') return req.status === 'approved';
                if (refundFilter === 'pending') return req.status === 'pending';
                return false;
              }).length > 0 ? (
                recentOrders.filter(o => {
                  const req = o.refundRequest || o.cancellationRequest;
                  if (!req) return false;
                  if (refundFilter === 'all') return true;
                  if (refundFilter === 'today') return isToday(req.requestedAt);
                  if (refundFilter === 'approved') return req.status === 'approved';
                  if (refundFilter === 'pending') return req.status === 'pending';
                  return false;
                }).map((order) => {
                  const isCancel = !!order.cancellationRequest;
                  const req = isCancel ? order.cancellationRequest : order.refundRequest;
                  
                  return (
                    <tr key={order.id}>
                      <td>
                        <div className="order-id-cell">
                          <span className="id">#{order.id.substring(0, 8)}</span>
                          <span className="items-mini">{order.items?.length} items</span>
                        </div>
                      </td>
                      <td>
                        <div className="customer-info">
                          <span className="name">{order.customerName || order.userName || 'Guest'}</span>
                          <span className="phone">{order.phone || order.phoneNumber || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="reason-cell">
                          <span className="reason-tag">{req.reason || 'No reason provided'}</span>
                          {req.message && <p className="reason-msg">"{req.message}"</p>}
                        </div>
                      </td>
                      <td>
                        {req.photoUrl ? (
                          <div className="evidence-preview" onClick={() => window.open(req.photoUrl, '_blank')}>
                            <img src={req.photoUrl} alt="Evidence" title="Click to view full image" />
                            <div className="preview-overlay">View</div>
                          </div>
                        ) : (
                          <span className="no-evidence">No photo</span>
                        )}
                      </td>
                      <td>
                        <div className="date-time-cell">
                          <span className="date">{formatDate(req.requestedAt)}</span>
                          <span className="time">{req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className="refund-badge" style={{ 
                          background: req.status === 'approved' ? '#dcfce7' : (isCancel ? '#fef3c7' : '#fee2e2'),
                          color: req.status === 'approved' ? '#15803d' : (isCancel ? '#d97706' : '#ef4444')
                        }}>
                          {isCancel ? 'Cancel' : 'Refund'}: {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'pending' && (
                          <div className="action-btns">
                            <button onClick={(e) => handleApproveRefund(e, order.id, isCancel)} className="btn-approve" title="Approve"><FiCheck /></button>
                            <button onClick={(e) => handleRejectRefund(e, order.id, isCancel)} className="btn-reject" title="Reject"><FiX /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="7" className="empty-msg">No {refundFilter} requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reasonModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Customize Order Reasons</h2>
            {/* Logic for reasons same as dashboard */}
            <button onClick={() => setReasonModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundRequests;
