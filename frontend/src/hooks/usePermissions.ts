import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

export function usePermissions() {
  const { user } = useAuth();
  const permissions = new Set(user?.permissions ?? []);

  return {
    user,
    permissions,
    hasPermission: (perm: string) => permissions.has(perm),
    hasAnyPermission: (perms: string[]) => perms.some((p) => permissions.has(p)),
    hasRole: (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
  };
}
