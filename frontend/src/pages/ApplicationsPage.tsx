import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { downloadResume, downloadResumes } from '@/lib/downloadResume';
import type { Application } from '@/types';

const STATUSES = ['applied', 'under_review', 'shortlisted', 'rejected', 'selected'];

export default function ApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'direct' | 'agency'>('all');
  const [keyword, setKeyword] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [education, setEducation] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    if (id) api.jobs.applications(id).then(setApps).catch(() => setApps([]));
  };
  useEffect(() => { load(); }, [id]);

  const updateStatus = async (appId: string, status: string) => {
    await api.applications.updateStatus(appId, status);
    load();
  };

  const filtered = useMemo(() => apps.filter((a) => {
    if (filter !== 'all' && a.application_source !== filter) return false;
    if (keyword) {
      const q = keyword.toLowerCase();
      const hay = `${a.applicant_name ?? ''} ${a.applicant_email ?? ''} ${a.resume_file_name ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (noticePeriod && a.applicant_notice_period !== noticePeriod) return false;
    if (education && a.applicant_education !== education) return false;
    return true;
  }), [apps, filter, keyword, noticePeriod, education]);

  const toggle = (appId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const bulkStatus = async (status: string) => {
    if (selected.size === 0) return;
    await api.applications.bulkUpdateStatus([...selected], status);
    setSelected(new Set());
    load();
  };

  return (
    <div>
      <Link to="/app/jobs" className="text-teal-700 text-sm">← My Jobs</Link>
      <h1 className="text-2xl font-bold mt-4 mb-4">Applications</h1>

      <div className="card p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Search candidate, email..."
          className="border rounded-lg px-3 py-2 text-sm"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select className="border rounded-lg px-3 py-2 text-sm" value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)}>
          <option value="">Any notice period</option>
          {['Immediate', '15 days', '30 days', '60 days', '90 days'].map((np) => (
            <option key={np} value={np}>{np}</option>
          ))}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={education} onChange={(e) => setEducation(e.target.value)}>
          <option value="">Any education</option>
          {["Bachelor's Degree", "Master's Degree", "MBA", "B.Tech", "M.Tech", "BCA", "MCA", "PhD", "Diploma"].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <button
          type="button"
          className="text-sm border rounded-lg px-3 py-2 hover:bg-slate-50"
          onClick={() => { setKeyword(''); setNoticePeriod(''); setEducation(''); }}
        >
          Clear filters
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'direct', 'agency'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-teal-700 text-white' : 'bg-slate-100'}`}>{f}</button>
        ))}
        <button type="button" disabled={selected.size === 0} onClick={() => bulkStatus('shortlisted')} className="text-sm border rounded-lg px-3 py-1 disabled:opacity-40 ml-auto">Shortlist</button>
        <button type="button" disabled={selected.size === 0} onClick={() => bulkStatus('rejected')} className="text-sm border rounded-lg px-3 py-1 disabled:opacity-40">Reject</button>
        <button type="button" disabled={selected.size === 0} onClick={() => downloadResumes([...selected], filtered)} className="text-sm border rounded-lg px-3 py-1 disabled:opacity-40">Download selected</button>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 w-8" />
              <th className="text-left p-3">Candidate</th>
              <th className="text-left p-3">Education</th>
              <th className="text-left p-3">Notice</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Resume</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3 whitespace-nowrap min-w-[9.5rem] pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggle(app.id)} />
                </td>
                <td className="p-3">
                  <div>{app.applicant_name || '—'}</div>
                  <div className="text-xs text-slate-400">{app.applicant_email}</div>
                  {app.agency_name && <div className="text-xs text-violet-600">via {app.agency_name}</div>}
                </td>
                <td className="p-3 text-xs">{app.applicant_education || '—'}</td>
                <td className="p-3 text-xs">{app.applicant_notice_period || '—'}</td>
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
                <td className="p-3 whitespace-nowrap min-w-[9.5rem] pr-4">
                  <button
                    type="button"
                    className="text-teal-700 text-xs font-medium whitespace-nowrap hover:underline"
                    onClick={() => downloadResume(app.id, app.resume_file_name || 'resume')}
                  >
                    Download Resume
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && <p className="p-4 text-slate-500">No applications match your filters.</p>}
      </div>
    </div>
  );
}
