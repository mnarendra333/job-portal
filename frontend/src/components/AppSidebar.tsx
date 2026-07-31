import { NavLink } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { NAV_ICONS } from '@/components/navIcons';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  to: string;
  roles: UserRole[];
  permission?: string;
  highlight?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/app', roles: ['admin', 'recruiter', 'agency', 'job_seeker'] },
  { label: 'Find Jobs', to: '/jobs', roles: ['admin', 'recruiter', 'agency', 'job_seeker'], permission: 'jobs:read', highlight: true },
  { label: 'My Profile', to: '/app/profile', roles: ['job_seeker'], permission: 'profile:read' },
  { label: 'My Applications', to: '/app/applications', roles: ['job_seeker'], permission: 'applications:read' },
  { label: 'Recommended Jobs', to: '/jobs?tab=recommended', roles: ['job_seeker'], permission: 'jobs:read' },
  { label: 'My Jobs', to: '/app/jobs', roles: ['recruiter', 'admin'], permission: 'jobs:read' },
  { label: 'Post New Job', to: '/app/jobs/new', roles: ['recruiter'], permission: 'jobs:write' },
  { label: 'Upload Candidates', to: '/app/upload', roles: ['agency'], permission: 'bulk:upload' },
  { label: 'Upload History', to: '/app/uploads', roles: ['agency'], permission: 'bulk:upload' },
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
    <aside className="w-full lg:w-52 shrink-0">
      <nav className="naukri-sidebar-card sticky top-20">
        <p className="text-xs font-semibold uppercase tracking-wide text-naukri-muted mb-3 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          {user.role.replace('_', ' ')} menu
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = NAV_ICONS[item.label] ?? Briefcase;
            return (
              <li key={item.to + item.label}>
                <NavLink
                  to={item.to}
                  end={item.to === '/app'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      item.highlight && !isActive
                        ? 'text-teal-700 bg-teal-50/80 font-medium hover:bg-teal-100 border border-teal-100'
                        : isActive
                          ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-100'
                          : 'text-naukri-text hover:bg-slate-50 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-80" strokeWidth={2} />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
