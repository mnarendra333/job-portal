import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AppHeader() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardPath = user ? '/app' : '/login';

  return (
    <header className="bg-white border-b border-naukri-border sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link to="/" className="font-bold text-lg text-naukri-text shrink-0 hover:text-naukri-blue">
            JobPortal
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link to="/jobs" className="text-naukri-muted hover:text-naukri-blue">Browse Jobs</Link>
            {user && (
              <Link to={dashboardPath} className="text-naukri-muted hover:text-naukri-blue">Dashboard</Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {loading ? (
            <span className="text-sm text-naukri-muted">...</span>
          ) : user ? (
            <>
              <Link
                to={dashboardPath}
                className="hidden md:inline text-sm text-naukri-muted hover:text-naukri-blue"
              >
                {user.role.replace('_', ' ')}
              </Link>
              <div className="flex items-center gap-2 pl-3 border-l border-naukri-border">
                <span
                  className="inline-flex items-center gap-2 text-sm font-medium text-naukri-text"
                  title={user.email}
                >
                  <span className="w-8 h-8 rounded-full bg-naukri-blue/10 text-naukri-blue flex items-center justify-center text-xs font-semibold">
                    {user.full_name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <span className="hidden sm:inline max-w-[140px] truncate">{user.full_name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/'); }}
                  className="text-sm text-red-600 hover:text-red-800 font-medium ml-1"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-naukri-muted hover:text-naukri-blue">Sign in</Link>
              <Link to="/register" className="naukri-btn-primary py-1.5 px-4 text-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
