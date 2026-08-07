import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { downloadResume, downloadResumes } from '@/lib/downloadResume';
import type { Application } from '@/types';

const STATUSES = ['applied', 'under_review', 'shortlisted', 'rejected', 'selected'];

export default function AdminCandidatesPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [location, setLocation] = useState('');
  const [education, setEducation] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [skill, setSkill] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 25;
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.admin.applications({
      keyword: keyword || undefined,
      status: status || undefined,
      source: source || undefined,
      location: location || undefined,
      education: education || undefined,
      notice_period: noticePeriod || undefined,
      min_experience: minExperience ? parseFloat(minExperience) : undefined,
      skill: skill || undefined,
      page,
      page_size: pageSize,
    })
      .then((res) => {
        setApps(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch((err) => {
        setApps([]);
        setTotal(0);
        setTotalPages(0);
        setError(err instanceof Error ? err.message : 'Failed to load candidates');
      })
      .finally(() => setLoading(false));
  }, [keyword, status, source, location, education, noticePeriod, minExperience, skill, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkStatus = async (newStatus: string) => {
    if (selected.size === 0) return;
    setMessage('');
    try {
      await api.applications.bulkUpdateStatus([...selected], newStatus);
      setMessage(`Updated ${selected.size} candidate(s) to ${newStatus.replace('_', ' ')}`);
      setSelected(new Set());
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bulk update failed');
    }
  };

  const bulkDownload = async () => {
    if (selected.size === 0) return;
    try {
      await downloadResumes([...selected], apps);
      setMessage(`Downloaded ${selected.size} resume(s)`);
    } catch {
      setMessage('Some downloads failed');
    }
  };

  const applyFilters = () => {
    if (page === 1) load();
    else setPage(1);
  };

  return (
    <div>
      <Link to="/app" className="text-sm text-naukri-blue hover:underline">← Dashboard</Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">All Candidates</h1>
      <p className="text-sm text-naukri-muted mb-6">Screen, filter, and manage every application including agency uploads.</p>

      {message && <p className="text-sm text-emerald-700 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="card p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input placeholder="Search name, email, job..." className="border rounded-lg px-3 py-2 text-sm" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Any source</option>
          <option value="direct">Direct</option>
          <option value="agency">Agency</option>
        </select>
        <input placeholder="Job location" className="border rounded-lg px-3 py-2 text-sm" value={location} onChange={(e) => setLocation(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={education} onChange={(e) => setEducation(e.target.value)}>
          <option value="">Any education</option>
          {["Bachelor's Degree", "Master's Degree", "MBA", "B.Tech", "M.Tech", "BCA", "MCA", "PhD", "Diploma"].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)}>
          <option value="">Any notice period</option>
          {['Immediate', '15 days', '30 days', '60 days', '90 days'].map((np) => (
            <option key={np} value={np}>{np}</option>
          ))}
        </select>
        <input placeholder="Min experience (yrs)" type="number" className="border rounded-lg px-3 py-2 text-sm" value={minExperience} onChange={(e) => setMinExperience(e.target.value)} />
        <input placeholder="Skill" className="border rounded-lg px-3 py-2 text-sm" value={skill} onChange={(e) => setSkill(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" onClick={applyFilters} className="naukri-btn-primary text-sm py-1.5 px-4">Apply filters</button>
        <button type="button" disabled={selected.size === 0} onClick={() => bulkStatus('shortlisted')} className="text-sm border rounded-lg px-3 py-1.5 disabled:opacity-40">Shortlist selected</button>
        <button type="button" disabled={selected.size === 0} onClick={() => bulkStatus('rejected')} className="text-sm border rounded-lg px-3 py-1.5 disabled:opacity-40">Reject selected</button>
        <button type="button" disabled={selected.size === 0} onClick={() => bulkStatus('under_review')} className="text-sm border rounded-lg px-3 py-1.5 disabled:opacity-40">Move to review</button>
        <button type="button" disabled={selected.size === 0} onClick={bulkDownload} className="text-sm border rounded-lg px-3 py-1.5 disabled:opacity-40">Download selected</button>
        <span className="text-sm text-naukri-muted self-center ml-auto">{total} candidates · {selected.size} selected</span>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-naukri-muted">Loading candidates...</p>
        ) : (
          <table className="w-full text-xs sm:text-sm table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-[24%]" />
              <col className="w-[26%]" />
              <col className="w-[10%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2" />
                <th className="text-left p-2 font-medium">Candidate</th>
                <th className="text-left p-2 font-medium">Job</th>
                <th className="text-left p-2 font-medium">Source</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-left p-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-t align-top">
                  <td className="p-2">
                    <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggle(app.id)} />
                  </td>
                  <td className="p-2">
                    <div className="font-medium truncate">{app.applicant_name || '—'}</div>
                    <div className="text-xs text-slate-400 truncate">{app.applicant_email}</div>
                    {app.applicant_education && <div className="text-xs text-slate-500 truncate">{app.applicant_education}</div>}
                    {app.agency_name && <div className="text-xs text-violet-600 truncate">via {app.agency_name}</div>}
                  </td>
                  <td className="p-2">
                    <div className="truncate">{app.job_title}</div>
                    <div className="text-xs text-slate-400 truncate">{app.organization_name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {[app.job_location, app.applicant_experience_years != null ? `${app.applicant_experience_years} yrs` : null].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="p-2">
                    <span className={app.application_source === 'direct' ? 'badge-direct' : 'badge-agency'}>{app.application_source}</span>
                  </td>
                  <td className="p-2">
                    <select
                      value={app.status}
                      onChange={async (e) => {
                        await api.applications.updateStatus(app.id, e.target.value);
                        load();
                      }}
                      className="border rounded px-1.5 py-1 text-xs w-full max-w-[8.5rem]"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-teal-700 text-xs font-medium hover:underline whitespace-nowrap"
                      title="Download resume"
                      onClick={() => downloadResume(app.id, app.resume_file_name || 'resume').catch(() => setMessage('Download failed'))}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && apps.length === 0 && <p className="p-6 text-slate-500">No candidates match your filters.</p>}
        {!loading && (
          <div className="p-4 border-t">
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
