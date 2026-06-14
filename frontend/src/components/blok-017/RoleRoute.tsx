// frontend/src/components/blok-017/RoleRoute.tsx
//
// Blok 017 role-based access gate, rebranded for Cuebe. Wraps ProtectedRoute
// with an access-tier (Layer 1) check. allowedRoles are AccessRole values
// (SUPER_ADMIN > ADMIN > MANAGER > USER > GUEST).

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { AccessRole } from '../../types/auth';
import ProtectedRoute from './ProtectedRoute';

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: AccessRole[];
  redirectTo?: string;
}

export default function RoleRoute({ children, allowedRoles, redirectTo = '/' }: RoleRouteProps) {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {user && allowedRoles.includes(user.role) ? (
        <>{children}</>
      ) : (
        <Navigate to={redirectTo} replace />
      )}
    </ProtectedRoute>
  );
}
