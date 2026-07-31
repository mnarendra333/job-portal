import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { MENU_ICONS } from '@/components/navIcons';
import type { User } from '@/types';

interface MenuItem {
  label: string;
  to?: string;
  onClick?: () => void;
  divider?: boolean;
  danger?: boolean;
}

interface UserMenuDropdownProps {
  user: User;
  onLogout: () => void;
}

export default function UserMenuDropdown({ user, onLogout }: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const close = () => setOpen(false);

  const items: MenuItem[] = [{ label: 'Dashboard', to: '/app' }];

  if (user.role === 'job_seeker') {
    items.push(
      { label: 'Edit Profile', to: '/app/profile' },
      { label: 'My Applications', to: '/app/applications' },
      { label: 'Find Jobs', to: '/jobs' },
    );
  }

  if (user.role === 'recruiter') {
    items.push(
      { label: 'My Jobs', to: '/app/jobs' },
      { label: 'Post New Job', to: '/app/jobs/new' },
      { label: 'Find Jobs', to: '/jobs' },
    );
  }

  if (user.role === 'admin') {
    items.push(
      { label: 'All Jobs', to: '/app/jobs' },
      { label: 'All Candidates', to: '/app/admin/candidates' },
      { label: 'Agency Uploads', to: '/app/admin/agency-uploads' },
      { label: 'User Management', to: '/app/admin/users' },
      { label: 'Find Jobs', to: '/jobs' },
    );
  }

  if (user.role === 'agency') {
    items.push(
      { label: 'Upload Candidates', to: '/app/upload' },
      { label: 'Upload History', to: '/app/uploads' },
      { label: 'Find Jobs', to: '/jobs' },
    );
  }

  items.push({ label: 'Settings', to: '/app/settings', divider: true });

  if (user.auth_provider === 'local') {
    items.push({ label: 'Change Password', to: '/app/settings/password' });
  }

  items.push({ label: 'Logout', onClick: onLogout, divider: true, danger: true });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-3 border-l border-naukri-border hover:bg-slate-50 rounded-lg py-1 pr-1 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="hidden md:inline text-xs font-medium text-naukri-muted capitalize px-1.5 py-0.5 rounded bg-slate-100">
          {user.role.replace('_', ' ')}
        </span>
        <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="md" />
        <span className="hidden sm:inline max-w-[120px] truncate text-sm font-semibold text-naukri-text">
          {user.full_name}
        </span>
        <ChevronDown className={`w-4 h-4 text-naukri-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 bg-white border border-naukri-border rounded-xl shadow-lg py-1 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-naukri-border bg-slate-50/80 flex items-center gap-3">
            <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-naukri-text truncate">{user.full_name}</p>
              <p className="text-xs text-naukri-muted truncate">{user.email}</p>
            </div>
          </div>
          {items.map((item) => {
            const Icon = item.danger ? LogOut : (MENU_ICONS[item.label] ?? Settings);
            return (
              <div key={item.label}>
                {item.divider && <div className="my-1 border-t border-naukri-border" />}
                {item.to ? (
                  <Link
                    to={item.to}
                    role="menuitem"
                    onClick={close}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-naukri-text hover:bg-slate-50 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-naukri-muted shrink-0" strokeWidth={2} />
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      if (item.onClick) item.onClick();
                      else if (item.to) navigate(item.to);
                    }}
                    className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                      item.danger ? 'text-red-600 font-medium' : 'text-naukri-text'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${item.danger ? 'text-red-500' : 'text-naukri-muted'}`} strokeWidth={2} />
                    {item.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
