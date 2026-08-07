import { useEffect, useState } from 'react';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import type { BulkUploadBatch } from '@/types';

export default function BulkHistoryPage() {
  const [batches, setBatches] = useState<BulkUploadBatch[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    api.bulkUploads.mine(page, pageSize)
      .then((res) => {
        setBatches(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch(() => {
        setBatches([]);
        setTotal(0);
        setTotalPages(0);
      });
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Upload History</h1>
      <div className="grid gap-4">
        {batches.map((b) => (
          <div key={b.id} className="card p-4">
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold">{b.job_title}</h2>
                <p className="text-sm text-slate-500">{new Date(b.created_at).toLocaleString()}</p>
              </div>
              <span className="text-sm">{b.success_count}/{b.total_files} OK</span>
            </div>
            {b.failed_count > 0 && (
              <ul className="mt-2 text-xs text-red-600">
                {b.items.filter((i) => i.status === 'failed').map((i) => (
                  <li key={i.id}>{i.file_name}: {i.error_message}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {batches.length === 0 && <p className="text-slate-500">No uploads yet.</p>}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} className="mt-6" />
    </div>
  );
}
