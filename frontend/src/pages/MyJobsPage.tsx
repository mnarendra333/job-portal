import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Job } from '@/types';

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  const load = () => api.jobs.mine().then(setJobs).catch(() => setJobs([]));
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await api.jobs.updateStatus(id, status);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <Link to="/app/jobs/new" className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm">+ New Job</Link>
      </div>
      <div className="grid gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold">{job.title}</h2>
                <p className="text-sm text-slate-500">{job.location} · {job.status}</p>
                <p className="text-xs text-slate-400 mt-1">{job.application_count} applications</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {job.status === 'draft' && (
                  <button type="button" onClick={() => setStatus(job.id, 'published')} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 rounded">Publish</button>
                )}
                {job.status === 'published' && (
                  <button type="button" onClick={() => setStatus(job.id, 'closed')} className="text-xs px-2 py-1 bg-slate-100 rounded">Close</button>
                )}
                <Link to={`/app/jobs/${job.id}/edit`} className="text-xs px-2 py-1 border rounded">Edit</Link>
                <Link to={`/app/jobs/${job.id}/applications`} className="text-xs px-2 py-1 bg-teal-50 text-teal-800 rounded">Applications</Link>
              </div>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-slate-500">No jobs yet. Create your first job posting.</p>}
      </div>
    </div>
  );
}
