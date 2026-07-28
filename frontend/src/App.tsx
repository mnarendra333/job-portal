import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';
import JobsPage from '@/pages/JobsPage';
import JobDetailPage from '@/pages/JobDetailPage';
import DashboardPage from '@/pages/DashboardPage';
import MyJobsPage from '@/pages/MyJobsPage';
import JobFormPage from '@/pages/JobFormPage';
import ApplicationsPage from '@/pages/ApplicationsPage';
import ProfilePage from '@/pages/ProfilePage';
import MyApplicationsPage from '@/pages/MyApplicationsPage';
import AgencyUploadPage from '@/pages/AgencyUploadPage';
import BulkHistoryPage from '@/pages/BulkHistoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="jobs" element={<MyJobsPage />} />
        <Route path="jobs/new" element={<JobFormPage />} />
        <Route path="jobs/:id/edit" element={<JobFormPage />} />
        <Route path="jobs/:id/applications" element={<ApplicationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="applications" element={<MyApplicationsPage />} />
        <Route path="upload" element={<AgencyUploadPage />} />
        <Route path="uploads" element={<BulkHistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
