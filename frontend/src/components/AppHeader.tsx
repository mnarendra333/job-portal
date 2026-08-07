import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Briefcase, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import UserMenuDropdown from '@/components/UserMenuDropdown';
import { useAuth } from '@/contexts/AuthContext';

function FindJobsLink() {
  return (
    <a
      href="/#jobs"
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm hover:from-teal-700 hover:to-emerald-700 transition-all"
    >
      <Briefcase className="w-4 h-4" strokeWidth={2.25} />
      Find Jobs
    </a>
  );
}

function NavLinkItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-slate-100 text-naukri-blue font-medium' : 'text-naukri-muted hover:text-naukri-blue hover:bg-slate-50'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppHeader() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-naukri-border sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-naukri-text shrink-0 hover:text-naukri-blue transition-colors">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-blue-600 flex items-center justify-center text-white text-sm">JP</span>
            <span className="hidden xs:inline">JobPortal</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            <FindJobsLink />
            {user && (
              <NavLinkItem to="/app">
                <LayoutDashboard className="w-4 h-4" strokeWidth={2} />
                Dashboard
              </NavLinkItem>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {loading ? (
            <span className="text-sm text-naukri-muted animate-pulse">Loading…</span>
          ) : user ? (
            <UserMenuDropdown user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-naukri-muted hover:text-naukri-blue px-2 py-1">
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
              <Link to="/register" className="inline-flex items-center gap-1.5 naukri-btn-primary py-1.5 px-4 text-sm">
                <UserPlus className="w-4 h-4" />
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
