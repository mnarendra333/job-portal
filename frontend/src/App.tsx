import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PublicLayout from '@/components/PublicLayout';
import RoleRoute from '@/components/RoleRoute';
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
import SettingsPage from '@/pages/SettingsPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import AdminCandidatesPage from '@/pages/AdminCandidatesPage';
import AdminAgencyUploadsPage from '@/pages/AdminAgencyUploadsPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import Layout from '@/components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
      </Route>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<RoleRoute roles={['job_seeker']} permissions={['profile:read']}><ProfilePage /></RoleRoute>} />
        <Route path="applications" element={<RoleRoute roles={['job_seeker']} permissions={['applications:read']}><MyApplicationsPage /></RoleRoute>} />
        <Route path="jobs" element={<RoleRoute roles={['recruiter', 'admin']} permissions={['jobs:read']}><MyJobsPage /></RoleRoute>} />
        <Route path="jobs/new" element={<RoleRoute roles={['recruiter']} permissions={['jobs:write']}><JobFormPage /></RoleRoute>} />
        <Route path="jobs/:id/edit" element={<RoleRoute roles={['recruiter', 'admin']} permissions={['jobs:write']}><JobFormPage /></RoleRoute>} />
        <Route path="jobs/:id/applications" element={<RoleRoute roles={['recruiter', 'admin']} permissions={['applications:manage']}><ApplicationsPage /></RoleRoute>} />
        <Route path="upload" element={<RoleRoute roles={['agency']} permissions={['bulk:upload']}><AgencyUploadPage /></RoleRoute>} />
        <Route path="uploads" element={<RoleRoute roles={['agency']} permissions={['bulk:upload']}><BulkHistoryPage /></RoleRoute>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/password" element={<ChangePasswordPage />} />
        <Route path="admin/candidates" element={<RoleRoute roles={['admin']} permissions={['applications:manage']}><AdminCandidatesPage /></RoleRoute>} />
        <Route path="admin/agency-uploads" element={<RoleRoute roles={['admin']} permissions={['dashboard:admin']}><AdminAgencyUploadsPage /></RoleRoute>} />
        <Route path="admin/users" element={<RoleRoute roles={['admin']} permissions={['users:read']}><AdminUsersPage /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
