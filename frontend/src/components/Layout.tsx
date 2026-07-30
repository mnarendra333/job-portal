import { Outlet } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import AppSidebar from '@/components/AppSidebar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-naukri-bg">
      <AppHeader />
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex gap-6 flex-col lg:flex-row">
        <AppSidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
