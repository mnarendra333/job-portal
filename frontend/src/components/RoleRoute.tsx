import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserRole } from '@/types';

interface RoleRouteProps {
  roles: UserRole[];
  permissions?: string[];
  children: React.ReactNode;
}

export default function RoleRoute({ roles, permissions, children }: RoleRouteProps) {
  const { user, loading } = useAuth();
  const { hasAnyPermission } = usePermissions();

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/app" replace />;
  if (permissions?.length && !hasAnyPermission(permissions)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
