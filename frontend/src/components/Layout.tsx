import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = () => {
    if (!user) return [];
    switch (user.role) {
      case 'recruiter':
      case 'admin':
        return [
          { to: '/app', label: 'Dashboard' },
          { to: '/app/jobs', label: 'My Jobs' },
          { to: '/jobs', label: 'Public Board' },
        ];
      case 'job_seeker':
        return [
          { to: '/app', label: 'Dashboard' },
          { to: '/app/profile', label: 'Profile' },
          { to: '/app/applications', label: 'My Applications' },
          { to: '/jobs', label: 'Browse Jobs' },
        ];
      case 'agency':
        return [
          { to: '/app', label: 'Dashboard' },
          { to: '/app/upload', label: 'Upload Candidates' },
          { to: '/app/uploads', label: 'Upload History' },
          { to: '/jobs', label: 'Browse Jobs' },
        ];
      default:
        return [{ to: '/app', label: 'Dashboard' }];
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-teal-700">JobPortal</Link>
          <nav className="flex items-center gap-4 text-sm">
            {navItems().map((item) => (
              <Link key={item.to} to={item.to} className="text-slate-600 hover:text-teal-700">{item.label}</Link>
            ))}
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">{user?.full_name}</span>
            <button
              type="button"
              onClick={() => { logout(); navigate('/'); }}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
