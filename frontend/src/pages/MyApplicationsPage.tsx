import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import type { Application } from '@/types';

export default function MyApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    api.applications.mine(page, pageSize)
      .then((res) => {
        setApps(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch(() => {
        setApps([]);
        setTotal(0);
        setTotalPages(0);
      });
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Applications</h1>
      <div className="grid gap-4">
        {apps.map((app) => (
          <div key={app.id} className="card p-4">
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold">{app.job_title}</h2>
                <p className="text-sm text-slate-500">Applied {new Date(app.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-sm capitalize bg-slate-100 px-2 py-1 rounded h-fit">{app.status.replace('_', ' ')}</span>
            </div>
            <Link to={`/jobs/${app.job_id}`} className="text-teal-700 text-sm mt-2 inline-block">View job →</Link>
          </div>
        ))}
        {apps.length === 0 && (
          <p className="text-slate-500">No applications yet. <Link to="/jobs" className="text-teal-700">Browse jobs</Link></p>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} className="mt-6" />
    </div>
  );
}
