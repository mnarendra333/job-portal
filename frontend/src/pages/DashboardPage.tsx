import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Building2,
  FileText,
  PlusCircle,
  Sparkles,
  Upload,
  UserCog,
  Users,
} from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { AdminDashboard, AgencyDashboard, RecruiterDashboard, SeekerDashboard } from '@/types';

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon?: LucideIcon }) {
  return (
    <div className={`card p-4 border-l-4 ${color} flex items-start justify-between gap-2`}>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
      {Icon && <Icon className="w-8 h-8 text-slate-200 shrink-0" strokeWidth={1.5} />}
    </div>
  );
}

function ActionLink({ to, children, primary }: { to: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        primary
          ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-sm'
          : 'border border-naukri-border text-naukri-text hover:bg-slate-50'
      }`}
    >
      {children}
    </Link>
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
      <div className="flex items-center gap-4 mb-6">
        <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.full_name}</h1>
          <p className="text-slate-500 capitalize">{user.role.replace('_', ' ')} · {user.organization_name || user.email}</p>
        </div>
      </div>

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
            <ActionLink to="/app/admin/candidates" primary><Users className="w-4 h-4" /> All Candidates</ActionLink>
            <ActionLink to="/app/jobs"><Briefcase className="w-4 h-4" /> All Jobs</ActionLink>
            <ActionLink to="/app/admin/agency-uploads"><Building2 className="w-4 h-4" /> Agency Uploads</ActionLink>
            <ActionLink to="/app/admin/users"><UserCog className="w-4 h-4" /> User Management</ActionLink>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total Jobs" value={recruiter.total_jobs} color="border-blue-500" />
            <StatCard label="Published" value={recruiter.published_jobs} color="border-emerald-500" />
            <StatCard label="Draft" value={recruiter.draft_jobs ?? 0} color="border-amber-500" />
            <StatCard label="Closed" value={recruiter.closed_jobs ?? 0} color="border-slate-400" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Applications" value={recruiter.total_applications} color="border-violet-500" />
            <StatCard label="Direct Applications" value={recruiter.direct_applications} color="border-teal-500" />
            <StatCard label="Agency Applications" value={recruiter.agency_applications} color="border-indigo-500" />
          </div>
          {Object.keys(recruiter.by_status).length > 0 && (
            <div className="card p-4 mb-6">
              <h2 className="font-semibold mb-3">Application pipeline</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(recruiter.by_status).map(([s, n]) => (
                  <span key={s} className="text-sm bg-slate-100 px-3 py-1 rounded capitalize">{s.replace(/_/g, ' ')}: {n}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 mb-6">
            <ActionLink to="/app/jobs/new" primary><PlusCircle className="w-4 h-4" /> Post New Job</ActionLink>
            <ActionLink to="/app/jobs"><Briefcase className="w-4 h-4" /> Manage Jobs</ActionLink>
            <ActionLink to="/jobs"><Sparkles className="w-4 h-4" /> Find Jobs</ActionLink>
          </div>
          {(recruiter.recent_applications?.length ?? 0) > 0 && (
            <div className="card p-4">
              <h2 className="font-semibold mb-3">Recent applications</h2>
              {recruiter.recent_applications!.map((a) => (
                <div key={a.id} className="text-sm py-2 border-b last:border-0 flex justify-between gap-4">
                  <span>{a.applicant_name ?? 'Candidate'} · {a.job_title}</span>
                  <span className="text-slate-500 capitalize shrink-0">{a.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {user.role === 'job_seeker' && seeker && (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Applications" value={seeker.applied_count} color="border-teal-500" />
            <StatCard label="Recommended for you" value={seeker.recommended_count ?? 0} color="border-violet-500" />
          </div>
          <div className="flex gap-3">
            <ActionLink to="/jobs?tab=recommended" primary><Sparkles className="w-4 h-4" /> Recommended Jobs</ActionLink>
            <ActionLink to="/app/applications"><FileText className="w-4 h-4" /> My Applications</ActionLink>
            <ActionLink to="/app/profile"><Users className="w-4 h-4" /> Edit Profile</ActionLink>
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
            <ActionLink to="/app/upload" primary><Upload className="w-4 h-4" /> Upload Candidates</ActionLink>
            <ActionLink to="/jobs"><Briefcase className="w-4 h-4" /> Browse Jobs</ActionLink>
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
