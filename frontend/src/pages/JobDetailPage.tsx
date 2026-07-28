import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { companyInitials, formatExperience, formatPostedAgo, formatSalary } from '@/lib/jobFormat';
import type { Job } from '@/types';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) api.jobs.get(id).then(setJob).catch(() => setJob(null));
  }, [id]);

  const apply = async () => {
    if (!id || !user) { navigate('/login'); return; }
    setError('');
    try {
      const fd = new FormData();
      if (coverLetter) fd.append('cover_letter', coverLetter);
      if (file) fd.append('file', file);
      await api.jobs.apply(id, fd);
      setMessage('Application submitted!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    }
  };

  const bulkUpload = async () => {
    if (!id || !user || !bulkFiles?.length) return;
    setError('');
    try {
      const fd = new FormData();
      Array.from(bulkFiles).forEach((f) => fd.append('files', f));
      const batch = await api.jobs.bulkUpload(id, fd);
      setMessage(`Uploaded ${batch.success_count}/${batch.total_files} resumes successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk upload failed');
    }
  };

  if (!job) return <div className="p-8 text-center text-naukri-muted">Loading job...</div>;

  return (
    <div className="min-h-screen bg-naukri-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/jobs" className="text-sm text-naukri-blue hover:underline">← All jobs</Link>

        <div className="naukri-job-card mt-4">
          <div className="flex justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-naukri-text">{job.title}</h1>
              <p className="naukri-company-name mt-2">{job.organization_name}</p>
            </div>
            <div className="naukri-logo-box">
              <span className="text-xs font-semibold text-naukri-muted">{companyInitials(job.organization_name)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-naukri-text">
            <span>{formatExperience(job.experience_min, job.experience_max)}</span>
            <span>{formatSalary(job.salary_min, job.salary_max, job.salary_visible)}</span>
            <span>{job.location}</span>
            <span className="text-naukri-muted">{formatPostedAgo(job.published_at)}</span>
          </div>

          {job.skills.length > 0 && (
            <p className="mt-4 text-sm text-naukri-skill">{job.skills.join(' ')}</p>
          )}

          <div className="mt-6 pt-4 border-t border-naukri-border">
            <h2 className="text-sm font-semibold text-naukri-text mb-2">Job description</h2>
            <p className="whitespace-pre-wrap text-sm text-naukri-muted leading-relaxed">{job.description}</p>
          </div>
        </div>

        {message && <p className="mt-4 text-emerald-700">{message}</p>}
        {error && <p className="mt-4 text-red-600">{error}</p>}

        {user?.role === 'job_seeker' && (
          <div className="naukri-sidebar-card mt-6">
            <h2 className="font-semibold text-naukri-text mb-3">Apply to this job</h2>
            <textarea
              className="w-full border border-naukri-border rounded-md px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-naukri-blue/30"
              rows={3}
              placeholder="Cover letter (optional)"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
            <input type="file" accept=".pdf,.doc,.docx" className="mb-3 block text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-naukri-muted mb-3">Leave file empty to use your profile resume.</p>
            <button type="button" onClick={apply} className="naukri-btn-primary">Submit Application</button>
          </div>
        )}

        {user?.role === 'agency' && (
          <div className="naukri-sidebar-card mt-6">
            <h2 className="font-semibold text-naukri-text mb-3">Upload candidates (bulk)</h2>
            <input type="file" accept=".pdf,.doc,.docx" multiple className="mb-3 block text-sm" onChange={(e) => setBulkFiles(e.target.files)} />
            <p className="text-xs text-naukri-muted mb-3">Up to 20 PDF/DOC/DOCX files. Each file becomes one application.</p>
            <button type="button" onClick={bulkUpload} className="naukri-btn-primary bg-violet-600 hover:bg-violet-700">Upload Resumes</button>
          </div>
        )}

        {!user && (
          <div className="naukri-sidebar-card mt-6 text-center">
            <p className="mb-3 text-naukri-muted">Sign in to apply or upload candidates.</p>
            <Link to="/login" className="text-naukri-blue font-medium hover:underline">Sign in →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
