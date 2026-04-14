import React, { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isStaffRole } from '@/lib/roles';

type SessionUser = {
  role?: string;
};

interface ProtectedRouteProps extends PropsWithChildren {
  // allowed roles, e.g., ['admin', 'nurse'], ['patient']. If empty or includes 'any'/'*', then only require authentication.
  allow: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allow, children }) => {
  const location = useLocation();
  let user: SessionUser | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        user = JSON.parse(raw);
      } catch {
        localStorage.removeItem('user');
        user = null;
      }
    }
  }

  if (!user) {
    // Not logged in: redirect to login and preserve intended path
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowAny = allow.length === 0 || allow.includes('any') || allow.includes('*');
  if (!allowAny && (!user.role || !allow.includes(user.role))) {
    // Logged in but lacks role permission
    // Non-admin staff should not be redirected to admin dashboard (can cause loops)
    if (isStaffRole(user.role) && user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }

    // Admin trying to access patient pages → redirect to admin dashboard
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    // Patient trying to access admin pages → redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
