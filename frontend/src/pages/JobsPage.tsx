import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import JobCard from '@/components/jobs/JobCard';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { JobListItem } from '@/types';

type TabId = 'profile' | 'might_like' | 'preferences';

const MAX_SELECT = 5;
const HIDDEN_KEY = 'job_portal_hidden_jobs';
const SAVED_KEY = 'job_portal_saved_jobs';

function loadIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveIds(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...ids]));
}

export default function JobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('profile');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(() => loadIds(HIDDEN_KEY));
  const [saved, setSaved] = useState<Set<string>>(() => loadIds(SAVED_KEY));

  const isSeeker = user?.role === 'job_seeker';

  const load = () => {
    setLoading(true);
    api.jobs.list({ keyword: keyword || undefined, location: location || undefined })
      .then(setJobs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visibleJobs = useMemo(() => jobs.filter((j) => !hidden.has(j.id)), [jobs, hidden]);

  const tabJobs = useMemo(() => {
    if (tab === 'preferences') return visibleJobs.filter((j) => j.skills.length >= 3);
    if (tab === 'might_like') return [...visibleJobs].reverse();
    return visibleJobs;
  }, [visibleJobs, tab]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= MAX_SELECT) return prev;
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleHide = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveIds(HIDDEN_KEY, next);
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveIds(SAVED_KEY, next);
      return next;
    });
  };

  const applySelected = () => {
    const first = [...selected][0];
    if (!first) return;
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/jobs/${first}`);
  };

  return (
    <div className="min-h-screen bg-naukri-bg">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <Link to="/" className="text-sm text-naukri-muted hover:text-naukri-blue mb-2 inline-block">← Home</Link>
            <h1 className="text-xl font-bold text-naukri-text">Recommended jobs for you</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {isSeeker && (
              <span className="text-sm text-naukri-muted">You can select upto {MAX_SELECT} jobs to apply</span>
            )}
            {isSeeker && (
              <button
                type="button"
                className="naukri-btn-primary"
                disabled={selected.size === 0}
                onClick={applySelected}
              >
                Apply{selected.size > 0 ? ` (${selected.size})` : ''}
              </button>
            )}
          </div>
        </div>

        <div className="card p-4 mb-6 flex gap-3 flex-wrap">
          <input
            className="border border-naukri-border rounded-md px-3 py-2 flex-1 min-w-[160px] text-sm focus:outline-none focus:ring-2 focus:ring-naukri-blue/30"
            placeholder="Skills, designation, companies"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <input
            className="border border-naukri-border rounded-md px-3 py-2 flex-1 min-w-[160px] text-sm focus:outline-none focus:ring-2 focus:ring-naukri-blue/30"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button type="button" onClick={load} className="naukri-btn-primary">Search</button>
        </div>

        <div className="flex gap-8 flex-col lg:flex-row">
          <div className="flex-1 min-w-0">
            <div className="flex gap-6 border-b border-naukri-border mb-5">
              <button type="button" className={`naukri-tab ${tab === 'profile' ? 'naukri-tab-active' : ''}`} onClick={() => setTab('profile')}>
                Profile ({visibleJobs.length})
              </button>
              <button type="button" className={`naukri-tab ${tab === 'might_like' ? 'naukri-tab-active' : ''}`} onClick={() => setTab('might_like')}>
                You might like ({visibleJobs.length})
              </button>
              <button type="button" className={`naukri-tab ${tab === 'preferences' ? 'naukri-tab-active' : ''}`} onClick={() => setTab('preferences')}>
                Preferences ({visibleJobs.filter((j) => j.skills.length >= 3).length})
              </button>
            </div>

            {loading ? (
              <p className="text-naukri-muted py-8 text-center">Loading jobs...</p>
            ) : tabJobs.length === 0 ? (
              <p className="text-naukri-muted py-8 text-center">No jobs found. Try adjusting your search.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {tabJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    selectable={isSeeker}
                    selected={selected.has(job.id)}
                    onSelect={toggleSelect}
                    saved={saved.has(job.id)}
                    onHide={handleHide}
                    onSave={handleSave}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="w-full lg:w-72 shrink-0">
            <div className="naukri-sidebar-card sticky top-6">
              <h2 className="font-semibold text-naukri-text mb-4">Add preferences to get matching jobs</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-naukri-muted">Preferred job role</span>
                  <button type="button" className="naukri-btn-outline">Add</button>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm text-naukri-muted">Preferred work location</span>
                    <button type="button" className="text-naukri-muted hover:text-naukri-text text-sm" aria-label="Edit location">✎</button>
                  </div>
                  <span className="naukri-pref-tag">{location || 'Remote'}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm text-naukri-muted">Preferred salary</span>
                    <button type="button" className="text-naukri-muted hover:text-naukri-text text-sm" aria-label="Edit salary">✎</button>
                  </div>
                  <span className="naukri-pref-tag">₹ 35,00,000</span>
                </div>
              </div>

              {saved.size > 0 && (
                <div className="mt-5 pt-4 border-t border-naukri-border">
                  <p className="text-sm font-medium text-naukri-text mb-1">Saved jobs</p>
                  <p className="text-xs text-naukri-muted">{saved.size} job{saved.size !== 1 ? 's' : ''} saved</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
