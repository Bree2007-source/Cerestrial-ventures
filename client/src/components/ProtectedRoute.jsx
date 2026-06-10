import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 30, textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default ProtectedRoute;