import { Link, useNavigate } from 'react-router-dom';
import UserMenuDropdown from '@/components/UserMenuDropdown';
import { useAuth } from '@/contexts/AuthContext';

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
        <div className="flex items-center gap-6 min-w-0">
          <Link to="/" className="font-bold text-lg text-naukri-text shrink-0 hover:text-naukri-blue">
            JobPortal
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link to="/jobs" className="text-naukri-muted hover:text-naukri-blue">Browse Jobs</Link>
            {user && (
              <Link to="/app" className="text-naukri-muted hover:text-naukri-blue">Dashboard</Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {loading ? (
            <span className="text-sm text-naukri-muted">...</span>
          ) : user ? (
            <UserMenuDropdown user={user} onLogout={handleLogout} />
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
