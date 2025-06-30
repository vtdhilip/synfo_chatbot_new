import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  // If the user is not an admin, redirect them to the main dashboard
  if (userRole !== 'admin') {
    return <Navigate to="/" />;
  }

  // If the user is an admin, show the protected page
  return <>{children}</>;
};

export default AdminRoute;