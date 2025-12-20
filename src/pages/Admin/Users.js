import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiSearch, FiUser, FiMail, FiCalendar, FiShield } from 'react-icons/fi';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => {
    if (!date) return 'N/A';
    // Handle Firestore Timestamp
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    // Handle standard Date object or string
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <h2>User Management</h2>
        <div className="search-bar">
          <FiSearch />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading users...</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} />
                          ) : (
                            <FiUser />
                          )}
                        </div>
                        <span className="user-name">{user.displayName || 'No Name'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="email-cell">
                        <FiMail className="cell-icon" />
                        {user.email}
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role === 'admin' ? 'admin' : 'user'}`}>
                        {user.role === 'admin' && <FiShield className="role-icon" />}
                        {user.role || 'User'}
                      </span>
                    </td>
                    <td>
                      <div className="date-cell">
                        <FiCalendar className="cell-icon" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge active">Active</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-results">
                    No users found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;
