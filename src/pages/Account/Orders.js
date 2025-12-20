import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import './Account.css';

const Orders = () => {
  // Mock orders data
  const orders = [
    {
      id: 'ORD-12345',
      date: 'Dec 10, 2025',
      total: 120.50,
      status: 'Delivered',
      items: ['Fresh Organic Papaya', 'Mixed Berries Pack']
    },
    {
      id: 'ORD-12346',
      date: 'Dec 05, 2025',
      total: 45.00,
      status: 'Processing',
      items: ['Organic Mangosteen']
    }
  ];

  return (
    <div className="account-section">
      <div className="account-header">
        <h2 className="account-title">My Orders</h2>
      </div>

      <div className="orders-list">
        {orders.length > 0 ? (
          orders.map(order => (
            <div key={order.id} className="order-card" style={{ 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '16px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{order.id}</h3>
                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>{order.date}</span>
                </div>
                <Badge variant={order.status === 'Delivered' ? 'success' : 'warning'}>
                  {order.status}
                </Badge>
              </div>
              
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '12px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem' }}>
                  <strong>Items:</strong> {order.items.join(', ')}
                </p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  Total: ${order.total.toFixed(2)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p>No orders found.</p>
            <Link to="/shop" className="save-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
