import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, isAppLoading } = useAuth();

  if (isAppLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!currentUser) {
    // If there's no user, redirect to the login page
    return <Navigate to="/login" />;
  }

  // If there is a user, render the child component (the dashboard)
  return <>{children}</>;
};

export default ProtectedRoute;

