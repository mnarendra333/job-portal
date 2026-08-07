import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { downloadBulkZip } from '@/lib/downloadResume';
import type { BulkUploadBatch } from '@/types';

type AgencyGroup = {
  key: string;
  agencyName: string;
  orgId?: string;
  batches: BulkUploadBatch[];
  successCount: number;
};

function groupByAgency(batches: BulkUploadBatch[]): AgencyGroup[] {
  const map = new Map<string, AgencyGroup>();
  for (const batch of batches) {
    const key = batch.agency_organization_id || batch.uploaded_by || batch.id;
    const agencyName = batch.agency_name || batch.uploaded_by_name || 'Unknown agency';
    const existing = map.get(key);
    if (existing) {
      existing.batches.push(batch);
      existing.successCount += batch.success_count;
    } else {
      map.set(key, {
        key,
        agencyName,
        orgId: batch.agency_organization_id,
        batches: [batch],
        successCount: batch.success_count,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.agencyName.localeCompare(b.agencyName));
}

export default function AdminAgencyUploadsPage() {
  const [batches, setBatches] = useState<BulkUploadBatch[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .agencyUploads(page, pageSize)
      .then((res) => {
        setBatches(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch(() => {
        setBatches([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const agencyGroups = useMemo(() => groupByAgency(batches), [batches]);

  async function handleDownload(key: string, path: string, filename: string) {
    setDownloading(key);
    try {
      await downloadBulkZip(path, filename);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <Link to="/app" className="text-sm text-naukri-blue hover:underline">
        ← Dashboard
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Agency Uploads</h1>
          <p className="text-sm text-naukri-muted">
            All bulk resume uploads from agency accounts across every job.
          </p>
        </div>
        {total > 0 && (
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() =>
              handleDownload('all', api.admin.downloadAllAgencyResumesUrl(), 'all_agency_resumes.zip')
            }
            className="inline-flex items-center gap-2 rounded-lg bg-naukri-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download All
          </button>
        )}
      </div>

      {loading && <p className="text-slate-500">Loading uploads…</p>}

      {!loading && total === 0 && (
        <p className="text-slate-500">No agency uploads yet.</p>
      )}

      <div className="space-y-8">
        {agencyGroups.map((group) => (
          <section key={group.key} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{group.agencyName}</h2>
                <p className="text-sm text-slate-500">
                  {group.batches.length} upload{group.batches.length === 1 ? '' : 's'} ·{' '}
                  {group.successCount} resume{group.successCount === 1 ? '' : 's'}
                </p>
              </div>
              {group.orgId && group.successCount > 0 && (
                <button
                  type="button"
                  disabled={downloading !== null}
                  onClick={() =>
                    handleDownload(
                      `agency-${group.key}`,
                      api.admin.downloadAgencyResumesUrl(group.orgId!),
                      `${group.agencyName.replace(/\s+/g, '_')}_resumes.zip`,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-naukri-blue px-3 py-1.5 text-sm font-medium text-naukri-blue hover:bg-blue-50 disabled:opacity-50"
                >
                  {downloading === `agency-${group.key}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download Agency
                </button>
              )}
            </div>

            <div className="grid gap-4">
              {group.batches.map((b) => (
                <div key={b.id} className="card p-4">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                        {b.agency_name || b.uploaded_by_name || 'Unknown agency'}
                        {b.uploaded_by_name && b.agency_name ? ` · ${b.uploaded_by_name}` : ''}
                      </p>
                      <h3 className="font-semibold mt-1">{b.job_title || 'Job'}</h3>
                      <p className="text-sm text-slate-500">{new Date(b.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-700">
                          {b.success_count}/{b.total_files} succeeded
                        </p>
                        {b.failed_count > 0 && (
                          <p className="text-xs text-red-600">{b.failed_count} failed</p>
                        )}
                      </div>
                      {b.success_count > 0 && (
                        <button
                          type="button"
                          disabled={downloading !== null}
                          onClick={() =>
                            handleDownload(
                              `batch-${b.id}`,
                              api.admin.downloadBatchResumesUrl(b.id),
                              `${(b.job_title || 'batch').replace(/\s+/g, '_')}_resumes.zip`,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {downloading === `batch-${b.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download batch
                        </button>
                      )}
                    </div>
                  </div>
                  {b.items.length > 0 && (
                    <ul className="mt-3 text-xs space-y-1 border-t pt-3">
                      {b.items.map((item) => (
                        <li
                          key={item.id}
                          className={item.status === 'success' ? 'text-emerald-700' : 'text-red-600'}
                        >
                          {item.file_name}: {item.status}
                          {item.application_id && (
                            <Link
                              to="/app/admin/candidates"
                              className="ml-2 text-naukri-blue hover:underline"
                            >
                              View in candidates →
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} className="mt-8" />
      )}
    </div>
  );
}
