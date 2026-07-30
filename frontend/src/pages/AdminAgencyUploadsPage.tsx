import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { BulkUploadBatch } from '@/types';

export default function AdminAgencyUploadsPage() {
  const [batches, setBatches] = useState<BulkUploadBatch[]>([]);

  useEffect(() => {
    api.admin.agencyUploads().then(setBatches).catch(() => setBatches([]));
  }, []);

  return (
    <div>
      <Link to="/app" className="text-sm text-naukri-blue hover:underline">← Dashboard</Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">Agency Uploads</h1>
      <p className="text-sm text-naukri-muted mb-6">All bulk resume uploads from agency accounts across every job.</p>

      <div className="grid gap-4">
        {batches.map((b) => (
          <div key={b.id} className="card p-4">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h2 className="font-semibold">{b.job_title || 'Job'}</h2>
                <p className="text-sm text-slate-500">{new Date(b.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-700">{b.success_count}/{b.total_files} succeeded</p>
                {b.failed_count > 0 && <p className="text-xs text-red-600">{b.failed_count} failed</p>}
              </div>
            </div>
            {b.items.length > 0 && (
              <ul className="mt-3 text-xs space-y-1 border-t pt-3">
                {b.items.map((item) => (
                  <li key={item.id} className={item.status === 'success' ? 'text-emerald-700' : 'text-red-600'}>
                    {item.file_name}: {item.status}
                    {item.application_id && (
                      <Link to="/app/admin/candidates" className="ml-2 text-naukri-blue hover:underline">View in candidates →</Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {batches.length === 0 && <p className="text-slate-500">No agency uploads yet.</p>}
      </div>
    </div>
  );
}
