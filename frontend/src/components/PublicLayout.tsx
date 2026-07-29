import { Outlet } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-naukri-bg">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
