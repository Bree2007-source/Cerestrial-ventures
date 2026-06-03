import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();

  // 1. If the person isn't logged in at all, redirect them straight to the login screen
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If a specific authorization level is demanded (like admin) and they don't match, block access
  if (allowedRole && user.role !== allowedRole) {
    alert('Access Denied: Administrative authorization privileges required.');
    return <Navigate to="/" replace />;
  }

  // 3. Otherwise, everything is safe, let them pass through to the protected screen!
  return children;
};

export default ProtectedRoute;