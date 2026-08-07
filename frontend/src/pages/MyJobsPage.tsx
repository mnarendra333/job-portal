import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { Job } from '@/types';

function JobSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
      <div className="h-4 bg-slate-100 rounded w-1/4" />
    </div>
  );
}

export default function MyJobsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 15;
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.jobs.mine(page, pageSize)
      .then((res) => {
        setJobs(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch((err) => {
        setJobs([]);
        setTotal(0);
        setTotalPages(0);
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const setStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.jobs.updateStatus(id, status);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{isAdmin ? 'All Jobs' : 'My Jobs'}</h1>
        {!isAdmin && (
          <Link to="/app/jobs/new" className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm">+ New Job</Link>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((n) => <JobSkeleton key={n} />)}
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold">{job.title}</h2>
                  <p className="text-sm text-slate-500">{job.location} · {job.status}</p>
                  {isAdmin && job.organization_name && (
                    <p className="text-xs text-violet-600 mt-1">{job.organization_name}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{job.application_count} applications</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!isAdmin && job.status === 'draft' && (
                    <button
                      type="button"
                      disabled={updatingId === job.id}
                      onClick={() => setStatus(job.id, 'published')}
                      className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 rounded disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                  {!isAdmin && job.status === 'published' && (
                    <button
                      type="button"
                      disabled={updatingId === job.id}
                      onClick={() => setStatus(job.id, 'closed')}
                      className="text-xs px-2 py-1 bg-slate-100 rounded disabled:opacity-50"
                    >
                      Close
                    </button>
                  )}
                  {!isAdmin && (
                    <Link to={`/app/jobs/${job.id}/edit`} className="text-xs px-2 py-1 border rounded">Edit</Link>
                  )}
                  <Link to={`/app/jobs/${job.id}/applications`} className="text-xs px-2 py-1 bg-teal-50 text-teal-800 rounded">Applications</Link>
                </div>
              </div>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-slate-500">No jobs found.</p>}
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} className="mt-4" />
        </div>
      )}
    </div>
  );
}
