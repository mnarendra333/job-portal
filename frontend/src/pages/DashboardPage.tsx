import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { AdminDashboard, AgencyDashboard, RecruiterDashboard, SeekerDashboard } from '@/types';

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
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [recruiter, setRecruiter] = useState<RecruiterDashboard | null>(null);
  const [seeker, setSeeker] = useState<SeekerDashboard | null>(null);
  const [agency, setAgency] = useState<AgencyDashboard | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') api.dashboard.admin().then(setAdmin).catch(() => {});
    if (user.role === 'recruiter') api.dashboard.recruiter().then(setRecruiter).catch(() => {});
    if (user.role === 'job_seeker') api.dashboard.seeker().then(setSeeker).catch(() => {});
    if (user.role === 'agency') api.dashboard.agency().then(setAgency).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Welcome, {user.full_name}</h1>
      <p className="text-slate-500 mb-6 capitalize">{user.role.replace('_', ' ')} · {user.organization_name || user.email}</p>

      {user.role === 'admin' && admin && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total Jobs" value={admin.total_jobs} color="border-blue-500" />
            <StatCard label="Published" value={admin.published_jobs} color="border-emerald-500" />
            <StatCard label="All Applications" value={admin.total_applications} color="border-violet-500" />
            <StatCard label="Agency Applications" value={admin.agency_applications} color="border-amber-500" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Recruiters" value={admin.total_recruiters} color="border-teal-500" />
            <StatCard label="Agencies" value={admin.total_agencies} color="border-indigo-500" />
            <StatCard label="Job Seekers" value={admin.total_seekers} color="border-pink-500" />
            <StatCard label="Agency Upload Batches" value={admin.total_agency_batches} color="border-orange-500" />
          </div>
          {Object.keys(admin.by_status).length > 0 && (
            <div className="card p-4 mb-6">
              <h2 className="font-semibold mb-3">Application pipeline</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(admin.by_status).map(([s, n]) => (
                  <span key={s} className="text-sm bg-slate-100 px-3 py-1 rounded capitalize">{s.replace('_', ' ')}: {n}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link to="/app/admin/candidates" className="px-4 py-2 bg-teal-700 text-white rounded-lg">All Candidates</Link>
            <Link to="/app/jobs" className="px-4 py-2 border rounded-lg">All Jobs</Link>
            <Link to="/app/admin/agency-uploads" className="px-4 py-2 border rounded-lg">Agency Uploads</Link>
            <Link to="/app/admin/users" className="px-4 py-2 border rounded-lg">User Management</Link>
          </div>
          {admin.recent_agency_uploads.length > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Recent agency uploads</h2>
              {admin.recent_agency_uploads.map((b) => (
                <div key={b.id} className="text-sm py-2 border-b last:border-0 flex justify-between">
                  <span>{b.job_title}</span>
                  <span className="text-emerald-700">{b.success_count}/{b.total_files} OK</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {user.role === 'recruiter' && recruiter && (
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
            <StatCard label="Recommended for you" value={seeker.recommended_count ?? 0} color="border-violet-500" />
          </div>
          <div className="flex gap-3">
            <Link to="/jobs?tab=recommended" className="px-4 py-2 bg-teal-700 text-white rounded-lg">Recommended Jobs</Link>
            <Link to="/app/applications" className="px-4 py-2 border rounded-lg">My Applications</Link>
            <Link to="/app/profile" className="px-4 py-2 border rounded-lg">Edit Profile</Link>
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
