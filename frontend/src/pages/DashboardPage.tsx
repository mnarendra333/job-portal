import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { AgencyDashboard, RecruiterDashboard, SeekerDashboard } from '@/types';

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`card p-4 border-l-4 ${color}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [recruiter, setRecruiter] = useState<RecruiterDashboard | null>(null);
  const [seeker, setSeeker] = useState<SeekerDashboard | null>(null);
  const [agency, setAgency] = useState<AgencyDashboard | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'recruiter' || user.role === 'admin') api.dashboard.recruiter().then(setRecruiter).catch(() => {});
    if (user.role === 'job_seeker') api.dashboard.seeker().then(setSeeker).catch(() => {});
    if (user.role === 'agency') api.dashboard.agency().then(setAgency).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Welcome, {user.full_name}</h1>
      <p className="text-slate-500 mb-6 capitalize">{user.role.replace('_', ' ')} · {user.organization_name || user.email}</p>

      {(user.role === 'recruiter' || user.role === 'admin') && recruiter && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Jobs" value={recruiter.total_jobs} color="border-blue-500" />
            <StatCard label="Published" value={recruiter.published_jobs} color="border-emerald-500" />
            <StatCard label="Applications" value={recruiter.total_applications} color="border-violet-500" />
            <StatCard label="Agency Uploads" value={recruiter.agency_applications} color="border-amber-500" />
          </div>
          <div className="flex gap-3">
            <Link to="/app/jobs/new" className="px-4 py-2 bg-teal-700 text-white rounded-lg">Post New Job</Link>
            <Link to="/app/jobs" className="px-4 py-2 border rounded-lg">Manage Jobs</Link>
          </div>
        </>
      )}

      {user.role === 'job_seeker' && seeker && (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Applications" value={seeker.applied_count} color="border-teal-500" />
          </div>
          <div className="flex gap-3">
            <Link to="/jobs" className="px-4 py-2 bg-teal-700 text-white rounded-lg">Browse Jobs</Link>
            <Link to="/app/applications" className="px-4 py-2 border rounded-lg">My Applications</Link>
          </div>
        </>
      )}

      {user.role === 'agency' && agency && (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Resumes Uploaded" value={agency.total_uploads} color="border-violet-500" />
            <StatCard label="Upload Batches" value={agency.total_batches} color="border-blue-500" />
          </div>
          <div className="flex gap-3 mb-6">
            <Link to="/app/upload" className="px-4 py-2 bg-violet-700 text-white rounded-lg">Upload Candidates</Link>
            <Link to="/jobs" className="px-4 py-2 border rounded-lg">Browse Jobs</Link>
          </div>
          {agency.recent_batches.length > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Recent uploads</h2>
              {agency.recent_batches.map((b) => (
                <div key={b.id} className="text-sm py-2 border-b last:border-0">
                  {b.job_title}: {b.success_count}/{b.total_files} succeeded
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
