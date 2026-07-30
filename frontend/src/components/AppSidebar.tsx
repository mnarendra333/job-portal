import { NavLink } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  to: string;
  roles: UserRole[];
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/app', roles: ['admin', 'recruiter', 'agency', 'job_seeker'] },
  { label: 'My Profile', to: '/app/profile', roles: ['job_seeker'], permission: 'profile:read' },
  { label: 'My Applications', to: '/app/applications', roles: ['job_seeker'], permission: 'applications:read' },
  { label: 'Recommended Jobs', to: '/jobs?tab=recommended', roles: ['job_seeker'], permission: 'jobs:read' },
  { label: 'My Jobs', to: '/app/jobs', roles: ['recruiter', 'admin'], permission: 'jobs:read' },
  { label: 'Post New Job', to: '/app/jobs/new', roles: ['recruiter'], permission: 'jobs:write' },
  { label: 'Upload Candidates', to: '/app/upload', roles: ['agency'], permission: 'bulk:upload' },
  { label: 'Upload History', to: '/app/uploads', roles: ['agency'], permission: 'bulk:upload' },
  { label: 'Browse Jobs', to: '/jobs', roles: ['agency'], permission: 'jobs:read' },
  { label: 'All Candidates', to: '/app/admin/candidates', roles: ['admin'], permission: 'applications:manage' },
  { label: 'Agency Uploads', to: '/app/admin/agency-uploads', roles: ['admin'], permission: 'dashboard:admin' },
  { label: 'User Management', to: '/app/admin/users', roles: ['admin'], permission: 'users:read' },
  { label: 'Settings', to: '/app/settings', roles: ['admin', 'recruiter', 'agency', 'job_seeker'] },
];

export default function AppSidebar() {
  const { user, hasPermission, hasRole } = usePermissions();

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => {
    if (!hasRole(...item.roles)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <nav className="naukri-sidebar-card sticky top-20">
        <p className="text-xs font-semibold uppercase tracking-wide text-naukri-muted mb-3">
          {user.role.replace('_', ' ')} menu
        </p>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to + item.label}>
              <NavLink
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm ${
                    isActive ? 'bg-teal-50 text-teal-800 font-medium' : 'text-naukri-text hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
