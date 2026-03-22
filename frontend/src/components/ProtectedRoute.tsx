import React, { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type SessionUser = {
  role?: string;
};

interface ProtectedRouteProps extends PropsWithChildren {
  // allowed roles, e.g., ['nurse'], ['patient']. If empty or includes 'any'/'*', then only require authentication.
  allow: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allow, children }) => {
  const location = useLocation();
  const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user: SessionUser | null = raw ? JSON.parse(raw) : null;

  if (!user) {
    // Not logged in: redirect to login and preserve intended path
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowAny = allow.length === 0 || allow.includes('any') || allow.includes('*');
  if (!allowAny && (!user.role || !allow.includes(user.role))) {
    // Logged in but lacks role permission
    // Admin trying to access patient pages → redirect to admin dashboard
    if (user.role === 'nurse') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Patient trying to access admin pages → redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
