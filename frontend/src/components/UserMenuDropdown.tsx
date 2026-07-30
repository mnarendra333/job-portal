import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
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

  const items: MenuItem[] = [
    { label: 'Dashboard', to: '/app' },
  ];

  if (user.role === 'job_seeker') {
    items.push(
      { label: 'Edit Profile', to: '/app/profile' },
      { label: 'My Applications', to: '/app/applications' },
      { label: 'Browse Jobs', to: '/jobs' },
    );
  }

  if (user.role === 'recruiter') {
    items.push(
      { label: 'My Jobs', to: '/app/jobs' },
      { label: 'Post New Job', to: '/app/jobs/new' },
      { label: 'Browse Jobs', to: '/jobs' },
    );
  }

  if (user.role === 'admin') {
    items.push(
      { label: 'All Jobs', to: '/app/jobs' },
      { label: 'All Candidates', to: '/app/admin/candidates' },
      { label: 'Agency Uploads', to: '/app/admin/agency-uploads' },
      { label: 'User Management', to: '/app/admin/users' },
    );
  }

  if (user.role === 'agency') {
    items.push(
      { label: 'Upload Candidates', to: '/app/upload' },
      { label: 'Upload History', to: '/app/uploads' },
      { label: 'Browse Jobs', to: '/jobs' },
    );
  }

  items.push(
    { label: 'Settings', to: '/app/settings', divider: true },
  );

  if (user.auth_provider === 'local') {
    items.push({ label: 'Change Password', to: '/app/settings/password' });
  }

  items.push({ label: 'Logout', onClick: onLogout, divider: true, danger: true });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-3 border-l border-naukri-border hover:opacity-90"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="hidden md:inline text-sm text-naukri-muted capitalize">
          {user.role.replace('_', ' ')}
        </span>
        <span className="w-8 h-8 rounded-full bg-naukri-blue/10 text-naukri-blue flex items-center justify-center text-xs font-semibold">
          {initials(user.full_name)}
        </span>
        <span className="hidden sm:inline max-w-[140px] truncate text-sm font-medium text-naukri-text">
          {user.full_name}
        </span>
        <svg
          className={`w-4 h-4 text-naukri-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white border border-naukri-border rounded-lg shadow-lg py-1 z-50"
        >
          <div className="px-4 py-3 border-b border-naukri-border">
            <p className="text-sm font-semibold text-naukri-text truncate">{user.full_name}</p>
            <p className="text-xs text-naukri-muted truncate">{user.email}</p>
          </div>
          {items.map((item) => (
            <div key={item.label}>
              {item.divider && <div className="my-1 border-t border-naukri-border" />}
              {item.to ? (
                <Link
                  to={item.to}
                  role="menuitem"
                  onClick={close}
                  className="block px-4 py-2 text-sm text-naukri-text hover:bg-slate-50"
                >
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
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${
                    item.danger ? 'text-red-600 font-medium' : 'text-naukri-text'
                  }`}
                >
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
