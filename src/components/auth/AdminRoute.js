import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser || userRole !== 'admin') {
    return <Navigate to="/login" />;
  }

  return children;
};

export default AdminRoute;
