import { Link, Outlet, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-naukri-bg">
      <AppHeader />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-naukri-border py-3 text-center text-xs text-naukri-muted">
        <Link to="/" className="hover:text-naukri-blue">← Back to home</Link>
        {' · '}
        <Link to="/jobs" className="hover:text-naukri-blue">Browse jobs</Link>
        {' · '}
        <button type="button" className="hover:text-naukri-blue" onClick={() => navigate('/app')}>
          Dashboard
        </button>
      </footer>
    </div>
  );
}
