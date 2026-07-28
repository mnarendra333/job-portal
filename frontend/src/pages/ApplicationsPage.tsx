import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Application } from '@/types';

const STATUSES = ['applied', 'under_review', 'shortlisted', 'rejected', 'selected'];

export default function ApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'direct' | 'agency'>('all');

  const load = () => {
    if (id) api.jobs.applications(id).then(setApps).catch(() => setApps([]));
  };
  useEffect(() => { load(); }, [id]);

  const updateStatus = async (appId: string, status: string) => {
    await api.applications.updateStatus(appId, status);
    load();
  };

  const filtered = apps.filter((a) => filter === 'all' || a.application_source === filter);

  return (
    <div>
      <Link to="/app/jobs" className="text-teal-700 text-sm">← My Jobs</Link>
      <h1 className="text-2xl font-bold mt-4 mb-4">Applications</h1>
      <div className="flex gap-2 mb-4">
        {(['all', 'direct', 'agency'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-teal-700 text-white' : 'bg-slate-100'}`}>{f}</button>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Candidate</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Resume</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-3">
                  <div>{app.applicant_name || '—'}</div>
                  <div className="text-xs text-slate-400">{app.applicant_email}</div>
                  {app.agency_name && <div className="text-xs text-violet-600">via {app.agency_name}</div>}
                </td>
                <td className="p-3">
                  <span className={app.application_source === 'direct' ? 'badge-direct' : 'badge-agency'}>
                    {app.application_source}
                  </span>
                </td>
                <td className="p-3">{app.resume_file_name}</td>
                <td className="p-3">
                  <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className="text-teal-700 text-xs"
                    onClick={async () => {
                      const token = localStorage.getItem('access_token');
                      const res = await fetch(api.applications.downloadUrl(app.id), {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = app.resume_file_name || 'resume';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-slate-500">No applications yet.</p>}
      </div>
    </div>
  );
}
