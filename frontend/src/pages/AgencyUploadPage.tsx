import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { BulkUploadBatch, JobListItem } from '@/types';

export default function AgencyUploadPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [jobId, setJobId] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [result, setResult] = useState<BulkUploadBatch | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.jobs.list({ page: 1, page_size: 100 }).then((res) => setJobs(res.items)).catch(() => setJobs([]));
  }, []);

  const submit = async () => {
    if (!jobId || !files?.length) return;
    setError('');
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const batch = await api.jobs.bulkUpload(jobId, fd);
      setResult(batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Upload Candidates</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="card p-6 space-y-4">
        <select className="w-full border rounded-lg px-3 py-2" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">Select a job</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.location}</option>)}
        </select>
        <input type="file" accept=".pdf,.doc,.docx" multiple onChange={(e) => setFiles(e.target.files)} />
        <p className="text-xs text-slate-400">Up to 20 files. PDF, DOC, DOCX only.</p>
        <button type="button" onClick={submit} className="px-4 py-2 bg-violet-700 text-white rounded-lg">Upload</button>
      </div>
      {result && (
        <div className="card p-6 mt-6">
          <h2 className="font-semibold mb-2">Upload results</h2>
          <p className="text-sm mb-4">{result.success_count} succeeded, {result.failed_count} failed</p>
          <ul className="text-sm space-y-1">
            {result.items.map((item) => (
              <li key={item.id} className={item.status === 'success' ? 'text-emerald-700' : 'text-red-600'}>
                {item.file_name}: {item.status}{item.error_message ? ` — ${item.error_message}` : ''}
              </li>
            ))}
          </ul>
          <Link to="/app/uploads" className="text-violet-700 text-sm mt-4 inline-block">View all uploads →</Link>
        </div>
      )}
    </div>
  );
}
